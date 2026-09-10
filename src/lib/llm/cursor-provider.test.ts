import { describe, expect, it } from "vitest";
import {
  cursorModelId,
  isCursorModel,
  messagesToPrompt,
} from "./cursor-provider";

describe("cursor-provider helpers", () => {
  it("detecta modelos Cursor", () => {
    expect(isCursorModel("composer-2.5")).toBe(true);
    expect(isCursorModel("cursor-auto")).toBe(true);
    expect(isCursorModel("gpt-4o")).toBe(false);
  });

  it("mapeia cursor-auto para auto", () => {
    expect(cursorModelId("cursor-auto")).toBe("auto");
    expect(cursorModelId("composer-2.5")).toBe("composer-2.5");
    expect(cursorModelId("composer-2.5-fast")).toBe("composer-2.5");
  });

  it("monta prompt com system e user", () => {
    const text = messagesToPrompt([
      { role: "system", content: "Você é PM" },
      { role: "user", content: "Gere PRD" },
    ]);
    expect(text).toContain("Você é PM");
    expect(text).toContain("[USER]");
    expect(text).toContain("Gere PRD");
  });
});
