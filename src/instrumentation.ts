export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reconcileStoreOnBoot } = await import("./lib/store");
    const fixed = await reconcileStoreOnBoot();
    if (fixed > 0) {
      console.info(`[fabrica-store] ${fixed} correção(ões) aplicadas no boot`);
    }
    const { resumeJobWorker } = await import("./lib/jobs/worker");
    await resumeJobWorker();
  }
}
