import type { OrderInput } from "@/lib/types";
import { generateMockProject } from "@/lib/artifacts/mock-factory";
import { flutterCalculatorTemplate } from "@/lib/artifacts/flutter-calculator-template";
import {
  flutterTasklistTemplate,
} from "@/lib/artifacts/flutter-tasklist-template";
import { isTasklistOrder } from "@/lib/artifacts/tasklist-order";
import { slugify } from "@/lib/artifacts/slug";

function scopeOf(order: OrderInput) {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

export function filterFilesByScope(
  order: OrderInput,
  files: Record<string, string>,
): Record<string, string> {
  const scope = scopeOf(order);
  return Object.fromEntries(
    Object.entries(files).filter(([filePath]) => {
      if (filePath.startsWith("frontend/") && !scope.includeFrontend) return false;
      if (filePath.startsWith("mobile/") && !scope.includeMobile) return false;
      if (filePath.startsWith("backend/") && !scope.includeBackend) return false;
      if (filePath.startsWith("mock/") && !scope.includeBackend) return false;
      if (filePath === "docker-compose.yml" && !scope.includeBackend) return false;
      return true;
    }),
  );
}

function mockMobileFallback(order: OrderInput): Record<string, string> {
  const mock = generateMockProject({
    ...order,
    deliverableType: "B",
    generateTestBuild: false,
  });
  return Object.fromEntries(
    Object.entries(mock).filter(([filePath]) => filePath.startsWith("mobile/")),
  );
}

export function ensureMobileDeliverable(
  order: OrderInput,
  files: Record<string, string>,
): Record<string, string> {
  if (!order.includeMobile) return files;

  const stack = order.mobileStack.toLowerCase();
  if (!stack.includes("flutter")) return files;

  const main = files["mobile/lib/main.dart"]?.trim() ?? "";
  const hasRealApp =
    main.length > 0 &&
    !main.includes("Hello World") &&
    !main.includes("PreviewApp") &&
    main.includes("runApp");

  const needsDemoApk =
    isTasklistOrder(order) &&
    !files["mobile/lib/core/demo/demo_store.dart"]?.trim();

  if (hasRealApp && !needsDemoApk) return files;

  const slug = slugify(order.name);
  const hay = `${order.name} ${order.problem}`.toLowerCase();
  const template =
    hay.includes("calc") || hay.includes("calcul")
      ? flutterCalculatorTemplate(order, slug)
      : isTasklistOrder(order)
        ? flutterTasklistTemplate(order, slug)
        : mockMobileFallback(order);

  const merged = { ...files };
  for (const [filePath, content] of Object.entries(template)) {
    merged[filePath] = content;
  }
  return merged;
}
