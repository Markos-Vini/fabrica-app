export type GithubRepo = { owner: string; repo: string };

export type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at?: string;
};

export type GithubArtifact = {
  id: number;
  name: string;
  archive_download_url: string;
};

const WORKFLOW_FILE = "android-debug.yml";
const ARTIFACT_NAME = "app-debug";

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export function parseRepoFromUrl(url: string): GithubRepo {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) throw new Error("URL do GitHub inválida.");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function dispatchApkWorkflow(input: {
  token: string;
  owner: string;
  repo: string;
  ref?: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const ref = input.ref ?? "main";
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: headers(input.token),
      body: JSON.stringify({ ref }),
    },
  );
  if (res.status !== 204) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const message = body.message ?? `GitHub dispatch HTTP ${res.status}`;
    if (res.status === 404 || /not found/i.test(message)) {
      throw new Error(
        "Workflow android-debug.yml não encontrado no GitHub. Republica o repositório ou aguarde alguns segundos e tente de novo.",
      );
    }
    throw new Error(message);
  }
}

export async function workflowExists(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/actions/workflows/${WORKFLOW_FILE}`,
    { headers: headers(input.token) },
  );
  return res.ok;
}

export async function findNewWorkflowRun(input: {
  token: string;
  owner: string;
  repo: string;
  afterRunId?: number;
  minCreatedAtMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<WorkflowRun | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10`,
    { headers: headers(input.token) },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { workflow_runs?: WorkflowRun[] };
  const afterRunId = input.afterRunId ?? 0;
  const minCreatedAtMs = input.minCreatedAtMs ?? 0;
  return (
    body.workflow_runs?.find((run) => {
      if (run.id <= afterRunId) return false;
      if (minCreatedAtMs && run.created_at) {
        return new Date(run.created_at).getTime() >= minCreatedAtMs;
      }
      return true;
    }) ?? null
  );
}

export function githubActionsWorkflowUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}`;
}

export async function getLatestWorkflowRun(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}): Promise<WorkflowRun | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
    { headers: headers(input.token) },
  );
  if (res.status === 404) return null;
  const body = (await res.json()) as {
    workflow_runs?: WorkflowRun[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? `GitHub runs HTTP ${res.status}`);
  }
  return body.workflow_runs?.[0] ?? null;
}

export async function pollRunUntilDone(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  delayMs?: number;
  /** Ignora runs antigos já concluídos antes do dispatch atual. */
  afterRunId?: number;
  /** Só considera runs criados após este instante (ms). */
  minCreatedAtMs?: number;
}): Promise<WorkflowRun> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const max = input.maxAttempts ?? 30;
  const delay = input.delayMs ?? 5000;
  const afterRunId = input.afterRunId ?? 0;
  const minCreatedAtMs = input.minCreatedAtMs ?? 0;

  for (let attempt = 0; attempt < max; attempt += 1) {
    const res = await fetchImpl(
      `https://api.github.com/repos/${input.owner}/${input.repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
      { headers: headers(input.token) },
    );
    if (res.status === 404) {
      await sleep(delay);
      continue;
    }
    const body = (await res.json()) as {
      workflow_runs?: WorkflowRun[];
      message?: string;
    };
    if (!res.ok) {
      throw new Error(body.message ?? `GitHub runs HTTP ${res.status}`);
    }

    const candidates = (body.workflow_runs ?? []).filter((run) => {
      if (run.id <= afterRunId) return false;
      if (minCreatedAtMs && run.created_at) {
        return new Date(run.created_at).getTime() >= minCreatedAtMs;
      }
      return true;
    });

    const inProgress = candidates.find(
      (run) => run.status === "queued" || run.status === "in_progress",
    );
    if (inProgress) {
      await sleep(delay);
      continue;
    }

    const completed = candidates.find((run) => run.status === "completed");
    if (completed) {
      if (completed.conclusion !== "success") {
        throw new Error(
          `Workflow falhou (${completed.conclusion ?? "unknown"}). Abra o GitHub Actions para ver o log.`,
        );
      }
      return completed;
    }

    await sleep(delay);
  }
  throw new Error(
    "Timeout aguardando o workflow de APK — o build Flutter no GitHub pode levar até 12 minutos. Abra o GitHub Actions (link abaixo) e aguarde concluir; se já terminou com sucesso, clique em “Gerar APK” de novo.",
  );
}

export async function findArtifact(input: {
  token: string;
  owner: string;
  repo: string;
  runId: number;
  fetchImpl?: typeof fetch;
}): Promise<GithubArtifact | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/actions/runs/${input.runId}/artifacts`,
    { headers: headers(input.token) },
  );
  const body = (await res.json()) as {
    artifacts?: GithubArtifact[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? `GitHub artifacts HTTP ${res.status}`);
  }
  return body.artifacts?.find((a) => a.name === ARTIFACT_NAME) ?? null;
}

export async function downloadArtifact(
  token: string,
  artifact: GithubArtifact,
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer> {
  const res = await fetchImpl(artifact.archive_download_url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Download do artefato HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
