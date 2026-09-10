export type PublishGithubInput = {
  token: string;
  name: string;
  description: string;
  files: Record<string, string>;
  fetchImpl?: typeof fetch;
};

/** Paths legados na raiz do repo que conflitam com apps Flutter em mobile/. */
export function staleFlutterRootPaths(files: Record<string, string>): string[] {
  if (!files["mobile/lib/main.dart"]?.trim()) return [];
  const legacy = ["lib/main.dart", "pubspec.yaml", "analysis_options.yaml"];
  return legacy.filter((filePath) => !files[filePath]?.trim());
}

const MAX_PUBLISH_FILE_BYTES = 1_500_000;

/** Remove dumps de agente, binários e paths inválidos antes do push. */
export function sanitizeFilesForGithubPublish(
  files: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(files)) {
    const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.includes("..")) continue;
    if (normalized.includes("node_modules/")) continue;
    if (normalized.includes(".dart_tool/")) continue;
    if (normalized.includes("/build/")) continue;
    if (/\.(png|jpe?g|gif|webp|zip|apk|exe|dll|woff2?)$/i.test(normalized)) {
      continue;
    }
    // Locks enormes — regeneráveis com npm install.
    if (normalized.endsWith("package-lock.json")) continue;
    // Artefatos internos do agente Cursor — não pertencem ao repo do produto.
    if (
      /(^|\/)(educa[-_].*\.json|output-files\.json|.*-response.*\.json)$/i.test(
        normalized,
      )
    ) {
      continue;
    }
    if (typeof content !== "string") continue;
    if (Buffer.byteLength(content, "utf8") > MAX_PUBLISH_FILE_BYTES) continue;
    out[normalized] = content;
  }
  return out;
}

function githubHeaders(token: string, json = false): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function githubContentsUrl(owner: string, repo: string, filePath: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export async function fetchGithubFileContent(input: {
  token: string;
  owner: string;
  repo: string;
  filePath: string;
  branch?: string;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const branch =
    input.branch ??
    (
      await resolvePublishBranch({
        token: input.token,
        owner: input.owner,
        repo: input.repo,
        fetchImpl,
      })
    );
  const headers = githubHeaders(input.token);
  const url = `${githubContentsUrl(input.owner, input.repo, input.filePath)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetchImpl(url, { headers });
  if (res.status === 404) return null;
  const body = (await res.json()) as {
    content?: string;
    encoding?: string;
    message?: string;
  };
  if (!res.ok || body.encoding !== "base64" || !body.content) {
    throw new Error(
      body.message ?? `GitHub ler ${input.filePath} HTTP ${res.status}`,
    );
  }
  return Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
}

export async function publishToGithub(
  input: PublishGithubInput,
): Promise<{ htmlUrl: string; fullName: string }> {
  const token = input.token.trim();
  if (!token) {
    throw new Error("Token do GitHub não configurado.");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const userRes = await fetchImpl("https://api.github.com/user", { headers });
  const user = (await userRes.json()) as { login?: string; message?: string };
  if (!userRes.ok || !user.login) {
    throw new Error(user.message ?? `GitHub /user HTTP ${userRes.status}`);
  }

  const repoRes = await fetchImpl("https://api.github.com/user/repos", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      private: true,
      auto_init: true,
    }),
  });
  const repo = (await repoRes.json()) as {
    html_url?: string;
    full_name?: string;
    default_branch?: string;
    message?: string;
    errors?: { message?: string }[];
  };
  if (!repoRes.ok || !repo.full_name || !repo.html_url) {
    const alreadyExists = repoRes.status === 422;
    if (!alreadyExists) {
      throw new Error(
        repo.message ??
          repo.errors?.[0]?.message ??
          `GitHub criar repo HTTP ${repoRes.status}`,
      );
    }
    const existingRes = await fetchImpl(
      `https://api.github.com/repos/${user.login}/${input.name}`,
      { headers },
    );
    const existing = (await existingRes.json()) as {
      html_url?: string;
      full_name?: string;
      default_branch?: string;
      message?: string;
    };
    if (!existingRes.ok || !existing.full_name || !existing.html_url) {
      throw new Error(
        existing.message ?? `GitHub repo existente HTTP ${existingRes.status}`,
      );
    }
    repo.full_name = existing.full_name;
    repo.html_url = existing.html_url;
    repo.default_branch = existing.default_branch;
  }

  if (!repo.full_name || !repo.html_url) {
    throw new Error("GitHub não devolveu o repositório.");
  }

  const [owner, repoName] = repo.full_name.split("/");
  await pushFilesToGithubRepo({
    token: input.token,
    owner,
    repo: repoName,
    files: sanitizeFilesForGithubPublish(input.files),
    fetchImpl,
    reset: true,
  });

  return { htmlUrl: repo.html_url, fullName: repo.full_name };
}

export async function getGithubRepoMeta(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}): Promise<{ defaultBranch: string; htmlUrl: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}`,
    { headers },
  );
  const body = (await res.json()) as {
    default_branch?: string;
    html_url?: string;
    message?: string;
  };
  if (!res.ok || !body.html_url) {
    if (res.status === 404 || /not found/i.test(body.message ?? "")) {
      throw new Error(
        `Repositório ${input.owner}/${input.repo} inacessível com o token atual. Confira Configurações → GitHub.`,
      );
    }
    throw new Error(body.message ?? `GitHub repo HTTP ${res.status}`);
  }
  return {
    defaultBranch: body.default_branch ?? "main",
    htmlUrl: body.html_url,
  };
}

export async function resolvePublishBranch(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const meta = await getGithubRepoMeta(input);

  const refRes = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/git/ref/heads/${encodeURIComponent(meta.defaultBranch)}`,
    { headers },
  );
  if (refRes.ok) return meta.defaultBranch;

  const listRes = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}/branches?per_page=10`,
    { headers },
  );
  if (listRes.ok) {
    const list = (await listRes.json()) as { name: string }[];
    if (list[0]?.name) return list[0].name;
  }

  return meta.defaultBranch;
}

export async function pushGithubFile(input: {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  content: string;
  message?: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  const branch =
    input.branch ??
    (await resolvePublishBranch({
      token: input.token,
      owner: input.owner,
      repo: input.repo,
      fetchImpl,
    }));

  const putOnce = async (targetBranch: string, sha?: string) => {
    const encoded = Buffer.from(input.content, "utf8").toString("base64");
    const url = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    return fetchImpl(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message:
          input.message ??
          `chore: adiciona ${input.filePath} (Fábrica de Software)`,
        content: encoded,
        branch: targetBranch,
        sha,
      }),
    });
  };

  let sha: string | undefined;
  const contentUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const existingRes = await fetchImpl(`${contentUrl}?ref=${encodeURIComponent(branch)}`, {
    headers,
  });
  if (existingRes.ok) {
    const existing = (await existingRes.json()) as { sha?: string };
    sha = existing.sha;
  }

  let putRes = await putOnce(branch, sha);
  if (putRes.status === 404 || putRes.status === 422) {
    const fallbackBranch = await resolvePublishBranch({
      token: input.token,
      owner: input.owner,
      repo: input.repo,
      fetchImpl,
    });
    if (fallbackBranch !== branch) {
      putRes = await putOnce(fallbackBranch);
    }
  }

  if (!putRes.ok) {
    const err = (await putRes.json()) as { message?: string };
    throw new Error(
      err.message ?? `GitHub enviar ${input.filePath} HTTP ${putRes.status}`,
    );
  }
}

function isGithubObjectStateError(message: string | undefined): boolean {
  return Boolean(message && /BadObjectState|not a valid|GitRPC/i.test(message));
}

function isTransientGithubError(message: string | undefined): boolean {
  return Boolean(
    message && /fetch failed|ECONNRESET|ETIMEDOUT|socket|network/i.test(message),
  );
}

async function createEmptyGithubRepo(input: {
  token: string;
  name: string;
  description: string;
  fetchImpl?: typeof fetch;
}): Promise<{ htmlUrl: string; fullName: string; owner: string; repo: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = githubHeaders(input.token, true);
  const userRes = await fetchImpl("https://api.github.com/user", { headers });
  const user = (await userRes.json()) as { login?: string; message?: string };
  if (!userRes.ok || !user.login) {
    throw new Error(user.message ?? `GitHub /user HTTP ${userRes.status}`);
  }

  const repoRes = await fetchImpl("https://api.github.com/user/repos", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      private: true,
      auto_init: false,
    }),
  });
  const repo = (await repoRes.json()) as {
    html_url?: string;
    full_name?: string;
    message?: string;
    errors?: { message?: string }[];
  };
  if (!repoRes.ok || !repo.full_name || !repo.html_url) {
    throw new Error(
      repo.message ??
        repo.errors?.[0]?.message ??
        `GitHub criar repo HTTP ${repoRes.status}`,
    );
  }
  const [owner, repoName] = repo.full_name.split("/");
  return {
    htmlUrl: repo.html_url,
    fullName: repo.full_name,
    owner: owner!,
    repo: repoName!,
  };
}

async function deleteGithubRepo(input: {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = githubHeaders(input.token);
  const res = await fetchImpl(
    `https://api.github.com/repos/${input.owner}/${input.repo}`,
    { method: "DELETE", headers },
  );
  return res.ok || res.status === 404;
}

/**
 * Publica o pacote como snapshot completo do branch (sem base_tree).
 * Com reset=true, cria commit órfão e force-push — recupera repos corrompidos.
 */
export async function pushFilesToGithubRepo(input: {
  token: string;
  owner: string;
  repo: string;
  files: Record<string, string>;
  fetchImpl?: typeof fetch;
  message?: string;
  /** Commit órfão + force no branch (ignora histórico corrompido). */
  reset?: boolean;
}): Promise<{ htmlUrl: string; defaultBranch: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const files = sanitizeFilesForGithubPublish(input.files);
  if (Object.keys(files).length === 0) {
    throw new Error("Nenhum arquivo válido para publicar no GitHub.");
  }

  const branch = await resolvePublishBranch(input);
  const headers = githubHeaders(input.token, true);
  const repoBase = `https://api.github.com/repos/${input.owner}/${input.repo}`;

  let parentSha: string | null = null;
  if (!input.reset) {
    const refRes = await fetchImpl(
      `${repoBase}/git/ref/heads/${encodeURIComponent(branch)}`,
      { headers },
    );
    if (refRes.ok) {
      const ref = (await refRes.json()) as { object: { sha: string } };
      parentSha = ref.object.sha;
    }
  } else {
    const refRes = await fetchImpl(
      `${repoBase}/git/ref/heads/${encodeURIComponent(branch)}`,
      { headers },
    );
    if (refRes.ok) {
      const ref = (await refRes.json()) as { object?: { sha?: string } };
      if (ref.object?.sha) {
        // Branch existe: force update depois do commit órfão.
        parentSha = "reset";
      }
    }
  }

  const sortedPaths = Object.keys(files).sort((a, b) => {
    if (a === ".github/workflows/android-debug.yml") return -1;
    if (b === ".github/workflows/android-debug.yml") return 1;
    return a.localeCompare(b);
  });

  const treeEntries: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }[] = [];

  for (let i = 0; i < sortedPaths.length; i += 1) {
    const filePath = sortedPaths[i]!;
    const content = files[filePath]!;
    const blobRes = await fetchImpl(`${repoBase}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: Buffer.from(content, "utf8").toString("base64"),
        encoding: "base64",
      }),
    });
    const blob = (await blobRes.json()) as { sha?: string; message?: string };
    if (!blobRes.ok || !blob.sha) {
      throw new Error(
        blob.message ?? `GitHub blob ${filePath} HTTP ${blobRes.status}`,
      );
    }
    treeEntries.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
    // Evita rajada de API / pressão de memória no Next.
    if (i > 0 && i % 25 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const treeRes = await fetchImpl(`${repoBase}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tree: treeEntries }),
  });
  const tree = (await treeRes.json()) as { sha?: string; message?: string };
  if (!treeRes.ok || !tree.sha) {
    throw new Error(tree.message ?? `GitHub tree HTTP ${treeRes.status}`);
  }

  const commitMessage =
    input.message ??
    `chore: sincroniza ${treeEntries.length} arquivos (Fábrica de Software)`;

  const useOrphan = Boolean(input.reset) || !parentSha || parentSha === "reset";
  const commitRes = await fetchImpl(`${repoBase}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: useOrphan ? `${commitMessage} (reset)` : commitMessage,
      tree: tree.sha,
      parents: useOrphan || !parentSha || parentSha === "reset" ? [] : [parentSha],
    }),
  });
  let commit = (await commitRes.json()) as { sha?: string; message?: string };

  if ((!commitRes.ok || !commit.sha) && parentSha && parentSha !== "reset") {
    if (isGithubObjectStateError(commit.message)) {
      const orphanRes = await fetchImpl(`${repoBase}/git/commits`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: `${commitMessage} (reset)`,
          tree: tree.sha,
          parents: [],
        }),
      });
      commit = (await orphanRes.json()) as { sha?: string; message?: string };
      if (!orphanRes.ok || !commit.sha) {
        throw new Error(
          commit.message ?? `GitHub commit HTTP ${orphanRes.status}`,
        );
      }
      await updateGithubBranchRef({
        fetchImpl,
        headers,
        repoBase,
        branch,
        sha: commit.sha,
        force: true,
        hadParent: true,
      });
      const meta = await getGithubRepoMeta(input);
      return { htmlUrl: meta.htmlUrl, defaultBranch: branch };
    }
    throw new Error(commit.message ?? `GitHub commit HTTP ${commitRes.status}`);
  }

  if (!commitRes.ok || !commit.sha) {
    throw new Error(commit.message ?? `GitHub commit HTTP ${commitRes.status}`);
  }

  await updateGithubBranchRef({
    fetchImpl,
    headers,
    repoBase,
    branch,
    sha: commit.sha,
    force: useOrphan,
    hadParent: Boolean(parentSha),
  });

  const meta = await getGithubRepoMeta(input);
  return { htmlUrl: meta.htmlUrl, defaultBranch: branch };
}

/**
 * Sincroniza com recuperação. Em repo corrompido, cria um repo NOVO
 * (não tenta apagar/reenviar no mesmo — isso derrubava o servidor).
 */
export async function syncFilesToGithubRepo(input: {
  token: string;
  owner: string;
  repo: string;
  files: Record<string, string>;
  description?: string;
  fetchImpl?: typeof fetch;
  message?: string;
  /** Pula tentativa no repo antigo e cria um nome novo imediatamente. */
  preferNewRepo?: boolean;
}): Promise<{ htmlUrl: string; defaultBranch: string; recreated: boolean }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const files = sanitizeFilesForGithubPublish(input.files);

  const tryPush = async (owner: string, repo: string, reset: boolean) =>
    pushFilesToGithubRepo({
      token: input.token,
      owner,
      repo,
      files,
      fetchImpl,
      message: input.message,
      reset,
    });

  if (!input.preferNewRepo) {
    try {
      const result = await tryPush(input.owner, input.repo, true);
      return { ...result, recreated: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTransientGithubError(message)) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const result = await tryPush(input.owner, input.repo, true);
          return { ...result, recreated: false };
        } catch {
          /* cai no recreate */
        }
      } else if (
        !isGithubObjectStateError(message) &&
        !/GitHub (tree|commit|ref|blob)|fetch failed/i.test(message)
      ) {
        throw error;
      }
    }
  }

  // Repo antigo problemático: cria um limpo com sufixo (sem DELETE — evita crash/timeout).
  const suffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const candidates = [
    `${input.repo}-${suffix}`,
    `${input.repo}-v2`,
    `${input.repo}-${Date.now().toString(36).slice(-5)}`,
  ];

  let lastError: unknown = null;
  for (const name of candidates) {
    try {
      const created = await createEmptyGithubRepo({
        token: input.token,
        name,
        description:
          input.description ?? `${input.repo} — gerado pela Fábrica de Software`,
        fetchImpl,
      });
      const result = await tryPush(created.owner, created.repo, true);
      return {
        htmlUrl: result.htmlUrl,
        defaultBranch: result.defaultBranch,
        recreated: true,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao republicar no GitHub após recriar repositório.");
}

async function updateGithubBranchRef(input: {
  fetchImpl: typeof fetch;
  headers: Record<string, string>;
  repoBase: string;
  branch: string;
  sha: string;
  force: boolean;
  hadParent: boolean;
}): Promise<void> {
  const { fetchImpl, headers, repoBase, branch, sha } = input;
  if (input.hadParent) {
    let updateRef = await fetchImpl(
      `${repoBase}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha, force: input.force }),
      },
    );
    if (!updateRef.ok && !input.force) {
      const err = (await updateRef.json()) as { message?: string };
      if (isGithubObjectStateError(err.message) || updateRef.status === 422) {
        updateRef = await fetchImpl(
          `${repoBase}/git/refs/heads/${encodeURIComponent(branch)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ sha, force: true }),
          },
        );
      } else {
        throw new Error(err.message ?? `GitHub ref HTTP ${updateRef.status}`);
      }
    }
    if (!updateRef.ok) {
      const err = (await updateRef.json()) as { message?: string };
      throw new Error(err.message ?? `GitHub ref HTTP ${updateRef.status}`);
    }
    return;
  }

  const createRef = await fetchImpl(`${repoBase}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha,
    }),
  });
  if (!createRef.ok) {
    const err = (await createRef.json()) as { message?: string };
    // Branch pode já existir após recreate parcial.
    if (createRef.status === 422) {
      const forceRef = await fetchImpl(
        `${repoBase}/git/refs/heads/${encodeURIComponent(branch)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ sha, force: true }),
        },
      );
      if (forceRef.ok) return;
    }
    throw new Error(err.message ?? `GitHub ref HTTP ${createRef.status}`);
  }
}
