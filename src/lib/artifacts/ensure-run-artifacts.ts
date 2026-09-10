import type { OrderInput } from "@/lib/types";
import { demoAccountsMarkdown } from "./demo-accounts-doc";
import {
  appendMvpSectionToReadme,
  isFullStackMvp,
  mvpDockerCompose,
  mvpRootEnvExample,
  mvpRunGuideMarkdown,
} from "./mvp-stack-scaffold";
import { ensureMvpStackArtifacts } from "./ensure-mvp-artifacts";
import { slugify } from "./slug";
import { ensureBuildReadiness } from "./ensure-build-readiness";
import { ensureTailwindCss } from "./ensure-tailwind-css";

function frontOnlyEnvExample(): string {
  return `# Front-end — primeira execução
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
`;
}

function frontOnlyRunGuide(order: OrderInput): string {
  return `# Como rodar — ${order.name} (front-end)

## Pré-requisitos

- Node.js 20+

## Primeira execução

\`\`\`bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
\`\`\`

Abra \`http://localhost:3000\` (ou a porta indicada no terminal).

## Demo na Vercel (sem back-end)

Com token Vercel configurado na Fábrica, o deploy usa **mock API** — login e telas principais funcionam sem subir a API.

Credenciais: veja \`docs/DEMO-ACCOUNTS.md\`.
`;
}

function appendDemoSectionToReadme(existing: string): string {
  const marker = "## Demonstração";
  if (existing.includes(marker)) return existing;
  return `${existing.trim()}

---

## Demonstração

Credenciais de teste: **docs/DEMO-ACCOUNTS.md**

- **Web (Vercel):** mock API ativo — não precisa de back-end local.
- **Mobile (APK):** modo demo com dados locais quando aplicável.
`;
}

/**
 * Injeta guias de execução e contas demo proporcionais ao escopo —
 * sem compilar na esteira.
 */
export function ensureRunArtifacts(
  order: OrderInput,
  files: Record<string, string>,
): Record<string, string> {
  ensureBuildReadiness(order, files);
  if (order.includeFrontend) {
    ensureTailwindCss(files);
  }
  const patch: Record<string, string> = {};

  if (isFullStackMvp(order)) {
    Object.assign(patch, ensureMvpStackArtifacts(order, files));
  } else {
    if (order.includeFrontend) {
      if (!files["frontend/.env.local.example"] && !files["frontend/.env.example"]) {
        patch["frontend/.env.local.example"] = frontOnlyEnvExample();
      }
      if (!files["docs/COMO-RODAR.md"] && !files["docs/COMO-RODAR-MVP.md"]) {
        patch["docs/COMO-RODAR.md"] = frontOnlyRunGuide(order);
      }
    }

    if (
      order.includeBackend &&
      order.includeDatabase &&
      !files["docker-compose.yml"]?.includes("healthcheck")
    ) {
      patch["docker-compose.yml"] = mvpDockerCompose(order, slugify(order.name));
      if (!files[".env.example"]) {
        patch[".env.example"] = mvpRootEnvExample(order);
      }
    }

    if (order.includeBackend && !order.includeFrontend && !order.includeMobile) {
      if (!files["docs/COMO-RODAR.md"]) {
        patch["docs/COMO-RODAR.md"] = [
          `# Como rodar — ${order.name} (API)`,
          "",
          "```bash",
          "cd backend",
          "cp .env.example .env",
          "npm install",
          order.includeDatabase ? "docker compose up -d" : "",
          "npm run start:dev",
          "```",
          "",
          "Swagger: `/api/docs` quando disponível.",
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    if (
      order.includeFrontend &&
      order.includeBackend &&
      !isFullStackMvp(order)
    ) {
      if (!files["docs/COMO-RODAR.md"]) {
        patch["docs/COMO-RODAR.md"] = mvpRunGuideMarkdown(order);
      }
    }
  }

  if (order.includeAuth && !files["docs/DEMO-ACCOUNTS.md"]?.trim()) {
    patch["docs/DEMO-ACCOUNTS.md"] = demoAccountsMarkdown(order);
  }

  const readme = files["README.md"] ?? patch["README.md"];
  if (readme && order.includeAuth) {
    patch["README.md"] = appendDemoSectionToReadme(readme);
  } else if (readme && isFullStackMvp(order)) {
    patch["README.md"] = appendMvpSectionToReadme(readme, order);
  }

  return patch;
}
