import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import { agentsForPipeline } from "@/lib/agents/plan";
import { agentPrompt, type ClientLayerFocus } from "@/lib/agents/prompts";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import { generateMockProject } from "@/lib/artifacts/mock-factory";
import { generatePlanningPackage } from "@/lib/artifacts/planning-factory";
import { mergePlanningBaseline } from "@/lib/artifacts/planning-content";
import { mergePlanningDocsForSoftware } from "@/lib/artifacts/merge-planning-software-docs";
import { zipFiles } from "@/lib/artifacts/packager";
import { parseGeneratedFiles } from "@/lib/artifacts/parse-files";
import {
  mergeRecoveredWorkspace,
  recoverOrderWorkspaceFiles,
  loadReferencedJsonDumps,
  stripPlanningPollution,
} from "@/lib/artifacts/agent-disk-recovery";
import {
  clearOrderWorkspace,
  ensureOrderWorkspace,
  orderWorkspaceDir,
  syncCollectedToWorkspace,
} from "@/lib/artifacts/order-workspace";
import { ensureApkWorkflowFiles } from "@/lib/artifacts/apk-workflow-files";
import {
  ensureMobileDeliverable,
  filterFilesByScope,
} from "@/lib/artifacts/scope-files";
import {
  formatScopeGapMessage,
  validateDeliverableScope,
  validatePlanningScope,
} from "@/lib/artifacts/scope-validation";
import {
  formatImportGapMessage,
  validateGeneratedImports,
} from "@/lib/artifacts/import-validation";
import {
  buildGateLogText,
  formatBuildGateMessage,
  runSoftwareBuildGate,
} from "@/lib/artifacts/build-gate";
import { isPlanningOrder, isPlanningMode, inferOrderKind, type OrderKind } from "@/lib/factory-mode";
import type { OrderScope } from "@/lib/order-scope";
import { loadPlanningContext } from "@/lib/planning-context";
import { complete } from "@/lib/llm/router";
import { getProviderKeys, getPublicSettings } from "@/lib/settings";
import { publishOrderArtifacts } from "@/lib/agents/deliver";
import {
  getOrder,
  updateOrder,
  updateRun,
  type AgentRunRecord,
} from "@/lib/store";
import type { AgentId, OrderInput } from "@/lib/types";
import { absorbSoftwareRecovery } from "@/lib/agents/software-finalize";
import { ensureRunArtifacts } from "@/lib/artifacts/ensure-run-artifacts";
import {
  formatDemoReadinessMessage,
  validateDemoReadiness,
} from "@/lib/artifacts/demo-readiness";

function orderScope(order: OrderInput): OrderScope {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function frontendExecutionPasses(order: OrderInput): ClientLayerFocus[] {
  const passes: ClientLayerFocus[] = [];
  if (order.includeMobile) passes.push("mobile");
  if (order.includeFrontend) passes.push("web");
  return passes;
}

function filesForAgent(
  agent: AgentId,
  all: Record<string, string>,
  orderKind: OrderKind,
  clientLayer?: ClientLayerFocus,
): Record<string, string> {
  const pick = (pred: (p: string) => boolean) =>
    Object.fromEntries(Object.entries(all).filter(([p]) => pred(p)));

  if (isPlanningMode(orderKind)) {
    if (agent === "pm") {
      return pick((p) => p === "docs/PRD.md" || p === "docs/HISTORIAS-USUARIO.md");
    }
    if (agent === "architect") {
      return pick(
        (p) => p === "docs/ARQUITETURA.md" || p === "docs/MODELO-DADOS.md",
      );
    }
    if (agent === "backend") return pick((p) => p === "docs/PLANO-BACKEND.md");
    if (agent === "frontend") {
      return pick((p) => p === "docs/PLANO-FRONTEND-MOBILE.md");
    }
    if (agent === "qa") return pick((p) => p === "docs/ESTRATEGIA-QA.md");
    return pick(
      (p) =>
        p === "README.md" ||
        p === "docs/ROADMAP.md" ||
        p === "docs/TAREFAS.md",
    );
  }

  if (agent === "pm") return pick((p) => p === "docs/PRD.md");
  if (agent === "architect") return pick((p) => p === "docs/ARQUITETURA.md");
  if (agent === "backend") return pick((p) => p.startsWith("backend/"));
  if (agent === "frontend") {
    if (clientLayer === "mobile") return pick((p) => p.startsWith("mobile/"));
    if (clientLayer === "web") return pick((p) => p.startsWith("frontend/"));
    return pick((p) => p.startsWith("frontend/") || p.startsWith("mobile/"));
  }
  if (agent === "qa") return pick((p) => p === "docs/QA.md");
  return pick(
    (p) =>
      p === "README.md" ||
      p === "docker-compose.yml" ||
      p.startsWith("tests/") ||
      p.startsWith("mock/") ||
      p.startsWith(".github/"),
  );
}

function summarize(files: Record<string, string>): string {
  const names = Object.keys(files);
  if (names.length === 0) return "(sem arquivos nesta etapa)";
  return names.map((n) => `### ${n}\n\n${files[n]}`).join("\n\n");
}

async function persistCollected(
  orderId: string,
  collected: Record<string, string>,
): Promise<void> {
  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "tree.json"),
    JSON.stringify(collected),
    "utf8",
  );
}

function applyAgentOutput(
  collected: Record<string, string>,
  order: OrderInput,
  raw: string,
  orderId: string,
  planning: boolean,
): void {
  const parsed = parseGeneratedFiles(raw);
  Object.assign(
    parsed,
    loadReferencedJsonDumps(raw, [orderWorkspaceDir(orderId), process.cwd()]),
  );
  if (
    parsed["output.md"] &&
    !parsed["output.md"].trim().startsWith("{") &&
    !parsed["output.md"].includes('"files"')
  ) {
    delete parsed["output.md"];
  }
  const recovered = recoverOrderWorkspaceFiles(
    orderId,
    planning ? "planning" : "software",
  );
  Object.assign(
    collected,
    mergeRecoveredWorkspace(parsed, recovered, { planning }),
  );
  if (!planning) {
    Object.assign(
      collected,
      ensureMobileDeliverable(order, collected),
    );
  }
  Object.assign(collected, filterFilesByScope(order, collected));
  if (planning) {
    Object.assign(collected, stripPlanningPollution(collected));
  }
}

export async function runPipeline(orderId: string): Promise<void> {
  const loaded = await getOrder(orderId, { fresh: true });
  if (!loaded) return;

  const { order } = loaded;
  if (order.status === "completed") return;

  // Planejamento com software já gerado: nunca revalida como app (causava
  // "faltam mobile/lib/main.dart" e apagava a etapa de software na UI).
  if (order.derivedSoftwareOrderId) {
    const derived = await getOrder(order.derivedSoftwareOrderId, { fresh: true });
    if (derived?.order.status === "completed") {
      await updateOrder(orderId, {
        status: "completed",
        currentAgent: null,
        errorMessage: null,
      });
      return;
    }
  }

  if (
    order.sourcePlanningOrderId &&
    order.status === "failed" &&
    order.errorMessage?.includes("Entrega incompleta")
  ) {
    const treePath = path.join(
      process.cwd(),
      "storage",
      "orders",
      orderId,
      "tree.json",
    );
    if (existsSync(treePath)) {
      await updateOrder(orderId, {
        status: "completed",
        currentAgent: null,
        errorMessage: null,
      });
      return;
    }
  }

  const activeRuns = loaded.runs.filter((r) => r.status !== "skipped");
  if (
    activeRuns.length > 0 &&
    activeRuns.every((r) => r.status === "completed")
  ) {
    await updateOrder(orderId, {
      status: "completed",
      currentAgent: null,
      errorMessage: null,
    });
    return;
  }

  const settings = await getPublicSettings();
  const keys = await getProviderKeys();
  const orderKind = inferOrderKind(order, settings.factoryMode);
  const planning = orderKind === "planning";
  const fromApprovedPlanning = Boolean(order.sourcePlanningOrderId);
  const mockFiles = planning
    ? generatePlanningPackage(order)
    : generateMockProject(order);
  let collected: Record<string, string> = {
    ...(await loadCollectedFiles(orderId)),
  };
  const priorChunks: string[] = [];

  if (order.sourcePlanningOrderId) {
    const planningContext = await loadPlanningContext(
      order.sourcePlanningOrderId,
      orderScope(order as OrderInput),
    );
    if (planningContext) priorChunks.push(planningContext);
  }

  await updateOrder(orderId, { status: "running", errorMessage: null });

  const isFreshRun = activeRuns.every(
    (r) => r.status === "pending" || r.status === "running",
  );
  if (isFreshRun && activeRuns.every((r) => r.status === "pending")) {
    await clearOrderWorkspace(orderId);
    collected = {};
  }
  await ensureOrderWorkspace(orderId);
  await syncCollectedToWorkspace(orderId, collected);

  const sequence = agentsForPipeline(
    orderKind,
    order.deliverableType,
    orderScope(order as OrderInput),
    { fromApprovedPlanning },
  ).run;
  let runningAgent: AgentId | null = null;

  try {
    for (const agent of sequence) {
      const current = await getOrder(orderId, { fresh: true });
      if (!current) return;
      const run = current.runs.find((r) => r.agent === agent);
      if (!run || run.status === "skipped") continue;

      if (run.status === "completed") {
        if (run.outputText) {
          priorChunks.push(run.outputText.slice(0, 4000));
        }
        continue;
      }

      const model = settings.agentModels[agent] ?? "gpt-4o";
      runningAgent = agent;
      await updateOrder(orderId, { currentAgent: agent });
      await updateRun(run.id, {
        status: "running",
        model,
        startedAt: new Date().toISOString(),
        errorMessage: null,
      });

      const orderInput = order as OrderInput;
      const passes: (ClientLayerFocus | undefined)[] =
        agent === "frontend"
          ? frontendExecutionPasses(orderInput)
          : [undefined];

      if (settings.mockMode) {
        await sleep(700);
        const outputParts: string[] = [];
        for (const layer of passes) {
          const slice = filesForAgent(agent, mockFiles, orderKind, layer);
          Object.assign(collected, slice);
          outputParts.push(summarize(slice));
        }
        if (!planning) {
          Object.assign(
            collected,
            ensureMobileDeliverable(orderInput, collected),
          );
        }
        Object.assign(collected, filterFilesByScope(orderInput, collected));
        if (planning) {
          Object.assign(collected, stripPlanningPollution(collected));
        }
        await syncCollectedToWorkspace(orderId, collected);
        await persistCollected(orderId, collected);
        await updateRun(run.id, {
          status: "completed",
          outputText: outputParts.join("\n\n"),
          finishedAt: new Date().toISOString(),
        });
        priorChunks.push(outputParts.join("\n\n"));
        continue;
      }

      const outputParts: string[] = [];
      for (const layer of passes) {
        const prompt = agentPrompt(
          agent,
          orderInput,
          priorChunks.join("\n\n"),
          orderKind,
          fromApprovedPlanning,
          layer,
        );
        const result = await complete({
          mockMode: false,
          model,
          keys,
          agentCwd: orderWorkspaceDir(orderId),
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
        });
        applyAgentOutput(collected, orderInput, result.text, orderId, planning);
        outputParts.push(result.text);
      }

      await syncCollectedToWorkspace(orderId, collected);
      await persistCollected(orderId, collected);
      const combinedOutput = outputParts.join("\n\n---\n\n");
      await updateRun(run.id, {
        status: "completed",
        outputText: combinedOutput.slice(0, 50_000),
        finishedAt: new Date().toISOString(),
      });
      priorChunks.push(combinedOutput.slice(0, 4000));
    }

    if (Object.keys(collected).length === 0) {
      Object.assign(collected, mockFiles);
    }

    if (planning) {
      Object.assign(
        collected,
        mergePlanningBaseline(order as OrderInput, collected),
      );
      Object.assign(collected, stripPlanningPollution(collected));
    }

    if (fromApprovedPlanning && order.sourcePlanningOrderId) {
      const planningFiles = await loadCollectedFiles(order.sourcePlanningOrderId);
      if (planningFiles) {
        Object.assign(
          collected,
          mergePlanningDocsForSoftware(
            planningFiles,
            collected,
            order.deliverableType,
            orderScope(order as OrderInput),
          ),
        );
      }
    }

    if (!planning) {
      Object.assign(
        collected,
        ensureMobileDeliverable(order as OrderInput, collected),
      );
      Object.assign(
        collected,
        ensureApkWorkflowFiles(order as OrderInput, collected),
      );
    }
    Object.assign(collected, filterFilesByScope(order as OrderInput, collected));

    if (planning) {
      Object.assign(collected, stripPlanningPollution(collected));
    }

    if (!planning) {
      absorbSoftwareRecovery(
        collected,
        orderId,
        order as OrderInput,
        loaded.runs
          .map((run) => run.outputText)
          .filter((text): text is string => Boolean(text?.trim())),
      );
      Object.assign(
        collected,
        ensureRunArtifacts(order as OrderInput, collected),
      );
    }
    const scopeGaps = planning
      ? validatePlanningScope(collected)
      : validateDeliverableScope(order as OrderInput, collected);
    if (scopeGaps.length > 0) {
      throw new Error(formatScopeGapMessage(scopeGaps));
    }

    if (!planning) {
      const importGaps = validateGeneratedImports(order as OrderInput, collected);
      if (importGaps.length > 0) {
        throw new Error(formatImportGapMessage(importGaps));
      }

      const demoGaps = validateDemoReadiness(order as OrderInput, collected);
      if (demoGaps.length > 0) {
        throw new Error(formatDemoReadinessMessage(demoGaps));
      }

      if (settings.buildGateEnabled && !settings.mockMode) {
        const gateDir = path.join(
          process.cwd(),
          "storage",
          "orders",
          orderId,
          "build-gate",
        );
        const gate = await runSoftwareBuildGate(
          order as OrderInput,
          collected,
          { workDir: gateDir },
        );
        await writeFile(
          path.join(gateDir, "result.log"),
          buildGateLogText(gate),
          "utf8",
        );
        if (!gate.ok) {
          throw new Error(formatBuildGateMessage(gate));
        }
      }
    }

    const slug = slugify(order.name);
    const zip = await zipFiles(slug, collected);
    const dir = path.join(process.cwd(), "storage", "orders", orderId);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "tree.json"),
      JSON.stringify(collected),
      "utf8",
    );
    await writeFile(path.join(dir, `${slug}.zip`), zip);

    await publishOrderArtifacts(orderId);
    await updateOrder(orderId, { status: "completed", currentAgent: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no pipeline";
    const snapshot = runningAgent
      ? (await getOrder(orderId, { fresh: true }))?.runs.find(
          (r) => r.agent === runningAgent,
        )
      : null;
    if (snapshot) {
      await updateRun(snapshot.id, {
        status: "failed",
        errorMessage: message,
        finishedAt: new Date().toISOString(),
      });
    }
    await updateOrder(orderId, {
      status: "failed",
      errorMessage: message,
    });
  }
}

export function agentLabel(id: AgentId): string {
  return AGENT_CATALOG.find((a) => a.id === id)?.name ?? id;
}

export type { AgentRunRecord };
