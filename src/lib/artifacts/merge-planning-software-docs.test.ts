import { describe, expect, it } from "vitest";
import {
  mergePlanningDocsForSoftware,
  planningDocKeysForScope,
} from "./merge-planning-software-docs";

describe("mergePlanningDocsForSoftware", () => {
  it("copia docs do planejamento e preserva QA gerado na esteira", () => {
    const planning = {
      "docs/PRD.md": "# PRD planejamento",
      "docs/ARQUITETURA.md": "# Arquitetura planejamento",
      "docs/QA.md": "# QA planejamento",
    };
    const software = {
      "docs/QA.md": "# QA pós-implementação",
      "backend/package.json": "{}",
    };

    const merged = mergePlanningDocsForSoftware(planning, software, "C");

    expect(merged["docs/PRD.md"]).toBe("# PRD planejamento");
    expect(merged["docs/ARQUITETURA.md"]).toBe("# Arquitetura planejamento");
    expect(merged["docs/QA.md"]).toBe("# QA pós-implementação");
    expect(merged["backend/package.json"]).toBe("{}");
  });

  it("ignora docs de backend quando o escopo é só app", () => {
    const planning = {
      "docs/PRD.md": "# PRD",
      "docs/MODELO-DADOS.md": "# Modelo",
      "docs/PLANO-BACKEND.md": "# Backend",
      "docs/PLANO-FRONTEND-MOBILE.md": "# Cliente",
    };
    const software = { "mobile/pubspec.yaml": "name: app" };
    const appOnlyScope = {
      includeMobile: true,
      includeFrontend: false,
      includeBackend: false,
      includeDatabase: false,
      includeAuth: false,
      includeAdmin: false,
    };

    const merged = mergePlanningDocsForSoftware(
      planning,
      software,
      "B",
      appOnlyScope,
    );

    expect(merged["docs/PRD.md"]).toBe("# PRD");
    expect(merged["docs/PLANO-FRONTEND-MOBILE.md"]).toBe("# Cliente");
    expect(merged["docs/MODELO-DADOS.md"]).toBeUndefined();
    expect(merged["docs/PLANO-BACKEND.md"]).toBeUndefined();
  });
});

describe("planningDocKeysForScope", () => {
  it("omite plano de backend sem API", () => {
    const keys = planningDocKeysForScope({
      includeMobile: true,
      includeFrontend: false,
      includeBackend: false,
      includeDatabase: false,
      includeAuth: false,
      includeAdmin: false,
    });
    expect(keys).not.toContain("docs/PLANO-BACKEND.md");
    expect(keys).toContain("docs/PRD.md");
  });
});
