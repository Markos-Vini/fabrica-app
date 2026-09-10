import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { filesForOrder } from "@/lib/agents/deliver";
import { assertMobileApkSource } from "@/lib/artifacts/assert-mobile-apk-source";
import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";
import { APK_WORKFLOW_PATH } from "@/lib/artifacts/apk-workflow-files";
import {
  dispatchApkWorkflow,
  downloadArtifact,
  findArtifact,
  findNewWorkflowRun,
  getLatestWorkflowRun,
  githubActionsWorkflowUrl,
  parseRepoFromUrl,
  pollRunUntilDone,
  workflowExists,
} from "@/lib/github/actions";
import { getGithubRepoMeta, syncFilesToGithubRepo, pushFilesToGithubRepo, pushGithubFile, fetchGithubFileContent } from "@/lib/github/publish";
import { getGithubToken } from "@/lib/settings";
import { getOrder, updateOrder } from "@/lib/store";

export function apkFilePath(orderId: string): string {
  return path.join(process.cwd(), "storage", "orders", orderId, "app-debug.zip");
}

export async function deleteApkArtifact(orderId: string): Promise<void> {
  const filePath = apkFilePath(orderId);
  if (!existsSync(filePath)) return;
  await rm(filePath, { force: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistOrderFiles(
  orderId: string,
  files: Record<string, string>,
): Promise<void> {
  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "tree.json"), JSON.stringify(files, null, 2), "utf8");
}

async function syncOrderToGithubBeforeApk(
  orderId: string,
  token: string,
  owner: string,
  repo: string,
): Promise<void> {
  const loaded = await getOrder(orderId);
  if (!loaded) {
    throw new Error("Pedido não encontrado.");
  }
  const files = await filesForOrder(orderId);
  assertMobileApkSource(loaded.order, files);

  const synced = await syncFilesToGithubRepo({
    token,
    owner,
    repo,
    files,
    description: `${loaded.order.name} — gerado pela Fábrica de Software`,
    message: `chore: sincroniza pacote completo antes do APK (${loaded.order.name})`,
  });
  let targetOwner = owner;
  let targetRepo = repo;
  if (synced.htmlUrl && synced.htmlUrl !== loaded.order.githubUrl) {
    await updateOrder(orderId, { githubUrl: synced.htmlUrl, githubError: null });
    const parsed = parseRepoFromUrl(synced.htmlUrl);
    targetOwner = parsed.owner;
    targetRepo = parsed.repo;
  }

  const remoteMain = await fetchGithubFileContent({
    token,
    owner: targetOwner,
    repo: targetRepo,
    branch: synced.defaultBranch,
    filePath: "mobile/lib/main.dart",
  });
  assertMobileApkSource(loaded.order, {
    "mobile/lib/main.dart": remoteMain ?? "",
  });

  await persistOrderFiles(orderId, files);
}

async function ensureWorkflowPublished(
  orderId: string,
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  if (await workflowExists({ token, owner, repo })) {
    const { defaultBranch } = await getGithubRepoMeta({ token, owner, repo });
    return defaultBranch;
  }

  const files = await filesForOrder(orderId);
  const workflow = files[APK_WORKFLOW_PATH];
  if (!workflow?.trim()) {
    throw new Error(
      "Workflow de APK ausente no pacote. Clique em “Republicar no GitHub” e tente de novo.",
    );
  }

  try {
    await pushGithubFile({
      token,
      owner,
      repo,
      filePath: APK_WORKFLOW_PATH,
      content: workflow,
      message: "chore: adiciona workflow APK debug (Fábrica de Software)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar workflow";
    if (!/not found/i.test(message)) throw error;

    await pushFilesToGithubRepo({
      token,
      owner,
      repo,
      files: { [APK_WORKFLOW_PATH]: workflow },
      reset: true,
    });
  }

  await persistOrderFiles(orderId, files);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(2500);
    if (await workflowExists({ token, owner, repo })) {
      const { defaultBranch } = await getGithubRepoMeta({ token, owner, repo });
      return defaultBranch;
    }
  }

  throw new Error(
    "Workflow enviado, mas o GitHub ainda não indexou. Aguarde 15s e clique em “Gerar APK de teste”.",
  );
}

export async function buildApkForOrder(orderId: string): Promise<void> {
  const loaded = await getOrder(orderId);
  if (!loaded) return;
  const { order } = loaded;

  if (!order.generateTestBuild || !supportsNativeApk(order.mobileStack)) {
    await updateOrder(orderId, { apkStatus: "skipped" });
    return;
  }
  if (!order.githubUrl) {
    await updateOrder(orderId, {
      apkStatus: "failed",
      apkError: "Publique no GitHub antes de gerar o APK.",
    });
    return;
  }

  const token = await getGithubToken();
  if (!token) {
    await updateOrder(orderId, {
      apkStatus: "failed",
      apkError: "Token do GitHub não configurado.",
    });
    return;
  }

  await updateOrder(orderId, {
    apkStatus: "building",
    apkError: null,
    apkRunUrl: null,
  });

  try {
    const { owner, repo } = parseRepoFromUrl(order.githubUrl);

    const baselineRun = await getLatestWorkflowRun({ token, owner, repo });
    const baselineRunId = baselineRun?.id ?? 0;
    const dispatchAt = Date.now();

    const defaultBranch = await ensureWorkflowPublished(orderId, token, owner, repo);

    await syncOrderToGithubBeforeApk(orderId, token, owner, repo);

    await dispatchApkWorkflow({
      token,
      owner,
      repo,
      ref: defaultBranch,
    });

    const actionsUrl = githubActionsWorkflowUrl(owner, repo);
    await updateOrder(orderId, {
      apkRunUrl: actionsUrl,
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(3000);
      const started = await findNewWorkflowRun({
        token,
        owner,
        repo,
        afterRunId: baselineRunId,
        minCreatedAtMs: dispatchAt - 15_000,
      });
      if (started?.html_url) {
        await updateOrder(orderId, { apkRunUrl: started.html_url });
        break;
      }
    }

    const run = await pollRunUntilDone({
      token,
      owner,
      repo,
      maxAttempts: 90,
      delayMs: 8000,
      afterRunId: baselineRunId,
      minCreatedAtMs: dispatchAt - 15_000,
    });
    const artifact = await findArtifact({
      token,
      owner,
      repo,
      runId: run.id,
    });
    if (!artifact) {
      throw new Error(
        "Build concluiu, mas o artefato app-debug não foi encontrado. Veja o workflow no GitHub.",
      );
    }
    const buffer = await downloadArtifact(token, artifact);
    const dir = path.join(process.cwd(), "storage", "orders", orderId);
    await mkdir(dir, { recursive: true });
    await writeFile(apkFilePath(orderId), buffer);
    await updateOrder(orderId, {
      apkStatus: "ready",
      apkRunUrl: run.html_url,
      apkError: null,
    });
  } catch (error) {
    await updateOrder(orderId, {
      apkStatus: "failed",
      apkError: error instanceof Error ? error.message : "Falha ao gerar APK",
    });
  }
}
