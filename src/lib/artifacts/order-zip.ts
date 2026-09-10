import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import { zipFiles } from "./packager";
import { slugify } from "./slug";

/** ZIP do APK de teste — não é o pacote do projeto. */
export const APK_DEBUG_ZIP_NAME = "app-debug.zip";

export function resolveProjectZipFilename(
  dir: string,
  orderName: string,
): string {
  const slug = slugify(orderName);
  const preferred = `${slug}.zip`;

  if (existsSync(path.join(dir, preferred))) {
    return preferred;
  }

  const projectZips = readdirSync(dir).filter(
    (file) => file.endsWith(".zip") && file !== APK_DEBUG_ZIP_NAME,
  );

  if (projectZips.length === 1) {
    return projectZips[0];
  }

  if (projectZips.length > 1) {
    const slugMatch = projectZips.find((file) => file === preferred);
    if (slugMatch) return slugMatch;
    return projectZips.sort((a, b) => a.localeCompare(b))[0];
  }

  return preferred;
}

export async function buildOrderZipBuffer(
  orderId: string,
  orderName: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const dir = path.join(process.cwd(), "storage", "orders", orderId);
  const slug = slugify(orderName);
  const resolvedName = existsSync(dir)
    ? resolveProjectZipFilename(dir, orderName)
    : `${slug}.zip`;
  const zipPath = path.join(dir, resolvedName);

  if (existsSync(zipPath)) {
    return { buffer: await readFile(zipPath), filename: resolvedName };
  }

  const files = await loadCollectedFiles(orderId);
  if (!files || Object.keys(files).length === 0) {
    throw new Error("ZIP ainda não gerado");
  }

  const buffer = await zipFiles(slug, files);
  await mkdir(dir, { recursive: true });
  const filename = `${slug}.zip`;
  await writeFile(path.join(dir, filename), buffer);
  return { buffer, filename };
}
