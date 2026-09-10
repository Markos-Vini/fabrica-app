import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getOrder } from "@/lib/store";
import type { EnqueueInput, JobRecord, JobStatus, JobType } from "./types";

type DeliveryOrderHint = {
  githubUrl: string | null;
  githubError: string | null;
  vercelUrl: string | null;
  vercelError: string | null;
  includeFrontend: boolean;
  updatedAt: string;
  apkStatus?: string;
};

type JobsData = { jobs: JobRecord[] };

const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

function nowIso(): string {
  return new Date().toISOString();
}

function cuid(): string {
  return randomBytes(12).toString("hex");
}

function emptyJobs(): JobsData {
  return { jobs: [] };
}

let cache: JobsData | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function readJobs(): Promise<JobsData> {
  if (cache) return cache;
  if (!existsSync(JOBS_FILE)) {
    cache = emptyJobs();
    return cache;
  }
  const raw = await readFile(JOBS_FILE, "utf8");
  const parsed = JSON.parse(raw) as JobsData;
  parsed.jobs = parsed.jobs ?? [];
  cache = parsed;
  return cache;
}

async function writeJobs(data: JobsData): Promise<void> {
  cache = data;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(JOBS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function deliveryAlreadySucceeded(hint: DeliveryOrderHint): boolean {
  if (!hint.githubUrl || hint.githubError) return false;
  if (hint.includeFrontend && !hint.vercelUrl && !hint.vercelError) return false;
  if (hint.includeFrontend && hint.vercelError) return false;
  return true;
}

function isOrphanedDeliveryJob(job: JobRecord, hint: DeliveryOrderHint): boolean {
  if (job.type !== "publish" && job.type !== "apk") return false;
  if (job.status !== "pending" && job.status !== "running") return false;
  if (Date.parse(job.createdAt) > Date.parse(hint.updatedAt)) return false;
  if (job.type === "publish") return deliveryAlreadySucceeded(hint);
  return hint.apkStatus === "ready" || hint.apkStatus === "failed";
}

export async function listJobsForOrder(orderId: string): Promise<JobRecord[]> {
  const loaded = await getOrder(orderId);
  const hint = loaded?.order
    ? {
        githubUrl: loaded.order.githubUrl,
        githubError: loaded.order.githubError,
        vercelUrl: loaded.order.vercelUrl,
        vercelError: loaded.order.vercelError,
        includeFrontend: loaded.order.includeFrontend,
        updatedAt: loaded.order.updatedAt,
        apkStatus: loaded.order.apkStatus,
      }
    : undefined;
  await reconcileDeliveryJobs(orderId, hint);
  return locked(async () => {
    const data = await readJobs();
    return data.jobs
      .filter((job) => job.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

const PENDING_STALE_MS = 2 * 60 * 1000;
const RUNNING_STALE_MS = 10 * 60 * 1000;

function failDeliveryJob(job: JobRecord, message: string): void {
  job.status = "failed";
  job.errorMessage = message;
  job.finishedAt = nowIso();
}

/** Marca jobs de entrega presos (fila morta ou worker interrompido) como falhos. */
export async function reconcileDeliveryJobs(
  orderId?: string,
  orderHint?: DeliveryOrderHint,
): Promise<number> {
  return locked(async () => {
    const data = await readJobs();
    let count = 0;
    const now = Date.now();
    for (const job of data.jobs) {
      if (job.type !== "publish" && job.type !== "apk") continue;
      if (orderId && job.orderId !== orderId) continue;
      if (orderHint && isOrphanedDeliveryJob(job, orderHint)) {
        failDeliveryJob(job, "Job órfão — entrega já concluída ou substituída.");
        count += 1;
        continue;
      }
      if (job.status === "pending") {
        const age = now - Date.parse(job.createdAt);
        if (age > PENDING_STALE_MS) {
          failDeliveryJob(
            job,
            "Job expirou na fila (worker inativo ou interrompido).",
          );
          count += 1;
        }
      }
      if (job.status === "running") {
        const started = job.startedAt ? Date.parse(job.startedAt) : Date.parse(job.createdAt);
        if (now - started > RUNNING_STALE_MS) {
          failDeliveryJob(job, "Job expirou ou foi interrompido.");
          count += 1;
        }
      }
    }
    if (count > 0) await writeJobs(data);
    return count;
  });
}

export async function hasActiveJob(
  orderId: string,
  type: JobType,
): Promise<boolean> {
  return locked(async () => {
    const data = await readJobs();
    return data.jobs.some(
      (job) =>
        job.orderId === orderId &&
        job.type === type &&
        (job.status === "pending" || job.status === "running"),
    );
  });
}

export async function enqueueJob(input: EnqueueInput): Promise<JobRecord | null> {
  return locked(async () => {
    const data = await readJobs();
    const duplicate = data.jobs.some(
      (job) =>
        job.orderId === input.orderId &&
        job.type === input.type &&
        (job.status === "pending" || job.status === "running"),
    );
    if (duplicate) return null;

    const job: JobRecord = {
      id: cuid(),
      type: input.type,
      orderId: input.orderId,
      status: "pending",
      errorMessage: null,
      createdAt: nowIso(),
      startedAt: null,
      finishedAt: null,
      attempts: 0,
    };
    data.jobs.unshift(job);
    await writeJobs(data);
    return job;
  });
}

export async function claimNextJob(): Promise<JobRecord | null> {
  return locked(async () => {
    const data = await readJobs();
    const pending = [...data.jobs]
      .filter((job) => job.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const job = pending[0];
    if (!job) return null;
    job.status = "running";
    job.startedAt = nowIso();
    job.attempts += 1;
    await writeJobs(data);
    return { ...job };
  });
}

export async function finishJob(
  id: string,
  status: Extract<JobStatus, "completed" | "failed">,
  errorMessage: string | null = null,
): Promise<void> {
  await locked(async () => {
    const data = await readJobs();
    const job = data.jobs.find((item) => item.id === id);
    if (!job) return;
    job.status = status;
    job.errorMessage = errorMessage;
    job.finishedAt = nowIso();
    await writeJobs(data);
  });
}

export async function recoverStaleJobs(): Promise<number> {
  return locked(async () => {
    const data = await readJobs();
    let count = 0;
    for (const job of data.jobs) {
      if (job.status !== "running") continue;
      if (job.type === "publish" || job.type === "apk") {
        failDeliveryJob(job, "Job interrompido ao reiniciar o servidor.");
      } else if (job.type === "pipeline") {
        const loaded = await getOrder(job.orderId);
        const order = loaded?.order;
        const runsDone =
          loaded &&
          loaded.runs
            .filter((run) => run.status !== "skipped")
            .every((run) => run.status === "completed");
        if (order?.status === "completed" || runsDone) {
          job.status = "completed";
          job.errorMessage = null;
          job.finishedAt = nowIso();
        } else if (
          order?.derivedSoftwareOrderId &&
          (await getOrder(order.derivedSoftwareOrderId))?.order.status ===
            "completed"
        ) {
          // Não reexecuta planejamento se o software já existe.
          job.status = "completed";
          job.errorMessage = null;
          job.finishedAt = nowIso();
        } else {
          job.status = "pending";
          job.startedAt = null;
        }
      } else {
        job.status = "pending";
        job.startedAt = null;
      }
      count += 1;
    }
    if (count > 0) await writeJobs(data);
    return count;
  });
}

export async function cancelPendingJobsForOrder(orderId: string): Promise<number> {
  return locked(async () => {
    const data = await readJobs();
    let count = 0;
    for (const job of data.jobs) {
      if (
        job.orderId === orderId &&
        (job.status === "pending" || job.status === "running")
      ) {
        job.status = "failed";
        job.errorMessage = "Cancelado pelo usuário.";
        job.finishedAt = nowIso();
        count += 1;
      }
    }
    if (count > 0) await writeJobs(data);
    return count;
  });
}

/** Cancela apenas jobs de entrega (GitHub/Vercel/APK), sem interromper a esteira. */
export async function cancelDeliveryJobsForOrder(orderId: string): Promise<number> {
  return locked(async () => {
    const data = await readJobs();
    let count = 0;
    for (const job of data.jobs) {
      if (
        job.orderId === orderId &&
        (job.type === "publish" || job.type === "apk") &&
        (job.status === "pending" || job.status === "running")
      ) {
        job.status = "failed";
        job.errorMessage = "Cancelado pelo usuário.";
        job.finishedAt = nowIso();
        count += 1;
      }
    }
    if (count > 0) await writeJobs(data);
    return count;
  });
}

/** Apenas para testes — limpa cache e arquivo em memória. */
export function resetJobsCacheForTests(): void {
  cache = null;
}

export { JOBS_FILE };
