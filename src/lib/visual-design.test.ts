import { describe, expect, it } from "vitest";
import {
  derivePrimaryColorHex,
  flutterSeedColorLiteral,
  parsePrimaryColor,
  parseUiReference,
  parseUiStyle,
  previewThemeForStyle,
  visualBriefForPrompt,
} from "./visual-design";
import type { OrderInput } from "@/lib/types";

const base: OrderInput = {
  name: "TaskList",
  problem: "Tarefas",
  audience: "Todos",
  businessRules: "RN-01",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js",
  databaseStack: "MySQL",
  generateTestBuild: true,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("visual-design", () => {
  it("normaliza estilo e cor", () => {
    expect(parseUiStyle("corporate")).toBe("corporate");
    expect(parseUiStyle("invalid")).toBe("modern");
    expect(parsePrimaryColor("2563EB")).toBe("#2563EB");
    expect(parsePrimaryColor("bad")).toBeNull();
    expect(parseUiReference("  como Todoist  ")).toBe("como Todoist");
  });

  it("deriva cor estável a partir do nome", () => {
    const a = derivePrimaryColorHex(base);
    const b = derivePrimaryColorHex(base);
    expect(a).toBe(b);
    expect(flutterSeedColorLiteral(base)).toMatch(/^0xFF[0-9A-F]{6}$/);
  });

  it("inclui referência no brief quando informada", () => {
    const brief = visualBriefForPrompt({
      ...base,
      uiStyle: "modern",
      uiReference: "como Notion",
      primaryColor: "#059669",
    });
    expect(brief).toContain("Referência de UI");
    expect(brief).toContain("como Notion");
    expect(brief).toContain("#059669");
  });

  it("aplica cor primária na prévia do tema", () => {
    const theme = previewThemeForStyle("modern", "#059669");
    expect(theme.accent).toBe("#059669");
    expect(theme.accentSoft).not.toBe(theme.accent);
  });
});
