import { describe, expect, it } from "vitest";
import {
  apkDownloadPath,
  createResourceDownloadToken,
  verifyResourceDownloadToken,
} from "./download-token";

describe("download-token", () => {
  it("cria e valida token de APK", () => {
    const now = 1_700_000_000_000;
    const token = createResourceDownloadToken("order-1", "apk", "secret", { now });
    expect(verifyResourceDownloadToken(token, "order-1", "apk", "secret", { now })).toBe(
      true,
    );
    expect(
      verifyResourceDownloadToken(token, "order-2", "apk", "secret", { now }),
    ).toBe(false);
  });

  it("expira após o TTL", () => {
    const now = 1_700_000_000_000;
    const token = createResourceDownloadToken("order-1", "apk", "secret", {
      now,
      ttlMs: 1000,
    });
    expect(
      verifyResourceDownloadToken(token, "order-1", "apk", "secret", {
        now: now + 1001,
      }),
    ).toBe(false);
  });

  it("monta path com query assinada", () => {
    const token = createResourceDownloadToken("abc", "apk", "secret");
    expect(apkDownloadPath("abc", token)).toMatch(/^\/api\/orders\/abc\/apk\?t=/);
  });
});
