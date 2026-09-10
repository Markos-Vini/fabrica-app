import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { OrderInput } from "@/lib/types";

const TEMPLATE_ROOT = path.join(
  process.cwd(),
  "src/lib/artifacts/templates/flutter-calculator",
);

function walk(dir: string, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir)) {
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

export function flutterCalculatorTemplate(
  order: OrderInput,
  slug: string,
): Record<string, string> {
  const files = walk(TEMPLATE_ROOT);
  if (Object.keys(files).length === 0) return {};

  const pkg = slug.replace(/-/g, "_");
  if (files["mobile/pubspec.yaml"]) {
    files["mobile/pubspec.yaml"] = files["mobile/pubspec.yaml"]
      .replace(/^name: .+$/m, `name: ${pkg}`)
      .replace(
        /^description: .+$/m,
        `description: ${order.name} — calculadora gerada pela Fábrica de Software.`,
      );
  }
  return files;
}
