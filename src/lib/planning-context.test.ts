import { describe, expect, it } from "vitest";
import { formatPlanningContext } from "./planning-context";

describe("formatPlanningContext", () => {
  it("monta contexto com docs do planejamento", () => {
    const text = formatPlanningContext({
      "docs/PRD.md": "# PRD\n\nSync de tarefas",
      "docs/TAREFAS.md": "| T-001 | Setup |",
    });

    expect(text).toContain("Documentação aprovada");
    expect(text).toContain("### docs/PRD.md");
    expect(text).toContain("Sync de tarefas");
    expect(text).toContain("T-001");
  });
});
