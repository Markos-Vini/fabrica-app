import type { AgentRunRecord, OrderRecord, RunStatus } from "@/lib/store";

const ORDER_STATUS_RANK: Record<OrderRecord["status"], number> = {
  queued: 0,
  running: 1,
  completed: 2,
  failed: 3,
};

function pickRunStatus(prev: RunStatus, next: RunStatus): RunStatus {
  if (prev === "skipped" || next === "skipped") {
    return prev === "skipped" ? prev : next;
  }
  // Poll atrasado durante execução: não regride agente já concluído.
  if (prev === "completed" && (next === "running" || next === "pending")) {
    return "completed";
  }
  // Após rerun, o servidor é fonte da verdade (failed→pending/completed, etc.).
  return next;
}

function pickOutput(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  return next.length >= prev.length ? next : prev;
}

export function mergeRuns(
  prev: AgentRunRecord[],
  next: AgentRunRecord[],
): AgentRunRecord[] {
  const prevById = new Map(prev.map((run) => [run.id, run]));

  return next.map((run) => {
    const old = prevById.get(run.id);
    if (!old) return run;

    const status = pickRunStatus(old.status, run.status);
    const outputText = pickOutput(old.outputText, run.outputText);
    const errorMessage =
      status === "completed" ? null : (run.errorMessage ?? old.errorMessage);

    if (
      status === old.status &&
      outputText === old.outputText &&
      errorMessage === old.errorMessage
    ) {
      return old;
    }

    return {
      ...run,
      status,
      outputText,
      errorMessage,
      model: run.model ?? old.model,
      startedAt: run.startedAt ?? old.startedAt,
      finishedAt: run.finishedAt ?? old.finishedAt,
    };
  });
}

export function mergeOrder(prev: OrderRecord, next: OrderRecord): OrderRecord {
  const prevTime = Date.parse(prev.updatedAt);
  const nextTime = Date.parse(next.updatedAt);

  if (nextTime > prevTime) return next;
  if (nextTime < prevTime) return prev;

  if (prev.status === "failed" && next.status === "completed") return next;
  if (prev.status === "completed" && next.status === "failed") return prev;

  return ORDER_STATUS_RANK[next.status] >= ORDER_STATUS_RANK[prev.status]
    ? next
    : prev;
}

export function pipelineProgress(runs: AgentRunRecord[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const active = runs.filter((run) => run.status !== "skipped");
  const completed = active.filter((run) => run.status === "completed").length;
  const total = active.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}
