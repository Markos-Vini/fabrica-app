import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generateMockProject } from "@/lib/artifacts/mock-factory";
import { ensureApkWorkflowFiles } from "@/lib/artifacts/apk-workflow-files";
import { ensureRunArtifacts } from "@/lib/artifacts/ensure-run-artifacts";
import { ensureMobileDeliverable } from "@/lib/artifacts/scope-files";
import { parseRepoFromUrl } from "@/lib/github/actions";
import { publishToGithub, syncFilesToGithubRepo } from "@/lib/github/publish";
import { githubRepoName } from "@/lib/github/repo-name";
import { getGithubToken, getVercelToken } from "@/lib/settings";
import { getOrder, updateOrder } from "@/lib/store";
import { isPlanningOrder } from "@/lib/factory-mode";
import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";
import { deployToVercel } from "@/lib/vercel/deploy";
import { prepareFrontendDeployFiles } from "@/lib/vercel/prepare-frontend-deploy";
import { apkFilePath, deleteApkArtifact } from "@/lib/agents/apk-build";

export async function loadCollectedFiles(
  orderId: string,
): Promise<Record<string, string> | null> {
  const treePath = path.join(process.cwd(), "storage", "orders", orderId, "tree.json");
  if (!existsSync(treePath)) return null;
  const raw = await readFile(treePath, "utf8");
  return JSON.parse(raw) as Record<string, string>;
}

export async function filesForOrder(
  orderId: string,
): Promise<Record<string, string>> {
  const loaded = await getOrder(orderId);
  if (!loaded) throw new Error("Pedido não encontrado");
  const fromDisk = await loadCollectedFiles(orderId);
  let base =
    fromDisk && Object.keys(fromDisk).length > 0
      ? fromDisk
      : generateMockProject(loaded.order);
  base = ensureMobileDeliverable(loaded.order, base);
  Object.assign(base, ensureRunArtifacts(loaded.order, base));
  return ensureApkWorkflowFiles(loaded.order, base);
}

export async function publishOrderArtifacts(orderId: string): Promise<void> {
  const loaded = await getOrder(orderId);
  if (!loaded) return;

  if (isPlanningOrder(loaded.order)) {
    await updateOrder(orderId, {
      apkStatus: "skipped",
      githubError: null,
    });
    return;
  }

  const files = await filesForOrder(orderId);
  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "tree.json"), JSON.stringify(files, null, 2), "utf8");

  const githubToken = await getGithubToken();
  const isRepublish = Boolean(loaded.order.githubUrl);
  if (githubToken) {
    try {
      const published = loaded.order.githubUrl
        ? await (async () => {
            const { owner, repo } = parseRepoFromUrl(loaded.order.githubUrl!);
            const synced = await syncFilesToGithubRepo({
              token: githubToken,
              owner,
              repo,
              files,
              description: `${loaded.order.name} — gerado pela Fábrica de Software`,
              message: `chore: republica pacote completo (${loaded.order.name})`,
              preferNewRepo: /BadObjectState|GitRPC|fetch failed/i.test(
                loaded.order.githubError ?? "",
              ),
            });
            return { htmlUrl: synced.htmlUrl };
          })()
        : await publishToGithub({
            token: githubToken,
            name: githubRepoName(loaded.order.name),
            description: `${loaded.order.name} — gerado pela Fábrica de Software`,
            files,
          });
      const wantsApk =
        loaded.order.generateTestBuild &&
        supportsNativeApk(loaded.order.mobileStack);
      if (
        wantsApk &&
        isRepublish &&
        (loaded.order.apkStatus === "ready" || existsSync(apkFilePath(orderId)))
      ) {
        await deleteApkArtifact(orderId);
      }
      await updateOrder(orderId, {
        githubUrl: published.htmlUrl,
        githubError: null,
        apkError: null,
        apkStatus: wantsApk ? "idle" : loaded.order.apkStatus,
      });
      if (
        !isRepublish &&
        loaded.order.generateTestBuild &&
        supportsNativeApk(loaded.order.mobileStack)
      ) {
        const alreadyBuilding =
          loaded.order.apkStatus === "building" ||
          (await import("@/lib/jobs/store").then(({ hasActiveJob }) =>
            hasActiveJob(orderId, "apk"),
          ));
        if (!alreadyBuilding) {
          void import("@/lib/jobs/worker").then(({ enqueueJob }) =>
            enqueueJob({ type: "apk", orderId }),
          );
        }
      }
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : "Falha ao publicar no GitHub";
      const githubError = /BadObjectState|GitRPC/i.test(raw)
        ? `${raw} — o repositório estava corrompido; tente Republicar de novo (a Fábrica recria o repo automaticamente).`
        : raw;
      await updateOrder(orderId, { githubError });
    }
  }

  const vercelToken = await getVercelToken();
  if (vercelToken && loaded.order.includeFrontend) {
    if (isRepublish) {
      await updateOrder(orderId, { vercelUrl: null, vercelError: null });
    }

    const frontendFiles = prepareFrontendDeployFiles(files);
    if (frontendFiles && Object.keys(frontendFiles).length > 0) {
      try {
        const deployed = await deployToVercel({
          token: vercelToken,
          name: githubRepoName(loaded.order.name),
          files: frontendFiles,
          env: {
            NEXT_PUBLIC_USE_MOCK_API: "true",
          },
        });
        await updateOrder(orderId, {
          vercelUrl: deployed.url,
          vercelError: null,
        });
      } catch (error) {
        await updateOrder(orderId, {
          vercelUrl: null,
          vercelError:
            error instanceof Error ? error.message : "Falha ao publicar na Vercel",
        });
      }
    } else {
      await updateOrder(orderId, {
        vercelUrl: null,
        vercelError: "Nenhum arquivo em frontend/ para publicar na Vercel.",
      });
    }
  }
}
