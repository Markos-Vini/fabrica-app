import type { OrderInput } from "@/lib/types";
import type { OrderScope } from "@/lib/order-scope";
import { scopeLayersLabel } from "@/lib/order-scope";
import type { DomainFeatures } from "./task-backlog-types";
import { richTaskCopy, type TaskCopyContext } from "./task-rich-copy";

export type { DomainFeatures } from "./task-backlog-types";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  acceptance: string;
  dep: string;
  est: number;
  owner: string;
  story?: string;
};

type PhaseBlock = { title: string; items: TaskItem[] };

class BacklogBuilder {
  private seq = 0;
  private phases: PhaseBlock[] = [];
  private currentPhase = "";
  private currentItems: TaskItem[] = [];
  private ids = new Map<string, string>();

  constructor(private readonly copyCtx: TaskCopyContext) {}

  phase(title: string): this {
    this.flushPhase();
    this.currentPhase = title;
    return this;
  }

  add(input: {
    key?: string;
    title: string;
    description: string;
    acceptance: string;
    dep?: string;
    est: number;
    owner: string;
    story?: string;
  }): this {
    this.seq += 1;
    const id = `T-${String(this.seq).padStart(3, "0")}`;
    const dep = input.dep ? (this.ids.get(input.dep) ?? input.dep) : "—";
    const copy = richTaskCopy(
      input.key,
      { description: input.description, acceptance: input.acceptance },
      this.copyCtx,
    );
    const task: TaskItem = {
      id,
      title: input.title,
      description: copy.description,
      acceptance: copy.acceptance,
      dep,
      est: input.est,
      owner: input.owner,
      story: input.story,
    };
    if (input.key) this.ids.set(input.key, id);
    this.currentItems.push(task);
    return this;
  }

  build(): PhaseBlock[] {
    this.flushPhase();
    return this.phases;
  }

  private flushPhase(): void {
    if (this.currentPhase && this.currentItems.length > 0) {
      this.phases.push({ title: this.currentPhase, items: [...this.currentItems] });
    }
    this.currentItems = [];
  }
}

function parseBusinessRules(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function inferFeatures(order: OrderInput): DomainFeatures {
  const blob = `${order.name} ${order.problem} ${order.businessRules}`.toLowerCase();
  return {
    syncRealtime: /sincron|tempo real|real.?time|websocket|sse|push/.test(blob),
    charts: /gráfico|dashboard|produtiv|métrica|chart|relatório visual/.test(blob),
    dueDateValidation: /vencimento|data.*atual|anterior à data|data passada/.test(blob),
    categories: /categor/.test(blob),
    priorities: /prioridad/.test(blob),
    taskCrud: /tarefa|task|afazer|to-?do|checklist/.test(blob),
  };
}

function renderBacklog(
  order: OrderInput,
  scope: OrderScope,
  phases: PhaseBlock[],
): string {
  const rules = parseBusinessRules(order.businessRules);
  const lines: string[] = [
    `# Backlog de tarefas — ${order.name}`,
    "",
    `Escopo: ${scopeLayersLabel(scope)}`,
    "",
    "Backlog orientado a desenvolvimento — cada tarefa abaixo pode virar card no Jira/Linear/GitHub Projects, com descrição e critérios de aceite detalhados.",
    "",
  ];

  for (const section of phases) {
    lines.push(`## ${section.title}`, "");
    for (const task of section.items) {
      lines.push(
        `### ${task.id} · ${task.title}`,
        "",
        `- **Responsável:** ${task.owner}`,
        `- **Estimativa:** ${task.est} dia(s)`,
        `- **Dependências:** ${task.dep}`,
      );
      if (task.story) {
        lines.push(`- **História:** ${task.story}`);
      }
      lines.push(
        "",
        "**Descrição**",
        "",
        task.description,
        "",
        "**Critérios de aceite**",
        "",
        ...formatAcceptanceBullets(task.acceptance),
        "",
      );
    }
  }

  lines.push(
    "",
    "## Regras de negócio rastreadas",
    ...rules.map((rule, i) => `- **RN-${String(i + 1).padStart(2, "0")}:** ${rule}`),
    "",
    "## Definition of Done (MVP)",
    "- [ ] Todas as regras RN acima cobertas por tarefas concluídas e testadas",
    "- [ ] Contratos de API documentados (OpenAPI) e clientes web/mobile integrados",
    "- [ ] Testes automatizados nos fluxos críticos (auth, CRUD, sync se aplicável)",
    "- [ ] README com setup local (API + web + mobile) e variáveis de ambiente",
    "",
    "## Como usar este backlog",
    "1. Importe as tarefas na ferramenta do time mantendo o **ID** (T-xxx) para rastreio.",
    "2. Cruze com [HISTORIAS-USUARIO.md](./HISTORIAS-USUARIO.md) — histórias US-xxx referenciadas nas tarefas.",
    "3. Ajuste estimativas após spike técnico da stack escolhida.",
  );

  return lines.join("\n");
}

function formatAcceptanceBullets(acceptance: string): string[] {
  const parts = acceptance
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return ["- (definir critérios de aceite)"];
  return parts.map((part) => `- ${part}`);
}

export function generateTaskBacklog(order: OrderInput, scope: OrderScope): string {
  if (!scope.includeBackend && !scope.includeFrontend && scope.includeMobile) {
    return mobileOnlyBacklog(order, scope);
  }
  return fullStackBacklog(order, scope);
}

function fullStackBacklog(order: OrderInput, scope: OrderScope): string {
  const features = inferFeatures(order);
  const rules = parseBusinessRules(order.businessRules);
  const copyCtx: TaskCopyContext = { order, scope, features };
  const b = new BacklogBuilder(copyCtx);

  b.phase("Fase 0 — Fundação")
    .add({
      key: "repo",
      title: "Setup monorepo e padrões",
      description:
        "Estrutura apps/api, apps/web, apps/mobile, ESLint, Prettier, scripts root",
      acceptance: "Clone documentado; CI roda lint em PR",
      est: 1,
      owner: "DevOps",
    })
    .add({
      key: "ci",
      title: "CI pipeline inicial",
      description: "GitHub Actions: lint + test + build por app",
      acceptance: "PR bloqueia merge se lint/test falhar",
      dep: "repo",
      est: 1,
      owner: "DevOps",
    })
    .add({
      key: "env",
      title: "Ambientes e secrets",
      description: ".env.example API/web/mobile; DATABASE_URL, JWT_SECRET, API_URL",
      acceptance: "Dev novo sobe stack local seguindo README",
      dep: "repo",
      est: 0.5,
      owner: "DevOps",
    });

  if (scope.includeBackend) {
    b.phase("Fase 1 — API base")
      .add({
        key: "api",
        title: "Bootstrap API",
        description: `${order.backendStack}, prefixo /api/v1, GET /health, CORS`,
        acceptance: "Health 200; logs estruturados",
        dep: "repo",
        est: 1,
        owner: "Back-end",
        story: "US-060",
      })
      .add({
        key: "api-common",
        title: "Camada comum da API",
        description: "ValidationPipe, DTOs, exception filter, erro JSON padronizado",
        acceptance: "Validação → 400 com campo/mensagem",
        dep: "api",
        est: 1,
        owner: "Back-end",
      })
      .add({
        key: "swagger",
        title: "OpenAPI / Swagger",
        description: "Documentação em /api/docs com schemas",
        acceptance: "Endpoints MVP documentados",
        dep: "api",
        est: 0.5,
        owner: "Back-end",
      });
  }

  if (scope.includeBackend && scope.includeDatabase) {
    b.phase("Fase 2 — Dados")
      .add({
        key: "schema",
        title: `Modelagem e migrações ${order.databaseStack}`,
        description:
          "User, Task (title, description?, dueDate, priority, category, status, completedAt)",
        acceptance: "Migração from scratch; índices userId, dueDate, status",
        dep: "api",
        est: 1.5,
        owner: "Back-end",
        story: "US-010",
      })
      .add({
        key: "seeds",
        title: "Seeds categorias/prioridades",
        description: "Enum Category; Baixa/Média/Alta; seed idempotente",
        acceptance: features.categories
          ? "API lista categorias para formulários"
          : "Prioridades disponíveis na API",
        dep: "schema",
        est: 0.5,
        owner: "Back-end",
      });
  }

  if (scope.includeBackend && scope.includeAuth) {
    b.phase("Fase 3 — Autenticação")
      .add({
        key: "register",
        title: "POST /auth/register",
        description: "E-mail único, hash senha, retorno token",
        acceptance: "E-mail duplicado → 409; senha nunca em log",
        dep: scope.includeDatabase ? "schema" : "api",
        est: 1,
        owner: "Back-end",
        story: "US-001",
      })
      .add({
        key: "login",
        title: "POST /auth/login + refresh",
        description: "Login, refresh token, logout invalida sessão",
        acceptance: "401 credenciais inválidas; refresh funciona",
        dep: "register",
        est: 1,
        owner: "Back-end",
        story: "US-002",
      })
      .add({
        key: "guard",
        title: "Guard de autenticação",
        description: "Middleware rotas privadas; userId no contexto",
        acceptance: "Sem token → 401; isolamento por usuário",
        dep: "login",
        est: 0.5,
        owner: "Back-end",
      });
  }

  if (scope.includeBackend && features.taskCrud) {
    const listDep = scope.includeAuth ? "guard" : scope.includeDatabase ? "seeds" : "api-common";

    b.phase("Fase 4 — Domínio (tarefas)")
      .add({
        key: "tasks-list",
        title: "GET /tasks",
        description: "Filtros status, categoria, período; paginação; ordenação",
        acceptance: "Só tarefas do usuário autenticado",
        dep: listDep,
        est: 1,
        owner: "Back-end",
        story: "US-020",
      })
      .add({
        key: "tasks-create",
        title: "POST /tasks",
        description: "title, description?, dueDate, priority, category; validações",
        acceptance: features.dueDateValidation
          ? "dueDate < hoje → 422 (RN-05)"
          : "Payload inválido → 400",
        dep: "tasks-list",
        est: 1,
        owner: "Back-end",
        story: "US-021",
      })
      .add({
        key: "tasks-update",
        title: "PATCH /tasks/:id",
        description: "Atualização parcial; ownership check",
        acceptance: "Só dono edita; updatedAt auditado",
        dep: "tasks-create",
        est: 1,
        owner: "Back-end",
        story: "US-022",
      })
      .add({
        key: "tasks-complete",
        title: "PATCH /tasks/:id/complete",
        description: "Marca concluída, completedAt, histórico sync",
        acceptance: rules[2]
          ? "Histórico atualizado para sync imediato (RN-03)"
          : "Status completed persistido",
        dep: "tasks-update",
        est: 1,
        owner: "Back-end",
        story: "US-023",
      })
      .add({
        key: "tasks-delete",
        title: "DELETE /tasks/:id",
        description: "Exclusão conforme PRD; cascade histórico",
        acceptance: "404 se não existir; UI reflete exclusão",
        dep: "tasks-list",
        est: 0.5,
        owner: "Back-end",
        story: "US-024",
      });

    if (features.charts) {
      b.add({
        key: "tasks-stats",
        title: "GET /analytics/productivity",
        description:
          "Agregação concluídas vs pendentes por período (query period=day|week|month)",
        acceptance: "Dados alimentam gráficos web (RN-04); documentado no OpenAPI",
        dep: "tasks-complete",
        est: 1,
        owner: "Back-end",
        story: "US-040",
      });
    }
  }

  if (scope.includeBackend && features.syncRealtime) {
    b.phase("Fase 5 — Sync tempo real")
      .add({
        key: "realtime",
        title: "Canal WebSocket/SSE",
        description: "Canal autenticado; eventos task.created/updated/completed/deleted",
        acceptance: "Clientes recebem evento < 2s após mutação",
        dep: features.taskCrud ? "tasks-complete" : "api-common",
        est: 2,
        owner: "Back-end",
        story: "US-030",
      })
      .add({
        key: "realtime-doc",
        title: "Contrato de eventos",
        description: "Documentar payload JSON, versionamento, reconexão",
        acceptance: "README + exemplo client-side",
        dep: "realtime",
        est: 0.5,
        owner: "Back-end",
      });
  }

  if (scope.includeMobile) {
    b.phase("Fase 6 — Mobile")
      .add({
        key: "mobile-scaffold",
        title: `Scaffold ${order.mobileStack}`,
        description: "Projeto, screens/widgets/services, flavors dev/prod",
        acceptance: "App abre em emulador",
        dep: "repo",
        est: 1,
        owner: "Mobile",
      })
      .add({
        key: "mobile-auth",
        title: "Cliente HTTP + auth mobile",
        description: "Interceptor token, refresh, secure storage",
        acceptance: "Login persiste; 401 → tela login",
        dep: scope.includeAuth ? "login" : "api",
        est: 1,
        owner: "Mobile",
        story: "US-001",
      })
      .add({
        key: "mobile-list",
        title: "Lista de tarefas mobile",
        description: "ListView, pull-to-refresh, filtros, empty state",
        acceptance: "Lista sincronizada com API",
        dep: "mobile-auth",
        est: 1.5,
        owner: "Mobile",
        story: "US-020",
      })
      .add({
        key: "mobile-form",
        title: "Formulário criar/editar",
        description: "title, description, dueDate, priority, category",
        acceptance: features.dueDateValidation
          ? "Bloqueia data passada localmente (RN-05)"
          : "Validação alinhada à API",
        dep: "mobile-list",
        est: 2,
        owner: "Mobile",
        story: "US-021",
      })
      .add({
        key: "mobile-actions",
        title: "Concluir/excluir mobile",
        description: "Ações com confirmação e feedback visual",
        acceptance: "Conclusão chama API; erro amigável offline",
        dep: "mobile-form",
        est: 1,
        owner: "Mobile",
        story: "US-023",
      });

    if (features.syncRealtime) {
      b.add({
        key: "mobile-sync",
        title: "Listener sync mobile",
        description: "WebSocket/SSE; atualizar lista em tempo real",
        acceptance: "Conclusão no web reflete no app aberto",
        dep: "realtime",
        est: 1.5,
        owner: "Mobile",
        story: "US-030",
      });
    }
  }

  if (scope.includeFrontend) {
    b.phase("Fase 7 — Web")
      .add({
        key: "web-scaffold",
        title: `Scaffold ${order.frontendStack}`,
        description: "Rotas, layout autenticado, client API tipado",
        acceptance: "Rotas protegidas; build passa",
        dep: "repo",
        est: 1,
        owner: "Front-end",
      })
      .add({
        key: "web-auth",
        title: "Auth web",
        description: "Login/registro, sessão, redirect pós-login",
        acceptance: "Registro → dashboard; logout limpa sessão",
        dep: scope.includeAuth ? "login" : "api",
        est: 1.5,
        owner: "Front-end",
        story: "US-001",
      })
      .add({
        key: "web-crud",
        title: "CRUD tarefas web",
        description: "Listagem, formulário modal, complete/delete inline",
        acceptance: "Paridade de campos com mobile (RN-01)",
        dep: "web-auth",
        est: 2,
        owner: "Front-end",
        story: "US-020",
      });

    if (features.charts) {
      b.add({
        key: "web-charts",
        title: "Dashboard gráficos",
        description: "Chart concluídas vs pendentes; filtros período",
        acceptance: "Gráfico responsivo com /analytics/productivity (RN-04)",
        dep: "tasks-stats",
        est: 2,
        owner: "Front-end",
        story: "US-040",
      });
    }

    if (features.syncRealtime) {
      b.add({
        key: "web-sync",
        title: "Sync tempo real web",
        description: "Hook eventos; invalidar cache ao receber update",
        acceptance: "Alteração mobile reflete no painel aberto",
        dep: "realtime",
        est: 1,
        owner: "Front-end",
        story: "US-030",
      });
    }
  }

  if (scope.includeAdmin) {
    b.phase("Fase 8 — Admin")
      .add({
        key: "admin-users",
        title: "Painel admin usuários",
        description: "Listagem, busca, rota /admin role admin",
        acceptance: "Somente admin; paginação",
        dep: scope.includeFrontend ? "web-scaffold" : "api",
        est: 2,
        owner: "Front-end",
        story: "US-050",
      })
      .add({
        key: "admin-metrics",
        title: "Métricas operacionais",
        description: "Endpoints admin: usuários ativos, tarefas/dia",
        acceptance: "Sem expor PII sensível",
        dep: "admin-users",
        est: 1,
        owner: "Back-end",
      });
  }

  const qaDep = scope.includeFrontend
    ? "web-crud"
    : scope.includeMobile
      ? "mobile-actions"
      : features.taskCrud
        ? "tasks-complete"
        : "api";

  b.phase("Fase 9 — QA e entrega")
    .add({
      key: "qa-unit",
      title: "Testes unitários domínio",
      description: "Validação dueDate, priority, ownership",
      acceptance: "≥ 80% services críticos",
      dep: qaDep,
      est: 1.5,
      owner: "QA",
    })
    .add({
      key: "qa-api",
      title: "Testes integração API",
      description: "Auth + CRUD + stats + sync",
      acceptance: "CI verde; 401/422/404 cobertos",
      dep: "qa-unit",
      est: 2,
      owner: "QA",
    })
    .add({
      key: "qa-e2e",
      title: "Testes E2E fluxo crítico",
      description: "Login → criar → concluir → gráfico (se web)",
      acceptance: "Headless no CI",
      dep: features.charts ? "web-charts" : scope.includeFrontend ? "web-crud" : "mobile-actions",
      est: 2,
      owner: "QA",
    })
    .add({
      title: "Checklist release MVP",
      description: "Smoke staging, migrations, rollback, changelog",
      acceptance: "Deploy documentado; tag semver",
      dep: "qa-e2e",
      est: 1,
      owner: "DevOps",
    });

  return renderBacklog(order, scope, b.build());
}

function mobileOnlyBacklog(order: OrderInput, scope: OrderScope): string {
  const rules = parseBusinessRules(order.businessRules);
  const features = inferFeatures(order);
  const b = new BacklogBuilder({ order, scope, features });

  b.phase("Mobile — app local")
    .add({
      key: "m-setup",
      title: `Setup ${order.mobileStack}`,
      description: "Projeto, lib/screens, widgets, services, README",
      acceptance: "App roda em emulador",
      est: 1,
      owner: "Mobile",
    })
    .add({
      key: "m-design",
      title: "Design system",
      description: "Theme, componentes base reutilizáveis",
      acceptance: "Tokens centralizados",
      dep: "m-setup",
      est: 1,
      owner: "Mobile",
    })
    .add({
      key: "m-flow",
      title: "Fluxo principal",
      description: rules[0] ?? order.problem,
      acceptance: "Critérios PRD atendidos",
      dep: "m-design",
      est: 2,
      owner: "Mobile",
    })
    .add({
      key: "m-logic",
      title: "Lógica testável + persistência",
      description: "Domain layer + storage local",
      acceptance: "Testes unitários passando",
      dep: "m-flow",
      est: 2,
      owner: "Mobile",
    })
    .add({
      title: "QA e build release",
      description: "Widget tests + APK/IPA debug",
      acceptance: "Build instalável em dispositivo",
      dep: "m-logic",
      est: 1,
      owner: "QA",
    });

  return renderBacklog(order, { ...scope, includeMobile: true }, b.build());
}
