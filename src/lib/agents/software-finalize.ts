import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import {
  mergeRecoveredCode,
  recoverAllSoftwareFiles,
} from "@/lib/artifacts/agent-disk-recovery";
import { mergePlanningDocsForSoftware } from "@/lib/artifacts/merge-planning-software-docs";
import { zipFiles } from "@/lib/artifacts/packager";
import {
  ensureMobileDeliverable,
  filterFilesByScope,
} from "@/lib/artifacts/scope-files";
import {
  formatScopeGapMessage,
  validateDeliverableScope,
} from "@/lib/artifacts/scope-validation";
import {
  formatImportGapMessage,
  validateGeneratedImports,
} from "@/lib/artifacts/import-validation";
import { slugify } from "@/lib/artifacts/slug";
import {
  syncCollectedToWorkspace,
} from "@/lib/artifacts/order-workspace";
import { publishOrderArtifacts } from "@/lib/agents/deliver";
import { ensureRunArtifacts } from "@/lib/artifacts/ensure-run-artifacts";
import {
  buildGateLogText,
  formatBuildGateMessage,
  runSoftwareBuildGate,
} from "@/lib/artifacts/build-gate";
import {
  formatDemoReadinessMessage,
  validateDemoReadiness,
} from "@/lib/artifacts/demo-readiness";
import { getPublicSettings } from "@/lib/settings";
import { getOrder, updateOrder, type OrderRecord } from "@/lib/store";
import type { OrderInput } from "@/lib/types";

/** Mescla arquivos do disco/dumps JSON na árvore coletada do pedido de software. */
export function absorbSoftwareRecovery(
  collected: Record<string, string>,
  orderId: string,
  order: OrderInput,
  agentOutputs: string[],
): void {
  const recovered = recoverAllSoftwareFiles(orderId, order, agentOutputs);
  Object.assign(collected, mergeRecoveredCode(collected, recovered));
}

export async function repairSoftwareDelivery(
  orderId: string,
): Promise<{ ok: boolean; error?: string; fileCount?: number }> {
  const loaded = await getOrder(orderId, { fresh: true });
  if (!loaded) return { ok: false, error: "Pedido não encontrado" };
  if (loaded.order.orderKind === "planning") {
    return { ok: false, error: "Reparo só se aplica a pedidos de software." };
  }

  const order = loaded.order as OrderRecord;
  let collected = { ...(await loadCollectedFiles(orderId)) };

  const agentOutputs = loaded.runs
    .map((run) => run.outputText)
    .filter((text): text is string => Boolean(text?.trim()));

  absorbSoftwareRecovery(collected, orderId, order, agentOutputs);

  if (order.sourcePlanningOrderId) {
    const planningFiles = await loadCollectedFiles(order.sourcePlanningOrderId);
    if (planningFiles) {
      collected = mergePlanningDocsForSoftware(
        planningFiles,
        collected,
        order.deliverableType,
        {
          includeMobile: order.includeMobile,
          includeFrontend: order.includeFrontend,
          includeBackend: order.includeBackend,
          includeDatabase: order.includeDatabase,
          includeAuth: order.includeAuth,
          includeAdmin: order.includeAdmin,
        },
      );
    }
  }

  collected = ensureMobileDeliverable(order, collected);
  collected = filterFilesByScope(order, collected);
  Object.assign(collected, ensureRunArtifacts(order, collected));

  const gaps = validateDeliverableScope(order, collected);
  if (gaps.length > 0) {
    return { ok: false, error: formatScopeGapMessage(gaps) };
  }

  const importGaps = validateGeneratedImports(order, collected);
  if (importGaps.length > 0) {
    return { ok: false, error: formatImportGapMessage(importGaps) };
  }

  const demoGaps = validateDemoReadiness(order, collected);
  if (demoGaps.length > 0) {
    return { ok: false, error: formatDemoReadinessMessage(demoGaps) };
  }

  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  await mkdir(dir, { recursive: true });

  const settings = await getPublicSettings();
  if (settings.buildGateEnabled) {
    const gateDir = path.join(dir, "build-gate");
    const gate = await runSoftwareBuildGate(order, collected, {
      workDir: gateDir,
    });
    await writeFile(
      path.join(gateDir, "result.log"),
      buildGateLogText(gate),
      "utf8",
    );
    if (!gate.ok) {
      return { ok: false, error: formatBuildGateMessage(gate) };
    }
  }

  await syncCollectedToWorkspace(orderId, collected);
  await writeFile(
    path.join(dir, "tree.json"),
    JSON.stringify(collected, null, 2),
    "utf8",
  );

  const slug = slugify(order.name);
  const zip = await zipFiles(slug, collected);
  await writeFile(path.join(dir, `${slug}.zip`), zip);

  await updateOrder(orderId, {
    status: "completed",
    currentAgent: null,
    errorMessage: null,
  });

  await publishOrderArtifacts(orderId);

  return { ok: true, fileCount: Object.keys(collected).length };
}
