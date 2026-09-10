import { describe, expect, it } from "vitest";
import {
  dataModelBriefForPrompt,
  dataModelReviewFromForm,
  parseEntityRelationsFromForm,
  parseMainEntitiesFromForm,
} from "./data-model-context";
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

describe("data-model-context", () => {
  it("monta entidades a partir do formulário", () => {
    const fd = new FormData();
    fd.set("entity_user", "on");
    fd.set("entity_task", "on");
    fd.set("entity_category", "on");
    fd.set("entitiesCustom", "Tag");
    fd.set(
      "entityRelations",
      "Usuário 1:N Tarefa\nTarefa N:1 Categoria",
    );
    expect(parseMainEntitiesFromForm(fd)).toBe(
      "Usuário, Tarefa / Item, Categoria, Tag",
    );
    expect(parseEntityRelationsFromForm(fd)).toContain("Usuário 1:N Tarefa");
  });

  it("retorna null quando nada marcado", () => {
    expect(parseMainEntitiesFromForm(new FormData())).toBeNull();
  });

  it("gera brief para prompts", () => {
    const brief = dataModelBriefForPrompt({
      ...base,
      mainEntities: "Usuário, Tarefa / Item, Categoria",
      entityRelations: "Usuário 1:N Tarefa",
    });
    expect(brief).toContain("Entidades principais");
    expect(brief).toContain("MODELO-DADOS.md");
    expect(dataModelBriefForPrompt(base)).toBe("");
  });

  it("resume para revisão", () => {
    const fd = new FormData();
    fd.set("entity_product", "on");
    fd.set("entity_order", "on");
    fd.set("entityRelations", "Pedido N:N Produto");
    expect(dataModelReviewFromForm(fd)).toContain("Produto");
    expect(dataModelReviewFromForm(fd)).toContain("Relações:");
  });
});
