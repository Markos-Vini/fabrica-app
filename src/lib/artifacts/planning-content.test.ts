import { describe, expect, it } from "vitest";
import {
  isIncompleteTaskBacklog,
  isPlanningStubContent,
  mergePlanningBaseline,
} from "./planning-content";
import type { OrderInput } from "@/lib/types";

const order: OrderInput = {
  name: "Tasklist",
  problem: "Organizar tarefas",
  audience: "Equipes",
  businessRules: "CRUD de tarefas com prioridade",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js (Express)",
  databaseStack: "SQLite",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("isPlanningStubContent", () => {
  it("detecta placeholder de TAREFAS sem tabela", () => {
    expect(
      isPlanningStubContent(
        "[conteúdo completo em docs/TAREFAS.md — 99 tarefas T-001 a T-202]",
        "docs/TAREFAS.md",
      ),
    ).toBe(true);
  });

  it("detecta stub de README em uma linha", () => {
    expect(
      isPlanningStubContent(
        "Gerado em README.md — índice do pacote TaskList v1.0, links para todos docs.",
        "README.md",
      ),
    ).toBe(true);
  });

  it("detecta stub de ROADMAP resumido", () => {
    expect(
      isPlanningStubContent(
        "Gerado em docs/ROADMAP.md — roadmap 6 fases, 57 tarefas, ~215 pts.",
        "docs/ROADMAP.md",
      ),
    ).toBe(true);
  });

  it("aceita backlog com tabela markdown", () => {
    const table = [
      "# Backlog",
      "",
      "| # | Tarefa | Descrição | Dep. | Est. | Responsável |",
      "|---|--------|-----------|------|------|-------------|",
      "| 1 | Setup | Repositório e CI | — | 1 | DevOps |",
      "| 2 | API | Endpoints principais | 1 | 2 | Back-end |",
      "| 3 | Mobile | Fluxo principal | 2 | 2 | Mobile |",
      "| 4 | QA | Testes integrados | 3 | 1 | QA |",
    ].join("\n");
    expect(isPlanningStubContent(table, "docs/TAREFAS.md")).toBe(false);
  });
});

describe("isIncompleteTaskBacklog", () => {
  it("detecta backlog IA sem fases de dados e auth", () => {
    const iaPartial = `# Backlog
| ID | Tarefa | Descrição técnica | Critérios de aceite | Dep. | Est. (d) | Resp. |
|----|--------|-------------------|---------------------|------|----------|-------|
| **Fase 0 — Fundação** | | | | | | |
| T-001 | Setup | Monorepo | ok | — | 1 | DevOps |
| **Fase 1 — API base** | | | | | | |
| T-004 | Bootstrap API | NestJS | ok | T-001 | 1 | Back-end |
| **Fase 4 — Domínio (tarefas)** | | | | | | |
| T-007 | GET /tasks | Lista | ok | T-004 | 1 | Back-end |
${Array.from({ length: 22 }, (_, i) => `| T-${String(i + 8).padStart(3, "0")} | Task | Desc | ok | — | 1 | Dev |`).join("\n")}
`;
    expect(isIncompleteTaskBacklog(iaPartial, order)).toBe(true);
  });
});

describe("mergePlanningBaseline", () => {
  it("substitui backlog genérico de 12 tarefas pelo template detalhado", () => {
    const sparse = `# Backlog de tarefas — TaskList

| # | Tarefa | Descrição | Dep. | Est. | Responsável |
|---|--------|-----------|------|------|-------------|
| 1 | Setup repositório | Monorepo | — | 1 | DevOps |
| 2 | API base | Bootstrap | 1 | 1 | Back-end |
| 3 | Schema | Migrações | 2 | 1 | Back-end |
| 4 | Auth | Login | 3 | 1 | Back-end |
| 5 | CRUD | Domínio | 4 | 2 | Back-end |
| 6 | Mobile | Scaffold | 1 | 1 | Mobile |
| 7 | Web | Scaffold | 1 | 1 | Front-end |
| 8 | QA | Testes | 7 | 1 | QA |
`;

    const merged = mergePlanningBaseline(order, {
      "docs/TAREFAS.md": sparse,
    });

    expect((merged["docs/TAREFAS.md"].match(/### T-/g) ?? []).length).toBeGreaterThanOrEqual(
      25,
    );
    expect(merged["docs/TAREFAS.md"]).toContain("GET /tasks");
    expect(merged["docs/TAREFAS.md"]).toContain("PATCH /tasks/:id/complete");
    expect(merged["docs/TAREFAS.md"]).toContain("POST /auth/register");
    expect(merged["docs/TAREFAS.md"]).toContain("Fase 2 — Dados");
  });

  it("substitui README e ROADMAP stub mantendo PRD da IA", () => {
    const merged = mergePlanningBaseline(order, {
      "docs/PRD.md": "# PRD customizado\n\nConteúdo rico gerado pela IA que deve ser preservado no merge.",
      "README.md":
        "Gerado em README.md — índice do pacote TaskList v1.0, links para todos docs.",
      "docs/ROADMAP.md":
        "Gerado em docs/ROADMAP.md — roadmap 6 fases, 57 tarefas, ~215 pts.",
    });

    expect(merged["docs/PRD.md"]).toContain("PRD customizado");
    expect(merged["README.md"]).toContain("Índice de documentos");
    expect(merged["README.md"].split("\n").length).toBeGreaterThan(12);
    expect(merged["docs/ROADMAP.md"]).toMatch(/^# Roadmap/i);
    expect(merged["docs/ROADMAP.md"]).toContain("Fase 0");
  });
});
