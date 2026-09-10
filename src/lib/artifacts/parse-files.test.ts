import { describe, expect, it } from "vitest";
import { parseGeneratedFiles } from "./parse-files";

describe("parseGeneratedFiles", () => {
  it("lê um JSON com mapa de arquivos", () => {
    const raw = JSON.stringify({
      files: {
        "README.md": "# App",
        "src/index.ts": "export {}",
      },
    });
    expect(parseGeneratedFiles(raw)).toEqual({
      "README.md": "# App",
      "src/index.ts": "export {}",
    });
  });

  it("guarda markdown bruto quando não há árvore de arquivos", () => {
    expect(parseGeneratedFiles("# PRD\n\nTexto")).toEqual({
      "output.md": "# PRD\n\nTexto",
    });
  });

  it("salva JSON truncado no meio do conteúdo do arquivo", () => {
    const body = "# Plano mobile\n\n".padEnd(1200, "x");
    const raw = JSON.stringify({
      files: { "docs/PLANO-FRONTEND-MOBILE.md": body },
    }).slice(0, 800);

    const parsed = parseGeneratedFiles(raw);
    expect(parsed["docs/PLANO-FRONTEND-MOBILE.md"]).toContain("# Plano mobile");
    expect(parsed["docs/PLANO-FRONTEND-MOBILE.md"].length).toBeGreaterThan(700);
  });

  it("salva JSON truncado com arquivos de código mobile/", () => {
    const body = "import 'package:flutter/material.dart';\n".padEnd(600, "/");
    const raw = JSON.stringify({
      files: {
        "mobile/lib/main.dart": body,
        "mobile/pubspec.yaml": "name: app",
      },
    }).slice(0, 400);

    const parsed = parseGeneratedFiles(raw);
    expect(parsed["mobile/lib/main.dart"]).toContain("material.dart");
  });
});
