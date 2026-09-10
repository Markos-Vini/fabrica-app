import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

describe("encryptSecret / decryptSecret", () => {
  it("recupera o texto original após cifrar", () => {
    const key = "chave-de-cifragem-com-tamanho-ok";
    const cipher = encryptSecret("sk-live-abc", key);
    expect(cipher).not.toContain("sk-live-abc");
    expect(decryptSecret(cipher, key)).toBe("sk-live-abc");
  });

  it("falha com chave errada", () => {
    const cipher = encryptSecret("sk-live-abc", "chave-certa-com-tamanho-ok!!");
    expect(() => decryptSecret(cipher, "chave-errada-com-tamanho-ok!")).toThrow();
  });
});

describe("maskSecret", () => {
  it("mostra só os 4 últimos caracteres", () => {
    expect(maskSecret("sk-abcdefghijklmnopqrstuvwxyz")).toBe("••••wxyz");
  });

  it("mascara por completo valores curtos", () => {
    expect(maskSecret("ab")).toBe("••••");
  });
});
