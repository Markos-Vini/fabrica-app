import { describe, expect, it } from "vitest";
import { generateMockProject } from "./mock-factory";
import type { OrderInput } from "@/lib/types";

const fullScope = {
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

const appOnlyScope = {
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

const baseOrder: OrderInput = {
  name: "Café Delivery",
  problem: "Pedidos pelo WhatsApp se perdem",
  audience: "Cafeterias de bairro",
  businessRules: "Pedido mínimo R$ 20",
  deliverableType: "A",
  mobileStack: "PWA/Web Mobile",
  frontendStack: "Next.js",
  backendStack: "Node.js (Express)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  ...fullScope,
};

describe("generateMockProject", () => {
  it("inclui PRD e arquitetura no tipo A e omite código de API", () => {
    const files = generateMockProject(baseOrder);
    expect(files["docs/PRD.md"]).toContain("Café Delivery");
    expect(files["docs/ARQUITETURA.md"]).toContain("mermaid");
    expect(files["docs/QA.md"]).toBeTruthy();
    expect(files["README.md"]).toContain("Café Delivery");
    expect(Object.keys(files).some((p) => p.startsWith("backend/"))).toBe(
      false,
    );
  });

  it("gera código por camada no tipo B sem PRD completo", () => {
    const files = generateMockProject({ ...baseOrder, deliverableType: "B" });
    expect(files["docs/PRD.md"]).toBeUndefined();
    expect(files["backend/src/server.js"]).toBeTruthy();
    expect(files["frontend/README.md"]).toContain("Next.js");
    expect(files["backend/src/server.js"]).toContain("Café Delivery");
  });

  it("inclui docs, código, testes e scaffold MVP no tipo D full-stack", () => {
    const files = generateMockProject({ ...baseOrder, deliverableType: "D" });
    expect(files["docs/PRD.md"]).toBeTruthy();
    expect(files["backend/src/server.js"]).toBeTruthy();
    expect(files["frontend/README.md"]).toBeTruthy();
    expect(files["tests/smoke.test.js"]).toBeTruthy();
    expect(files["docker-compose.yml"]).toContain("postgres");
    expect(files["docker-compose.yml"]).toContain("healthcheck");
    expect(files["docs/COMO-RODAR-MVP.md"]).toBeTruthy();
    expect(files["scripts/setup-dev.ps1"]).toBeTruthy();
  });

  it("inclui workflow APK e guia MVP em full-stack com mobile", () => {
    const files = generateMockProject({
      ...baseOrder,
      deliverableType: "B",
      generateTestBuild: true,
      mobileStack: "Flutter (Dart)",
    });
    expect(files["docs/COMO-RODAR-MVP.md"]).toBeTruthy();
    expect(files["mobile/run-dev.ps1"]).toBeTruthy();
    expect(files["mock/db.json"]).toBeUndefined();
    expect(files["mobile/pubspec.yaml"]).toContain("flutter:");
    expect(files[".github/workflows/android-debug.yml"]).toContain(
      "flutter build apk --debug",
    );
  });

  it("mantém mock json-server quando back-end sem banco (escopo parcial)", () => {
    const files = generateMockProject({
      ...baseOrder,
      deliverableType: "B",
      includeMobile: false,
      includeDatabase: false,
    });
    expect(files["mock/db.json"]).toContain("Café Delivery");
    expect(files["docker-compose.yml"]).toContain("json-server");
  });

  it("gera scaffold Expo para React Native com build de teste", () => {
    const files = generateMockProject({
      ...baseOrder,
      deliverableType: "B",
      generateTestBuild: true,
      mobileStack: "React Native (TS/JS)",
    });
    expect(files["mobile/package.json"]).toContain("expo");
    expect(files["mobile/App.tsx"]).toContain("Café Delivery");
    expect(files[".github/workflows/android-debug.yml"]).toContain("expo prebuild");
  });

  it("escopo só app omite back-end, mock e site web", () => {
    const files = generateMockProject({
      ...baseOrder,
      name: "Calculadora",
      deliverableType: "B",
      mobileStack: "Flutter (Dart)",
      ...appOnlyScope,
    });
    expect(files["backend/src/server.js"]).toBeUndefined();
    expect(files["frontend/README.md"]).toBeUndefined();
    expect(files["mock/db.json"]).toBeUndefined();
    expect(files["docker-compose.yml"]).toBeUndefined();
    expect(files["mobile/pubspec.yaml"]).toContain("flutter:");
  });
});
