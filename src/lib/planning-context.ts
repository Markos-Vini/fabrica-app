import { loadCollectedFiles } from "@/lib/agents/deliver";
import { scopeLayersLabel, type OrderScope } from "@/lib/order-scope";

export const PLANNING_DOC_KEYS = [
  "docs/PRD.md",
  "docs/HISTORIAS-USUARIO.md",
  "docs/ARQUITETURA.md",
  "docs/MODELO-DADOS.md",
  "docs/PLANO-BACKEND.md",
  "docs/PLANO-FRONTEND-MOBILE.md",
  "docs/ESTRATEGIA-QA.md",
  "docs/ROADMAP.md",
  "docs/TAREFAS.md",
  "README.md",
] as const;

export function formatPlanningContext(
  files: Record<string, string>,
  scope?: OrderScope,
): string {
  const parts: string[] = [
    "## Documentação aprovada (planejamento de referência)",
    "Implemente o software **estritamente conforme** esta especificação.",
    "Não contradiga PRD, arquitetura, planos técnicos ou backlog de tarefas.",
  ];

  if (scope) {
    parts.push("", `**Escopo acordado:** ${scopeLayersLabel(scope)}`);
  }

  parts.push("");

  for (const key of PLANNING_DOC_KEYS) {
    const content = files[key]?.trim();
    if (content) {
      parts.push(`### ${key}`, "", content, "");
    }
  }

  return parts.join("\n");
}

export async function loadPlanningContext(
  planningOrderId: string,
  scope?: OrderScope,
): Promise<string | null> {
  const files = await loadCollectedFiles(planningOrderId);
  if (!files || Object.keys(files).length === 0) return null;
  const formatted = formatPlanningContext(files, scope);
  return formatted.length > 120 ? formatted : null;
}
