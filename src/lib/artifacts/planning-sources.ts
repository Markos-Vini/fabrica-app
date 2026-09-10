import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  recoverOrderWorkspaceFiles,
  stripPlanningPollution,
} from "@/lib/artifacts/agent-disk-recovery";
import { parseGeneratedFiles } from "@/lib/artifacts/parse-files";
import {
  isTemplatePlanningContent,
  isPlanningStubContent,
} from "@/lib/artifacts/planning-content";
import { getOrder } from "@/lib/store";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import type { OrderInput } from "@/lib/types";

const PLANNING_DOC_PREFIXES = ["docs/", "README.md"] as const;

function isPlanningDocPath(filePath: string): boolean {
  return filePath === "README.md" || filePath.startsWith("docs/");
}

function isUsablePlanningDoc(content: string, filePath: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") && trimmed.includes('"files"')) return false;
  if (filePath === "output.md") return false;
  if (isPlanningStubContent(trimmed, filePath)) return false;
  if (isTemplatePlanningContent(trimmed, filePath)) return false;
  return true;
}

function mergePreferRicher(
  target: Record<string, string>,
  source: Record<string, string>,
): void {
  for (const [filePath, content] of Object.entries(source)) {
    if (!isPlanningDocPath(filePath)) continue;
    if (!isUsablePlanningDoc(content, filePath)) continue;
    const prev = target[filePath];
    if (!prev || content.length > prev.length) {
      target[filePath] = content;
    }
  }
}

/**
 * Agentes legados gravaram docs/ na raiz da fábrica em vez do workspace do pedido.
 * Só usa arquivos cujo título menciona o nome do projeto.
 */
function recoverLegacyRootPlanningDocs(order: OrderInput): Record<string, string> {
  const docsDir = path.join(process.cwd(), "docs");
  if (!existsSync(docsDir)) return {};

  const marker = order.name.trim().toLowerCase();
  if (!marker) return {};

  const out: Record<string, string> = {};
  for (const entry of readdirSync(docsDir)) {
    if (!entry.endsWith(".md")) continue;
    const filePath = `docs/${entry}`;
    const content = readFileSync(path.join(docsDir, entry), "utf8");
    const firstLine = content.split("\n")[0]?.toLowerCase() ?? "";
    if (!firstLine.includes(marker)) continue;
    if (!isUsablePlanningDoc(content, filePath)) continue;
    out[filePath] = content;
  }
  return out;
}

/**
 * Reúne a melhor versão de cada documento de planejamento:
 * tree.json (sem código), workspace do pedido e saídas JSON dos agentes.
 */
export async function collectPlanningDocSources(
  orderId: string,
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};

  const fromTree = stripPlanningPollution((await loadCollectedFiles(orderId)) ?? {});
  mergePreferRicher(merged, fromTree);

  mergePreferRicher(
    merged,
    recoverOrderWorkspaceFiles(orderId, "planning"),
  );

  const loaded = await getOrder(orderId, { fresh: true });
  if (loaded) {
    mergePreferRicher(merged, recoverLegacyRootPlanningDocs(loaded.order as OrderInput));

    for (const run of loaded.runs) {
      if (run.status !== "completed" || !run.outputText?.trim()) continue;
      mergePreferRicher(merged, parseGeneratedFiles(run.outputText));
    }
  }

  return stripPlanningPollution(merged);
}
