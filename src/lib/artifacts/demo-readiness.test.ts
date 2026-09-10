import { describe, expect, it } from "vitest";
import { validateDemoReadiness } from "./demo-readiness";
import type { OrderInput } from "@/lib/types";

const order: OrderInput = {
  name: "X",
  problem: "p",
  audience: "a",
  businessRules: "r",
  deliverableType: "C",
  mobileStack: "Flutter",
  frontendStack: "Next.js",
  backendStack: "Node",
  databaseStack: "MySQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: false,
  includeFrontend: true,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: true,
  includeAdmin: false,
};

describe("validateDemoReadiness", () => {
  it("passa quando mock e credenciais existem", () => {
    const gaps = validateDemoReadiness(order, {
      "docs/DEMO-ACCOUNTS.md": "gestor@demo.local / Senha@123",
      "frontend/src/lib/api.ts": "USE_MOCK_API",
    });
    expect(gaps).toHaveLength(0);
  });

  it("falha quando falta mock no front", () => {
    const gaps = validateDemoReadiness(order, {
      "docs/DEMO-ACCOUNTS.md": "gestor@demo.local / Senha@123",
      "frontend/package.json": "{}",
    });
    expect(gaps.some((g) => g.path === "frontend/")).toBe(true);
  });
});
