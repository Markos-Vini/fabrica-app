import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import {
  JOBS_FILE as jobsFile,
  enqueueJob as persistJob,
  listJobsForOrder,
  resetJobsCacheForTests,
} from "./store";
import {
  resetJobHandlersForTests,
  setJobHandlersForTests,
} from "./handlers";
import { drainQueue } from "./worker";

describe("job worker", () => {
  beforeEach(async () => {
    resetJobsCacheForTests();
    resetJobHandlersForTests();
    const file = jobsFile();
    if (existsSync(file)) await rm(file, { force: true });
  });

  afterEach(async () => {
    resetJobsCacheForTests();
    resetJobHandlersForTests();
    const file = jobsFile();
    if (existsSync(file)) await rm(file, { force: true });
  });

  it("executa handler registrado e marca job como completed", async () => {
    const handler = vi.fn(async () => undefined);
    setJobHandlersForTests({ pipeline: handler });

    await persistJob({ type: "pipeline", orderId: "order-1" });
    await drainQueue();

    expect(handler).toHaveBeenCalledWith("order-1");
    const jobs = await listJobsForOrder("order-1");
    expect(jobs[0]?.status).toBe("completed");
  });

  it("marca job como failed quando handler lança erro", async () => {
    setJobHandlersForTests({
      apk: async () => {
        throw new Error("GitHub offline");
      },
    });

    await persistJob({ type: "apk", orderId: "order-2" });
    await drainQueue();

    const jobs = await listJobsForOrder("order-2");
    expect(jobs[0]?.status).toBe("failed");
    expect(jobs[0]?.errorMessage).toContain("GitHub offline");
  });
});
