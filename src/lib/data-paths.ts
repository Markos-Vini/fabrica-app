import path from "node:path";

/** Diretório gravável para JSON da fábrica (na Vercel usa /tmp). */
export function fabricaDataDir(): string {
  if (process.env.FABRICA_DATA_DIR) {
    return path.resolve(process.env.FABRICA_DATA_DIR);
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "fabrica-data");
  }
  return path.join(process.cwd(), "data");
}

export function fabricaStorageRoot(): string {
  if (process.env.FABRICA_STORAGE_DIR) {
    return path.resolve(process.env.FABRICA_STORAGE_DIR);
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "fabrica-storage");
  }
  return path.join(process.cwd(), "storage");
}
