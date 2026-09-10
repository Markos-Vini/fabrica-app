import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { OrderInput } from "@/lib/types";
import { orderWorkspaceDir } from "./order-workspace";
import { slugify } from "./slug";

export type WorkspaceRecoveryMode = "planning" | "software";

const CODE_PREFIXES = ["mobile/", "backend/", "frontend/", "mock/"] as const;

const PLANNING_ALLOWED_PREFIXES = [
  "docs/",
  "tests/",
  ".github/",
] as const;

const TEXT_FILE =
  /\.(dart|yaml|yml|json|md|ts|tsx|js|mjs|mts|css|sql|prisma|env\.example)$/i;

function defaultSkipDir(name: string): boolean {
  return (
    name.startsWith(".") ||
    name === "node_modules" ||
    name === "build" ||
    name === ".dart_tool" ||
    name === "dist" ||
    name === "coverage" ||
    name === ".next"
  );
}

function walkTextFiles(
  rootDir: string,
  prefix: string,
  skipDir = defaultSkipDir,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(rootDir)) return out;

  for (const entry of readdirSync(rootDir)) {
    if (skipDir(entry)) continue;
    const abs = path.join(rootDir, entry);
    const rel = `${prefix}/${entry}`.replace(/\\/g, "/");
    if (statSync(abs).isDirectory()) {
      Object.assign(out, walkTextFiles(abs, rel, skipDir));
    } else if (TEXT_FILE.test(entry)) {
      out[rel] = readFileSync(abs, "utf8");
    }
  }
  return out;
}

function isAllowedPlanningPath(filePath: string): boolean {
  if (filePath === "README.md") return true;
  return PLANNING_ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isSoftwarePath(filePath: string): boolean {
  if (
    filePath === "README.md" ||
    filePath === "docker-compose.yml" ||
    filePath === ".env.example" ||
    filePath === "output.md"
  ) {
    return true;
  }
  if (CODE_PREFIXES.some((prefix) => filePath.startsWith(prefix))) return true;
  if (filePath.startsWith("docs/")) return true;
  if (filePath.startsWith("tests/")) return true;
  if (filePath.startsWith(".github/")) return true;
  return false;
}

/** Lê dumps JSON referenciados na saída prose do agente (ex.: educaflex-backend-output.json). */
export function loadReferencedJsonDumps(
  raw: string,
  searchRoots: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const tried = new Set<string>();

  const tryLoad = (filePath: string) => {
    const normalized = path.normalize(filePath);
    if (tried.has(normalized) || !existsSync(normalized)) return;
    tried.add(normalized);
    Object.assign(out, loadJsonFilesDump(normalized));
  };

  for (const match of raw.matchAll(/[`'"]([^`'"]+\.json)[`']/g)) {
    const ref = match[1].replace(/\\/g, "/");
    if (path.isAbsolute(ref)) {
      tryLoad(ref);
    }
    const basename = path.basename(ref);
    for (const root of searchRoots) {
      tryLoad(path.join(root, basename));
    }
    tryLoad(path.join(process.cwd(), basename));
  }

  return out;
}

/**
 * Agentes legados gravaram backend/frontend/mobile na raiz da fábrica
 * em vez do workspace isolado do pedido.
 */
export function recoverLegacyRootCodeFiles(
  order: OrderInput,
): Record<string, string> {
  const slug = slugify(order.name).toLowerCase();
  const marker = order.name.trim().toLowerCase();
  if (!slug && !marker) return {};

  const out: Record<string, string> = {};
  const root = process.cwd();

  for (const folder of ["backend", "frontend", "mobile"] as const) {
    const folderPath = path.join(root, folder);
    if (!existsSync(folderPath)) continue;

    const markerFiles = [
      path.join(folderPath, "package.json"),
      path.join(folderPath, "pubspec.yaml"),
      path.join(folderPath, "README.md"),
    ];
    let belongs = false;
    for (const markerFile of markerFiles) {
      if (!existsSync(markerFile)) continue;
      const text = readFileSync(markerFile, "utf8").toLowerCase();
      if (text.includes(slug) || (marker && text.includes(marker))) {
        belongs = true;
        break;
      }
    }
    if (!belongs) continue;

    Object.assign(out, walkTextFiles(folderPath, folder));
  }

  return Object.fromEntries(
    Object.entries(out).filter(([filePath]) => isSoftwarePath(filePath)),
  );
}

/** Reúne código do workspace, dumps JSON e pastas legadas na raiz. */
export function recoverAllSoftwareFiles(
  orderId: string,
  order: OrderInput,
  agentOutputs: string[] = [],
): Record<string, string> {
  const merged: Record<string, string> = {};
  const roots = [orderWorkspaceDir(orderId), process.cwd()];

  Object.assign(merged, recoverOrderWorkspaceFiles(orderId, "software"));

  for (const raw of agentOutputs) {
    Object.assign(merged, loadReferencedJsonDumps(raw, roots));
  }

  Object.assign(merged, recoverLegacyRootCodeFiles(order));

  return merged;
}

/** Lê dump JSON gerado pelo agente (workspace ou raiz). */
export function loadJsonFilesDump(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      files?: Record<string, string>;
    };
    if (!parsed.files || typeof parsed.files !== "object") return {};
    return parsed.files;
  } catch {
    return {};
  }
}

/**
 * Recupera arquivos escritos pelo agente **somente** no workspace isolado do pedido.
 * Nunca lê mobile/, backend/ ou docs/ da raiz da fábrica.
 */
export function recoverOrderWorkspaceFiles(
  orderId: string,
  mode: WorkspaceRecoveryMode,
): Record<string, string> {
  const cwd = orderWorkspaceDir(orderId);
  const out: Record<string, string> = {};

  Object.assign(out, loadJsonFilesDump(path.join(cwd, "mobile-output.json")));
  Object.assign(out, loadJsonFilesDump(path.join(cwd, "frontend-output.json")));

  if (mode === "planning") {
    Object.assign(out, walkTextFiles(path.join(cwd, "docs"), "docs"));
    const readme = path.join(cwd, "README.md");
    if (existsSync(readme)) {
      out["README.md"] = readFileSync(readme, "utf8");
    }
    Object.assign(out, walkTextFiles(path.join(cwd, "tests"), "tests"));
    return Object.fromEntries(
      Object.entries(out).filter(([filePath]) => isAllowedPlanningPath(filePath)),
    );
  }

  for (const prefix of CODE_PREFIXES) {
    const folder = prefix.slice(0, -1);
    Object.assign(out, walkTextFiles(path.join(cwd, folder), folder));
  }
  Object.assign(out, walkTextFiles(path.join(cwd, "docs"), "docs"));
  Object.assign(out, walkTextFiles(path.join(cwd, "tests"), "tests"));
  Object.assign(out, walkTextFiles(path.join(cwd, ".github"), ".github"));

  for (const rootFile of ["README.md", "docker-compose.yml", ".env.example"] as const) {
    const abs = path.join(cwd, rootFile);
    if (existsSync(abs) && statSync(abs).isFile()) {
      out[rootFile] = readFileSync(abs, "utf8");
    }
  }

  return Object.fromEntries(
    Object.entries(out).filter(([filePath]) => isSoftwarePath(filePath)),
  );
}

/** @deprecated Use recoverOrderWorkspaceFiles — mantido para compatibilidade em testes internos. */
export function recoverWorkspaceCodeFiles(_cwd = process.cwd()): Record<string, string> {
  return {};
}

export function isMobilePlaceholder(mainDart: string): boolean {
  const main = mainDart.trim();
  return (
    !main ||
    main.includes("PreviewApp") ||
    main.includes("Hello World") ||
    (main.includes("MaterialApp") &&
      main.includes("Text(") &&
      !main.includes("TaskListApp") &&
      !main.includes("go_router") &&
      !main.includes("ProviderScope"))
  );
}

export function mergeRecoveredWorkspace(
  files: Record<string, string>,
  recovered: Record<string, string>,
  options: { planning: boolean },
): Record<string, string> {
  const merged = { ...files };

  for (const [filePath, content] of Object.entries(recovered)) {
    if (!content.trim()) continue;

    if (options.planning) {
      if (!isAllowedPlanningPath(filePath)) continue;
      if (!merged[filePath]?.trim() || content.length > merged[filePath].length) {
        merged[filePath] = content;
      }
      continue;
    }

    if (filePath.startsWith("mobile/")) {
      merged[filePath] = content;
      continue;
    }
    if (
      (filePath.startsWith("backend/") || filePath.startsWith("frontend/")) &&
      (!merged[filePath]?.trim() || content.length >= merged[filePath].length)
    ) {
      merged[filePath] = content;
      continue;
    }
    if (!merged[filePath]?.trim()) {
      merged[filePath] = content;
    }
  }

  return merged;
}

/** Remove artefatos de código e respostas prose que não pertencem ao pacote de planejamento. */
export function stripPlanningPollution(
  files: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).filter(([filePath]) => {
      if (filePath === "output.md") return false;
      if (CODE_PREFIXES.some((prefix) => filePath.startsWith(prefix))) return false;
      if (filePath.startsWith("mock/")) return false;
      return isAllowedPlanningPath(filePath) || filePath.startsWith("docs/");
    }),
  );
}

export function mergeRecoveredCode(
  files: Record<string, string>,
  recovered: Record<string, string>,
): Record<string, string> {
  return mergeRecoveredWorkspace(files, recovered, { planning: false });
}
