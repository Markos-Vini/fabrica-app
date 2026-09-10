import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { publishOrderArtifacts } from "./deliver";
import {
  createOrder,
  getOrder,
  getUserByEmail,
  resetStoreCacheForTests,
  updateOrder,
} from "@/lib/store";
import { agentsForDeliverable } from "@/lib/agents/plan";
import { adminEmail } from "@/lib/env";

const TEST_FILE = path.join(process.cwd(), "data", "fabrica-deliver.test.json");

vi.mock("@/lib/settings", () => ({
  getGithubToken: vi.fn(async () => ""),
  getVercelToken: vi.fn(async () => ""),
}));

vi.mock("@/lib/vercel/deploy", () => ({
  deployToVercel: vi.fn(),
}));

describe("publishOrderArtifacts", () => {
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
    await rm(path.join(process.cwd(), "storage", "orders", orderId), {
      recursive: true,
      force: true,
    });
  });

  it("ignora publicação remota em pedidos de planejamento", async () => {
    const admin = await getUserByEmail(adminEmail());
    if (!admin) throw new Error("Admin ausente");
    const created = await createOrder(
      {
        name: "Plano Teste",
        problem: "p",
        audience: "a",
        businessRules: "r",
        deliverableType: "C",
        mobileStack: "Flutter",
        frontendStack: "Next.js",
        backendStack: "NestJS",
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
      { orderKind: "planning" },
    );
    orderId = created.order.id;
    await updateOrder(orderId, { status: "completed" });
    await publishOrderArtifacts(orderId);
    const loaded = await getOrder(orderId);
    expect(loaded?.order.apkStatus).toBe("skipped");
    expect(loaded?.order.githubUrl).toBeNull();
  });
});
