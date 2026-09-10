import { describe, expect, it } from "vitest";
import { ensureRunArtifacts } from "./ensure-run-artifacts";
import type { OrderInput } from "@/lib/types";

const baseOrder: OrderInput = {
  name: "Demo App",
  problem: "p",
  audience: "a",
  businessRules: "r",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js",
  databaseStack: "MySQL",
  generateTestBuild: true,
  scopePreset: "full",
  includeMobile: false,
  includeFrontend: true,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: true,
  includeAdmin: true,
};

describe("ensureRunArtifacts", () => {
  it("injeta env e guia para front-only", () => {
    const patch = ensureRunArtifacts(baseOrder, { "README.md": "# App" });
    expect(patch["frontend/.env.local.example"]).toContain("USE_MOCK_API");
    expect(patch["docs/COMO-RODAR.md"]).toContain("front-end");
    expect(patch["docs/DEMO-ACCOUNTS.md"]).toContain("Senha@123");
  });
});
