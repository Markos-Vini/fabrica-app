import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cancelPendingJobsForOrder,
  cancelDeliveryJobsForOrder,
  claimNextJob,
  enqueueJob,
  finishJob,
  hasActiveJob,
  JOBS_FILE,
  reconcileDeliveryJobs,
  recoverStaleJobs,
  resetJobsCacheForTests,
} from "./store";

describe("jobs store", () => {
  beforeEach(async () => {
    resetJobsCacheForTests();
    if (existsSync(JOBS_FILE)) await rm(JOBS_FILE, { force: true });
  });

  afterEach(async () => {
    resetJobsCacheForTests();
    if (existsSync(JOBS_FILE)) await rm(JOBS_FILE, { force: true });
  });

  it("enfileira e processa jobs em ordem FIFO", async () => {
    const first = await enqueueJob({ type: "pipeline", orderId: "order-a" });
    const second = await enqueueJob({ type: "apk", orderId: "order-b" });
    expect(first?.status).toBe("pending");
    expect(second?.status).toBe("pending");

    const claimed = await claimNextJob();
    expect(claimed?.orderId).toBe("order-a");
    expect(claimed?.status).toBe("running");

    await finishJob(claimed!.id, "completed");
    const next = await claimNextJob();
    expect(next?.orderId).toBe("order-b");
  });

  it("não duplica job pendente do mesmo tipo e pedido", async () => {
    await enqueueJob({ type: "pipeline", orderId: "order-a" });
    const duplicate = await enqueueJob({ type: "pipeline", orderId: "order-a" });
    expect(duplicate).toBeNull();
    expect(await hasActiveJob("order-a", "pipeline")).toBe(true);
  });

  it("marca publish/apk running como falhos após crash (não re-enfileira)", async () => {
    const publish = await enqueueJob({ type: "publish", orderId: "order-x" });
    const pipeline = await enqueueJob({ type: "pipeline", orderId: "order-y" });
    await claimNextJob();
    await claimNextJob();
    const recovered = await recoverStaleJobs();
    expect(recovered).toBe(2);
    expect(await hasActiveJob("order-x", "publish")).toBe(false);
    expect(await hasActiveJob("order-y", "pipeline")).toBe(true);
    expect(publish).toBeTruthy();
    expect(pipeline).toBeTruthy();
  });

  it("persiste jobs em data/jobs.json", async () => {
    await enqueueJob({ type: "apk", orderId: "order-z" });
    resetJobsCacheForTests();
    expect(existsSync(JOBS_FILE)).toBe(true);
    expect(await hasActiveJob("order-z", "apk")).toBe(true);
    expect(path.basename(JOBS_FILE)).toBe("jobs.json");
  });

  it("cancela jobs pendentes ou em execução de um pedido", async () => {
    await enqueueJob({ type: "pipeline", orderId: "order-cancel" });
    await claimNextJob();
    const count = await cancelPendingJobsForOrder("order-cancel");
    expect(count).toBe(1);
    expect(await hasActiveJob("order-cancel", "pipeline")).toBe(false);
  });

  it("cancela só publish e apk sem parar a esteira", async () => {
    await enqueueJob({ type: "pipeline", orderId: "order-mix" });
    await enqueueJob({ type: "publish", orderId: "order-mix" });
    await enqueueJob({ type: "apk", orderId: "order-mix" });
    const count = await cancelDeliveryJobsForOrder("order-mix");
    expect(count).toBe(2);
    expect(await hasActiveJob("order-mix", "pipeline")).toBe(true);
    expect(await hasActiveJob("order-mix", "publish")).toBe(false);
    expect(await hasActiveJob("order-mix", "apk")).toBe(false);
  });

  it("reconcile falha jobs pending antigos", async () => {
    await enqueueJob({ type: "publish", orderId: "order-stale" });
    const data = JSON.parse(await readFile(JOBS_FILE, "utf8")) as {
      jobs: Array<{ createdAt: string }>;
    };
    data.jobs[0]!.createdAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await writeFile(JOBS_FILE, JSON.stringify(data, null, 2));
    resetJobsCacheForTests();

    const count = await reconcileDeliveryJobs("order-stale");
    expect(count).toBe(1);
    expect(await hasActiveJob("order-stale", "publish")).toBe(false);
  });

  it("reconcile remove publish órfão quando pedido já foi entregue", async () => {
    const orderId = "order-delivered";
    const deliveredAt = new Date().toISOString();
    await enqueueJob({ type: "publish", orderId });
    const data = JSON.parse(await readFile(JOBS_FILE, "utf8")) as {
      jobs: Array<{ createdAt: string }>;
    };
    data.jobs[0]!.createdAt = new Date(Date.now() - 60_000).toISOString();
    await writeFile(JOBS_FILE, JSON.stringify(data, null, 2));
    resetJobsCacheForTests();

    const count = await reconcileDeliveryJobs(orderId, {
      githubUrl: "https://github.com/test/repo",
      githubError: null,
      vercelUrl: "https://test.vercel.app",
      vercelError: null,
      includeFrontend: true,
      updatedAt: deliveredAt,
    });
    expect(count).toBe(1);
    expect(await hasActiveJob(orderId, "publish")).toBe(false);
  });
});
