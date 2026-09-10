import { describe, expect, it } from "vitest";
import {
  checkPassword,
  createSessionToken,
  parseSessionUserId,
  SESSION_MAX_AGE_MS,
  verifySessionToken,
} from "./auth";

describe("checkPassword", () => {
  it("aceita a senha correta com comparação constante", () => {
    expect(checkPassword("segredo", "segredo")).toBe(true);
  });

  it("rejeita senha errada e entrada vazia", () => {
    expect(checkPassword("outra", "segredo")).toBe(false);
    expect(checkPassword("", "segredo")).toBe(false);
  });
});

describe("session token", () => {
  it("emite um token verificável com userId", () => {
    const token = createSessionToken("chave-sessao", "abc123");
    expect(verifySessionToken(token, "chave-sessao")).toBe(true);
    expect(parseSessionUserId(token, "chave-sessao")).toBe("abc123");
  });

  it("rejeita token adulterado ou segredo diferente", () => {
    const token = createSessionToken("chave-sessao", "abc123");
    expect(verifySessionToken(token + "x", "chave-sessao")).toBe(false);
    expect(verifySessionToken(token, "outra-chave")).toBe(false);
    expect(parseSessionUserId(token, "outra-chave")).toBeNull();
    expect(parseSessionUserId("", "chave-sessao")).toBeNull();
  });

  it("expira sessão após 12 horas", () => {
    const token = createSessionToken("chave-sessao", "abc123");
    const payload = token.slice(0, token.lastIndexOf("."));
    const issuedAt = Number(payload.split(".")[1]);
    expect(parseSessionUserId(token, "chave-sessao", issuedAt + SESSION_MAX_AGE_MS)).toBe(
      "abc123",
    );
    expect(
      parseSessionUserId(token, "chave-sessao", issuedAt + SESSION_MAX_AGE_MS + 1),
    ).toBeNull();
  });
});
