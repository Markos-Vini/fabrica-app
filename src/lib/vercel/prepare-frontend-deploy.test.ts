import { describe, expect, it } from "vitest";
import {
  ensureEnvProduction,
  patchApiClientForVercelDemo,
  patchAuthProviderForVercelDemo,
  patchNextConfigForVercel,
  patchSessionForVercelDemo,
  prepareFrontendDeployFiles,
} from "./prepare-frontend-deploy";

const CLIENT = `const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

async function request<T>() {
  if (USE_MOCK) {
    return mock.handleMock<T>(path, options);
  }
}`;

const SESSION = `export function setSession(token: string, user: Usuario): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = \`\${COOKIE_NAME}=\${token}; path=/; max-age=\${60 * 60 * 8}; SameSite=Lax\`;
}`;

const AUTH_PROVIDER = `      setSession(res.accessToken, res.usuario);
      setUser(res.usuario);
      router.push('/dashboard');`;

describe("prepareFrontendDeployFiles", () => {
  it("aplica patches de demo e remove standalone", () => {
    const result = prepareFrontendDeployFiles({
      "frontend/lib/api/client.ts": CLIENT,
      "frontend/lib/auth/session.ts": SESSION,
      "frontend/lib/auth/AuthProvider.tsx": AUTH_PROVIDER,
      "frontend/next.config.js":
        "const nextConfig = {\n  reactStrictMode: true,\n  output: 'standalone',\n};\n",
      "frontend/package.json": "{}",
      "backend/main.ts": "x",
    });

    expect(result?.["lib/api/client.ts"]).toContain("function useMockApi()");
    expect(result?.["lib/api/client.ts"]).toContain("if (useMockApi())");
    expect(result?.["lib/auth/session.ts"]).toContain("encodeURIComponent(token)");
    expect(result?.["lib/auth/AuthProvider.tsx"]).toContain(
      "window.location.assign('/dashboard')",
    );
    expect(result?.["next.config.js"]).not.toContain("standalone");
    expect(result?.["next.config.js"]).toContain("ignoreBuildErrors");
    expect(result?.[".env.production"]).toContain("NEXT_PUBLIC_USE_MOCK_API=true");
    expect(result?.["vercel.json"]).toContain("NEXT_PUBLIC_USE_MOCK_API");
    expect(result?.["vercel.json"]).toContain("--include=dev");
  });

  it("retorna null sem pasta frontend", () => {
    expect(prepareFrontendDeployFiles({ "backend/main.ts": "x" })).toBeNull();
  });
});

describe("patchApiClientForVercelDemo", () => {
  it("funciona com finais de linha CRLF", () => {
    const crlf = `${CLIENT.replace(/\n/g, "\r\n")}`;
    const patched = patchApiClientForVercelDemo(crlf);
    expect(patched).toContain("function useMockApi()");
    expect(patched).toContain("if (useMockApi())");
  });

  it("não altera arquivo já patchado", () => {
    const patched = patchApiClientForVercelDemo(
      "function useMockApi() {}\nif (useMockApi()) {}",
    );
    expect(patched).toContain("function useMockApi()");
    expect(patched).not.toContain("const USE_MOCK");
  });
});

describe("patchSessionForVercelDemo", () => {
  it("codifica cookie e adiciona Secure em https", () => {
    expect(patchSessionForVercelDemo(SESSION)).toContain("encodeURIComponent(token)");
  });
});

describe("patchAuthProviderForVercelDemo", () => {
  it("usa navegação completa após login", () => {
    expect(patchAuthProviderForVercelDemo(AUTH_PROVIDER)).toContain(
      "window.location.assign('/dashboard')",
    );
  });
});

describe("patchNextConfigForVercel", () => {
  it("remove output standalone e ignora erros TS na demo", () => {
    const patched = patchNextConfigForVercel(
      "const nextConfig = {\n  output: 'standalone',\n};\n",
    );
    expect(patched).not.toContain("standalone");
    expect(patched).toContain("ignoreBuildErrors");
  });
});

describe("ensureEnvProduction", () => {
  it("mescla variáveis existentes", () => {
    const files = ensureEnvProduction({
      ".env.production": "FOO=bar\n",
    });
    expect(files[".env.production"]).toContain("FOO=bar");
    expect(files[".env.production"]).toContain("NEXT_PUBLIC_USE_MOCK_API=true");
  });
});
