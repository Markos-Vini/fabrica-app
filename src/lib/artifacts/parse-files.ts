function unescapeJsonString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/** Recupera arquivos quando o JSON foi truncado (ex.: limite de 50k no outputText). */
function salvageTruncatedFilesJson(raw: string): Record<string, string> | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{"files"')) return null;

  const files: Record<string, string> = {};
  const keyRe =
    /"((?:docs\/[^"]+|(?:mobile|backend|frontend|mock|tests|\.github)\/[^"]+|README\.md|docker-compose\.yml))"\s*:\s*"/g;
  const matches = [...trimmed.matchAll(keyRe)];
  if (matches.length === 0) return null;

  for (let i = 0; i < matches.length; i += 1) {
    const filePath = matches[i][1];
    const contentStart = matches[i].index! + matches[i][0].length;
    let contentRaw: string;
    if (i + 1 < matches.length) {
      const nextIndex = matches[i + 1].index!;
      contentRaw = trimmed.slice(contentStart, nextIndex).replace(/"\s*,?\s*$/, "");
    } else {
      contentRaw = trimmed.slice(contentStart).replace(/"\s*}*\s*}*\s*$/, "");
    }
    const content = unescapeJsonString(contentRaw).trim();
    if (content) files[filePath] = content;
  }

  return Object.keys(files).length > 0 ? files : null;
}

export function parseGeneratedFiles(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        files?: Record<string, string>;
      };
      if (parsed.files && typeof parsed.files === "object") {
        return parsed.files;
      }
    } catch {
      const salvaged = salvageTruncatedFilesJson(trimmed);
      if (salvaged) return salvaged;
    }
  }
  return { "output.md": raw };
}
