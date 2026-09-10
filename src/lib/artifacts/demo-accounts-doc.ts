import type { OrderInput } from "@/lib/types";

/** Template injetado quando o agente não gera docs/DEMO-ACCOUNTS.md. */
export function demoAccountsMarkdown(order: OrderInput): string {
  const lines = [
    `# Contas de demonstração — ${order.name}`,
    "",
    "Use estas credenciais para **testar o MVP** (web na Vercel, APK ou ambiente local).",
    "",
    "| Papel | E-mail | Senha |",
    "|-------|--------|-------|",
  ];

  if (order.includeAdmin || order.includeFrontend) {
    lines.push("| Gestor (painel web) | gestor@demo.local | Senha@123 |");
  }
  if (order.includeMobile) {
    lines.push("| Aluno (app mobile) | aluno@demo.local | Senha@123 |");
  }
  if (!order.includeAdmin && !order.includeMobile && order.includeAuth) {
    lines.push("| Usuário | usuario@demo.local | Senha@123 |");
  }

  lines.push(
    "",
    "Os agentes devem substituir estes placeholders por contas alinhadas ao domínio do app.",
    "Mantenha a senha documentada aqui e no README raiz.",
    "",
    "## Modo demo sem back-end",
    "",
    "- **Web (Vercel):** `NEXT_PUBLIC_USE_MOCK_API=true` — login funciona com dados mockados.",
    "- **Mobile (APK):** `USE_MOCK_API=true` por padrão no build de demonstração.",
    "",
  );

  return lines.join("\n");
}
