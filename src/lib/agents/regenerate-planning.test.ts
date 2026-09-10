import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { regeneratePlanningDocs } from "./regenerate-planning";
import {
  createOrder,
  getUserByEmail,
  resetStoreCacheForTests,
  updateOrder,
  updateRun,
} from "@/lib/store";
import { agentsForPipeline } from "@/lib/agents/plan";
import { adminEmail } from "@/lib/env";

const TEST_FILE = path.join(process.cwd(), "data", "fabrica-regen-planning.test.json");
const orderIds: string[] = [];

afterEach(async () => {
  resetStoreCacheForTests();
  delete process.env.FABRICA_DATA_FILE;
  for (const orderId of orderIds.splice(0)) {
    await rm(path.join(process.cwd(), "storage", "orders", orderId), {
      recursive: true,
      force: true,
    });
  }
  if (existsSync(TEST_FILE)) await rm(TEST_FILE, { force: true });
});

describe("regeneratePlanningDocs", () => {
  it("atualiza TAREFAS rasas mantendo PRD da IA", async () => {
    process.env.FABRICA_DATA_FILE = TEST_FILE;
    resetStoreCacheForTests();
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin ausente");

    const created = await createOrder(
      {
        name: "TaskList Sync",
        problem: "Sync de tarefas mobile e web",
        audience: "Equipes",
        businessRules:
          "1. CRUD de tarefas mobile e web\n4. Gráficos de produtividade no painel web",
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
      },
      agentsForPipeline("planning", "C", {
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: true,
      }),
      admin.id,
      { orderKind: "planning" },
    );
    orderIds.push(created.order.id);
    await updateOrder(created.order.id, { status: "completed" });

    const dir = path.join(process.cwd(), "storage", "orders", created.order.id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "tree.json"),
      JSON.stringify(
        {
          "docs/PRD.md": "# PRD customizado\n\nConteúdo rico gerado pela IA que deve ser preservado no merge.",
          "docs/TAREFAS.md": "[conteúdo completo em docs/TAREFAS.md — 99 tarefas]",
        },
        null,
        2,
      ),
      "utf8",
    );

    const { fileCount } = await regeneratePlanningDocs(created.order.id, "merge");
    expect(fileCount).toBeGreaterThan(5);

    const tree = JSON.parse(
      readFileSync(path.join(dir, "tree.json"), "utf8"),
    ) as Record<string, string>;

    expect(tree["docs/PRD.md"]).toContain("PRD customizado");
    expect(tree["docs/TAREFAS.md"]).toContain("### T-001");
    expect((tree["docs/TAREFAS.md"].match(/### T-/g) ?? []).length).toBeGreaterThanOrEqual(
      25,
    );
    expect(
      existsSync(path.join(dir, "tasklist-sync.zip")),
    ).toBe(true);
  });

  it("merge recupera PRD rico das saídas dos agentes quando tree.json está degradado", async () => {
    process.env.FABRICA_DATA_FILE = TEST_FILE;
    resetStoreCacheForTests();
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin ausente");

    const created = await createOrder(
      {
        name: "EducaFlex Regen",
        problem: "Treinamento corporativo",
        audience: "RH",
        businessRules: "Sequenciamento de aulas",
        deliverableType: "C",
        mobileStack: "Flutter (Dart)",
        frontendStack: "Next.js",
        backendStack: "NestJS",
        databaseStack: "MySQL",
        generateTestBuild: false,
        scopePreset: "full",
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: true,
      },
      agentsForPipeline("planning", "C", {
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: true,
      }),
      admin.id,
      { orderKind: "planning" },
    );
    orderIds.push(created.order.id);
    await updateOrder(created.order.id, { status: "completed" });

    const pmRun = created.runs.find((r) => r.agent === "pm");
    if (!pmRun) throw new Error("Run PM ausente");
    await updateRun(pmRun.id, {
      status: "completed",
      outputText: JSON.stringify({
        files: {
          "docs/PRD.md":
            "# PRD — EducaFlex Regen\n\n## 1. Visão geral\n\nConteúdo extenso da IA ".repeat(
              400,
            ),
          "docs/HISTORIAS-USUARIO.md": "# Histórias\n\n" + "US-001 detalhe\n".repeat(200),
        },
      }),
    });

    const dir = path.join(process.cwd(), "storage", "orders", created.order.id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "tree.json"),
      JSON.stringify({
        "docs/PRD.md": `# PRD — EducaFlex Regen

## 1. Contexto
Treinamento corporativo

## 5. MVP funcional
1. Fluxo principal descrito no pedido
`,
      }),
      "utf8",
    );

    await regeneratePlanningDocs(created.order.id, "merge");
    const tree = JSON.parse(
      readFileSync(path.join(dir, "tree.json"), "utf8"),
    ) as Record<string, string>;

    expect(tree["docs/PRD.md"]).toContain("## 1. Visão geral");
    expect(tree["docs/PRD.md"].length).toBeGreaterThan(5000);
    expect(tree["docs/PRD.md"]).not.toContain("Fluxo principal descrito no pedido");
    expect(Object.keys(tree).some((k) => k.startsWith("mobile/"))).toBe(false);
  });

  it("template substitui tudo pelo pacote MOCK local", async () => {
    process.env.FABRICA_DATA_FILE = TEST_FILE;
    resetStoreCacheForTests();
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin ausente");

    const created = await createOrder(
      {
        name: "Curso Demo",
        problem: "Capacitação",
        audience: "Alunos",
        businessRules: "Regra 1",
        deliverableType: "A",
        mobileStack: "Flutter",
        frontendStack: "Next.js",
        backendStack: "NestJS",
        databaseStack: "MySQL",
        generateTestBuild: false,
        scopePreset: "app-api",
        includeMobile: true,
        includeFrontend: false,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: false,
      },
      agentsForPipeline("planning", "A", {
        includeMobile: true,
        includeFrontend: false,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: false,
      }),
      admin.id,
      { orderKind: "planning" },
    );
    orderIds.push(created.order.id);
    await updateOrder(created.order.id, { status: "completed" });

    const dir = path.join(process.cwd(), "storage", "orders", created.order.id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "tree.json"),
      JSON.stringify({
        "docs/PRD.md": "# PRD rico\n\n" + "x".repeat(8000),
      }),
      "utf8",
    );

    await regeneratePlanningDocs(created.order.id, "template");
    const tree = JSON.parse(
      readFileSync(path.join(dir, "tree.json"), "utf8"),
    ) as Record<string, string>;

    expect(tree["docs/PRD.md"]).toContain("## 1. Contexto");
    expect(tree["docs/PRD.md"].length).toBeLessThan(3000);
  });
});
