import type { AgentId } from "@/lib/types";
import type { OrderScope } from "@/lib/order-scope";

export const AGENT_CATALOG: {
  id: AgentId;
  name: string;
  role: string;
  help: string;
}[] = [
  {
    id: "pm",
    name: "PM",
    role: "Analista de Requisitos — estrutura o pedido em PRD",
    help: "Product Manager: lê sua descrição e produz o PRD — documento com objetivo, público, regras de negócio e critérios de aceite. É a base para todas as etapas seguintes.",
  },
  {
    id: "architect",
    name: "Arquiteto",
    role: "Mapeia a arquitetura nas linguagens escolhidas",
    help: "Define como o sistema será organizado: camadas (app, API, banco), tecnologias escolhidas e diagramas. Garante que o código siga um plano coerente.",
  },
  {
    id: "backend",
    name: "Dev Back-end",
    role: "Escreve a API no stack selecionado",
    help: "Desenvolvedor de servidor: cria a API, rotas, regras de negócio no back-end e integração com banco de dados, quando o escopo incluir essa camada.",
  },
  {
    id: "frontend",
    name: "Dev Front-end / Mobile",
    role: "Constrói as telas no framework escolhido",
    help: "Desenvolvedor de interface: gera telas, fluxos e componentes visuais — site web (React/Next) ou app mobile (Flutter), conforme o escopo do pedido.",
  },
  {
    id: "qa",
    name: "QA / Code Reviewer",
    role: "Revisa sintaxe e integridade do que foi gerado",
    help: "Quality Assurance: revisa o que foi gerado, aponta erros, lacunas e riscos antes da entrega. Funciona como uma revisão de código e qualidade.",
  },
  {
    id: "devops",
    name: "DevOps & Build",
    role: "Empacota README, docker-compose e o ZIP final",
    help: "DevOps: monta o pacote final — README com instruções, docker-compose (se houver), organiza arquivos e gera o ZIP para download.",
  },
];

export function agentDisplayForScope(
  agentId: AgentId,
  scope: Pick<OrderScope, "includeMobile" | "includeFrontend">,
  stack?: { mobileStack?: string; frontendStack?: string },
): { name: string; role: string } {
  const base = AGENT_CATALOG.find((a) => a.id === agentId);
  if (!base) return { name: agentId, role: "" };

  if (agentId === "frontend") {
    if (scope.includeMobile && !scope.includeFrontend) {
      return {
        name: "Dev Mobile",
        role: `Constrói o app em ${stack?.mobileStack ?? "mobile"}`,
      };
    }
    if (scope.includeFrontend && !scope.includeMobile) {
      return {
        name: "Dev Front-end",
        role: `Constrói o site em ${stack?.frontendStack ?? "web"}`,
      };
    }
  }

  return { name: base.name, role: base.role };
}
