import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isMobilePlaceholder,
  loadReferencedJsonDumps,
  mergeRecoveredCode,
  recoverLegacyRootCodeFiles,
  recoverOrderWorkspaceFiles,
  stripPlanningPollution,
} from "./agent-disk-recovery";
import { orderWorkspaceDir } from "./order-workspace";
import type { OrderInput } from "@/lib/types";

const ORDER_ID = "test-isolation-order";

const educaflexOrder = {
  name: "EducaFlex",
  problem: "Treinamento",
  audience: "RH",
  businessRules: "RN-01",
  deliverableType: "B",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "MySQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: true,
} as OrderInput;

function writeWorkspaceFile(relativePath: string, content: string) {
  const abs = path.join(orderWorkspaceDir(ORDER_ID), relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

afterEach(() => {
  const dir = orderWorkspaceDir(ORDER_ID);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("agent-disk-recovery", () => {
  it("detecta main.dart placeholder", () => {
    expect(isMobilePlaceholder("class PreviewApp {}")).toBe(true);
    expect(
      isMobilePlaceholder("runApp(const ProviderScope(child: TaskListApp()))"),
    ).toBe(false);
  });

  it("substitui mobile placeholder por arquivos recuperados", () => {
    const out = mergeRecoveredCode(
      {
        "mobile/lib/main.dart": "class PreviewApp {}",
        "docs/PRD.md": "x",
      },
      {
        "mobile/lib/main.dart": "runApp(TaskListApp())",
        "mobile/lib/app.dart": "app",
      },
    );
    expect(out["mobile/lib/main.dart"]).toContain("TaskListApp");
    expect(out["mobile/lib/app.dart"]).toBe("app");
    expect(out["docs/PRD.md"]).toBe("x");
  });

  it("sobrescreve mobile existente no tree com versão recuperada do workspace", () => {
    const out = mergeRecoveredCode(
      {
        "mobile/lib/main.dart": "runApp(const ProviderScope(child: TaskListApp()))",
        "mobile/lib/models/task.dart": "copyWith({ String? title })",
      },
      {
        "mobile/lib/models/task.dart": "copyWith({ String? id, String? title })",
      },
    );
    expect(out["mobile/lib/models/task.dart"]).toContain("String? id");
  });
});

describe("recoverOrderWorkspaceFiles", () => {
  it("em planejamento só recupera docs e README do workspace do pedido", () => {
    writeWorkspaceFile("docs/PRD.md", "# PRD EducaFlex");
    writeWorkspaceFile("docs/ARQUITETURA.md", "# Arquitetura completa");
    writeWorkspaceFile("README.md", "# README");
    writeWorkspaceFile("mobile/lib/main.dart", "void main() {}");
    writeWorkspaceFile("backend/package.json", "{}");

    const recovered = recoverOrderWorkspaceFiles(ORDER_ID, "planning");

    expect(recovered["docs/PRD.md"]).toBe("# PRD EducaFlex");
    expect(recovered["docs/ARQUITETURA.md"]).toBe("# Arquitetura completa");
    expect(recovered["README.md"]).toBe("# README");
    expect(recovered["mobile/lib/main.dart"]).toBeUndefined();
    expect(recovered["backend/package.json"]).toBeUndefined();
  });

  it("inclui migration.sql do prisma no workspace de software", () => {
    writeWorkspaceFile(
      "backend/prisma/migrations/001_init/migration.sql",
      "CREATE TABLE users (id INT);",
    );

    const recovered = recoverOrderWorkspaceFiles(ORDER_ID, "software");
    expect(recovered["backend/prisma/migrations/001_init/migration.sql"]).toContain(
      "CREATE TABLE",
    );
  });

  it("stripPlanningPollution remove código e output.md", () => {
    const cleaned = stripPlanningPollution({
      "docs/PRD.md": "# ok",
      "mobile/lib/main.dart": "bad",
      "backend/package.json": "bad",
      "output.md": "Os arquivos foram gravados...",
    });
    expect(Object.keys(cleaned)).toEqual(["docs/PRD.md"]);
  });
});

describe("loadReferencedJsonDumps", () => {
  it("carrega JSON referenciado na saída prose do agente", () => {
    const dumpPath = path.join(process.cwd(), "agent-output-test.json");
    writeFileSync(
      dumpPath,
      JSON.stringify({
        files: {
          "backend/prisma/schema.prisma": "model User {}",
          "backend/package.json": '{"name":"educaflex-api"}',
        },
      }),
      "utf8",
    );

    const raw =
      "O JSON completo está em `agent-output-test.json`. Use o arquivo.";
    const files = loadReferencedJsonDumps(raw, [process.cwd()]);

    expect(files["backend/prisma/schema.prisma"]).toContain("model User");
    expect(files["backend/package.json"]).toContain("educaflex-api");

    rmSync(dumpPath, { force: true });
  });
});

describe("recoverLegacyRootCodeFiles", () => {
  it("recupera backend/frontend da raiz quando pertencem ao pedido", () => {
    const legacy = recoverLegacyRootCodeFiles(educaflexOrder);
    expect(legacy["backend/prisma/schema.prisma"]?.length ?? 0).toBeGreaterThan(
      100,
    );
    expect(legacy["frontend/package.json"]?.length ?? 0).toBeGreaterThan(10);
    expect(legacy["frontend/app/page.tsx"]?.length ?? 0).toBeGreaterThan(10);
  });
});
