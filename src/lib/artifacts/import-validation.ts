import path from "node:path";
import type { OrderInput } from "@/lib/types";

export type ImportGap = {
  file: string;
  importPath: string;
  expected: string;
};

const DART_REL_IMPORT = /import\s+['"](\.\.?\/[^'"]+)['"]/g;
const TS_REL_IMPORT =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]+\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g;
const TS_ALIAS_IMPORT =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]+\s+from\s+)?['"]@\/([^'"]+)['"]/g;

const CODE_PREFIXES = ["mobile/", "backend/", "frontend/"] as const;
const MODULE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".dart", ""];

function normalizeKey(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function resolveRelative(fromFile: string, relImport: string): string {
  const dir = path.posix.dirname(normalizeKey(fromFile));
  return normalizeKey(path.posix.normalize(path.posix.join(dir, relImport)));
}

function existsAsModule(files: Record<string, string>, basePath: string): boolean {
  const normalized = normalizeKey(basePath);
  if (files[normalized]?.trim()) return true;

  for (const ext of MODULE_EXTENSIONS) {
    const candidate =
      ext && !normalized.endsWith(ext) ? `${normalized}${ext}` : normalized;
    if (files[candidate]?.trim()) return true;
  }

  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    if (files[`${normalized}/index${ext}`]?.trim()) return true;
  }

  return false;
}

function aliasCandidates(filePath: string, aliasPath: string): string[] {
  const clean = aliasPath.replace(/^\.\//, "");
  if (filePath.startsWith("frontend/")) {
    return [`frontend/src/${clean}`, `frontend/${clean}`];
  }
  if (filePath.startsWith("backend/")) {
    return [`backend/src/${clean}`, `backend/${clean}`];
  }
  return [];
}

function collectRelativeGaps(
  files: Record<string, string>,
  filePath: string,
  content: string,
  pattern: RegExp,
): ImportGap[] {
  const gaps: ImportGap[] = [];
  for (const match of content.matchAll(pattern)) {
    const importPath = match[1];
    if (!importPath) continue;
    const expected = resolveRelative(filePath, importPath);
    if (!existsAsModule(files, expected)) {
      gaps.push({ file: filePath, importPath, expected });
    }
  }
  return gaps;
}

function collectAliasGaps(
  files: Record<string, string>,
  filePath: string,
  content: string,
): ImportGap[] {
  const gaps: ImportGap[] = [];
  for (const match of content.matchAll(TS_ALIAS_IMPORT)) {
    const aliasPath = match[1];
    if (!aliasPath) continue;
    const candidates = aliasCandidates(filePath, aliasPath);
    if (candidates.length === 0) continue;
    if (!candidates.some((candidate) => existsAsModule(files, candidate))) {
      gaps.push({
        file: filePath,
        importPath: `@/${aliasPath}`,
        expected: candidates.join(" ou "),
      });
    }
  }
  return gaps;
}

/** Verifica imports relativos (e @/) contra a árvore gerada — bloqueia ZIP com referências quebradas. */
export function validateGeneratedImports(
  order: OrderInput,
  files: Record<string, string>,
): ImportGap[] {
  const gaps: ImportGap[] = [];
  const checkCode =
    order.includeMobile || order.includeFrontend || order.includeBackend;
  if (!checkCode) return gaps;

  for (const [filePath, content] of Object.entries(files)) {
    if (!content.trim()) continue;
    if (!CODE_PREFIXES.some((prefix) => filePath.startsWith(prefix))) continue;

    if (filePath.endsWith(".dart")) {
      gaps.push(...collectRelativeGaps(files, filePath, content, DART_REL_IMPORT));
      continue;
    }

    if (/\.(tsx?|jsx?|mjs)$/.test(filePath)) {
      gaps.push(...collectRelativeGaps(files, filePath, content, TS_REL_IMPORT));
      gaps.push(...collectAliasGaps(files, filePath, content));
    }
  }

  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = `${gap.file}|${gap.importPath}|${gap.expected}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatImportGapMessage(gaps: ImportGap[], limit = 8): string {
  if (gaps.length === 0) return "";
  const shown = gaps.slice(0, limit);
  const items = shown
    .map((g) => `${g.file} → "${g.importPath}" (esperado: ${g.expected})`)
    .join("; ");
  const extra =
    gaps.length > limit ? ` … e mais ${gaps.length - limit} import(s).` : "";
  return (
    `Imports quebrados detectados antes do ZIP — ${items}${extra} ` +
    "Reprocesse a esteira ou use Recuperar arquivos após corrigir no workspace."
  );
}
