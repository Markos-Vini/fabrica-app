import { describe, expect, it } from "vitest";
import { agentsForDeliverable, agentsForPipeline } from "./plan";

const fullScope = {
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

const appOnlyScope = {
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("agentsForDeliverable", () => {
  it("roda PM, Arquiteto, QA e DevOps para documentação (A)", () => {
    expect(agentsForDeliverable("A")).toEqual({
      run: ["pm", "architect", "qa", "devops"],
      skip: ["backend", "frontend"],
    });
  });

  it("pula o PM em MVP sem documentação (B)", () => {
    expect(agentsForDeliverable("B")).toEqual({
      run: ["architect", "backend", "frontend", "qa", "devops"],
      skip: ["pm"],
    });
  });

  it("roda todos os agentes em MVP + docs (C)", () => {
    expect(agentsForDeliverable("C")).toEqual({
      run: ["pm", "architect", "backend", "frontend", "qa", "devops"],
      skip: [],
    });
  });

  it("roda todos os agentes em aplicação completa (D)", () => {
    expect(agentsForDeliverable("D")).toEqual({
      run: ["pm", "architect", "backend", "frontend", "qa", "devops"],
      skip: [],
    });
  });
});

describe("agentsForPipeline", () => {
  it("no modo planejamento pula back-end quando escopo é só app", () => {
    expect(agentsForPipeline("planning", "A", appOnlyScope)).toEqual({
      run: ["pm", "architect", "frontend", "qa", "devops"],
      skip: ["backend"],
    });
  });

  it("no modo planejamento respeita escopo completo", () => {
    expect(agentsForPipeline("planning", "A", fullScope)).toEqual({
      run: ["pm", "architect", "backend", "frontend", "qa", "devops"],
      skip: [],
    });
  });

  it("no modo software combina tipo de entrega com escopo", () => {
    expect(agentsForPipeline("software", "A", fullScope)).toEqual(
      agentsForDeliverable("A"),
    );
    expect(agentsForPipeline("software", "C", appOnlyScope)).toEqual({
      run: ["pm", "architect", "frontend", "qa", "devops"],
      skip: ["backend"],
    });
  });
});
