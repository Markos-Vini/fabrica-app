export function pickFrontendDeployFiles(
  files: Record<string, string>,
): Record<string, string> | null {
  const entries = Object.entries(files).filter(([filePath]) =>
    filePath.startsWith("frontend/"),
  );
  if (entries.length === 0) return null;
  const picked: Record<string, string> = {};
  for (const [filePath, content] of entries) {
    picked[filePath.replace(/^frontend\//, "")] = content;
  }
  return picked;
}
