import type { AgentId, OrderInput } from "@/lib/types";
import type { FactoryMode, OrderKind } from "@/lib/factory-mode";
import { isPlanningMode } from "@/lib/factory-mode";
import { scopeLayersLabel } from "@/lib/order-scope";
import {
  agentQualityChecklist,
  JSON_OUTPUT_RULE,
  PLANNING_JSON_RULE,
  scopeExclusionBrief,
} from "@/lib/agents/output-contract";
import { stackRulesForAgent } from "@/lib/agents/stack-rules";
import {
  flutterUiInstructions,
  visualBriefForPrompt,
  withVisualDefaults,
} from "@/lib/visual-design";
import { productBriefForPrompt, withProductDefaults } from "@/lib/product-context";
import { nfrBriefForPrompt, withNfrDefaults } from "@/lib/nfr-context";
import { integrationsBriefForPrompt } from "@/lib/integrations-context";
import { dataModelBriefForPrompt } from "@/lib/data-model-context";
import { successCriteriaBriefForPrompt } from "@/lib/success-criteria-context";
import { isFullStackMvp } from "@/lib/artifacts/mvp-stack-scaffold";

/** Regras para demo de stakeholders (Vercel/APK sem back-end). */
function stakeholderDemoRules(order: OrderInput, agent: AgentId): string {
  if (agent !== "frontend" && agent !== "devops") return "";

  const parts: string[] = [];

  if (agent === "frontend" && order.includeFrontend) {
    parts.push(
      [
        "Demo para gestores (web):",
        "- Repositório mock ativo quando NEXT_PUBLIC_USE_MOCK_API=true (padrão na Vercel).",
        "- Login demo funcional sem API real — dados em memória ou localStorage.",
        "- Documente contas em docs/DEMO-ACCOUNTS.md (gestor + usuário final).",
        order.includeBackend
          ? "- Camada API real opcional; mock deve cobrir fluxo principal sozinho."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (agent === "frontend" && order.includeMobile) {
    parts.push(
      [
        "Demo mobile (APK):",
        "- USE_MOCK_API=true por padrão no app (demo sem back-end).",
        "- Repositório mock com login e fluxo principal navegável.",
        "- Contas demo iguais às de docs/DEMO-ACCOUNTS.md.",
      ].join("\n"),
    );
  }

  if (agent === "devops") {
    parts.push(
      [
        "Documentação demo:",
        "- docs/DEMO-ACCOUNTS.md com tabela papel | e-mail | senha.",
        "- README: seção Demonstração explicando Vercel (mock) e APK.",
        order.includeFrontend
          ? "- frontend/.env.local.example com NEXT_PUBLIC_USE_MOCK_API=true."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return parts.join("\n\n");
}

/** Regras de engenharia aprendidas em MVPs full-stack — evita retrabalho pós-geração. */
function mvpEngineeringRules(order: OrderInput, agent: AgentId): string {
  if (!isFullStackMvp(order)) return "";

  const common = [
    "Este é um **MVP full-stack** (API + banco + cliente). Priorize fluxo demo executável localmente.",
    "Inclua scripts/setup-dev.ps1, scripts/setup-dev.sh e docs/COMO-RODAR-MVP.md com passos para Docker, API, web e mobile.",
  ];

  if (agent === "backend") {
    return [
      ...common,
      "Back-end NestJS/Express:",
      "- Escute em HOST=0.0.0.0 (aceitar conexões da rede local para teste no celular).",
      "- Defina PUBLIC_BASE_URL no .env.example (IP LAN para URLs de upload/stream no mobile).",
      "- Sirva arquivos estáticos em /uploads/ (PUT para upload + GET para MP4). Pasta uploads/ no projeto.",
      "- NEXT_PUBLIC_USE_MOCK_API=false no frontend; mobile USE_MOCK_API=false por padrão.",
      "- Seed com contas demo (gestor + usuário final) e senha documentada no README.",
      "- Se houver trilha sequencial (aulas/módulos/etapas): ProgressoService com desbloquearProximaAula após conclusão; syncProgressoMatricula no GET detalhe para reparar cadeia quebrada; bootstrap de progresso na matrícula.",
      "- Stream de vídeo: adapter resolve URLs relativas (/uploads/...) para absolutas via PUBLIC_BASE_URL; não repassar URLs de API JSON ao player.",
    ].join("\n");
  }

  if (agent === "frontend") {
    return [
      ...common,
      "Painel web:",
      "- .env.example com NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 e NEXT_PUBLIC_USE_MOCK_API=false.",
      "- Upload de vídeo/arquivo: presign → PUT binário → salvar URL relativa /uploads/... na entidade.",
    ].join("\n");
  }

  if (agent === "devops") {
    return [
      ...common,
      "DevOps / README:",
      "- docker-compose.yml com banco (MySQL ou Postgres) + healthcheck; profiles full para api/web opcionais.",
      "- README.md com tabela de portas, 3 terminais (API, web, mobile), setup automático via scripts/setup-dev.ps1.",
      "- mobile/run-dev.ps1 detectando IP LAN para celular físico; documentar 10.0.2.2 só para emulador Android.",
      "- Android debug: android/app/src/debug/AndroidManifest.xml com usesCleartextTraffic=true para http local.",
      "- NÃO versione mobile/android/ incompleto — o workflow CI executa flutter create; cleartext vai no manifest de debug gerado pelo CI.",
      "- NÃO use json-server mock-api como substituto da API real quando o escopo inclui backend NestJS+MySQL.",
    ].join("\n");
  }

  return common.join("\n");
}

function mobileMvpRules(order: OrderInput): string {
  if (!order.includeMobile || !order.includeBackend) return "";
  return [
    "Mobile Flutter (API real):",
    "- app_config: USE_MOCK_API default false; API_BASE_URL default http://10.0.2.2:3001/api/v1 (emulador).",
    "- Inclua mobile/run-dev.ps1 para celular físico (detecta IP LAN).",
      "- Android debug: usesCleartextTraffic=true para http:// local.",
      "- NÃO commite pasta mobile/android/ parcial (só lib/ + pubspec) — o CI roda flutter create com embedding v2.",
    "- Repositórios API (não mock) quando USE_MOCK_API=false; refresh após concluir aula.",
  ].join("\n");
}

/** Foco de geração do agente front/mobile — uma camada por passagem. */
export type ClientLayerFocus = "mobile" | "web";

function orderContextBrief(order: OrderInput): string {
  const product = productBriefForPrompt(withProductDefaults(order));
  const nfr = nfrBriefForPrompt(withNfrDefaults(order));
  const integrations = integrationsBriefForPrompt(order);
  const dataModel = dataModelBriefForPrompt(order);
  const success = successCriteriaBriefForPrompt(order);
  const visual = visualBriefForPrompt(withVisualDefaults(order));
  return [product, nfr, integrations, dataModel, success, visual]
    .filter(Boolean)
    .join("\n\n");
}

function scopeBrief(order: OrderInput): string {
  return scopeLayersLabel({
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  });
}

function clientGenerationInstructions(
  order: OrderInput,
  clientLayer?: ClientLayerFocus,
): string {
  const lines: string[] = [
    `Escopo deste pedido: ${scopeBrief(order)}.`,
    "Respeite rigorosamente o escopo — NÃO gere camadas fora do escopo.",
  ];

  if (clientLayer === "mobile") {
    lines.push(
      `Gere SOMENTE a pasta mobile/ com ${order.mobileStack}.`,
      "NÃO crie pasta frontend/, backend/, mock/ nem docker-compose.",
      "Obrigatório em Flutter: mobile/lib/main.dart (ponto de entrada), telas e widgets do app, pubspec.yaml com dependências (ex.: go_router, riverpod).",
      "NÃO deixe o projeto só com pubspec.yaml — o app deve abrir telas reais, não Hello World nem PreviewApp com texto do PRD.",
      `Substitua APP_DISPLAY_NAME pelo nome real do app: "${order.name}".`,
    );
    if (order.mobileStack.toLowerCase().includes("flutter")) {
      lines.push(flutterUiInstructions(order));
    }
    return lines.join("\n");
  }

  if (clientLayer === "web") {
    lines.push(
      `Gere SOMENTE a pasta frontend/ com ${order.frontendStack}.`,
      "NÃO crie pasta mobile/, backend/, mock/ nem docker-compose.",
      "Obrigatório: frontend/package.json, páginas de login/cadastro, CRUD de tarefas, filtros e perfil.",
      order.includeAdmin
        ? "Inclua rota /admin com painel administrativo básico."
        : "",
      order.expectedScreens?.includes("Dashboard") ||
      order.expectedScreens?.includes("gráfico")
        ? "Inclua /dashboard com gráficos de produtividade (Recharts ou similar)."
        : "",
      flutterUiInstructions(order),
    );
    return lines.filter(Boolean).join("\n");
  }

  if (order.includeMobile && !order.includeFrontend) {
    lines.push(
      `Gere SOMENTE a pasta mobile/ com ${order.mobileStack}.`,
      "NÃO crie pasta frontend/, backend/, mock/ nem docker-compose.",
      "Obrigatório em Flutter: mobile/lib/main.dart (ponto de entrada), telas e widgets do app, pubspec.yaml com dependências (ex.: go_router, riverpod).",
      "NÃO deixe o projeto só com pubspec.yaml — o app deve abrir telas reais, não Hello World nem PreviewApp com texto do PRD.",
    );
    if (order.mobileStack.toLowerCase().includes("flutter")) {
      lines.push(flutterUiInstructions(order));
    }
  } else if (order.includeFrontend && !order.includeMobile) {
    lines.push(
      `Gere SOMENTE a pasta frontend/ com ${order.frontendStack}.`,
      "NÃO crie pasta mobile/.",
      flutterUiInstructions(order),
    );
  } else if (order.includeMobile && order.includeFrontend) {
    lines.push(
      `Gere frontend/ (${order.frontendStack}) e mobile/ (${order.mobileStack}) com paridade de funcionalidades.`,
      flutterUiInstructions(order),
    );
  }

  return lines.join("\n");
}

export function agentPrompt(
  agent: AgentId,
  order: OrderInput,
  prior: string,
  orderKind: OrderKind | FactoryMode = "software",
  fromApprovedPlanning = false,
  clientLayer?: ClientLayerFocus,
): {
  system: string;
  user: string;
} {
  if (isPlanningMode(orderKind as FactoryMode)) {
    return planningPrompt(agent, order, prior);
  }
  return appPrompt(agent, order, prior, fromApprovedPlanning, clientLayer);
}

function appPrompt(
  agent: AgentId,
  order: OrderInput,
  prior: string,
  fromApprovedPlanning = false,
  clientLayer?: ClientLayerFocus,
): {
  system: string;
  user: string;
} {
  const specRule = fromApprovedPlanning
    ? "\n\nHá documentação de planejamento **aprovada** no contexto. Implemente rigorosamente conforme PRD, arquitetura, planos e backlog — não reinvente requisitos nem contradiga a spec. Em caso de dúvida, siga o planejamento."
    : "";
  const exclusion = scopeExclusionBrief(order);
  const context = orderContextBrief(order);
  const brief = `App: ${order.name}
Problema: ${order.problem}
Público: ${order.audience}
Regras: ${order.businessRules}
${context ? `${context}\n` : ""}Escopo: ${scopeBrief(order)}
${exclusion}
${order.includeMobile ? `Mobile: ${order.mobileStack}` : ""}
${order.includeFrontend ? `Front-end: ${order.frontendStack}` : ""}
${order.includeBackend ? `Back-end: ${order.backendStack}` : ""}
${order.includeDatabase ? `Banco: ${order.databaseStack}` : ""}
Tipo de saída: ${order.deliverableType}`;

  const jsonRule = JSON_OUTPUT_RULE;

  if (agent === "pm") {
    return {
      system:
        "Você é um PM sênior. Escreva um PRD claro em Markdown (português) com critérios de aceite testáveis." +
        specRule,
      user: `${brief}\n\n${agentQualityChecklist("pm", order)}\n\nGere docs/PRD.md.\n${jsonRule}`,
    };
  }
  if (agent === "architect") {
    const stackRules = stackRulesForAgent("architect", order);
    return {
      system:
        "Você é arquiteto de software. Respeite rigorosamente as linguagens e o escopo do pedido. Inclua diagrama mermaid apenas com camadas ativas. Documente integrações externas e gestão de secrets quando informadas." +
        specRule,
      user: `${brief}\n\n${agentQualityChecklist("architect", order)}${stackRules ? `\n\n${stackRules}` : ""}\n\nContexto anterior:\n${prior}\n\nGere docs/ARQUITETURA.md apenas para as camadas do escopo.\n${jsonRule}`,
    };
  }
  if (agent === "backend") {
    const mvpRules = mvpEngineeringRules(order, "backend");
    const stackRules = stackRulesForAgent("backend", order);
    return {
      system:
        `Você é dev back-end especialista em ${order.backendStack}. Gere código executável completo — não stubs.` +
        specRule,
      user: `${brief}\n\n${agentQualityChecklist("backend", order)}${stackRules ? `\n\n${stackRules}` : ""}\n\n${mvpRules ? `${mvpRules}\n\n` : ""}Contexto:\n${prior}\n\nGere os arquivos da API (pastas backend/).\n${jsonRule}`,
    };
  }
  if (agent === "frontend") {
    const scopeHint = clientGenerationInstructions(order, clientLayer);
    const stackRules = stackRulesForAgent("frontend", order);
    const mvpRules = [
      mvpEngineeringRules(order, "frontend"),
      mobileMvpRules(order),
      stakeholderDemoRules(order, "frontend"),
    ]
      .filter(Boolean)
      .join("\n\n");
    const role =
      clientLayer === "mobile" || (order.includeMobile && !order.includeFrontend)
        ? `dev mobile especialista em ${order.mobileStack}`
        : clientLayer === "web" ||
            (order.includeFrontend && !order.includeMobile)
          ? `dev front-end especialista em ${order.frontendStack}`
          : `dev front-end/mobile (${order.frontendStack}, ${order.mobileStack})`;
    const layerNote =
      clientLayer === "mobile"
        ? "\n\nEsta passagem: gere **apenas** mobile/."
        : clientLayer === "web"
          ? "\n\nEsta passagem: gere **apenas** frontend/."
          : "";
    return {
      system: `Você é ${role}. Implemente código executável completo, não só configs. Priorize UI moderna, acessível e coerente com a diretriz visual do pedido. Verifique imports antes de responder.` + specRule,
      user: `${brief}\n\n${agentQualityChecklist("frontend", order)}${stackRules ? `\n\n${stackRules}` : ""}\n\n${scopeHint}${layerNote}${mvpRules ? `\n\n${mvpRules}` : ""}\n\nContexto:\n${prior}\n\n${jsonRule}`,
    };
  }
  if (agent === "qa") {
    const stackRules = stackRulesForAgent("qa", order);
    return {
      system:
        "Você é QA e code reviewer sênior. Audite o material gerado contra o escopo e as regras de negócio. Seja específico: cite caminhos de arquivo e linhas quando possível." +
        specRule,
      user: `${brief}\n\n${agentQualityChecklist("qa", order)}${stackRules ? `\n\n${stackRules}` : ""}\n\nMaterial gerado:\n${prior}\n\nGere docs/QA.md com tabela PASS/FAIL, riscos e ações recomendadas.\n${jsonRule}`,
    };
  }
  const mvpRules = [
    mvpEngineeringRules(order, "devops"),
    stakeholderDemoRules(order, "devops"),
  ]
    .filter(Boolean)
    .join("\n\n");
  const stackRules = stackRulesForAgent("devops", order);
  return {
    system:
      "Você é DevOps. Empacote README, docker-compose e instruções de subida copy-paste. Não invente pastas que não existem no contexto." +
      specRule,
    user: `${brief}\n\n${agentQualityChecklist("devops", order)}${stackRules ? `\n\n${stackRules}` : ""}\n\n${mvpRules ? `${mvpRules}\n\n` : ""}Contexto:\n${prior}\n\nGere README.md e docker-compose.yml (se houver código). Tipo D também gera testes em tests/.\n${jsonRule}`,
  };
}

function planningPrompt(agent: AgentId, order: OrderInput, prior: string): {
  system: string;
  user: string;
} {
  const context = orderContextBrief(order);
  const brief = `Projeto: ${order.name}
Problema: ${order.problem}
Público: ${order.audience}
Regras: ${order.businessRules}
${context ? `${context}\n` : ""}Escopo: ${scopeLayersLabel({
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  })}
${order.includeMobile ? `Mobile: ${order.mobileStack}` : ""}
${order.includeFrontend ? `Front-end: ${order.frontendStack}` : ""}
${order.includeBackend ? `Back-end: ${order.backendStack}` : ""}
${order.includeDatabase ? `Banco: ${order.databaseStack}` : ""}`;

  const jsonRule = PLANNING_JSON_RULE;
  const exclusion = scopeExclusionBrief(order);

  const map: Record<AgentId, { system: string; files: string }> = {
    pm: {
      system:
        "Você é PM sênior. Produza PRD e histórias de usuário priorizadas. Separe claramente MVP (v1) de escopo futuro (v2+). Mapeie papéis de usuário, fluxos informados e critérios de sucesso mensuráveis.",
      files: "docs/PRD.md e docs/HISTORIAS-USUARIO.md",
    },
    architect: {
      system:
        "Você é arquiteto. Diagramas mermaid, decisões e modelo de dados. Documente implicações de offline, sync, escala, idiomas e compliance (LGPD) quando informados nos RNF. Use as entidades e relações informadas como base do MODELO-DADOS.md.",
      files: "docs/ARQUITETURA.md e docs/MODELO-DADOS.md",
    },
    backend: {
      system: `Você é tech lead back-end (${order.backendStack}). Plano de APIs, ordem de implementação, endpoints e integrações externas — sem código.`,
      files: "docs/PLANO-BACKEND.md",
    },
    frontend: {
      system: `Você é tech lead front/mobile (${order.frontendStack}, ${order.mobileStack}). Telas, fluxos, ordem de construção — sem código. Inclua seção de diretriz visual (paleta, tipografia, componentes base) e inventário de telas/páginas com responsabilidade de cada uma.`,
      files: "docs/PLANO-FRONTEND-MOBILE.md",
    },
    qa: {
      system:
        "Você é QA lead. Estratégia de testes, DoD e casos críticos. Inclua cenários para sync, offline e privacidade quando aplicável. Transforme critérios de sucesso informados em casos de teste mensuráveis.",
      files: "docs/ESTRATEGIA-QA.md",
    },
    devops: {
      system:
        "Você é engenheiro de entrega. Roadmap por fases, backlog numerado com dependências e estimativas. Priorize tarefas do MVP (v1) antes de v2+.",
      files:
        "docs/ROADMAP.md, docs/TAREFAS.md e README.md (índice do pacote). " +
        "Em docs/TAREFAS.md gere backlog **detalhado** com IDs T-001, T-002…, " +
        "colunas: descrição técnica, critérios de aceite, dependências, estimativa, responsável e fase (MVP ou v2+). " +
        "Mínimo 30 tarefas para escopo full-stack; quebre CRUD, auth, sync, mobile, web e QA separadamente. " +
        "Inclua fases de schema/migrações e auth quando o escopo tiver banco e login. " +
        "README.md e docs/ROADMAP.md devem ser Markdown **completos** (múltiplas seções), nunca uma linha resumo. " +
        "Mapeie cada regra de negócio numerada do pedido. " +
        "NUNCA use placeholders como [conteúdo completo] ou referências a outro arquivo.",
    },
  };

  const spec = map[agent];
  return {
    system: spec.system,
    user: `${brief}\n\n${exclusion}\n\n${agentQualityChecklist(agent, order, "planning")}\n\nContexto anterior:\n${prior}\n\nGere ${spec.files}.\nRespeite rigorosamente o escopo — não inclua camadas não marcadas.\n${jsonRule}`,
  };
}
