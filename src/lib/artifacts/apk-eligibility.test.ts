import { describe, expect, it } from "vitest";
import { initialApkStatus, supportsNativeApk } from "./apk-eligibility";

describe("supportsNativeApk", () => {
  it("aceita Flutter e React Native", () => {
    expect(supportsNativeApk("Flutter (Dart)")).toBe(true);
    expect(supportsNativeApk("React Native (TS/JS)")).toBe(true);
  });

  it("rejeita PWA puro", () => {
    expect(supportsNativeApk("PWA/Web Mobile")).toBe(false);
  });
});

describe("initialApkStatus", () => {
  it("fica idle quando build de teste e stack nativa", () => {
    expect(
      initialApkStatus({
        generateTestBuild: true,
        mobileStack: "Flutter (Dart)",
      }),
    ).toBe("idle");
  });

  it("pula quando não pediu build de teste", () => {
    expect(
      initialApkStatus({
        generateTestBuild: false,
        mobileStack: "Flutter (Dart)",
      }),
    ).toBe("skipped");
  });
});
