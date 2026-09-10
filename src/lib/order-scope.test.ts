import { describe, expect, it } from "vitest";
import {
  agentsSkippedByScope,
  parseScopeFromForm,
  scopeFromPreset,
} from "./order-scope";

describe("order-scope", () => {
  it("app-only não inclui back-end nem front web", () => {
    const scope = scopeFromPreset("app-only");
    expect(scope.includeMobile).toBe(true);
    expect(scope.includeBackend).toBe(false);
    expect(scope.includeFrontend).toBe(false);
    expect(agentsSkippedByScope(scope)).toContain("backend");
  });

  it("parseia escopo personalizado do formulário", () => {
    const fd = new FormData();
    fd.set("scopePreset", "custom");
    fd.set("includeMobile", "on");
    const scope = parseScopeFromForm(fd);
    expect(scope.includeMobile).toBe(true);
    expect(scope.includeBackend).toBe(false);
  });
});
