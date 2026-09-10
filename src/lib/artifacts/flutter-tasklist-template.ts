import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { OrderInput } from "@/lib/types";
import {
  flutterSeedColorLiteral,
  withVisualDefaults,
} from "@/lib/visual-design";

const TEMPLATE_ROOT = path.join(
  process.cwd(),
  "src/lib/artifacts/templates/flutter-tasklist",
);

function walk(dir: string, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const abs = path.join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(abs).isDirectory()) {
      Object.assign(out, walk(abs, rel));
    } else {
      out[`mobile/${rel.replace(/\\/g, "/")}`] = readFileSync(abs, "utf8");
    }
  }
  return out;
}

export function flutterTasklistTemplate(
  order: OrderInput,
  slug: string,
): Record<string, string> {
  const normalized = withVisualDefaults(order);
  const files = walk(TEMPLATE_ROOT);
  if (Object.keys(files).length === 0) return {};

  const pkg = slug.replace(/-/g, "_");
  const appTitle = normalized.name.replace(/'/g, "\\'");
  const seedLiteral = flutterSeedColorLiteral(normalized);

  if (files["mobile/pubspec.yaml"]) {
    files["mobile/pubspec.yaml"] = files["mobile/pubspec.yaml"]
      .replace(/^name: .+$/m, `name: ${pkg}`)
      .replace(
        /^description: .+$/m,
        `description: ${order.name} — gerenciamento de tarefas (Fábrica de Software).`,
      );
  }

  for (const [filePath, content] of Object.entries(files)) {
    let next = content
      .replace(/0xFF2563EB/g, seedLiteral)
      .replace(/Color\(0xFF2563EB\)/g, `Color(${seedLiteral})`);

    if (filePath.endsWith("app.dart") || filePath.includes("login_screen.dart")) {
      next = next.replace(/APP_DISPLAY_NAME/g, appTitle);
    }

    files[filePath] = next;
  }

  return files;
}

export { isTasklistOrder } from "./tasklist-order";
