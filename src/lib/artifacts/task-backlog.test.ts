import { describe, expect, it } from "vitest";
import { generateTaskBacklog } from "./task-backlog";
import type { OrderInput } from "@/lib/types";

const taskListOrder: OrderInput = {
  name: "TaskList Sync",
  problem:
    "Plataforma de tarefas sincronizada em tempo real entre mobile e web com métricas visuais.",
  audience: "Profissionais, estudantes e equipes pequenas",
  businessRules: [
    "1. O usuário pode criar, editar, concluir e excluir tarefas pelo App Mobile e Painel Web.",
    "2. Cada tarefa possui título, descrição opcional, vencimento, prioridade e categoria.",
    "3. Tarefas concluídas sincronizam imediatamente com a API para atualizar histórico.",
    "4. O Painel Web exibe gráficos de produtividade (concluídas vs pendentes por período).",
    "5. Não permitir tarefas com vencimento anterior à data atual.",
  ].join("\n"),
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
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

describe("generateTaskBacklog", () => {
  it("gera backlog detalhado para TaskList Sync full-stack", () => {
    const md = generateTaskBacklog(taskListOrder, {
      includeMobile: true,
      includeFrontend: true,
      includeBackend: true,
      includeDatabase: true,
      includeAuth: true,
      includeAdmin: true,
    });

    expect(md).toContain("### T-001");
    expect(md).toContain("**Descrição**");
    expect(md).toContain("**Critérios de aceite**");
    expect(md).toContain("Criar a estrutura monorepo");
    expect(md).toContain("GET /tasks");
    expect(md).toContain("/analytics/productivity");
    expect(md).toContain("POST /auth/register");
    expect(md).toContain("Fase 2 — Dados");
    expect(md).toContain("Fase 3 — Autenticação");
    expect(md).toContain("gráfico");
    expect(md).toContain("RN-05");
    expect(md).toContain("Regras de negócio rastreadas");
    expect((md.match(/### T-/g) ?? []).length).toBeGreaterThanOrEqual(30);
  });

  it("gera backlog mobile-only sem API", () => {
    const md = generateTaskBacklog(taskListOrder, {
      includeMobile: true,
      includeFrontend: false,
      includeBackend: false,
      includeDatabase: false,
      includeAuth: false,
      includeAdmin: false,
    });

    expect(md).toContain("Mobile — app local");
    expect(md).not.toContain("GET /tasks");
    expect(md).toContain("### T-001");
  });
});
