import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "./theme";

describe("theme", () => {
  it("expõe chave de storage estável", () => {
    expect(THEME_STORAGE_KEY).toBe("fabrica-theme");
  });
});
