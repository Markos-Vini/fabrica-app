const TAILWIND_DIRECTIVES = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;

const TAILWIND_COMPONENTS = `
@layer components {
  .sidebar-gradient {
    background: var(
      --sidebar-bg-gradient,
      linear-gradient(180deg, var(--primary-dark) 0%, var(--primary) 100%)
    );
  }
}
`;

const TAILWIND_BUILD_DEPS = ["tailwindcss", "postcss", "autoprefixer"] as const;

function hasTailwindConfig(files: Record<string, string>): boolean {
  return Object.keys(files).some(
    (path) =>
      path.startsWith("frontend/") &&
      /tailwind\.config\.(ts|js|mjs|cjs)$/.test(path),
  );
}

/** Garante diretivas Tailwind e classes custom usadas pelos componentes gerados. */
export function ensureTailwindCss(files: Record<string, string>): void {
  if (!hasTailwindConfig(files)) return;

  const globalsPath = "frontend/app/globals.css";
  const globals = files[globalsPath];
  if (!globals?.trim()) return;

  let next = globals;
  if (!next.includes("@tailwind base")) {
    next = TAILWIND_DIRECTIVES + next;
  }
  if (!next.includes(".sidebar-gradient")) {
    next = `${next.trimEnd()}\n${TAILWIND_COMPONENTS}\n`;
  }
  files[globalsPath] = next;

  ensureTailwindBuildDeps(files);
}

/** Vercel pode omitir devDependencies — tailwind precisa estar disponível no build. */
export function ensureTailwindBuildDeps(files: Record<string, string>): void {
  const pkgPath = "frontend/package.json";
  const raw = files[pkgPath];
  if (!raw?.trim()) return;

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    pkg = JSON.parse(raw) as typeof pkg;
  } catch {
    return;
  }

  pkg.dependencies = pkg.dependencies ?? {};
  pkg.devDependencies = pkg.devDependencies ?? {};
  let changed = false;

  for (const name of TAILWIND_BUILD_DEPS) {
    const version = pkg.devDependencies[name];
    if (version && !pkg.dependencies[name]) {
      pkg.dependencies[name] = version;
      delete pkg.devDependencies[name];
      changed = true;
    }
  }

  if (changed) {
    files[pkgPath] = `${JSON.stringify(pkg, null, 2)}\n`;
  }
}
