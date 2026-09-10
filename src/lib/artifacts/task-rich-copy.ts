import type { OrderInput } from "@/lib/types";
import type { OrderScope } from "@/lib/order-scope";
import type { DomainFeatures } from "./task-backlog-types";

export type TaskCopyContext = {
  order: OrderInput;
  scope: OrderScope;
  features: DomainFeatures;
};

type RichTask = {
  description: (ctx: TaskCopyContext) => string;
  acceptance: (ctx: TaskCopyContext) => string;
};

export const RICH_TASK_COPY: Record<string, RichTask> = {
  repo: {
    description: (ctx) =>
      `Criar a estrutura monorepo do projeto **${ctx.order.name}** com pastas separadas para API, web e mobile (ex.: \`apps/api\`, \`apps/web\`, \`apps/mobile\`). Configurar ESLint, Prettier, TypeScript base e scripts na raiz (\`dev\`, \`build\`, \`test\`, \`lint\`). Documentar no README como clonar, instalar dependências e subir cada app. Objetivo: qualquer dev do time começa em menos de 30 minutos.`,
    acceptance: () =>
      "Repositório clona sem erro; `npm run lint` na raiz executa; README descreve setup local passo a passo",
  },
  ci: {
    description: () =>
      "Configurar GitHub Actions (ou CI equivalente) com jobs por app: lint, testes unitários e build. PRs devem rodar a pipeline automaticamente. Cache de dependências para reduzir tempo de build.",
    acceptance: () =>
      "Pipeline roda em PR; merge bloqueado se lint ou test falhar; badge de status opcional no README",
  },
  env: {
    description: (ctx) =>
      `Publicar \`.env.example\` para API, web e mobile com variáveis documentadas (ex.: \`DATABASE_URL\`, \`JWT_SECRET\`, \`API_URL\`, \`NEXT_PUBLIC_API_URL\`). Nunca commitar secrets reais. Alinhar nomes entre apps para o fluxo ${ctx.order.name} funcionar em localhost.`,
    acceptance: () =>
      "Dev novo copia .env.example, preenche valores mínimos e sobe API + um cliente conforme README",
  },
  api: {
    description: (ctx) =>
      `Inicializar serviço ${ctx.order.backendStack} com prefixo \`/api/v1\`, endpoint \`GET /health\` retornando versão e status, CORS configurado para origens web/mobile em dev, e logging estruturado (request id, status, duração). Base para todos os módulos do ${ctx.order.name}.`,
    acceptance: () => "GET /health → 200 JSON; logs em stdout; CORS permite localhost dos clientes",
  },
  "api-common": {
    description: () =>
      "Implementar camada transversal: pipes de validação (class-validator ou equivalente), DTOs tipados, exception filter retornando JSON `{ field, message }` ou `{ error, details }`, e middleware de request-id. Padronizar códigos HTTP em todo o domínio.",
    acceptance: () =>
      "Payload inválido → 400 com campo e mensagem; exceções não tratadas → 500 sem stack trace em produção",
  },
  swagger: {
    description: () =>
      "Expor documentação OpenAPI/Swagger em `/api/docs` com schemas de request/response dos endpoints MVP. Manter sincronizado com DTOs — contrato é referência para web e mobile.",
    acceptance: () =>
      "Swagger UI acessível; endpoints de auth, tasks e analytics documentados com exemplos",
  },
  schema: {
    description: (ctx) =>
      `Modelar entidades principais em ${ctx.order.databaseStack} (User, Task, Category conforme PRD): campos, FKs, índices em \`userId\`, \`status\`, \`dueDate\`. Criar migração inicial idempotente e script de rollback. Soft delete em Task (\`deletedAt\`) para preservar histórico de métricas.`,
    acceptance: () =>
      "Migração roda from scratch; índices criados; seed separado; diagrama ER referenciado em MODELO-DADOS.md",
  },
  seeds: {
    description: (ctx) =>
      `${ctx.features.categories ? "Seed de categorias padrão (Trabalho, Estudo, Pessoal, Saúde, Outros) e " : ""}enums de prioridade (Baixa, Média, Alta). Script idempotente executável em dev e CI.`,
    acceptance: () =>
      "Após seed, API lista categorias/prioridades usadas nos formulários de criação de tarefa",
  },
  register: {
    description: () =>
      "Implementar `POST /auth/register` com e-mail único, hash de senha (bcrypt/argon2), validação de formato e retorno de tokens. Nunca logar senha ou hash. Rate limit básico anti-abuse.",
    acceptance: () =>
      "Registro válido → 201 + tokens; e-mail duplicado → 409; senha fraca → 422 com mensagem clara",
  },
  login: {
    description: () =>
      "Implementar `POST /auth/login` e refresh token (`POST /auth/refresh`). Logout invalida refresh quando aplicável. Tokens JWT com expiração curta no access e longa no refresh.",
    acceptance: () =>
      "Login válido → 200 + tokens; credenciais inválidas → 401; refresh renova access sem re-login",
  },
  guard: {
    description: () =>
      "Guard/middleware JWT em rotas privadas: extrair `userId` do token, rejeitar expirado/inválido com 401, anexar usuário ao contexto da request. Todas as queries de domínio filtram por `userId`.",
    acceptance: () =>
      "Rota protegida sem token → 401; token válido → userId disponível no service; usuário A não acessa dados de B",
  },
  "tasks-list": {
    description: () =>
      "Implementar `GET /tasks` com filtros query (`status`, `category`, `priority`, `dueFrom`, `dueTo`), paginação (`page`, `limit`) e ordenação padrão (pendentes primeiro, vencimento ascendente). Retornar apenas tarefas do usuário autenticado.",
    acceptance: () =>
      "Listagem paginada; filtros combináveis; resposta JSON tipada; performance aceitável com 500+ tarefas de teste",
  },
  "tasks-create": {
    description: (ctx) =>
      `Implementar \`POST /tasks\` com body: title (obrig.), description?, dueDate, priority, categoryId. Validar RN-02 e ${ctx.features.dueDateValidation ? "rejeitar dueDate anterior a hoje (422, RN-05)" : "campos obrigatórios"}. Persistir e retornar 201.`,
    acceptance: (ctx) =>
      ctx.features.dueDateValidation
        ? "Criação válida → 201; dueDate passada → 422; campos faltando → 400"
        : "Criação válida → 201; payload inválido → 400/422",
  },
  "tasks-update": {
    description: () =>
      "Implementar `PATCH /tasks/:id` para atualização parcial. Verificar ownership (`task.userId === auth.userId`). Atualizar `updatedAt`. Revalidar dueDate e demais regras na edição.",
    acceptance: () =>
      "Dono edita com sucesso → 200; outro usuário → 403; id inexistente → 404",
  },
  "tasks-complete": {
    description: (ctx) =>
      `Endpoint \`PATCH /tasks/:id/complete\`: seta status COMPLETED, preenche \`completedAt\` (UTC), persiste imediatamente e ${ctx.features.syncRealtime ? "dispara evento de sync (RN-03)" : "retorna entidade atualizada"}. Idempotente se já concluída.`,
    acceptance: () =>
      "Conclusão persiste completedAt; segundo PATCH idempotente; evento sync emitido se aplicável",
  },
  "tasks-delete": {
    description: () =>
      "Implementar `DELETE /tasks/:id` com soft delete (`deletedAt`) ou hard delete conforme PRD. Verificar ownership. Excluída não aparece em listagens padrão.",
    acceptance: () => "Delete → 204/200; 404 se não existir; listagem não retorna tarefa excluída",
  },
  "tasks-stats": {
    description: (ctx) =>
      `Agregações em \`GET /analytics/productivity?period=day|week|month\`: séries temporais de tarefas concluídas vs pendentes por usuário autenticado. Alimenta dashboard web (RN-04). Dados derivados de \`completedAt\` e \`status\`.`,
    acceptance: () =>
      "Resposta JSON com séries por período; contagem bate com dados seed; filtrado por userId",
  },
  realtime: {
    description: () =>
      "Canal WebSocket (ou SSE) autenticado em `/sync`: após create/update/complete/delete de task, broadcast evento `{ type, task }` para conexões do mesmo userId. Latência alvo < 2s p95.",
    acceptance: () =>
      "Cliente conectado recebe evento após mutação; reconexão automática documentada; auth obrigatória",
  },
  "realtime-doc": {
    description: () =>
      "Documentar contrato de eventos sync: tipos (`task.created`, `task.updated`, `task.completed`, `task.deleted`), payload JSON, versionamento e exemplo de client-side (web + mobile).",
    acceptance: () => "Seção no README da API + exemplo funcional mínimo",
  },
  "mobile-scaffold": {
    description: (ctx) =>
      `Criar projeto ${ctx.order.mobileStack} com navegação (ex.: go_router), theme, estrutura \`lib/screens\`, \`lib/services\`, \`lib/models\`. Flavors dev/prod se aplicável. App abre em emulador sem crash.`,
    acceptance: () => "`flutter run` OK; estrutura de pastas documentada; ícone/splash placeholder",
  },
  "mobile-auth": {
    description: () =>
      "Cliente HTTP (dio/http) com interceptor de Bearer token, refresh automático, secure storage para tokens. Telas login/registro integradas à API. 401 global → redirect login.",
    acceptance: () =>
      "Login persiste sessão após restart; refresh silencioso; logout limpa storage",
  },
  "mobile-list": {
    description: () =>
      "Tela principal: ListView de tarefas com pull-to-refresh, chips de filtro (status/prioridade), empty state com CTA criar, distinção visual pendente vs concluída.",
    acceptance: () =>
      "Lista carrega da API; refresh atualiza; estados loading/erro/vazio tratados",
  },
  "mobile-form": {
    description: (ctx) =>
      `Formulário criar/editar: title, description, dueDate (date picker), priority, category. ${ctx.features.dueDateValidation ? "Validar data passada no cliente antes de submit (RN-05)." : ""} Feedback inline de erro.`,
    acceptance: () =>
      "Criação e edição funcionam; validação impede submit inválido; sucesso volta à lista",
  },
  "mobile-actions": {
    description: () =>
      "Ações concluir e excluir com confirmação (dialog), feedback visual (snackbar), chamada API imediata. Tratar offline com mensagem e retry manual.",
    acceptance: () =>
      "Concluir/excluir refletem na UI após 200; erro de rede mostra retry",
  },
  "mobile-sync": {
    description: () =>
      "Integrar listener WebSocket/SSE: ao receber evento remoto, atualizar lista in-memory sem reload completo. Manter conexão em foreground.",
    acceptance: () =>
      "Alteração feita na web aparece no app aberto em ≤ 2s em rede estável",
  },
  "web-scaffold": {
    description: (ctx) =>
      `Scaffold ${ctx.order.frontendStack}: App Router, layout autenticado, client HTTP tipado (fetch/axios), rotas protegidas, design tokens alinhados ao produto.`,
    acceptance: () => "`npm run build` passa; rotas públicas vs privadas separadas",
  },
  "web-auth": {
    description: () =>
      "Páginas login/registro, persistência de sessão (cookie httpOnly ou storage seguro), redirect pós-login para dashboard/lista, logout limpa estado global.",
    acceptance: () =>
      "Fluxo registro → dashboard; logout → login; sessão sobrevive refresh de página",
  },
  "web-crud": {
    description: () =>
      "CRUD completo na web: tabela/lista de tarefas, modal ou drawer de formulário, ações inline concluir/excluir, paridade de campos com mobile (RN-01).",
    acceptance: () =>
      "Todas operações CRUD funcionam; UI consistente com mobile; erros API exibidos",
  },
  "web-charts": {
    description: () =>
      "Dashboard com gráfico (Chart.js/Recharts) concluídas vs pendentes, seletor de período (dia/semana/mês), consumindo `/analytics/productivity`. Layout responsivo.",
    acceptance: () =>
      "Gráfico renderiza dados reais; troca de período recarrega; empty state quando sem dados",
  },
  "web-sync": {
    description: () =>
      "Hook de sync: subscreve WebSocket, invalida cache React Query/SWR ao receber eventos, atualiza lista e gráfico sem F5.",
    acceptance: () =>
      "Conclusão no mobile atualiza painel web aberto automaticamente",
  },
  "qa-unit": {
    description: () =>
      "Testes unitários dos services de domínio: validação dueDate, priority enum, ownership checks. Meta ≥ 80% nos módulos críticos (tasks, auth).",
    acceptance: () => "Coverage report ≥ 80% nos services alvo; CI executa testes",
  },
  "qa-api": {
    description: () =>
      "Testes de integração API: fluxos auth, CRUD tasks, analytics, sync. Cobrir 401, 403, 404, 422. Rodar em CI com banco de teste.",
    acceptance: () => "Suite integração verde no CI; casos de erro principais cobertos",
  },
  "qa-e2e": {
    description: (ctx) =>
      `E2E (Playwright ou similar): login → criar tarefa → concluir → ${ctx.features.charts ? "ver gráfico atualizado" : "confirmar na lista"}. Headless no CI.`,
    acceptance: () => "Fluxo crítico E2E passa local e no CI",
  },
};

export function richTaskCopy(
  key: string | undefined,
  fallback: { description: string; acceptance: string },
  ctx: TaskCopyContext,
): { description: string; acceptance: string } {
  if (!key || !RICH_TASK_COPY[key]) return fallback;
  const rich = RICH_TASK_COPY[key];
  return {
    description: rich.description(ctx),
    acceptance: rich.acceptance(ctx),
  };
}
