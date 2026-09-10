import { describe, expect, it } from "vitest";
import { USER_GUIDE_SECTIONS, getGuideSection } from "./sections";

describe("user-guide sections", () => {
  it("tem seções únicas com conteúdo", () => {
    const ids = USER_GUIDE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of USER_GUIDE_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it("resolve seção por id", () => {
    expect(getGuideSection("visao-geral")?.title).toBe("Visão geral");
    expect(getGuideSection("inexistente")).toBeUndefined();
  });
});
