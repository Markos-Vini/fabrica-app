import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

const REQUIRED_PATHS = [
  "README.md",
  "docker-compose.yml",
  ".env.example",
  "backend/package.json",
  "backend/.env.example",
  "backend/Dockerfile",
  "backend/prisma/schema.prisma",
  "backend/src/main.ts",
  "mobile/pubspec.yaml",
  "mobile/lib/main.dart",
  "frontend/package.json",
  "frontend/.env.example",
  "docs/PRD.md",
  "docs/ARQUITETURA.md",
  "tests/vitest.config.mts",
  "tests/README.md",
];

describe("estrutura do repositório EducaFlex", () => {
  it.each(REQUIRED_PATHS)("existe %s", (relativePath) => {
    expect(existsSync(join(ROOT, relativePath))).toBe(true);
  });

  it("README contém instruções de subida", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toContain("backend/");
    expect(readme).toContain("mobile/");
    expect(readme).toContain("docker compose");
    expect(readme).toContain("Início rápido");
    expect(readme).toContain("npm run db:setup");
    expect(readme).toContain("API_BASE_URL");
    expect(readme).toContain("EducaFlex");
  });

  it("docker-compose define mysql e perfis", () => {
    const compose = readFileSync(join(ROOT, "docker-compose.yml"), "utf8");
    expect(compose).toMatch(/^\s*mysql:/m);
    expect(compose).toContain("mysql:8.4");
    expect(compose).toContain("profiles:");
    expect(compose).toMatch(/^\s*api:/m);
    expect(compose).toMatch(/^\s*web:/m);
    expect(compose).toMatch(/^\s*mobile-ci:/m);
    expect(compose).toContain("educaflex");
  });
});
