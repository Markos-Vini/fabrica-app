import { describe, expect, it } from "vitest";
import {
  formatBuildGateMessage,
  materializeLayer,
  runSoftwareBuildGate,
  type CommandRunner,
} from "./build-gate";
import type { OrderInput } from "@/lib/types";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const baseOrder: OrderInput = {
  name: "Demo",
  problem: "Teste",
  audience: "Dev",
  businessRules: "RN-01",
  deliverableType: "C",
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
  includeAdmin: true,
};

function mockRunner(
  fn: (
    command: string,
    args: string[],
  ) => { code: number; stdout?: string; stderr?: string },
): CommandRunner {
  return async (_cwd, command, args) => {
    const hit = fn(command, args);
    return {
      code: hit.code,
      stdout: hit.stdout ?? "",
      stderr: hit.stderr ?? "",
    };
  };
}

describe("materializeLayer", () => {
  it("grava arquivos com prefixo", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gate-"));
    try {
      await materializeLayer(
        {
          "frontend/package.json": '{"name":"x"}',
          "backend/main.ts": "x",
        },
        "frontend/",
        path.join(dir, "frontend"),
      );
      const pkg = await readFile(path.join(dir, "frontend/package.json"), "utf8");
      expect(pkg).toContain('"name"');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("runSoftwareBuildGate", () => {
  it("passa quando front e flutter ok", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "gate-"));
    try {
      const result = await runSoftwareBuildGate(
        baseOrder,
        {
          "frontend/package.json": '{"scripts":{"build":"next build"}}',
          "frontend/app/page.tsx": "export default function P(){return null}",
          "mobile/pubspec.yaml": "name: demo",
        },
        {
          workDir,
          runCommand: mockRunner((command, args) => {
            const line = `${command} ${args.join(" ")}`;
            if (line.includes("install")) return { code: 0 };
            if (line.includes("run build")) return { code: 0 };
            if (line.includes("flutter") && line.includes("version")) return { code: 0 };
            if (line.includes("pub get")) return { code: 0 };
            if (line.includes("analyze")) return { code: 0 };
            return { code: 0 };
          }),
        },
      );
      expect(result.ok).toBe(true);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  it("falha quando npm run build quebra", async () => {
    const workDir = await mkdtemp(path.join(tmpdir(), "gate-"));
    try {
      const result = await runSoftwareBuildGate(
        baseOrder,
        {
          "frontend/package.json": '{"scripts":{"build":"next build"}}',
        },
        {
          workDir,
          skipMobile: true,
          runCommand: mockRunner((command, args) => {
            const line = `${command} ${args.join(" ")}`;
            if (line.includes("install")) return { code: 0 };
            if (line.includes("run build")) {
              return { code: 1, stderr: "Type error in page.tsx" };
            }
            return { code: 0 };
          }),
        },
      );
      expect(result.ok).toBe(false);
      expect(formatBuildGateMessage(result)).toContain("Type error");
      expect(formatBuildGateMessage(result)).toContain("NÃO foi publicado");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });
});
