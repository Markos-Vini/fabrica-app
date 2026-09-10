import { describe, expect, it } from "vitest";
import { agentsForPipeline } from "./plan";

const fullScope = {
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("agentsForPipeline — fromApprovedPlanning", () => {
  it("pula PM e Arquiteto em software gerado do planejamento", () => {
    expect(
      agentsForPipeline("software", "C", fullScope, {
        fromApprovedPlanning: true,
      }),
    ).toEqual({
      run: ["backend", "frontend", "qa", "devops"],
      skip: ["pm", "architect"],
    });
  });

  it("tipo B do planejamento pula PM (entrega) e Arquiteto (planejamento)", () => {
    expect(
      agentsForPipeline("software", "B", fullScope, {
        fromApprovedPlanning: true,
      }),
    ).toEqual({
      run: ["backend", "frontend", "qa", "devops"],
      skip: ["pm", "architect"],
    });
  });

  it("software avulso mantém PM e Arquiteto", () => {
    expect(agentsForPipeline("software", "C", fullScope)).toEqual({
      run: ["pm", "architect", "backend", "frontend", "qa", "devops"],
      skip: [],
    });
  });
});
