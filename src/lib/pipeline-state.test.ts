import { describe, expect, it } from "vitest";
import { mergeOrder, mergeRuns, pipelineProgress } from "./pipeline-state";
import type { AgentRunRecord, OrderRecord } from "./store";

function run(
  partial: Partial<AgentRunRecord> & Pick<AgentRunRecord, "id" | "agent">,
): AgentRunRecord {
  return {
    orderId: "o1",
    status: "pending",
    model: null,
    outputText: "",
    errorMessage: null,
    startedAt: null,
    finishedAt: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("mergeRuns", () => {
  it("não regride completed para running", () => {
    const prev = [
      run({
        id: "r1",
        agent: "pm",
        status: "completed",
        outputText: "PRD pronto",
      }),
    ];
    const next = [
      run({ id: "r1", agent: "pm", status: "running", outputText: "" }),
    ];
    const merged = mergeRuns(prev, next);
    expect(merged[0].status).toBe("completed");
    expect(merged[0].outputText).toBe("PRD pronto");
  });

  it("avança de running para completed", () => {
    const prev = [run({ id: "r1", agent: "pm", status: "running" })];
    const next = [
      run({
        id: "r1",
        agent: "pm",
        status: "completed",
        outputText: "ok",
      }),
    ];
    const merged = mergeRuns(prev, next);
    expect(merged[0].status).toBe("completed");
    expect(merged[0].outputText).toBe("ok");
  });

  it("preserva output mais longo", () => {
    const prev = [
      run({ id: "r1", agent: "pm", status: "running", outputText: "abc" }),
    ];
    const next = [
      run({ id: "r1", agent: "pm", status: "running", outputText: "a" }),
    ];
    const merged = mergeRuns(prev, next);
    expect(merged[0].outputText).toBe("abc");
  });

  it("atualiza failed para completed após rerun bem-sucedido", () => {
    const prev = [
      run({
        id: "r1",
        agent: "pm",
        status: "failed",
        errorMessage: "Agente Cursor indisponível",
      }),
    ];
    const next = [
      run({
        id: "r1",
        agent: "pm",
        status: "completed",
        outputText: "PRD pronto",
        errorMessage: null,
        finishedAt: "2026-09-07T13:16:24.271Z",
      }),
    ];
    const merged = mergeRuns(prev, next);
    expect(merged[0].status).toBe("completed");
    expect(merged[0].errorMessage).toBeNull();
    expect(merged[0].outputText).toBe("PRD pronto");
  });

  it("aceita reset para pending após rerun", () => {
    const prev = [run({ id: "r1", agent: "pm", status: "failed" })];
    const next = [run({ id: "r1", agent: "pm", status: "pending" })];
    expect(mergeRuns(prev, next)[0].status).toBe("pending");
  });
});

describe("mergeOrder", () => {
  it("prefere snapshot mais recente pelo updatedAt", () => {
    const prev = {
      status: "completed",
      currentAgent: null,
      updatedAt: "2026-01-01T12:00:00.000Z",
    } as OrderRecord;
    const next = {
      status: "running",
      currentAgent: "pm",
      updatedAt: "2026-01-01T11:00:00.000Z",
    } as OrderRecord;
    const merged = mergeOrder(prev, next);
    expect(merged.status).toBe("completed");
  });

  it("aceita rerun mais recente", () => {
    const prev = {
      status: "completed",
      updatedAt: "2026-01-01T12:00:00.000Z",
    } as OrderRecord;
    const next = {
      status: "queued",
      updatedAt: "2026-01-01T13:00:00.000Z",
    } as OrderRecord;
    expect(mergeOrder(prev, next).status).toBe("queued");
  });
});

describe("pipelineProgress", () => {
  it("ignora agentes pulados", () => {
    const runs = [
      run({ id: "1", agent: "pm", status: "completed" }),
      run({ id: "2", agent: "backend", status: "skipped" }),
      run({ id: "3", agent: "architect", status: "running" }),
    ];
    expect(pipelineProgress(runs)).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
    });
  });
});
