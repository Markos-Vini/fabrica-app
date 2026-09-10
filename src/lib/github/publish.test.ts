import { describe, expect, it, vi } from "vitest";
import {
  publishToGithub,
  pushFilesToGithubRepo,
  sanitizeFilesForGithubPublish,
  staleFlutterRootPaths,
  syncFilesToGithubRepo,
} from "./publish";

describe("sanitizeFilesForGithubPublish", () => {
  it("remove dumps de agente e arquivos inválidos", () => {
    const out = sanitizeFilesForGithubPublish({
      "mobile/lib/main.dart": "void main() {}",
      "backend/educa-response.json": '{"x":1}',
      "backend/output-files.json": "{}",
      "README.md": "# App",
    });
    expect(out["mobile/lib/main.dart"]).toBeTruthy();
    expect(out["README.md"]).toBeTruthy();
    expect(out["backend/educa-response.json"]).toBeUndefined();
    expect(out["backend/output-files.json"]).toBeUndefined();
  });
});

describe("publishToGithub", () => {
  it("cria o repositório e envia os arquivos em um único commit", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/user") && method === "GET") {
        return json({ login: "acme" });
      }
      if (url.endsWith("/user/repos") && method === "POST") {
        return json({
          full_name: "acme/cafe-delivery",
          html_url: "https://github.com/acme/cafe-delivery",
          default_branch: "main",
        });
      }
      if (url.endsWith("/repos/acme/cafe-delivery") && method === "GET") {
        return json({
          full_name: "acme/cafe-delivery",
          html_url: "https://github.com/acme/cafe-delivery",
          default_branch: "main",
        });
      }
      if (url.includes("/git/ref/heads/main") && method === "GET") {
        return json({ object: { sha: "parent-sha" } });
      }
      if (url.includes("/git/blobs") && method === "POST") {
        return json({ sha: `blob-${Math.random()}` });
      }
      if (url.includes("/git/trees") && method === "POST") {
        return json({ sha: "tree-sha" });
      }
      if (url.includes("/git/commits") && method === "POST") {
        return json({ sha: "commit-sha" });
      }
      if (url.includes("/git/refs/heads/main") && method === "PATCH") {
        return json({});
      }
      if (url.includes("/git/refs") && method === "POST") {
        return json({});
      }
      return json({ message: `unexpected ${method} ${url}` }, 500);
    });

    const result = await publishToGithub({
      token: "ghp_test",
      name: "cafe-delivery",
      description: "Gerado pela Fábrica de Software",
      files: { "README.md": "# Café", "mock/db.json": "{}" },
      fetchImpl,
    });

    expect(result.htmlUrl).toBe("https://github.com/acme/cafe-delivery");
  });

  it("falha sem token", async () => {
    await expect(
      publishToGithub({
        token: "",
        name: "x",
        description: "x",
        files: { "README.md": "oi" },
      }),
    ).rejects.toThrow(/token/i);
  });

  it("reusa o repositório se o nome já existir", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/user") && method === "GET") {
        return json({ login: "acme" });
      }
      if (url.endsWith("/user/repos") && method === "POST") {
        return json({ message: "name already exists on this account" }, 422);
      }
      if (url.endsWith("/repos/acme/cafe-delivery") && method === "GET") {
        return json({
          full_name: "acme/cafe-delivery",
          html_url: "https://github.com/acme/cafe-delivery",
          default_branch: "main",
        });
      }
      if (url.includes("/git/blobs") && method === "POST") {
        return json({ sha: "blob-sha" });
      }
      if (url.includes("/git/trees") && method === "POST") {
        return json({ sha: "tree-sha" });
      }
      if (url.includes("/git/commits") && method === "POST") {
        return json({ sha: "commit-sha" });
      }
      if (url.includes("/git/refs") && method === "POST") {
        return json({});
      }
      if (url.includes("/git/ref/heads/main") && method === "GET") {
        return json({ object: { sha: "parent" } });
      }
      if (url.includes("/git/refs/heads/main") && method === "PATCH") {
        return json({});
      }
      return json({ message: `unexpected ${method} ${url}` }, 500);
    });

    const result = await publishToGithub({
      token: "ghp_test",
      name: "cafe-delivery",
      description: "Gerado pela Fábrica de Software",
      files: { "README.md": "# Café" },
      fetchImpl,
    });
    expect(result.htmlUrl).toBe("https://github.com/acme/cafe-delivery");
  });
});

describe("pushFilesToGithubRepo", () => {
  it("envia snapshot completo sem base_tree", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/repos/acme/app") && method === "GET") {
        return json({
          html_url: "https://github.com/acme/app",
          default_branch: "main",
        });
      }
      if (url.includes("/git/ref/heads/main") && method === "GET") {
        return json({ object: { sha: "parent" } });
      }
      if (url.includes("/git/blobs") && method === "POST") {
        return json({ sha: "blob1" });
      }
      if (url.includes("/git/trees") && method === "POST") {
        const body = JSON.parse(String(init?.body)) as {
          tree: unknown[];
          base_tree?: string;
        };
        expect(body.base_tree).toBeUndefined();
        expect(body.tree).toHaveLength(3);
        return json({ sha: "new-tree" });
      }
      if (url.includes("/git/commits") && method === "POST") {
        return json({ sha: "new-commit" });
      }
      if (url.includes("/git/refs/heads/main") && method === "PATCH") {
        return json({});
      }
      return json({ message: `unexpected ${method} ${url}` }, 500);
    });

    await pushFilesToGithubRepo({
      token: "ghp_test",
      owner: "acme",
      repo: "app",
      files: {
        "README.md": "# App",
        "mobile/lib/main.dart": "void main() {}",
        "mobile/lib/app.dart": "class App {}",
      },
      fetchImpl,
    });

    const blobCalls = fetchImpl.mock.calls.filter(
      ([url, init]) =>
        String(url).includes("/git/blobs") && (init?.method ?? "GET") === "POST",
    );
    expect(blobCalls).toHaveLength(3);
  });
});

describe("syncFilesToGithubRepo", () => {
  it("cria repo novo quando preferNewRepo=true", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/user") && method === "GET") {
        return json({ login: "acme" });
      }
      if (url.endsWith("/user/repos") && method === "POST") {
        return json({
          full_name: "acme/app-20260908",
          html_url: "https://github.com/acme/app-20260908",
        });
      }
      if (url.endsWith("/repos/acme/app-20260908") && method === "GET") {
        return json({
          html_url: "https://github.com/acme/app-20260908",
          default_branch: "main",
        });
      }
      if (url.includes("/git/ref/heads/main") && method === "GET") {
        return json({ message: "Not Found" }, 404);
      }
      if (url.includes("/git/blobs") && method === "POST") {
        return json({ sha: "blob1" });
      }
      if (url.includes("/git/trees") && method === "POST") {
        return json({ sha: "new-tree" });
      }
      if (url.includes("/git/commits") && method === "POST") {
        return json({ sha: "new-commit" });
      }
      if (url.includes("/git/refs") && method === "POST") {
        return json({});
      }
      return json({ message: `unexpected ${method} ${url}` }, 500);
    });

    const result = await syncFilesToGithubRepo({
      token: "ghp_test",
      owner: "acme",
      repo: "app",
      files: { "README.md": "# App" },
      preferNewRepo: true,
      fetchImpl,
    });
    expect(result.recreated).toBe(true);
    expect(result.htmlUrl).toContain("app-20260908");
  });
});

describe("staleFlutterRootPaths", () => {
  it("lista arquivos legados na raiz quando o app Flutter está em mobile/", () => {
    expect(
      staleFlutterRootPaths({
        "mobile/lib/main.dart": "void main() {}",
      }),
    ).toEqual(["lib/main.dart", "pubspec.yaml", "analysis_options.yaml"]);
  });

  it("não remove paths que fazem parte do pacote", () => {
    expect(
      staleFlutterRootPaths({
        "mobile/lib/main.dart": "void main() {}",
        "pubspec.yaml": "name: root",
      }),
    ).toEqual(["lib/main.dart", "analysis_options.yaml"]);
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
