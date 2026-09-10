import { describe, expect, it } from "vitest";
import { agentDisplayForScope } from "./catalog";

describe("agentDisplayForScope", () => {
  it("mostra Dev Mobile no escopo app-only", () => {
    const display = agentDisplayForScope(
      "frontend",
      { includeMobile: true, includeFrontend: false },
      { mobileStack: "Flutter (Dart)" },
    );
    expect(display.name).toBe("Dev Mobile");
    expect(display.role).toContain("Flutter");
  });

  it("mostra Dev Front-end no escopo web", () => {
    const display = agentDisplayForScope(
      "frontend",
      { includeMobile: false, includeFrontend: true },
      { frontendStack: "Next.js" },
    );
    expect(display.name).toBe("Dev Front-end");
  });
});
