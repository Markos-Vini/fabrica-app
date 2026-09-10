import { describe, expect, it } from "vitest";
import { generatePlanningPackage } from "./planning-factory";
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
  problem: "Pedidos se perdem no WhatsApp",
  audience: "Cafeterias de bairro",
  businessRules: "Pedido mínimo R$ 20",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js (Express)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  ...fullScope,
};

describe("generatePlanningPackage", () => {
  it("gera pacote só de documentação e planejamento", () => {
    const files = generatePlanningPackage(baseOrder);
    expect(files["docs/PRD.md"]).toContain("Café Delivery");
    expect(files["docs/TAREFAS.md"]).toContain("Backlog de tarefas");
    expect(files["docs/TAREFAS.md"]).toContain("### T-001");
    expect(files["docs/TAREFAS.md"]).toContain("Critérios de aceite");
    expect(files["docs/ROADMAP.md"]).toContain("Fase 1");
    expect(Object.keys(files).some((p) => p.startsWith("backend/"))).toBe(false);
    expect(Object.keys(files).some((p) => p.startsWith("frontend/"))).toBe(false);
  });

  it("calculadora só app não menciona API, banco ou login", () => {
    const files = generatePlanningPackage({
      ...baseOrder,
      name: "Calculadora",
      problem: "Preciso de uma calculadora simples",
      audience: "Uso pessoal",
      businessRules: "Operações básicas: +, -, *, /",
      mobileStack: "Flutter (Dart)",
      ...appOnlyScope,
    });

    expect(files["docs/MODELO-DADOS.md"]).toBeUndefined();
    expect(files["docs/PLANO-BACKEND.md"]).toBeUndefined();
    expect(files["docs/PRD.md"]).toContain("Fora de escopo");
    expect(files["docs/PRD.md"]).toContain("Back-end, APIs e servidor");
    expect(files["docs/HISTORIAS-USUARIO.md"]).not.toContain("administrador");
    expect(files["docs/TAREFAS.md"]).toContain("Setup Flutter");
    expect(files["docs/TAREFAS.md"]).toContain("### T-001");
    expect(files["docs/TAREFAS.md"]).toContain("Definition of Done");
    expect(files["docs/ARQUITETURA.md"]).toContain('App["Flutter (Dart)"]');
    expect(files["docs/TAREFAS.md"]).not.toContain("Schema");
    expect(files["docs/TAREFAS.md"]).not.toContain("API POST");
  });
});
