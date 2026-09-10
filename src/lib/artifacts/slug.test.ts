import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("gera um slug ASCII a partir do nome do app", () => {
    expect(slugify("Café Delivery!")).toBe("cafe-delivery");
  });

  it("usa fallback quando o nome é vazio", () => {
    expect(slugify("   ")).toBe("app");
  });
});
