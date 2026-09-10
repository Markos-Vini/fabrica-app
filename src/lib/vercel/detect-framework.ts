export function detectVercelFramework(
  files: Record<string, string>,
): string | null {
  const pkgRaw = files["package.json"];
  if (!pkgRaw) return null;
  try {
    const pkg = JSON.parse(pkgRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "nextjs";
    if (deps.nuxt) return "nuxtjs";
    if (deps.vite || deps["@vitejs/plugin-react"]) return "vite";
  } catch {
    return null;
  }
  return null;
}
