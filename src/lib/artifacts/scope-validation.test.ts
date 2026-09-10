import { describe, expect, it } from "vitest";
import {
  formatScopeGapMessage,
  validateDeliverableScope,
  validatePlanningScope,
} from "./scope-validation";
import type { OrderInput } from "@/lib/types";

const baseOrder: OrderInput = {
  name: "App Teste",
  problem: "Teste",
  audience: "QA",
  businessRules: "Regra",
  deliverableType: "C",
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
};

describe("validateDeliverableScope", () => {
  it("aceita pacote full-stack completo", () => {
    const gaps = validateDeliverableScope(baseOrder, {
      "mobile/lib/main.dart": "void main() {}",
      "mobile/pubspec.yaml": "name: app",
      "frontend/package.json": "{}",
      "backend/package.json": "{}",
      "backend/prisma/schema.prisma": "model User {}",
      "docs/PRD.md": "# PRD",
    });
    expect(gaps).toEqual([]);
  });

  it("detecta frontend ausente", () => {
    const gaps = validateDeliverableScope(baseOrder, {
      "mobile/lib/main.dart": "void main() {}",
      "mobile/pubspec.yaml": "name: app",
      "backend/package.json": "{}",
      "backend/prisma/schema.prisma": "model User {}",
      "docs/PRD.md": "# PRD",
    });
    expect(gaps.some((g) => g.path === "frontend/")).toBe(true);
    expect(formatScopeGapMessage(gaps)).toContain("Front-end web");
  });

  it("ignora camadas desmarcadas no escopo", () => {
    const gaps = validateDeliverableScope(
      { ...baseOrder, includeFrontend: false, includeMobile: false },
      {
        "backend/package.json": "{}",
        "backend/prisma/schema.prisma": "model User {}",
        "docs/PRD.md": "# PRD",
      },
    );
    expect(gaps).toEqual([]);
  });
});

describe("validatePlanningScope", () => {
  it("exige só docs, não código mobile", () => {
    const gaps = validatePlanningScope({
      "docs/PRD.md": "# PRD",
      "docs/ARQUITETURA.md": "# Arq",
      "docs/ROADMAP.md": "# Road",
      "docs/TAREFAS.md": "# Tasks",
    });
    expect(gaps).toEqual([]);
  });

  it("não exige mobile/lib/main.dart", () => {
    const gaps = validatePlanningScope({
      "docs/PRD.md": "# PRD",
      "docs/ARQUITETURA.md": "# Arq",
    });
    expect(gaps.some((g) => g.path.includes("mobile"))).toBe(false);
    expect(gaps.length).toBeGreaterThan(0);
  });
});
