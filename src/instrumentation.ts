export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { reconcileStoreOnBoot } = await import("./lib/store");
    const fixed = await reconcileStoreOnBoot();
    if (fixed > 0) {
      console.info(`[fabrica-store] ${fixed} correção(ões) aplicadas no boot`);
    }
  } catch (error) {
    console.error("[fabrica-store] reconcile no boot ignorado", error);
  }

  // Worker de fila longa não é confiável em serverless da Vercel.
  if (process.env.VERCEL) return;

  try {
    const { resumeJobWorker } = await import("./lib/jobs/worker");
    await resumeJobWorker();
  } catch (error) {
    console.error("[fabrica-jobs] worker no boot ignorado", error);
  }
}
