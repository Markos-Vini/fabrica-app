import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, readFile, rm } from "node:fs/promises";
import { agentsForDeliverable } from "./plan";
import { runPipeline } from "./pipeline";
import {
  createOrder,
  getOrder,
  getUserByEmail,
  resetStoreCacheForTests,
} from "@/lib/store";
import { adminEmail } from "@/lib/env";

const TEST_FILE = path.join(process.cwd(), "data", "fabrica-pipeline.test.json");

describe("runPipeline (MOCK)", () => {
  let orderId = "";

  beforeAll(async () => {
    process.env.FABRICA_DATA_FILE = TEST_FILE;
    resetStoreCacheForTests();
    await mkdir(path.dirname(TEST_FILE), { recursive: true });
    if (existsSync(TEST_FILE)) await rm(TEST_FILE, { force: true });
  });

  afterAll(async () => {
    resetStoreCacheForTests();
    delete process.env.FABRICA_DATA_FILE;
    if (existsSync(TEST_FILE)) await rm(TEST_FILE, { force: true });
    if (!orderId) return;
    try {
      await rm(path.join(process.cwd(), "storage", "orders", orderId), {
        recursive: true,
        force: true,
      });
    } catch {
      // Windows pode manter workspace/ bloqueado brevemente após o pipeline.
    }
  });

  it("conclui um pedido tipo C e gera o ZIP", async () => {
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin bootstrap ausente");
    const created = await createOrder(
      {
        name: "App Teste Pipeline",
        problem: "Validar a esteira",
        audience: "QA interno",
        businessRules: "Pedido de teste",
        deliverableType: "C",
        mobileStack: "Flutter (Dart)",
        frontendStack: "React.js / Next.js",
        backendStack: "Node.js (Express/NestJS)",
        databaseStack: "PostgreSQL",
        generateTestBuild: false,
        scopePreset: "full",
        includeMobile: true,
        includeFrontend: true,
        includeBackend: true,
        includeDatabase: true,
        includeAuth: true,
        includeAdmin: true,
      },
      agentsForDeliverable("C"),
      admin.id,
      { orderKind: "software" },
    );
    orderId = created.order.id;
    await runPipeline(orderId);
    const loaded = await getOrder(orderId);
    expect(loaded?.order.status).toBe("completed");
    const dir = path.join(process.cwd(), "storage", "orders", orderId);
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir).some((f) => f.endsWith(".zip"))).toBe(true);

    const tree = JSON.parse(
      await readFile(path.join(dir, "tree.json"), "utf8"),
    ) as Record<string, string>;
    expect(tree["frontend/package.json"] ?? tree["frontend/src/App.jsx"]).toBeTruthy();
    expect(tree["mobile/lib/main.dart"]).toBeTruthy();
    expect(Object.keys(tree).some((k) => k.startsWith("backend/"))).toBe(true);
  }, 20_000);

  it("planejamento não inclui código de outras apps no pacote", async () => {
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin bootstrap ausente");
    const created = await createOrder(
      {
        name: "Plano Isolado Teste",
        problem: "Validar isolamento do workspace",
        audience: "QA",
        businessRules: "Sem contaminação",
        deliverableType: "A",
        mobileStack: "Flutter (Dart)",
        frontendStack: "React.js / Next.js",
        backendStack: "Node.js (Express/NestJS)",
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
      agentsForDeliverable("A"),
      admin.id,
      { orderKind: "planning" },
    );
    const planningId = created.order.id;
    await runPipeline(planningId);
    const tree = JSON.parse(
      await readFile(
        path.join(process.cwd(), "storage", "orders", planningId, "tree.json"),
        "utf8",
      ),
    ) as Record<string, string>;
    expect(Object.keys(tree).some((k) => k.startsWith("mobile/"))).toBe(false);
    expect(Object.keys(tree).some((k) => k.startsWith("backend/"))).toBe(false);
    expect(Object.keys(tree).some((k) => k.startsWith("frontend/"))).toBe(false);
    expect(tree["docs/PRD.md"]).toBeTruthy();
    await rm(path.join(process.cwd(), "storage", "orders", planningId), {
      recursive: true,
      force: true,
    });
  }, 20_000);
});
