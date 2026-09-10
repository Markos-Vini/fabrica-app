import { describe, expect, it } from "vitest";
import {
  parseOptionalText,
  parseScreensFromForm,
  parseUserRolesFromForm,
  productBriefForPrompt,
} from "./product-context";
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
  databaseStack: "MySQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: false,
};

describe("product-context", () => {
  it("monta papéis a partir do formulário", () => {
    const fd = new FormData();
    fd.set("userRole_end_user", "on");
    fd.set("userRole_admin", "on");
    fd.set("userRolesCustom", "Supervisor");
    expect(parseUserRolesFromForm(fd)).toBe(
      "Usuário final, Administrador, Supervisor",
    );
  });

  it("monta telas a partir do formulário", () => {
    const fd = new FormData();
    fd.set("screen_login", "on");
    fd.set("screen_home", "on");
    fd.set("screen_dashboard", "on");
    fd.set("screensCustom", "Checkout");
    expect(parseScreensFromForm(fd)).toBe(
      "Login, Home / lista principal, Dashboard web, Checkout",
    );
  });

  it("inclui MVP e fluxos no brief", () => {
    const brief = productBriefForPrompt({
      ...base,
      mvpEssentials: "CRUD de tarefas\nLogin",
      mvpLater: "Gráficos web",
      userRoles: "Usuário final",
      mainFlows: "Login → Criar tarefa → Concluir",
      expectedScreens: "Login, Home / lista principal, Detalhe do item",
    });
    expect(brief).toContain("Essencial no MVP");
    expect(brief).toContain("Gráficos web");
    expect(brief).toContain("Fluxos principais");
    expect(brief).toContain("Telas / páginas esperadas");
    expect(parseOptionalText("  ok  ")).toBe("ok");
  });

  it("retorna vazio quando não há contexto de produto", () => {
    expect(productBriefForPrompt(base)).toBe("");
  });
});
