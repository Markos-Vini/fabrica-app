export type DemoAccount = {
  role: string;
  email: string;
  password: string;
};

const EMAIL_PASSWORD =
  /([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*[/|·]\s*[`"']?([^\s`"'\n]+)/g;

const ROLE_EMAIL_PASSWORD =
  /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*(Gestor|Aluno|Admin|Usuário|Usuario|User|Demo[^:\n]*):\s*([a-zA-Z0-9._+-]+@[^\s]+)\s*[/|·]\s*([^\s\n]+)/gim;

const TABLE_ROW =
  /\|\s*([^|]+?)\s*\|\s*([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*\|\s*([^|\n]+?)\s*\|/g;

/** Extrai contas demo de README e docs/DEMO-ACCOUNTS.md gerados pelos agentes. */
export function extractDemoAccounts(
  files: Record<string, string>,
): DemoAccount[] {
  const text = [
    files["docs/DEMO-ACCOUNTS.md"],
    files["README.md"],
    files["frontend/README.md"],
    files["mobile/README.md"],
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!text.trim()) return [];

  const seen = new Set<string>();
  const accounts: DemoAccount[] = [];

  for (const match of text.matchAll(TABLE_ROW)) {
    const role = match[1]!.trim();
    const email = match[2]!.trim();
    const password = match[3]!.trim();
    if (role.toLowerCase().includes("papel") || role.includes("---")) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    accounts.push({ role, email, password });
  }

  for (const match of text.matchAll(ROLE_EMAIL_PASSWORD)) {
    const email = match[2]!.trim();
    const password = match[3]!.trim();
    if (seen.has(email)) continue;
    seen.add(email);
    accounts.push({ role: match[1]!.trim(), email, password });
  }

  for (const match of text.matchAll(EMAIL_PASSWORD)) {
    const email = match[1]!.trim();
    const password = match[2]!.trim();
    if (seen.has(email)) continue;
    if (password.length < 4 || password.includes("@")) continue;
    seen.add(email);
    accounts.push({ role: "Demo", email, password });
  }

  return accounts.slice(0, 6);
}
