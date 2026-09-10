import type { OrderInput } from "@/lib/types";
import type { OrderScope } from "@/lib/order-scope";
import { hasClientLayer, scopeLayersLabel } from "@/lib/order-scope";
import { mermaidDbNode, mermaidEdge, mermaidNode } from "./mermaid-label";
import { generateTaskBacklog } from "./task-backlog";
import { slugify } from "./slug";

function scopeOf(order: OrderInput): OrderScope {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

export function generatePlanningPackage(order: OrderInput): Record<string, string> {
  const scope = scopeOf(order);
  const slug = slugify(order.name);
  const files: Record<string, string> = {
    "README.md": readme(order, slug, scope),
    "docs/PRD.md": prd(order, scope),
    "docs/HISTORIAS-USUARIO.md": userStories(order, scope),
    "docs/ARQUITETURA.md": architecture(order, scope),
    "docs/ESTRATEGIA-QA.md": qaStrategy(order, scope),
    "docs/ROADMAP.md": roadmap(order, scope),
    "docs/TAREFAS.md": tasks(order, scope),
  };
  if (scope.includeDatabase || scope.includeBackend) {
    files["docs/MODELO-DADOS.md"] = dataModel(order, scope);
  }
  if (scope.includeBackend) {
    files["docs/PLANO-BACKEND.md"] = backendPlan(order, scope);
  }
  if (hasClientLayer(scope)) {
    files["docs/PLANO-FRONTEND-MOBILE.md"] = clientPlan(order, scope);
  }
  return files;
}

function readme(order: OrderInput, slug: string, scope: OrderScope): string {
  const indexRows = [
    "| `docs/PRD.md` | Visão, escopo e critérios de aceite |",
    "| `docs/HISTORIAS-USUARIO.md` | Histórias priorizadas |",
    "| `docs/ARQUITETURA.md` | Camadas e diagramas |",
  ];
  if (scope.includeDatabase || scope.includeBackend) {
    indexRows.push("| `docs/MODELO-DADOS.md` | Entidades e persistência |");
  }
  if (scope.includeBackend) {
    indexRows.push("| `docs/PLANO-BACKEND.md` | APIs e ordem back-end |");
  }
  if (hasClientLayer(scope)) {
    indexRows.push("| `docs/PLANO-FRONTEND-MOBILE.md` | Telas e fluxos do app |");
  }
  indexRows.push(
    "| `docs/ESTRATEGIA-QA.md` | Testes e Definition of Done |",
    "| `docs/ROADMAP.md` | Fases e sequência |",
    "| `docs/TAREFAS.md` | Backlog com dependências |",
  );

  const rules = order.businessRules
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  const structure: string[] = [];
  if (scope.includeBackend) structure.push("- `api/` — back-end e banco");
  if (scope.includeFrontend) structure.push("- `web/` — front-end web");
  if (scope.includeMobile) structure.push("- `mobile/` — app mobile");
  structure.push("- `docs/` — este pacote de planejamento");

  return `# Pacote de planejamento — ${order.name}

Gerado pela **Fábrica de Software** (Etapa 1 — Planejamento).

## Objetivo
${order.problem}

## Público-alvo
${order.audience}

## Escopo escolhido
${scopeLayersLabel(scope)}

## Stack de referência
${scope.includeMobile ? `- Mobile / app: ${order.mobileStack}` : ""}
${scope.includeFrontend ? `- Front-end web: ${order.frontendStack}` : ""}
${scope.includeBackend ? `- Back-end: ${order.backendStack}` : ""}
${scope.includeDatabase ? `- Banco: ${order.databaseStack}` : ""}

## Regras de negócio (stakeholder)
${rules.map((rule, i) => `${i + 1}. ${rule}`).join("\n")}

## Índice de documentos
| Documento | Conteúdo |
|-----------|----------|
${indexRows.join("\n")}

## Como usar este pacote
1. **Product / gestão** — revise [PRD.md](./docs/PRD.md) e [ROADMAP.md](./docs/ROADMAP.md).
2. **Equipe de TI** — implemente seguindo [TAREFAS.md](./docs/TAREFAS.md) (IDs T-xxx) e cruze com [HISTORIAS-USUARIO.md](./docs/HISTORIAS-USUARIO.md).
3. **Arquitetura** — alinhe decisões em [ARQUITETURA.md](./docs/ARQUITETURA.md) e [MODELO-DADOS.md](./docs/MODELO-DADOS.md) antes de codar.
4. **Etapa 2** — após aprovação, use a Fábrica para **gerar software** a partir deste planejamento.

## Estrutura sugerida do repositório
${structure.join("\n")}

Slug do projeto: \`${slug}\`
`;
}

function prd(order: OrderInput, scope: OrderScope): string {
  const mvpItems = ["Fluxo principal descrito no pedido"];
  if (scope.includeAuth) mvpItems.unshift("Login ou identificação do usuário");
  if (scope.includeAdmin) mvpItems.push("Painel administrativo básico");
  if (scope.includeBackend) mvpItems.push("Persistência via API");

  const outOfScope: string[] = [];
  if (!scope.includeBackend) outOfScope.push("Back-end, APIs e servidor");
  if (!scope.includeFrontend) outOfScope.push("Site web separado");
  if (!scope.includeDatabase) outOfScope.push("Banco de dados (estado local no app)");
  if (!scope.includeAuth) outOfScope.push("Contas, login e cadastro");
  if (!scope.includeAdmin) outOfScope.push("Painel administrativo");

  return `# PRD — ${order.name}

## 1. Contexto
${order.problem}

## 2. Público-alvo
${order.audience}

## 3. Regras de negócio
${order.businessRules}

## 4. Escopo incluído
${scopeLayersLabel(scope)}

## 5. MVP funcional
${mvpItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

## 6. Fora de escopo (por escolha do pedido)
${outOfScope.length > 0 ? outOfScope.map((item) => `- ${item}`).join("\n") : "- Nenhuma restrição extra"}

## 7. Critérios de aceite
- [ ] O fluxo principal funciona conforme as regras de negócio
- [ ] Escopo respeitado (sem camadas não solicitadas)
${scope.includeAuth ? "- [ ] Login/cadastro operacional" : ""}
${scope.includeBackend ? "- [ ] Dados persistidos conforme contrato da API" : "- [ ] App funciona offline/localmente sem depender de servidor"}
`;
}

function userStories(order: OrderInput, scope: OrderScope): string {
  const lines: string[] = [`# Histórias de usuário — ${order.name}`, ""];
  let epic = 1;

  if (scope.includeAuth) {
    lines.push(
      `## Épico ${epic} — Acesso`,
      "| ID | Como… | Quero… | Para… | Prioridade |",
      "|----|-------|--------|-------|------------|",
      "| US-01 | visitante | criar conta | acessar o app | Alta |",
      "| US-02 | usuário | fazer login | retomar meus dados | Alta |",
      "",
    );
    epic += 1;
  }

  lines.push(
    `## Épico ${epic} — Fluxo principal`,
    "| ID | Como… | Quero… | Para… | Prioridade |",
    "|----|-------|--------|-------|------------|",
    `| US-10 | ${order.audience.split(",")[0]?.trim() || "usuário"} | usar a funcionalidade central | ${order.problem.toLowerCase()} | Alta |`,
  );
  if (scope.includeBackend || scope.includeDatabase) {
    lines.push(
      "| US-11 | usuário | que meus dados sejam salvos | não perder informações | Média |",
    );
  }
  lines.push("");

  if (scope.includeAdmin) {
    epic += 1;
    lines.push(
      `## Épico ${epic} — Administração`,
      "| ID | Como… | Quero… | Para… | Prioridade |",
      "|----|-------|--------|-------|------------|",
      "| US-20 | administrador | gerenciar registros | manter o sistema | Média |",
      "",
    );
  }

  return lines.join("\n");
}

function architecture(order: OrderInput, scope: OrderScope): string {
  const user = mermaidNode("User", "Usuário");
  const edges: string[] = [];

  if (scope.includeFrontend) {
    const ui = mermaidNode("UI", order.frontendStack);
    edges.push(mermaidEdge(user, ui));
  }
  if (scope.includeMobile) {
    const app = mermaidNode("App", order.mobileStack);
    edges.push(mermaidEdge(user, app));
  }
  if (scope.includeBackend) {
    const api = mermaidNode("API", order.backendStack);
    if (scope.includeFrontend) {
      edges.push(mermaidEdge(mermaidNode("UI", order.frontendStack), api));
    }
    if (scope.includeMobile) {
      edges.push(mermaidEdge(mermaidNode("App", order.mobileStack), api));
    }
  }
  if (scope.includeDatabase) {
    const db = mermaidDbNode("DB", order.databaseStack);
    if (scope.includeBackend) {
      edges.push(mermaidEdge(mermaidNode("API", order.backendStack), db));
    }
  }

  const standalone =
    scope.includeMobile && !scope.includeBackend && !scope.includeFrontend;
  const mermaid =
    edges.length > 0
      ? `flowchart LR\n  ${edges.join("\n  ")}`
      : `flowchart LR\n  ${mermaidEdge(user, mermaidNode("App", order.mobileStack || "App local"))}`;

  const layers: string[] = [];
  if (scope.includeMobile) {
    layers.push(
      `- **App (${order.mobileStack})**: interface, lógica de negócio${standalone ? " e estado local" : ""}`,
    );
  }
  if (scope.includeFrontend) {
    layers.push(`- **Web (${order.frontendStack})**: interface no navegador`);
  }
  if (scope.includeBackend) {
    layers.push(`- **API (${order.backendStack})**: regras e persistência`);
  }
  if (scope.includeDatabase) {
    layers.push(`- **Dados (${order.databaseStack})**: armazenamento persistente`);
  }

  return `# Arquitetura — ${order.name}

## Escopo
${scopeLayersLabel(scope)}

## Camadas
${layers.join("\n")}

## Diagrama
\`\`\`mermaid
${mermaid}
\`\`\`

## Decisões
${scope.includeBackend ? "1. API REST entre cliente e servidor\n2. Regras de negócio validadas no back-end" : "1. **App standalone** — lógica e estado no cliente\n2. Sem servidor neste escopo"}
${scope.includeAuth ? "\n3. Autenticação de usuários" : "\n3. Sem login — uso direto do app"}
${standalone ? "\n4. Estado em memória ou storage local do dispositivo (sem sync remoto)" : ""}
`;
}

function dataModel(order: OrderInput, scope: OrderScope): string {
  if (!scope.includeDatabase && !scope.includeBackend) {
    return `# Modelo de dados — ${order.name}

Não há banco de dados neste escopo. Estado local no app (memória / storage do dispositivo).
`;
  }
  const entity = slugify(order.name).replace(/-/g, "_");
  return `# Modelo de dados — ${order.name}

${scope.includeAuth ? "### User\n- id, email, name, created_at\n" : ""}
### ${entity}
- id, ${scope.includeAuth ? "user_id, " : ""}payload, created_at

${scope.includeDatabase ? `Persistência em **${order.databaseStack}**.` : "Persistência mínima conforme necessidade da API."}
`;
}

function backendPlan(order: OrderInput, scope: OrderScope): string {
  return `# Plano back-end — ${order.backendStack}

## Quando implementar
Somente se o escopo incluir API (${scope.includeBackend ? "sim" : "não aplicável"}).

## Ordem
1. Bootstrap do serviço
${scope.includeDatabase ? `2. Conexão ${order.databaseStack} + migrações` : "2. Endpoints stateless (se aplicável)"}
${scope.includeAuth ? "3. Autenticação" : ""}
4. Endpoints do domínio (${order.name})
5. Testes de integração

## Regras no servidor
${order.businessRules}
`;
}

function clientPlan(order: OrderInput, scope: OrderScope): string {
  const parts: string[] = [`# Plano do app / interface — ${order.name}`, ""];
  if (scope.includeMobile) {
    parts.push(
      `## Mobile / app (${order.mobileStack})`,
      "1. Scaffold do projeto",
      "2. Layout principal e navegação mínima",
      "3. Fluxo central (telas do MVP)",
      "4. Lógica de negócio no cliente (se standalone)",
      scope.includeBackend ? "5. Integração com API" : "5. Estado local (sem API)",
      "",
    );
  }
  if (scope.includeFrontend) {
    parts.push(
      `## Front-end web (${order.frontendStack})`,
      "1. Layout e rotas",
      "2. Fluxo principal",
      scope.includeBackend ? "3. Client HTTP para API" : "3. Dados mockados ou estáticos",
      "",
    );
  }
  return parts.join("\n");
}

function qaStrategy(order: OrderInput, scope: OrderScope): string {
  return `# Estratégia de QA — ${order.name}

## Foco
${scope.includeBackend ? "- Testes unitários + integração API" : "- Testes unitários da lógica do app"}
${hasClientLayer(scope) ? "- Teste manual/E2E do fluxo principal na interface" : ""}

## Casos críticos
1. Fluxo principal: ${order.businessRules.split("\n")[0] || order.problem}
${scope.includeAuth ? "2. Login inválido / válido" : ""}
${scope.includeBackend ? "3. API rejeita regras inválidas" : "2. Operações matemáticas / fluxo core correto"}
`;
}

function roadmap(order: OrderInput, scope: OrderScope): string {
  const rules = order.businessRules
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  const phases: string[] = [
    "## Visão geral",
    "",
    `Projeto **${order.name}** — ${scopeLayersLabel(scope)}.`,
    "",
    "Ordem recomendada de execução (detalhamento em [TAREFAS.md](./TAREFAS.md)):",
    "",
    "### Fase 0 — Fundação (semana 1)",
    "- [ ] Monorepo, CI, variáveis de ambiente (.env.example)",
    "",
  ];

  if (scope.includeBackend) {
    phases.push(
      "### Fase 1 — API base (semana 1–2)",
      "- [ ] Bootstrap API, health, OpenAPI/Swagger",
      "",
    );
  }

  if (scope.includeBackend && scope.includeDatabase) {
    phases.push(
      "### Fase 2 — Dados (semana 2)",
      `- [ ] Schema e migrações ${order.databaseStack}`,
      "- [ ] Seeds (categorias, enums)",
      "",
    );
  }

  if (scope.includeBackend && scope.includeAuth) {
    phases.push(
      "### Fase 3 — Autenticação (semana 2)",
      "- [ ] Registro, login, JWT, guards nas rotas privadas",
      "",
    );
  }

  if (scope.includeBackend) {
    phases.push(
      "### Fase 4 — Domínio / regras de negócio (semana 3–4)",
      "- [ ] Endpoints do fluxo principal conforme PRD",
      "- [ ] Validações server-side das regras RN-*",
      "",
    );
  }

  phases.push(
    "### Fase 5 — Sync e métricas (semana 4–5)",
    "- [ ] Canal tempo real (WebSocket/SSE) se aplicável",
    "- [ ] Endpoint de produtividade para gráficos web",
    "",
  );

  if (scope.includeMobile) {
    phases.push(
      `### Fase 6 — Mobile (${order.mobileStack}) (semana 3–5)`,
      "- [ ] Scaffold, auth, CRUD, integração API",
      "",
    );
  }

  if (scope.includeFrontend) {
    phases.push(
      `### Fase 7 — Web (${order.frontendStack}) (semana 3–5)`,
      "- [ ] Scaffold, auth, CRUD, dashboard se aplicável",
      "",
    );
  }

  if (scope.includeAdmin) {
    phases.push(
      "### Fase 8 — Administração (semana 5)",
      "- [ ] Painel admin básico",
      "",
    );
  }

  phases.push(
    "### Fase 9 — QA e entrega (semana 5–6)",
    "- [ ] Testes unitários, integração API, E2E do fluxo crítico",
    "- [ ] Checklist de release e documentação de setup",
    "",
    "## Mapeamento regras → fases",
    ...rules.map((rule, i) => `- **RN-${String(i + 1).padStart(2, "0")}:** ${rule}`),
    "",
    "## Marcos",
    "- **M0** — Ambiente local sobe (API + clientes)",
    "- **M1** — CRUD funcional em pelo menos um cliente",
    "- **M2** — Regras de negócio validadas na API",
    "- **M3** — MVP integrado (mobile + web + API, se no escopo)",
    "- **M4** — Testes críticos verdes; pacote pronto para staging",
  );

  return `# Roadmap — ${order.name}

Escopo: ${scopeLayersLabel(scope)}

${phases.join("\n")}
`;
}

function tasks(order: OrderInput, scope: OrderScope): string {
  return generateTaskBacklog(order, scope);
}
