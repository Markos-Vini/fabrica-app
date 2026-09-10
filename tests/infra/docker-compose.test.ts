import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

describe("docker-compose.yml — contrato DevOps EducaFlex", () => {
  const compose = readFileSync(join(ROOT, "docker-compose.yml"), "utf8");

  it("MySQL expõe healthcheck", () => {
    expect(compose).toContain("healthcheck:");
    expect(compose).toContain("mysqladmin");
  });

  it("serviço api usa profile full e depende de mysql healthy", () => {
    expect(compose).toMatch(/api:[\s\S]*depends_on:[\s\S]*mysql:[\s\S]*condition: service_healthy/);
    expect(compose).toContain("- full");
  });

  it("serviço web expõe porta configurável", () => {
    expect(compose).toContain("${WEB_PORT:-3002}:3000");
    expect(compose).toContain("NEXT_PUBLIC_API_URL");
  });

  it("volume persistente para dados MySQL", () => {
    expect(compose).toContain("educaflex_mysql:");
  });

  it("banco padrão é educaflex", () => {
    expect(compose).toContain("MYSQL_DATABASE: ${MYSQL_DATABASE:-educaflex}");
    expect(compose).toContain("INTEGRATIONS_MODE");
  });
});
