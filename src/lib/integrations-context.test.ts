import { describe, expect, it } from "vitest";
import {
  integrationsBriefForPrompt,
  integrationsReviewFromForm,
  parseIntegrationsFromForm,
} from "./integrations-context";
import type { OrderInput } from "@/lib/types";

const base: OrderInput = {
  name: "Loja",
  problem: "Vendas",
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
  includeAdmin: true,
};

describe("integrations-context", () => {
  it("monta integrações a partir do formulário", () => {
    const fd = new FormData();
    fd.set("integration_payment", "on");
    fd.set("integration_email", "on");
    fd.set("integration_sso_google", "on");
    fd.set("integrationsCustom", "WhatsApp API");
    expect(parseIntegrationsFromForm(fd)).toBe(
      "SSO Google, E-mail transacional, Pagamento, WhatsApp API",
    );
  });

  it("retorna null quando nada marcado", () => {
    expect(parseIntegrationsFromForm(new FormData())).toBeNull();
  });

  it("gera brief para prompts", () => {
    const brief = integrationsBriefForPrompt({
      ...base,
      externalIntegrations: "Pagamento, E-mail transacional",
    });
    expect(brief).toContain("Integrações externas");
    expect(brief).toContain("secrets");
    expect(integrationsBriefForPrompt(base)).toBe("");
  });

  it("resume para revisão", () => {
    const fd = new FormData();
    fd.set("integration_maps", "on");
    expect(integrationsReviewFromForm(fd)).toBe("Mapas / geolocalização");
  });
});
