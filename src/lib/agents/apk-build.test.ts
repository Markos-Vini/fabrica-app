import { describe, expect, it } from "vitest";
import { apkFilePath } from "./apk-build";

describe("apk-build helpers", () => {
  it("resolve caminho do APK por pedido", () => {
    expect(apkFilePath("abc123")).toMatch(/storage[\\/]orders[\\/]abc123[\\/]app-debug\.zip$/);
  });
});
