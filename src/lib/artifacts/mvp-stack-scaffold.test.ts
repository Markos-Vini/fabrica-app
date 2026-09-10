import { describe, expect, it } from "vitest";
import { ensureMvpStackArtifacts } from "./ensure-mvp-artifacts";
import {
  isFullStackMvp,
  mvpRunGuideMarkdown,
  setupDevPs1,
} from "./mvp-stack-scaffold";
import type { OrderInput } from "@/lib/types";

const fullStackOrder: OrderInput = {
  name: "EducaFlex",
  problem: "Treinamento corporativo",
  audience: "Empresas",
  businessRules: "Trilha sequencial",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "MySQL",
  generateTestBuild: false,
  scopePreset: "full",
  uiStyle: "corporate",
  primaryColor: "#800000",
  uiReference: "",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
};

describe("mvp-stack-scaffold", () => {
  it("detecta full-stack MVP", () => {
    expect(isFullStackMvp(fullStackOrder)).toBe(true);
    expect(
      isFullStackMvp({ ...fullStackOrder, includeFrontend: false, includeMobile: false }),
    ).toBe(false);
  });

  it("gera guia com Docker, API, web e mobile", () => {
    const md = mvpRunGuideMarkdown(fullStackOrder);
    expect(md).toContain("setup-dev.ps1");
    expect(md).toContain("docker compose");
    expect(md).toContain("10.0.2.2");
    expect(md).toContain("run-dev.ps1");
    expect(md).toContain("PUBLIC_BASE_URL");
  });

  it("setup-dev.ps1 referencia mysql e backend", () => {
    const ps1 = setupDevPs1(fullStackOrder);
    expect(ps1).toContain("docker compose up -d mysql");
    expect(ps1).toContain("npm run db:setup");
  });
});

describe("ensureMvpStackArtifacts", () => {
  it("injeta scripts e guia no pacote", () => {
    const patch = ensureMvpStackArtifacts(fullStackOrder, {
      "README.md": "# App\n",
    });
    expect(patch["docs/COMO-RODAR-MVP.md"]).toBeTruthy();
    expect(patch["scripts/setup-dev.ps1"]).toBeTruthy();
    expect(patch["scripts/setup-dev.sh"]).toBeTruthy();
    expect(patch["docker-compose.yml"]).toContain("healthcheck");
    expect(patch["mobile/run-dev.ps1"]).toBeTruthy();
    expect(patch["README.md"]).toContain("Como rodar o MVP");
  });

  it("nao altera pedidos sem full-stack", () => {
    const patch = ensureMvpStackArtifacts(
      { ...fullStackOrder, includeBackend: false },
      {},
    );
    expect(Object.keys(patch)).toHaveLength(0);
  });
});
