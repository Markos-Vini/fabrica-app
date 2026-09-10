import { open, unlink, writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trava exclusiva entre processos (Next workers / reinícios sobrepostos)
 * para o arquivo de dados da Fábrica.
 */
export async function withStoreFileLock<T>(
  dataFile: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockPath = `${dataFile}.lock`;
  await mkdir(path.dirname(dataFile), { recursive: true });
  const started = Date.now();

  for (;;) {
    try {
      if (existsSync(lockPath)) {
        try {
          const { statSync } = await import("node:fs");
          const age = Date.now() - statSync(lockPath).mtimeMs;
          if (age > LOCK_STALE_MS) {
            await unlink(lockPath).catch(() => undefined);
          }
        } catch {
          /* ignore */
        }
      }

      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(String(process.pid), "utf8");
        return await fn();
      } finally {
        await handle.close().catch(() => undefined);
        await unlink(lockPath).catch(() => undefined);
      }
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code !== "EEXIST") throw error;
      if (Date.now() - started > LOCK_WAIT_MS) {
        throw new Error("Timeout ao obter trava do store da Fábrica.");
      }
      await sleep(40 + Math.floor(Math.random() * 40));
    }
  }
}

/** Grava JSON de forma atômica (temp + rename) para evitar arquivo pela metade. */
export async function writeJsonAtomic(
  filePath: string,
  data: unknown,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tempPath, filePath);
}
