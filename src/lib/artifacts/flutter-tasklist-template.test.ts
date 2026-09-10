import { describe, expect, it } from "vitest";
import {
  flutterTasklistTemplate,
} from "./flutter-tasklist-template";
import { isTasklistOrder } from "./tasklist-order";
import type { OrderInput } from "@/lib/types";

const base: OrderInput = {
  name: "TaskList",
  problem: "Gerenciamento de tarefas",
  audience: "Todos",
  businessRules: "",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "Next.js",
  backendStack: "Node.js",
  databaseStack: "MySQL",
  generateTestBuild: true,
  scopePreset: "app-only",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: false,
  includeDatabase: false,
  includeAuth: false,
  includeAdmin: false,
};

describe("isTasklistOrder", () => {
  it("detecta pedidos de tarefas", () => {
    expect(isTasklistOrder(base)).toBe(true);
    expect(isTasklistOrder({ ...base, name: "Calcfacil", problem: "Calculadora simples" })).toBe(false);
  });
});

describe("flutterTasklistTemplate", () => {
  it("gera app Flutter com modo demo e tema do pedido", () => {
    const files = flutterTasklistTemplate(
      { ...base, name: "Minhas Tarefas", primaryColor: "#059669" },
      "tasklist",
    );
    expect(files["mobile/lib/app.dart"]).toContain("TaskListApp");
    expect(files["mobile/lib/core/demo/demo_store.dart"]).toContain("DemoStore");
    expect(files["mobile/lib/core/theme/app_theme.dart"]).toContain("0xFF059669");
    expect(files["mobile/lib/features/auth/login_screen.dart"]).toContain(
      "Minhas Tarefas",
    );
    expect(files["mobile/pubspec.yaml"]).toMatch(/^name: tasklist$/m);
  });
});
