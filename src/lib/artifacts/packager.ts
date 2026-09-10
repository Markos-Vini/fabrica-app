import JSZip from "jszip";

export async function zipFiles(
  slug: string,
  files: Record<string, string>,
): Promise<Buffer> {
  const zip = new JSZip();
  const root = zip.folder(slug);
  if (!root) throw new Error("Não foi possível criar a pasta do ZIP");
  for (const [path, content] of Object.entries(files)) {
    root.file(path, content);
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}
