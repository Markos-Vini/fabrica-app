import { describe, expect, it } from "vitest";
import { androidWorkflow, FLUTTER_CI_VERSION } from "./android-workflow";

describe("androidWorkflow", () => {
  it("gera workflow Flutter quando a stack é Flutter", () => {
    const yml = androidWorkflow("Flutter (Dart)");
    expect(yml).toContain("subosito/flutter-action");
    expect(yml).toContain(`flutter-version: "${FLUTTER_CI_VERSION}"`);
    expect(yml).toContain("flutter create . --platforms=android --no-pub");
    expect(yml).toContain("Scaffold Android");
    expect(yml).toContain("usesCleartextTraffic");
    expect(yml).toContain("Verify mobile entrypoint");
    expect(yml).toContain("working-directory: mobile\n      - name: Verify mobile entrypoint");
    expect(yml).toContain("MAIN_BACKUP");
    expect(yml).toContain("flutter build apk --debug");
  });

  it("gera workflow Expo prebuild para React Native", () => {
    const yml = androidWorkflow("React Native (TS/JS)");
    expect(yml).toContain("expo prebuild");
    expect(yml).toContain("gradlew");
    expect(yml.toLowerCase()).toContain("assembledebug");
    expect(yml).not.toContain("subosito/flutter-action");
  });

  it("documenta PWA quando não há APK nativo", () => {
    const yml = androidWorkflow("PWA/Web Mobile");
    expect(yml).toContain("PWA");
    expect(yml).not.toContain("flutter build apk");
  });
});
