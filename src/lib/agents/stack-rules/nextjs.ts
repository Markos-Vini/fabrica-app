import type { AgentId } from "@/lib/types";

export function nextJsStackRules(agent: AgentId): string {
  if (agent === "frontend" || agent === "architect") {
    return [
      "Next.js (App Router):",
      "- frontend/app/layout.tsx + frontend/app/page.tsx (ou rotas do fluxo)",
      "- frontend/package.json com scripts dev/build/start",
      "- .env.example com NEXT_PUBLIC_API_URL quando houver API",
      "- Componentes em frontend/components/ ou app/; imports @/ → src/ ou app/",
      "- TypeScript strict: tipar retornos da API (CursoListItem vs CursoDetalhe); sem parâmetros implícitos any em .map/.filter",
      "- Se usar Tailwind: frontend/app/globals.css DEVE começar com @tailwind base/components/utilities",
      "- Evite pages/ legado salvo se o pedido pedir explicitamente Pages Router",
    ].join("\n");
  }
  if (agent === "qa") {
    return "Next.js QA: verifique layout.tsx/page.tsx, imports @/ e NEXT_PUBLIC_* no .env.example.";
  }
  if (agent === "devops") {
    return "Next.js: README com cd frontend && npm install && npm run dev e porta (3000).";
  }
  return "";
}
