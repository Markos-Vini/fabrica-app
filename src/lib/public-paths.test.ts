import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("libera apenas login", () => {
    expect(isPublicPath("/login")).toBe(true);
  });

  it("protege API mock, APK e o restante da fábrica", () => {
    expect(isPublicPath("/api/mock/abc123")).toBe(false);
    expect(isPublicPath("/api/mock/abc123/items")).toBe(false);
    expect(isPublicPath("/api/orders/abc123/apk")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/configuracoes")).toBe(false);
    expect(isPublicPath("/api/orders/abc123")).toBe(false);
    expect(isPublicPath("/pedidos/novo")).toBe(false);
  });
});
