import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

function parseEnvExample(relativePath: string): Map<string, string> {
  const content = readFileSync(join(ROOT, relativePath), "utf8");
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars.set(trimmed.slice(0, eq), value);
  }
  return vars;
}

describe(".env.example — variáveis mínimas EducaFlex", () => {
  it("raiz contém credenciais MySQL e JWT para Docker Compose", () => {
    const vars = parseEnvExample(".env.example");
    expect(vars.get("MYSQL_DATABASE")).toBe("educaflex");
    expect(vars.has("MYSQL_USER")).toBe(true);
    expect(vars.has("MYSQL_PASSWORD")).toBe(true);
    expect(vars.has("JWT_SECRET")).toBe(true);
    expect(vars.has("API_PORT")).toBe(true);
    expect(vars.has("WEB_PORT")).toBe(true);
    expect(vars.has("NEXT_PUBLIC_API_URL")).toBe(true);
    expect(vars.get("INTEGRATIONS_MODE")).toBe("mock");
  });

  it("backend/.env.example contém DATABASE_URL, JWT e INTEGRATIONS_MODE", () => {
    const vars = parseEnvExample("backend/.env.example");
    expect(vars.get("DATABASE_URL")).toMatch(/^mysql:\/\//);
    expect(vars.get("DATABASE_URL")).toContain("educaflex");
    expect(vars.has("JWT_SECRET")).toBe(true);
    expect(vars.get("PORT")).toBe("3001");
    expect(vars.get("INTEGRATIONS_MODE")).toBe("mock");
  });

  it("frontend/.env.example contém NEXT_PUBLIC_API_URL", () => {
    const vars = parseEnvExample("frontend/.env.example");
    expect(vars.get("NEXT_PUBLIC_API_URL")).toMatch(/^http/);
    expect(vars.has("NEXT_PUBLIC_USE_MOCK_API")).toBe(true);
  });
});
