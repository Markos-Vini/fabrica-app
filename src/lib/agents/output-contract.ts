import type { AgentId } from "@/lib/types";
import type { OrderInput } from "@/lib/types";

/** Regras compartilhadas de formato — reduz respostas prose e JSON inválido. */
export const JSON_OUTPUT_RULE =
  'Responda APENAS com JSON válido: {"files": {"caminho/arquivo.ext": "conteúdo"}}. ' +
  "Sem markdown fora do JSON, sem ``` fences, sem comentários antes/depois. " +
  "Escape quebras de linha como \\n dentro das strings. " +
  "NUNCA use placeholders ([conteúdo], TODO, TBD, lorem, ...). " +
  "Cada arquivo deve ser completo e compilável quando for código.";

export const PLANNING_JSON_RULE =
  'Responda APENAS com JSON {"files": {"caminho/arquivo.md": "conteúdo"}}. ' +
  "Documentação em Markdown, português. NÃO gere código de aplicativo (sem pastas mobile/, backend/, frontend/). " +
  "Sem markdown fora do JSON.";

/** Camadas explicitamente fora do escopo — evita backend/login em app-only. */
export function scopeExclusionBrief(order: OrderInput): string {
  const excluded: string[] = [];
  if (!order.includeMobile) excluded.push("mobile/");
  if (!order.includeFrontend) excluded.push("frontend/");
  if (!order.includeBackend) {
    excluded.push("backend/", "mock/", "docker-compose com serviço de API");
  }
  if (!order.includeDatabase) {
    excluded.push("prisma/schema.prisma", "migrations SQL", "ORM persistente");
  }
  if (!order.includeAuth) {
    excluded.push("login", "cadastro", "JWT", "sessão", "OAuth");
  }
  if (!order.includeAdmin) {
    excluded.push("painel admin", "rota /admin", "CRUD de usuários");
  }
  if (excluded.length === 0) {
    return "Todas as camadas do escopo estão ativas — não adicione camadas extras não pedidas.";
  }
  return `NÃO gere nem documente: ${excluded.join(", ")}.`;
}

/** Checklist de qualidade por agente — reforça entregáveis mínimos. */
export function agentQualityChecklist(
  agent: AgentId,
  order: OrderInput,
  mode: "planning" | "software" = "software",
): string {
  if (mode === "planning") {
    switch (agent) {
      case "pm":
        return "Checklist: PRD + histórias com papéis, fluxos e critérios mensuráveis.";
      case "architect":
        return `Checklist: arquitetura + modelo de dados coerentes com escopo.\n${scopeExclusionBrief(order)}`;
      case "backend":
        return "Checklist: plano de APIs/endpoints — sem código, só documentação.";
      case "frontend":
        return "Checklist: inventário de telas, fluxos e diretriz visual.";
      case "qa":
        return "Checklist: estratégia de testes alinhada ao escopo e RNF.";
      case "devops":
        return "Checklist: roadmap por fases + backlog T-001… com dependências e estimativas.";
      default:
        return "";
    }
  }

  switch (agent) {
    case "pm":
      return [
        "Checklist PM:",
        "- PRD com objetivo, público, regras numeradas e critérios de aceite testáveis",
        "- Separar MVP (v1) de v2+ quando aplicável",
      ].join("\n");
    case "architect":
      return [
        "Checklist Arquiteto:",
        "- Diagrama mermaid só com camadas do escopo",
        "- Decisões alinhadas às stacks escolhidas (sem trocar tecnologia)",
        scopeExclusionBrief(order),
      ].join("\n");
    case "backend":
      return [
        "Checklist Back-end:",
        "- backend/package.json + ponto de entrada (main.ts / index.ts)",
        order.includeDatabase
          ? "- backend/prisma/schema.prisma ou migrations equivalentes"
          : "- Sem banco — API stateless se aplicável",
        "- .env.example documentando variáveis",
        "- Imports e paths consistentes entre módulos",
      ].join("\n");
    case "frontend":
      return [
        "Checklist Front/Mobile:",
        order.includeMobile
          ? "- mobile/lib/main.dart + pubspec.yaml + telas reais (não Hello World)"
          : "",
        order.includeFrontend
          ? "- frontend/package.json + App/layout ou page de entrada"
          : "",
        "- Todos os imports resolvem (sem arquivo referenciado inexistente)",
        "- Estados loading, empty e erro nas telas principais",
        order.includeFrontend
          ? "- Mock API (USE_MOCK_API) para demo Vercel sem back-end"
          : "",
        order.includeMobile
          ? "- Mock mobile para APK de demonstração"
          : "",
        order.includeAuth
          ? "- docs/DEMO-ACCOUNTS.md ou README com credenciais demo"
          : "",
        scopeExclusionBrief(order),
      ]
        .filter(Boolean)
        .join("\n");
    case "qa":
      return [
        "Checklist QA (inclua no docs/QA.md como tabela PASS/FAIL):",
        "- Entry points existem (main.dart, package.json backend/frontend)",
        "- Escopo respeitado — sem pastas proibidas",
        "- Imports/caminhos cruzados entre arquivos gerados",
        "- Regras de negócio do pedido cobertas por fluxo ou teste",
        "- Riscos concretos com severidade (alta/média/baixa)",
        "Se encontrar gap bloqueante, liste o arquivo/caminho exato a corrigir.",
      ].join("\n");
    case "devops":
      return [
        "Checklist DevOps:",
        "- README.md com pré-requisitos, portas e comandos copy-paste",
        order.includeBackend
          ? "- docker-compose.yml ou instrução clara de subir banco/API"
          : "",
        order.includeMobile
          ? "- Seção mobile com flutter pub get && flutter run"
          : "",
        "- Listar estrutura de pastas gerada (índice)",
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return "";
  }
}
