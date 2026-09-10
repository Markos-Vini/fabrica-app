import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("valida senha correta", () => {
    const stored = hashPassword("segredo-forte");
    expect(verifyPassword("segredo-forte", stored)).toBe(true);
  });

  it("rejeita senha errada", () => {
    const stored = hashPassword("segredo-forte");
    expect(verifyPassword("outra", stored)).toBe(false);
  });
});
