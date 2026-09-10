import { describe, expect, it } from "vitest";
import {
  buildPlanningPdfBuffer,
  parseMarkdownBlocks,
  planningPdfFilename,
  stripMarkdownForPdf,
} from "./planning-pdf";

function countPdfPages(buffer: Buffer): number {
  const raw = buffer.toString("latin1");
  return (raw.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

describe("planningPdfFilename", () => {
  it("gera nome seguro", () => {
    expect(planningPdfFilename("TaskList Sync")).toBe("tasklist-sync-planejamento.pdf");
  });
});

describe("parseMarkdownBlocks", () => {
  it("interpreta títulos e listas", () => {
    const blocks = parseMarkdownBlocks(
      "# Título\n\n## Seção\n\n- Item um\n\nParágrafo normal.",
    );
    expect(blocks.map((b) => b.kind)).toEqual(["h1", "h2", "bullet", "p"]);
  });
});

describe("buildPlanningPdfBuffer", () => {
  it("gera PDF com capa, resumo e seções", async () => {
    const buffer = await buildPlanningPdfBuffer(
      {
        name: "TaskList",
        problem: "Organizar tarefas da equipe no dia a dia",
        audience: "Pequenas equipes comerciais",
        businessRules: "Só o dono da tarefa pode excluí-la",
        deliverableType: "C",
        mobileStack: "Flutter",
        frontendStack: "Next.js",
        backendStack: "Node.js",
        databaseStack: "SQLite",
        generateTestBuild: false,
        scopePreset: "full-stack",
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: false,
        mvpEssentials: "Login\nLista de tarefas\nCriar e concluir tarefa",
        userRoles: "Admin, Membro",
        mainEntities: "Usuário, Tarefa, Categoria",
      },
      {
        "README.md": "# Pacote\n\nObjetivo do projeto para stakeholders.",
        "docs/PRD.md": "# PRD\n\n## Objetivo\n\nRequisitos principais do produto.",
        "docs/HISTORIAS-USUARIO.md": "## Histórias\n\n- Como usuário, quero criar tarefas.",
        "docs/ROADMAP.md": "# Roadmap\n\n## Fase 1\n\nMVP com login e CRUD.",
        "docs/MODELO-DADOS.md": "# Modelo\n\nUsuário 1:N Tarefa.",
        "docs/ARQUITETURA.md": "# Arquitetura\n\nAPI REST + app mobile.",
      },
    );

    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(countPdfPages(buffer)).toBeLessThan(20);
    expect(countPdfPages(buffer)).toBeGreaterThan(3);
    expect(stripMarkdownForPdf("**Bold** e `code`")).toContain("Bold");
  });

  it("não duplica páginas em branco com conteúdo longo", async () => {
    const paragraph =
      "## Detalhe\n\nTexto explicativo do produto com **ênfase** e requisitos. ";
    const longDoc = `# PRD\n\n${paragraph.repeat(80)}`;
    const files = Object.fromEntries(
      [
        "README.md",
        "docs/PRD.md",
        "docs/HISTORIAS-USUARIO.md",
        "docs/ROADMAP.md",
        "docs/MODELO-DADOS.md",
        "docs/ARQUITETURA.md",
      ].map((path) => [path, longDoc]),
    );
    const buffer = await buildPlanningPdfBuffer(
      {
        name: "TaskList v2",
        problem: "Organizar tarefas",
        audience: "Equipes",
        businessRules: "Regras",
        deliverableType: "C",
        mobileStack: "Flutter",
        frontendStack: "Next.js",
        backendStack: "Node.js",
        databaseStack: "SQLite",
        generateTestBuild: false,
        scopePreset: "full-stack",
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: false,
      },
      files,
    );

    const pages = countPdfPages(buffer);
    expect(pages).toBeGreaterThan(5);
    expect(pages).toBeLessThan(30);
  });
});
