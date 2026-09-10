import { describe, expect, it } from "vitest";
import {
  ensureMobileDeliverable,
  filterFilesByScope,
} from "./scope-files";
import type { OrderInput } from "@/lib/types";

const appOnlyCalc: OrderInput = {
  name: "Calcfacil",
  problem: "Calculadora simples",
  audience: "Todos",
  businessRules: "4 operações",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("filterFilesByScope", () => {
  it("remove frontend quando escopo é só mobile", () => {
    const filtered = filterFilesByScope(appOnlyCalc, {
      "frontend/app/page.tsx": "x",
      "mobile/pubspec.yaml": "y",
    });
    expect(filtered["frontend/app/page.tsx"]).toBeUndefined();
    expect(filtered["mobile/pubspec.yaml"]).toBe("y");
  });
});

describe("ensureMobileDeliverable", () => {
  it("injeta template Flutter quando só pubspec existe", () => {
    const out = ensureMobileDeliverable(appOnlyCalc, {
      "mobile/pubspec.yaml": "name: calcfacil",
    });
    expect(out["mobile/lib/main.dart"]).toContain("runApp");
    expect(out["mobile/lib/core/calculator/calculator_engine.dart"]).toBeTruthy();
  });

  it("injeta template TaskList para pedidos de tarefas", () => {
    const out = ensureMobileDeliverable(
      {
        ...appOnlyCalc,
        name: "TaskList",
        problem: "Gerenciamento de tarefas sincronizado",
      },
      { "mobile/pubspec.yaml": "name: tasklist" },
    );
    expect(out["mobile/lib/main.dart"]).toContain("TaskListApp");
    expect(out["mobile/lib/features/tasks/home_screen.dart"]).toBeTruthy();
    expect(out["mobile/lib/core/demo/demo_store.dart"]).toBeTruthy();
  });

  it("substitui PreviewApp placeholder pelo template TaskList", () => {
    const out = ensureMobileDeliverable(
      {
        ...appOnlyCalc,
        name: "TaskList",
        problem: "Tarefas",
      },
      {
        "mobile/lib/main.dart": "class PreviewApp extends StatelessWidget {}",
      },
    );
    expect(out["mobile/lib/main.dart"]).toContain("TaskListApp");
    expect(out["mobile/lib/main.dart"]).not.toContain("PreviewApp");
  });
});
