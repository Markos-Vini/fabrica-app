import {
  claimNextJob,
  enqueueJob as persistJob,
  finishJob,
  recoverStaleJobs,
} from "./store";
import { getJobHandler } from "./handlers";
import type { EnqueueInput, JobRecord } from "./types";

let activeDrain: Promise<void> | null = null;

export async function enqueueJob(input: EnqueueInput): Promise<JobRecord | null> {
  const job = await persistJob(input);
  if (job) kickWorker();
  return job;
}

export function kickWorker(): void {
  void drainQueue().catch((error) => {
    console.error("[fabrica-jobs] worker error", error);
  });
}

export async function resumeJobWorker(): Promise<void> {
  const recovered = await recoverStaleJobs();
  if (recovered > 0) {
    console.info(`[fabrica-jobs] ${recovered} job(s) re-enfileirado(s) após restart`);
  }
  kickWorker();
}

export async function drainQueue(): Promise<void> {
  if (activeDrain) {
    await activeDrain;
    return;
  }
  activeDrain = drainQueueInner().finally(() => {
    activeDrain = null;
  });
  await activeDrain;
}

async function drainQueueInner(): Promise<void> {
  for (;;) {
    const job = await claimNextJob();
    if (!job) break;
    await runJob(job);
  }
}

async function runJob(job: JobRecord): Promise<void> {
  try {
    await getJobHandler(job.type)(job.orderId);
    await finishJob(job.id, "completed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao processar job";
    await finishJob(job.id, "failed", message);
  }
}
