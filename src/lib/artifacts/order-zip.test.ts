import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { generatePlanningPackage } from "./planning-factory";
import {
  APK_DEBUG_ZIP_NAME,
  buildOrderZipBuffer,
  resolveProjectZipFilename,
} from "./order-zip";
import type { OrderInput } from "@/lib/types";

const baseOrder: OrderInput = {
  name: "Calculadora Teste",
  problem: "Calcular",
  audience: "Eu",
  businessRules: "Somar e subtrair",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js (Express)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("buildOrderZipBuffer", () => {
  it("gera ZIP sob demanda a partir do tree.json", async () => {
    const orderId = "test-order-zip-on-demand";
    const dir = path.join(process.cwd(), "storage", "orders", orderId);
    await mkdir(dir, { recursive: true });
    const files = generatePlanningPackage(baseOrder);
    await writeFile(path.join(dir, "tree.json"), JSON.stringify(files), "utf8");

    const { buffer, filename } = await buildOrderZipBuffer(
      orderId,
      baseOrder.name,
    );
    expect(buffer.length).toBeGreaterThan(0);
    expect(filename).toContain(".zip");
    expect(existsSync(path.join(dir, filename))).toBe(true);
    expect(readdirSync(dir).some((f) => f.endsWith(".zip"))).toBe(true);
  });

  it("ignora app-debug.zip quando o pacote do projeto também existe", async () => {
    const orderId = "test-order-zip-not-apk";
    const dir = path.join(process.cwd(), "storage", "orders", orderId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, APK_DEBUG_ZIP_NAME), Buffer.from("apk"), "utf8");
    await writeFile(path.join(dir, "calculadora-teste.zip"), Buffer.from("project"), "utf8");

    expect(resolveProjectZipFilename(dir, baseOrder.name)).toBe(
      "calculadora-teste.zip",
    );

    const { filename } = await buildOrderZipBuffer(orderId, baseOrder.name);
    expect(filename).toBe("calculadora-teste.zip");
    expect(filename).not.toBe(APK_DEBUG_ZIP_NAME);
  });
});
