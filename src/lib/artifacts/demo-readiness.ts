import type { OrderInput } from "@/lib/types";

export type DemoReadinessGap = {
  path: string;
  reason: string;
};

function hasMockFrontend(files: Record<string, string>): boolean {
  return Object.entries(files).some(([path, content]) => {
    if (!path.startsWith("frontend/") || !content) return false;
    return (
      content.includes("USE_MOCK_API") ||
      content.includes("mock") ||
      content.includes("Mock")
    );
  });
}

function hasMockMobile(files: Record<string, string>): boolean {
  return Object.entries(files).some(([path, content]) => {
    if (!path.startsWith("mobile/") || !content) return false;
    return (
      content.includes("USE_MOCK_API") ||
      path.includes("mock") ||
      content.includes("Mock")
    );
  });
}

function hasDemoCredentials(files: Record<string, string>): boolean {
  const text = [
    files["docs/DEMO-ACCOUNTS.md"],
    files["README.md"],
  ]
    .filter(Boolean)
    .join("\n");
  return /@\S+\s*[/|·]/.test(text) || /Senha@123/.test(text);
}

/** Validação leve — presença de artefatos demo, sem compilar. */
export function validateDemoReadiness(
  order: OrderInput,
  files: Record<string, string>,
): DemoReadinessGap[] {
  const gaps: DemoReadinessGap[] = [];

  if (order.includeAuth && !hasDemoCredentials(files)) {
    gaps.push({
      path: "docs/DEMO-ACCOUNTS.md",
      reason: "Credenciais demo documentadas",
    });
  }

  if (order.includeFrontend && !order.includeBackend && !hasMockFrontend(files)) {
    gaps.push({
      path: "frontend/",
      reason: "Mock API ou flag USE_MOCK_API no front (demo Vercel)",
    });
  }

  if (order.includeMobile && order.generateTestBuild && !hasMockMobile(files)) {
    gaps.push({
      path: "mobile/",
      reason: "Repositório mock ou USE_MOCK_API no mobile (demo APK)",
    });
  }

  return gaps;
}

export function formatDemoReadinessMessage(gaps: DemoReadinessGap[]): string {
  if (gaps.length === 0) return "";
  const items = gaps.map((g) => `${g.reason} (${g.path})`).join("; ");
  return `Pacote demo incompleto — faltam: ${items}.`;
}
