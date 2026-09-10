const USE_MOCK_API_SNIPPET = `function useMockApi(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return true;
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'false') return false;
  if (typeof window === 'undefined') return true;
  const localSite =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  return !localSite;
}`;

const USE_MOCK_CONST =
  /const USE_MOCK = process\.env\.NEXT_PUBLIC_USE_MOCK_API === 'true';/;

const STANDALONE_OUTPUT =
  /^\s*output:\s*['"]standalone['"],?\s*\r?\n/m;

const SESSION_COOKIE_LINE =
  /document\.cookie = `\$\{COOKIE_NAME\}=\$\{token\}; path=\/; max-age=\$\{60 \* 60 \* 8\}; SameSite=Lax`;/;

const SESSION_COOKIE_REPLACEMENT = `const secureFlag =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';
  document.cookie = \`\${COOKIE_NAME}=\${encodeURIComponent(token)}; path=/; max-age=\${60 * 60 * 8}; SameSite=Lax\${secureFlag}\`;`;

const AUTH_LOGIN_REDIRECT = /router\.push\('\/dashboard'\);/g;

const VERCEL_JSON = `{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install --include=dev",
  "env": {
    "NEXT_PUBLIC_USE_MOCK_API": "true",
    "NEXT_PUBLIC_API_URL": "http://localhost:3001/api/v1"
  }
}
`;

export function patchApiClientForVercelDemo(content: string): string {
  if (content.includes("function useMockApi()")) {
    return content.replace(
      /if \(USE_MOCK\) \{/g,
      "if (useMockApi()) {",
    );
  }
  if (!USE_MOCK_CONST.test(content)) return content;
  return content
    .replace(USE_MOCK_CONST, `${USE_MOCK_API_SNIPPET}\n`)
    .replace(/if \(USE_MOCK\) \{/g, "if (useMockApi()) {");
}

export function patchNextConfigForVercel(content: string): string {
  let out = content;
  if (STANDALONE_OUTPUT.test(out)) {
    out = out.replace(STANDALONE_OUTPUT, "");
  }
  if (!out.includes("ignoreBuildErrors")) {
    out = out.replace(
      /const nextConfig = \{/,
      `const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },`,
    );
  }
  return out;
}

export function patchSessionForVercelDemo(content: string): string {
  if (content.includes("encodeURIComponent(token)")) return content;
  if (!SESSION_COOKIE_LINE.test(content)) return content;
  return content.replace(SESSION_COOKIE_LINE, SESSION_COOKIE_REPLACEMENT);
}

export function patchAuthProviderForVercelDemo(content: string): string {
  if (content.includes("window.location.assign('/dashboard')")) return content;
  return content.replace(
    AUTH_LOGIN_REDIRECT,
    "window.location.assign('/dashboard');",
  );
}

export function ensureEnvProduction(
  files: Record<string, string>,
): Record<string, string> {
  const lines = [
    "NEXT_PUBLIC_USE_MOCK_API=true",
    "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1",
  ];
  const existing = files[".env.production"];
  if (existing) {
    const merged = new Map<string, string>();
    for (const line of existing.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      merged.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
    for (const line of lines) {
      const eq = line.indexOf("=");
      merged.set(line.slice(0, eq), line.slice(eq + 1));
    }
    files[".env.production"] = `${[...merged.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`;
  } else {
    files[".env.production"] = `${lines.join("\n")}\n`;
  }
  return files;
}

export function prepareFrontendDeployFiles(
  files: Record<string, string>,
): Record<string, string> | null {
  const entries = Object.entries(files).filter(([filePath]) =>
    filePath.startsWith("frontend/"),
  );
  if (entries.length === 0) return null;

  const picked: Record<string, string> = {};
  for (const [filePath, content] of entries) {
    picked[filePath.replace(/^frontend\//, "")] = content;
  }

  if (picked["lib/api/client.ts"]) {
    picked["lib/api/client.ts"] = patchApiClientForVercelDemo(
      picked["lib/api/client.ts"],
    );
  }
  if (picked["lib/auth/session.ts"]) {
    picked["lib/auth/session.ts"] = patchSessionForVercelDemo(
      picked["lib/auth/session.ts"],
    );
  }
  if (picked["lib/auth/AuthProvider.tsx"]) {
    picked["lib/auth/AuthProvider.tsx"] = patchAuthProviderForVercelDemo(
      picked["lib/auth/AuthProvider.tsx"],
    );
  }
  if (picked["next.config.js"]) {
    picked["next.config.js"] = patchNextConfigForVercel(picked["next.config.js"]);
  }
  if (picked["next.config.mjs"]) {
    picked["next.config.mjs"] = patchNextConfigForVercel(picked["next.config.mjs"]);
  }
  ensureEnvProduction(picked);
  picked["vercel.json"] = VERCEL_JSON;
  return picked;
}
