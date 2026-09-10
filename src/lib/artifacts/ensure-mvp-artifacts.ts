import type { OrderInput } from "@/lib/types";
import { slugify } from "./slug";
import {
  appendMvpSectionToReadme,
  isFullStackMvp,
  mobileRunDevPs1,
  mvpDockerCompose,
  mvpRootEnvExample,
  mvpRunGuideMarkdown,
  setupDevPs1,
  setupDevSh,
} from "./mvp-stack-scaffold";

/**
 * Garante scripts de setup, guia de execução e docker-compose adequados
 * para MVPs full-stack — evita retrabalho manual pós-geração.
 */
export function ensureMvpStackArtifacts(
  order: OrderInput,
  files: Record<string, string>,
): Record<string, string> {
  if (!isFullStackMvp(order)) return {};

  const slug = slugify(order.name);
  const patch: Record<string, string> = {
    "docs/COMO-RODAR-MVP.md": mvpRunGuideMarkdown(order),
    "scripts/setup-dev.ps1": setupDevPs1(order),
    "scripts/setup-dev.sh": setupDevSh(order),
    ".env.example": mvpRootEnvExample(order),
  };

  const existingReadme = files["README.md"];
  patch["README.md"] = existingReadme
    ? appendMvpSectionToReadme(existingReadme, order)
    : `# ${order.name}\n\n${mvpRunGuideMarkdown(order)}`;

  const existingCompose = files["docker-compose.yml"] ?? "";
  const hasRealDb =
    existingCompose.includes("healthcheck") &&
    (existingCompose.includes("mysql:") || existingCompose.includes("postgres:"));
  if (!hasRealDb) {
    patch["docker-compose.yml"] = mvpDockerCompose(order, slug);
  }

  if (order.includeMobile && !files["mobile/run-dev.ps1"]) {
    patch["mobile/run-dev.ps1"] = mobileRunDevPs1();
  }

  return patch;
}
