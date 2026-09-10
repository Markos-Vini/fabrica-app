import { describe, expect, it } from "vitest";
import { stackRulesForAgent } from "./index";
import type { OrderInput } from "@/lib/types";

const flutterOrder: OrderInput = {
  name: "App",
  problem: "p",
  audience: "a",
  businessRules: "r",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("stackRulesForAgent", () => {
  it("inclui regras Flutter para dev mobile", () => {
    const rules = stackRulesForAgent("frontend", flutterOrder);
    expect(rules).toContain("Flutter");
    expect(rules).toContain("main.dart");
  });

  it("inclui regras Nest quando há backend Node", () => {
    const rules = stackRulesForAgent(
      "backend",
      {
        ...flutterOrder,
        includeBackend: true,
        includeDatabase: true,
      },
    );
    expect(rules).toContain("NestJS");
    expect(rules).toContain("prisma");
  });

  it("inclui regras Next.js para frontend web", () => {
    const rules = stackRulesForAgent("frontend", {
      ...flutterOrder,
      includeMobile: false,
      includeFrontend: true,
    });
    expect(rules).toContain("Next.js");
    expect(rules).toContain("layout.tsx");
  });
});
