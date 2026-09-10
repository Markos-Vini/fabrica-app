import { describe, expect, it } from "vitest";
import {
  ensureTailwindBuildDeps,
  ensureTailwindCss,
} from "./ensure-tailwind-css";

describe("ensureTailwindCss", () => {
  it("injeta diretivas @tailwind e sidebar-gradient", () => {
    const files = {
      "frontend/tailwind.config.ts": "export default { content: [] }",
      "frontend/app/globals.css": ":root { --primary: #a30000; }\nbody { margin: 0; }",
    };
    ensureTailwindCss(files);
    expect(files["frontend/app/globals.css"]).toContain("@tailwind base");
    expect(files["frontend/app/globals.css"]).toContain(".sidebar-gradient");
  });

  it("não altera quando não há tailwind.config", () => {
    const files = {
      "frontend/app/globals.css": "body { margin: 0; }",
    };
    ensureTailwindCss(files);
    expect(files["frontend/app/globals.css"]).not.toContain("@tailwind");
  });
});

describe("ensureTailwindBuildDeps", () => {
  it("move tailwind/postcss para dependencies", () => {
    const files = {
      "frontend/package.json": JSON.stringify({
        dependencies: { next: "14" },
        devDependencies: {
          tailwindcss: "^3.4.0",
          postcss: "^8.4.0",
          autoprefixer: "^10.4.0",
          typescript: "^5.0.0",
        },
      }),
    };
    ensureTailwindBuildDeps(files);
    const pkg = JSON.parse(files["frontend/package.json"]) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies.tailwindcss).toBe("^3.4.0");
    expect(pkg.dependencies.postcss).toBe("^8.4.0");
    expect(pkg.devDependencies.tailwindcss).toBeUndefined();
    expect(pkg.devDependencies.typescript).toBe("^5.0.0");
  });
});
