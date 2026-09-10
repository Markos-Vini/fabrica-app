import { buildApkForOrder } from "@/lib/agents/apk-build";
import { publishOrderArtifacts } from "@/lib/agents/deliver";
import { runPipeline } from "@/lib/agents/pipeline";
import type { JobType } from "./types";

export type JobHandler = (orderId: string) => Promise<void>;

const defaultHandlers: Record<JobType, JobHandler> = {
  pipeline: runPipeline,
  apk: buildApkForOrder,
  publish: publishOrderArtifacts,
};

let handlers: Record<JobType, JobHandler> = { ...defaultHandlers };

export function getJobHandler(type: JobType): JobHandler {
  return handlers[type];
}

export function setJobHandlersForTests(
  patch: Partial<Record<JobType, JobHandler>>,
): void {
  handlers = { ...defaultHandlers, ...patch };
}

export function resetJobHandlersForTests(): void {
  handlers = { ...defaultHandlers };
}
