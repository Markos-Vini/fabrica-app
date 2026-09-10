import { describe, expect, it, vi } from "vitest";
import {
  dispatchApkWorkflow,
  findArtifact,
  parseRepoFromUrl,
  pollRunUntilDone,
} from "./actions";

describe("parseRepoFromUrl", () => {
  it("extrai owner e repo de uma URL do GitHub", () => {
    expect(parseRepoFromUrl("https://github.com/acme/fabrica-cafe")).toEqual({
      owner: "acme",
      repo: "fabrica-cafe",
    });
  });

  it("falha com URL inválida", () => {
    expect(() => parseRepoFromUrl("https://example.com/x")).toThrow(/GitHub/i);
  });
});

describe("dispatchApkWorkflow", () => {
  it("dispara o workflow android-debug.yml na branch main", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await dispatchApkWorkflow({
      token: "ghp_test",
      owner: "acme",
      repo: "fabrica-cafe",
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/fabrica-cafe/actions/workflows/android-debug.yml/dispatches",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("pollRunUntilDone", () => {
  it("retorna o run quando concluir com sucesso", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      const status = calls < 2 ? "in_progress" : "completed";
      const conclusion = calls < 2 ? null : "success";
      return json({
        workflow_runs: [
          {
            id: 99,
            status,
            conclusion,
            html_url: "https://github.com/r/99",
            created_at: new Date().toISOString(),
          },
        ],
      });
    });
    const run = await pollRunUntilDone({
      token: "ghp_test",
      owner: "acme",
      repo: "fabrica-cafe",
      fetchImpl,
      maxAttempts: 3,
      delayMs: 0,
      afterRunId: 98,
    });
    expect(run.id).toBe(99);
    expect(run.conclusion).toBe("success");
  });

  it("ignora runs antigos já concluídos", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return json({
          workflow_runs: [
            {
              id: 50,
              status: "completed",
              conclusion: "failure",
              html_url: "https://github.com/r/50",
              created_at: "2020-01-01T00:00:00Z",
            },
          ],
        });
      }
      return json({
        workflow_runs: [
          {
            id: 51,
            status: "completed",
            conclusion: "success",
            html_url: "https://github.com/r/51",
            created_at: new Date().toISOString(),
          },
        ],
      });
    });
    const run = await pollRunUntilDone({
      token: "ghp_test",
      owner: "acme",
      repo: "fabrica-cafe",
      fetchImpl,
      maxAttempts: 3,
      delayMs: 0,
      afterRunId: 50,
      minCreatedAtMs: Date.now() - 60_000,
    });
    expect(run.id).toBe(51);
  });
});

describe("findArtifact", () => {
  it("localiza o artefato app-debug", async () => {
    const fetchImpl = vi.fn(async () =>
      json({
        artifacts: [
          { id: 1, name: "other", archive_download_url: "https://x/1" },
          { id: 2, name: "app-debug", archive_download_url: "https://x/2" },
        ],
      }),
    );
    const artifact = await findArtifact({
      token: "ghp_test",
      owner: "acme",
      repo: "fabrica-cafe",
      runId: 99,
      fetchImpl,
    });
    expect(artifact?.id).toBe(2);
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
