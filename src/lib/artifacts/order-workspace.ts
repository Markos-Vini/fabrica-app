import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function orderWorkspaceDir(orderId: string): string {
  return path.join(process.cwd(), "storage", "orders", orderId, "workspace");
}

export async function ensureOrderWorkspace(orderId: string): Promise<string> {
  const dir = orderWorkspaceDir(orderId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Limpa o workspace do pedido — evita reaproveitar artefatos de execuções anteriores. */
export async function clearOrderWorkspace(orderId: string): Promise<void> {
  const dir = orderWorkspaceDir(orderId);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
  await mkdir(dir, { recursive: true });
}

/** Espelha o tree.json acumulado no workspace isolado do pedido (contexto para o agente Cursor). */
export async function syncCollectedToWorkspace(
  orderId: string,
  files: Record<string, string>,
): Promise<void> {
  const root = await ensureOrderWorkspace(orderId);
  for (const [relativePath, content] of Object.entries(files)) {
    if (!relativePath || relativePath.includes("..")) continue;
    const abs = path.join(root, relativePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
}
