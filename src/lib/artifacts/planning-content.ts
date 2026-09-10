import type { OrderInput } from "@/lib/types";
import type { OrderScope } from "@/lib/order-scope";
import { generatePlanningPackage } from "./planning-factory";

function orderScopeFrom(order: OrderInput): OrderScope {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

function countTaskRows(content: string): number {
  const lines = content.split("\n");
  const section = lines.filter((line) => /^### T-/.test(line)).length;
  const idTable = lines.filter((line) => /^\| T-/.test(line)).length;
  const numberedTable = lines.filter((line) => /^\|\s*\d+\s*\|/.test(line)).length;
  return section + idTable + numberedTable;
}

function isSummaryStub(content: string): boolean {
  const trimmed = content.trim();
  if (/^gerado em (readme\.md|docs\/)/i.test(trimmed)) return true;
  if (
    trimmed.split("\n").filter(Boolean).length <= 1 &&
    /índice do pacote|roadmap \d+ fases|tarefas,?\s+\d+\s+pts|métricas \(\d+/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

export function isIncompleteTaskBacklog(
  content: string,
  order: OrderInput,
): boolean {
  const scope = orderScopeFrom(order);
  const lower = content.toLowerCase();

  if (scope.includeBackend && scope.includeDatabase) {
    const hasDataPhase =
      /fase 2|migra|schema|prisma|modelagem/.test(lower) ||
      /post \/auth|\/auth\/register|autenticação|fase 3 — auth/i.test(lower);
    if (!hasDataPhase && !/sqlite|banco de dados/.test(lower)) {
      if (/fase 4|domínio|get \/tasks/i.test(lower)) return true;
    }
  }

  if (scope.includeBackend && scope.includeAuth) {
    const hasAuth =
      /fase 3|post \/auth|\/auth\/register|\/auth\/login|autenticação|jwt/i.test(
        lower,
      );
    if (!hasAuth && /fase [4-9]|get \/tasks|mobile-auth|auth web/i.test(lower)) {
      return true;
    }
  }

  if (scope.includeAdmin && !/admin|painel admin|fase 8/i.test(lower)) {
    return true;
  }

  if (
    scope.includeBackend &&
    scope.includeDatabase &&
    /fase 1/i.test(content) &&
    /fase 4/i.test(content) &&
    !/fase 2/i.test(content)
  ) {
    return true;
  }

  if (
    scope.includeAuth &&
    /fase 1/i.test(content) &&
    /fase 4/i.test(content) &&
    !/fase 3/i.test(content)
  ) {
    return true;
  }

  return false;
}

function isSparseTaskBacklog(content: string, order: OrderInput): boolean {
  const rows = countTaskRows(content);
  const fullStack =
    order.includeBackend && order.includeFrontend && order.includeMobile;
  if (fullStack && rows < 25) return true;
  if (order.includeBackend && rows < 12) return true;
  return rows < 6;
}

export function isPlanningStubContent(
  content: string,
  filePath?: string,
): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;

  if (/\[conteúdo completo/i.test(trimmed)) return true;
  if (/tarefas T-\d+ a T-\d+/i.test(trimmed) && !trimmed.includes("|")) {
    return true;
  }
  if (/ver docs\//i.test(trimmed) && trimmed.length < 500) return true;
  if (/omitido|placeholder|truncado/i.test(trimmed) && trimmed.length < 500) {
    return true;
  }
  if (isSummaryStub(trimmed)) return true;

  if (filePath === "README.md") {
    if (!trimmed.startsWith("# ")) return true;
    if (trimmed.split("\n").length < 12) return true;
    return false;
  }

  if (filePath === "docs/ROADMAP.md") {
    if (!/^# roadmap/i.test(trimmed)) return true;
    if (trimmed.split("\n").length < 12) return true;
    return false;
  }

  if (filePath === "docs/TAREFAS.md") {
    if (/\[conteúdo completo/i.test(trimmed)) return true;
    if (/tarefas T-\d+ a T-\d+/i.test(trimmed) && !trimmed.includes("|")) {
      return true;
    }
    const taskRows = countTaskRows(trimmed);
    return taskRows < 3;
  }

  if (filePath?.startsWith("docs/")) {
    if (isTemplatePlanningContent(trimmed, filePath)) return true;
    return trimmed.length < 60;
  }

  return trimmed.length < 80;
}

/** Documentação gerada pelo template local (MOCK) — não é saída rica da esteira com IA. */
export function isTemplatePlanningContent(
  content: string,
  filePath?: string,
): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;

  if (filePath === "docs/PRD.md") {
    return (
      trimmed.includes("## 1. Contexto") &&
      trimmed.includes("Fluxo principal descrito no pedido")
    );
  }
  if (filePath === "docs/ARQUITETURA.md") {
    return (
      /^# Arquitetura —/m.test(trimmed) ||
      (trimmed.length < 1200 && trimmed.includes("## Diagrama"))
    );
  }
  if (filePath === "docs/MODELO-DADOS.md") {
    return (
      trimmed.length < 400 ||
      /^# Modelo de dados —/m.test(trimmed) ||
      /^### educaflex$/im.test(trimmed)
    );
  }
  if (filePath === "docs/HISTORIAS-USUARIO.md") {
    return trimmed.includes("| US-10 |") && trimmed.length < 2500;
  }
  if (filePath === "docs/PLANO-BACKEND.md") {
    return trimmed.length < 900 && !trimmed.includes("`/api/v1`");
  }
  if (filePath === "docs/PLANO-FRONTEND-MOBILE.md") {
    return trimmed.length < 600 && !trimmed.includes("Diretriz visual");
  }
  if (filePath === "docs/ESTRATEGIA-QA.md") {
    return trimmed.length < 600 && !trimmed.includes("Definition of Done");
  }
  if (filePath === "docs/ROADMAP.md") {
    return trimmed.length < 2500 && !trimmed.includes("```mermaid");
  }
  if (filePath === "README.md") {
    return (
      trimmed.includes("Etapa 1 — Planejamento") &&
      trimmed.length < 2800 &&
      !trimmed.includes("Como subir")
    );
  }

  return false;
}

function isWeakPlanningContent(content: string, filePath?: string): boolean {
  return (
    isPlanningStubContent(content, filePath) ||
    isTemplatePlanningContent(content, filePath)
  );
}

export function mergePlanningBaseline(
  order: OrderInput,
  collected: Record<string, string>,
): Record<string, string> {
  const baseline = generatePlanningPackage(order);
  const merged = { ...collected };

  for (const [filePath, content] of Object.entries(baseline)) {
    const existing = merged[filePath];
    const replaceTasks =
      filePath === "docs/TAREFAS.md" &&
      (!existing ||
        isWeakPlanningContent(existing, filePath) ||
        isSparseTaskBacklog(existing, order) ||
        isIncompleteTaskBacklog(existing, order));
    const replaceIndexDoc =
      (filePath === "README.md" || filePath === "docs/ROADMAP.md") &&
      (!existing || isWeakPlanningContent(existing, filePath));

    if (
      replaceTasks ||
      replaceIndexDoc ||
      !existing ||
      isWeakPlanningContent(existing, filePath)
    ) {
      if (
        existing &&
        !isWeakPlanningContent(existing, filePath) &&
        existing.length > content.length &&
        filePath !== "docs/TAREFAS.md"
      ) {
        continue;
      }
      merged[filePath] = content;
    }
  }

  return merged;
}
