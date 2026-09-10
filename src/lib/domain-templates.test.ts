import { describe, expect, it } from "vitest";
import {
  domainTemplateBrief,
  getDomainTemplate,
  parseDomainTemplateId,
} from "./domain-templates";

describe("domain-templates", () => {
  it("resolve template tasklist com telas e MVP", () => {
    const t = getDomainTemplate("tasklist");
    expect(t.defaults.name).toBe("TaskList");
    expect(t.defaults.screens).toContain("home");
    expect(t.defaults.scopePreset).toBe("app-api");
    expect(t.defaults.nfrSync).toBe("on_demand");
    expect(t.defaults.entities).toContain("task");
    expect(t.defaults.entities).toContain("user");
    expect(t.defaults.successCriteria).toContain("5 tarefas");
  });

  it("calculadora usa escopo app-only", () => {
    const t = getDomainTemplate("calculator");
    expect(t.defaults.scopePreset).toBe("app-only");
    expect(t.defaults.screens).toEqual(["home", "settings"]);
    expect(t.defaults.integrations).toEqual([]);
  });

  it("e-commerce inclui integrações de pagamento", () => {
    const t = getDomainTemplate("ecommerce");
    expect(t.defaults.integrations).toContain("payment");
    expect(t.defaults.integrations).toContain("email");
  });

  it("parse e brief", () => {
    expect(parseDomainTemplateId("ecommerce")).toBe("ecommerce");
    expect(parseDomainTemplateId("x")).toBe("blank");
    expect(domainTemplateBrief("tasklist")).toContain("TaskList");
    expect(domainTemplateBrief("blank")).toBeNull();
  });
});
