import type { OrderInput } from "@/lib/types";

export type ScopeGap = {
  path: string;
  reason: string;
};

function hasPath(
  files: Record<string, string>,
  pred: (path: string, content: string) => boolean,
): boolean {
  return Object.entries(files).some(([path, content]) => pred(path, content.trim()));
}

/** Valida só documentação — pedidos de planejamento não geram código. */
export function validatePlanningScope(
  files: Record<string, string>,
): ScopeGap[] {
  const gaps: ScopeGap[] = [];
  const required: Array<{ path: string; reason: string }> = [
    { path: "docs/PRD.md", reason: "PRD" },
    { path: "docs/ARQUITETURA.md", reason: "Arquitetura" },
    { path: "docs/ROADMAP.md", reason: "Roadmap" },
    { path: "docs/TAREFAS.md", reason: "Backlog de tarefas" },
  ];
  for (const item of required) {
    if (!files[item.path]?.trim()) {
      gaps.push(item);
    }
  }
  return gaps;
}

export function validateDeliverableScope(
  order: OrderInput,
  files: Record<string, string>,
): ScopeGap[] {
  const gaps: ScopeGap[] = [];

  if (order.includeMobile) {
    if (!files["mobile/lib/main.dart"]?.trim()) {
      gaps.push({ path: "mobile/lib/main.dart", reason: "App mobile" });
    }
    if (!files["mobile/pubspec.yaml"]?.trim()) {
      gaps.push({ path: "mobile/pubspec.yaml", reason: "Projeto Flutter" });
    }
  }

  if (order.includeFrontend) {
    const hasWeb = hasPath(files, (path, content) => {
      if (!content) return false;
      if (path === "frontend/package.json") return true;
      if (path === "frontend/src/App.jsx" || path === "frontend/src/App.tsx") {
        return true;
      }
      return (
        path.startsWith("frontend/app/") &&
        (path.endsWith("layout.tsx") || path.endsWith("page.tsx"))
      );
    });
    if (!hasWeb) {
      gaps.push({ path: "frontend/", reason: "Front-end web" });
    }
  }

  if (order.includeBackend) {
    if (!files["backend/package.json"]?.trim()) {
      gaps.push({ path: "backend/package.json", reason: "API back-end" });
    }
  }

  if (order.includeBackend && order.includeDatabase) {
    const hasDb = hasPath(files, (path, content) => {
      if (!content) return false;
      return (
        path === "backend/prisma/schema.prisma" ||
        path.includes("backend/prisma/migrations/")
      );
    });
    if (!hasDb) {
      gaps.push({
        path: "backend/prisma/",
        reason: "Schema ou migrations do banco",
      });
    }
  }

  const needsDocs = order.deliverableType === "C" || order.deliverableType === "D";
  if (needsDocs && !files["docs/PRD.md"]?.trim()) {
    gaps.push({ path: "docs/PRD.md", reason: "Documentação PRD" });
  }

  return gaps;
}

export function formatScopeGapMessage(gaps: ScopeGap[]): string {
  if (gaps.length === 0) return "";
  const items = gaps.map((g) => `${g.reason} (${g.path})`).join("; ");
  return `Entrega incompleta — faltam: ${items}. Reexecute a esteira ou reduza o escopo.`;
}
