import { describe, expect, it } from "vitest";
import {
  APK_WORKFLOW_PATH,
  ensureApkWorkflowFiles,
} from "./apk-workflow-files";
import type { OrderInput } from "@/lib/types";

const mobileOrder: OrderInput = {
  name: "TaskList",
  problem: "App de tarefas",
  audience: "Usuários",
  businessRules: "RN-01",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: true,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: false,
};

describe("ensureApkWorkflowFiles", () => {
  it("injeta workflow quando APK está habilitado", () => {
    const out = ensureApkWorkflowFiles(mobileOrder, { "mobile/lib/main.dart": "x" });
    expect(out[APK_WORKFLOW_PATH]).toContain("flutter build apk --debug");
  });

  it("não injeta quando generateTestBuild está desligado", () => {
    const out = ensureApkWorkflowFiles(
      { ...mobileOrder, generateTestBuild: false },
      {},
    );
    expect(out[APK_WORKFLOW_PATH]).toBeUndefined();
  });

  it("substitui workflow antigo (ex.: com push) pelo template atual", () => {
    const outdated = `name: old
on:
  push:
    branches: [main]
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/upload-artifact@v4`;
    const out = ensureApkWorkflowFiles(mobileOrder, {
      [APK_WORKFLOW_PATH]: outdated,
    });
    expect(out[APK_WORKFLOW_PATH]).toContain("workflow_dispatch:");
    expect(out[APK_WORKFLOW_PATH]).not.toContain("push:");
    expect(out[APK_WORKFLOW_PATH]).toContain("DEMO_MODE=true");
  });
});
