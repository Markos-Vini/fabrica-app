import { describe, expect, it } from "vitest";
import { extractDemoAccounts } from "./demo-accounts";

describe("extractDemoAccounts", () => {
  it("extrai e-mail/senha de docs/DEMO-ACCOUNTS.md", () => {
    const accounts = extractDemoAccounts({
      "docs/DEMO-ACCOUNTS.md": `# Demo
| Gestor | bruno.gestor@test.local | Senha@123 |
Demo: aluno@test.local / Senha@456
`,
    });
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts.some((a) => a.email.includes("gestor"))).toBe(true);
  });
});
