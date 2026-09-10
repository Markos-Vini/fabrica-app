import { describe, expect, it } from "vitest";
import {
  parseSuccessCriteriaFromForm,
  successCriteriaBriefForPrompt,
  successCriteriaReviewFromForm,
} from "./success-criteria-context";
import type { OrderInput } from "@/lib/types";

const base: OrderInput = {
  name: "TaskList",
  problem: "Tarefas",
  audience: "Todos",
  businessRules: "RN-01",
  deliverableType: "C",
  mobileStack: "Flutter",
  frontendStack: "Next.js",
  backendStack: "Node.js",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: false,
};

describe("success-criteria-context", () => {
  it("parseia critérios do formulário", () => {
    const fd = new FormData();
    fd.set("successCriteria", "  Cria 5 tarefas em < 2 min  ");
    expect(parseSuccessCriteriaFromForm(fd)).toBe("Cria 5 tarefas em < 2 min");
    expect(parseSuccessCriteriaFromForm(new FormData())).toBeNull();
  });

  it("gera brief para prompts", () => {
    const brief = successCriteriaBriefForPrompt({
      ...base,
      successCriteria: "Checkout em < 3 min",
    });
    expect(brief).toContain("Critérios de sucesso");
    expect(brief).toContain("ESTRATEGIA-QA.md");
    expect(successCriteriaBriefForPrompt(base)).toBe("");
  });

  it("resume para revisão", () => {
    const fd = new FormData();
    fd.set("successCriteria", "Login em < 30 s");
    expect(successCriteriaReviewFromForm(fd)).toBe("Login em < 30 s");
  });
});
