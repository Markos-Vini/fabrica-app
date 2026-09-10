import { describe, expect, it } from "vitest";
import { agentPrompt } from "./prompts";
import { JSON_OUTPUT_RULE, scopeExclusionBrief } from "./output-contract";
import type { OrderInput } from "@/lib/types";

const baseOrder: OrderInput = {
  name: "CalcFácil",
  problem: "Calculadora simples",
  audience: "Estudantes",
  businessRules: "Operações básicas",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("agentPrompt", () => {
  it("inclui contrato JSON e exclusões de escopo no dev mobile", () => {
    const { system, user } = agentPrompt("frontend", baseOrder, "", "software");
    expect(user).toContain(JSON_OUTPUT_RULE.slice(0, 30));
    expect(user).toContain("mobile/");
    expect(user).toContain("NÃO crie pasta frontend/");
    expect(user).toContain("Flutter");
    expect(system).toContain("executável");
  });

  it("reforça spec aprovada quando vem do planejamento", () => {
    const { system } = agentPrompt(
      "backend",
      { ...baseOrder, includeBackend: true, includeDatabase: true },
      "",
      "software",
      true,
    );
    expect(system).toContain("aprovada");
  });

  it("QA pede checklist PASS/FAIL", () => {
    const { user } = agentPrompt("qa", baseOrder, "material", "software");
    expect(user).toContain("PASS/FAIL");
    expect(user).toContain("docs/QA.md");
  });
});

describe("scopeExclusionBrief", () => {
  it("lista backend e auth fora do escopo app-only", () => {
    const brief = scopeExclusionBrief(baseOrder);
    expect(brief).toContain("backend/");
    expect(brief).toContain("login");
  });
});
