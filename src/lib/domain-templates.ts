import type { ScopePresetId } from "@/lib/order-scope";
import type { ScreenId, UserRoleId } from "@/lib/product-context";
import type { UiStyle } from "@/lib/visual-design";
import type {
  LocaleScope,
  OfflineMode,
  PrivacyLevel,
  ScaleTier,
  SyncMode,
} from "@/lib/nfr-context";
import { DEFAULT_NFR } from "@/lib/nfr-context";
import type { IntegrationId } from "@/lib/integrations-context";
import type { EntityId } from "@/lib/data-model-context";

export type DomainTemplateId =
  | "blank"
  | "tasklist"
  | "calculator"
  | "ecommerce"
  | "booking";

export type DomainFormDefaults = {
  name: string;
  problem: string;
  audience: string;
  businessRules: string;
  mvpEssentials: string;
  mvpLater: string;
  userRoles: UserRoleId[];
  userRolesCustom: string;
  mainFlows: string;
  screens: ScreenId[];
  screensCustom: string;
  uiStyle: UiStyle;
  primaryColor: string;
  uiReference: string;
  scopePreset: ScopePresetId;
  mobileStack: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
  nfrOffline: OfflineMode;
  nfrSync: SyncMode;
  nfrScale: ScaleTier;
  nfrLocales: LocaleScope;
  nfrPrivacy: PrivacyLevel;
  nfrNotes: string;
  integrations: IntegrationId[];
  integrationsCustom: string;
  entities: EntityId[];
  entitiesCustom: string;
  entityRelations: string;
  successCriteria: string;
};

export type DomainTemplate = {
  id: DomainTemplateId;
  title: string;
  description: string;
  defaults: DomainFormDefaults;
};

const BLANK_DEFAULTS: DomainFormDefaults = {
  name: "",
  problem: "",
  audience: "",
  businessRules: "",
  mvpEssentials: "",
  mvpLater: "",
  userRoles: [],
  userRolesCustom: "",
  mainFlows: "",
  screens: [],
  screensCustom: "",
  uiStyle: "modern",
  primaryColor: "",
  uiReference: "",
  scopePreset: "app-only",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  ...DEFAULT_NFR,
  integrations: [],
  integrationsCustom: "",
  entities: [],
  entitiesCustom: "",
  entityRelations: "",
  successCriteria: "",
};

export const DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    id: "blank",
    title: "Em branco",
    description: "Comece do zero sem pré-preenchimento.",
    defaults: BLANK_DEFAULTS,
  },
  {
    id: "tasklist",
    title: "TaskList",
    description: "App de tarefas com mobile, API e painel web.",
    defaults: {
      ...BLANK_DEFAULTS,
      name: "TaskList",
      problem:
        "Gerenciamento de tarefas sincronizado entre mobile e web, com prioridades, categorias e acompanhamento de produtividade.",
      audience:
        "Profissionais, estudantes e equipes pequenas que precisam organizar afazeres diários.",
      businessRules:
        "1. CRUD de tarefas no mobile e web.\n2. Cada tarefa tem título, descrição opcional, data, prioridade e categoria.\n3. Tarefas concluídas sincronizam com a API.\n4. Filtros por status, prioridade e categoria.\n5. Não permitir data de vencimento no passado.",
      mvpEssentials:
        "- Login e cadastro\n- CRUD de tarefas no mobile\n- Lista com filtros e conclusão\n- API REST com persistência",
      mvpLater:
        "- Gráficos de produtividade no painel web\n- Sync em tempo real\n- Painel admin",
      userRoles: ["end_user"],
      mainFlows:
        "1. Cadastro → Login → Home com lista de tarefas\n2. Criar tarefa → Definir prioridade e data → Salvar\n3. Filtrar pendentes → Concluir tarefa\n4. Web: visualizar gráficos de produtividade",
      screens: [
        "login",
        "register",
        "home",
        "detail",
        "form",
        "profile",
        "filters",
        "dashboard",
        "reports",
      ],
      uiStyle: "modern",
      primaryColor: "#2563EB",
      uiReference: "Layout limpo como Todoist, cards arredondados",
      scopePreset: "app-api",
      mobileStack: "Flutter (Dart)",
      backendStack: "Node.js (Express/NestJS)",
      databaseStack: "PostgreSQL",
      nfrOffline: "online_only",
      nfrSync: "on_demand",
      nfrScale: "medium",
      nfrLocales: "pt_br",
      nfrPrivacy: "standard",
      nfrNotes: "",
      integrations: [],
      integrationsCustom: "",
      entities: ["user", "task", "category", "tag"],
      entitiesCustom: "",
      entityRelations:
        "Usuário 1:N Tarefa\nTarefa N:1 Categoria\nTarefa N:N Tag (opcional v2)",
      successCriteria:
        "- Usuário cria 5 tarefas em < 2 min no mobile demo\n- Login + CRUD completo sem erro no fluxo guiado\n- Filtros por status retornam resultado correto em < 1 s",
    },
  },
  {
    id: "calculator",
    title: "Calculadora",
    description: "App local de calculadora — sem backend.",
    defaults: {
      ...BLANK_DEFAULTS,
      name: "Calcfacil",
      problem:
        "Calculadora simples e rápida para operações básicas (+, −, ×, ÷) com histórico local.",
      audience: "Usuários que precisam de cálculos rápidos no celular.",
      businessRules:
        "1. Operações básicas com teclado numérico.\n2. Botões C (limpar entrada) e AC (reset total).\n3. Exibir erro em divisão por zero.\n4. Histórico das últimas operações no dispositivo.",
      mvpEssentials:
        "- Teclado numérico e operadores\n- Display grande e legível\n- Histórico local de cálculos",
      mvpLater: "- Temas claro/escuro\n- Modo científico",
      userRoles: ["end_user"],
      mainFlows:
        "1. Abrir app → Digitar número → Operador → Segundo número → Resultado\n2. Ver histórico → Reutilizar valor",
      screens: ["home", "settings"],
      uiStyle: "minimal",
      primaryColor: "#D4894A",
      uiReference: "Display grande estilo calculadora iOS, teclado denso",
      scopePreset: "app-only",
      mobileStack: "Flutter (Dart)",
      nfrOffline: "offline_full",
      nfrSync: "none",
      nfrScale: "small",
      nfrLocales: "pt_br",
      nfrPrivacy: "standard",
      nfrNotes: "",
      integrations: [],
      integrationsCustom: "",
      entities: [],
      entitiesCustom: "Histórico de cálculo (local no dispositivo)",
      entityRelations: "",
      successCriteria:
        "- Resultado correto para +, −, × e ÷\n- Divisão por zero exibe mensagem clara\n- Histórico exibe as últimas 10 operações",
    },
  },
  {
    id: "ecommerce",
    title: "E-commerce",
    description: "Loja online com catálogo, carrinho e checkout.",
    defaults: {
      ...BLANK_DEFAULTS,
      name: "LojaRápida",
      problem:
        "Loja virtual para vender produtos com catálogo, carrinho, checkout e gestão de pedidos.",
      audience: "Pequenos comerciantes e consumidores finais.",
      businessRules:
        "1. Catálogo com nome, preço, imagem e estoque.\n2. Carrinho persiste entre sessões logadas.\n3. Checkout com endereço e forma de pagamento (simulado no MVP).\n4. Admin gerencia produtos e pedidos.\n5. Estoque não pode ficar negativo.",
      mvpEssentials:
        "- Catálogo e detalhe do produto\n- Carrinho e checkout\n- Login de cliente\n- Painel admin de produtos",
      mvpLater:
        "- Gateway de pagamento real\n- Cupons de desconto\n- Rastreamento de entrega",
      userRoles: ["end_user", "admin"],
      mainFlows:
        "1. Navegar catálogo → Ver produto → Adicionar ao carrinho\n2. Carrinho → Checkout → Confirmar pedido\n3. Admin: cadastrar produto → Publicar",
      screens: [
        "login",
        "register",
        "home",
        "detail",
        "form",
        "profile",
        "filters",
        "dashboard",
        "admin",
        "reports",
        "users_mgmt",
      ],
      uiStyle: "modern",
      primaryColor: "#059669",
      uiReference: "Cards de produto estilo Mercado Livre / Shopify",
      scopePreset: "full",
      mobileStack: "Flutter (Dart)",
      frontendStack: "React.js / Next.js",
      backendStack: "Node.js (Express/NestJS)",
      databaseStack: "PostgreSQL",
      nfrOffline: "online_only",
      nfrSync: "on_demand",
      nfrScale: "medium",
      nfrLocales: "pt_br",
      nfrPrivacy: "lgpd",
      nfrNotes: "Dados de clientes e pedidos — consentimento e exclusão.",
      integrations: ["payment", "email", "storage"],
      integrationsCustom: "",
      entities: ["user", "product", "order", "cart", "address", "payment"],
      entitiesCustom: "",
      entityRelations:
        "Usuário 1:N Pedido\nPedido 1:N ItemPedido N:1 Produto\nUsuário 1:N Endereço\nPedido 1:1 Pagamento",
      successCriteria:
        "- Cliente conclui checkout simulado em < 3 min\n- Admin cadastra produto visível no catálogo em < 1 min\n- Estoque não fica negativo após venda",
    },
  },
  {
    id: "booking",
    title: "Agenda / reservas",
    description: "Agendamento de horários com confirmação.",
    defaults: {
      ...BLANK_DEFAULTS,
      name: "AgendaFácil",
      problem:
        "Sistema de agendamento de horários para serviços (barbearia, clínica, consultoria) com confirmação e lembretes.",
      audience: "Prestadores de serviço e clientes que agendam horários.",
      businessRules:
        "1. Profissional define slots disponíveis por dia.\n2. Cliente escolhe serviço, data e horário livre.\n3. Não permitir double-booking no mesmo slot.\n4. Cancelamento até 2h antes do horário.\n5. Notificação de confirmação (simulada no MVP).",
      mvpEssentials:
        "- Cadastro de serviços e horários\n- Calendário de disponibilidade\n- Reserva pelo app\n- Lista de agendamentos do cliente",
      mvpLater:
        "- Lembretes push\n- Painel admin multi-profissional\n- Pagamento antecipado",
      userRoles: ["end_user", "admin"],
      userRolesCustom: "Profissional / prestador",
      mainFlows:
        "1. Cliente: escolher serviço → Ver horários → Confirmar reserva\n2. Profissional: definir agenda → Ver reservas do dia\n3. Cancelar ou reagendar com antecedência",
      screens: [
        "login",
        "register",
        "home",
        "detail",
        "form",
        "profile",
        "filters",
        "notifications",
        "dashboard",
        "admin",
      ],
      uiStyle: "corporate",
      primaryColor: "#1E3A5F",
      uiReference: "Calendário limpo estilo Calendly",
      scopePreset: "app-api",
      mobileStack: "Flutter (Dart)",
      backendStack: "Node.js (Express/NestJS)",
      databaseStack: "PostgreSQL",
      nfrOffline: "online_only",
      nfrSync: "realtime",
      nfrScale: "medium",
      nfrLocales: "pt_br",
      nfrPrivacy: "lgpd",
      nfrNotes: "Evitar double-booking — consistência forte na reserva.",
      integrations: ["email", "push", "calendar"],
      integrationsCustom: "Lembretes por SMS (fase 2)",
      entities: ["user", "service", "slot", "appointment"],
      entitiesCustom: "Profissional / prestador",
      entityRelations:
        "Profissional 1:N Serviço\nProfissional 1:N Slot\nCliente 1:N Agendamento N:1 Slot\nAgendamento N:1 Serviço",
      successCriteria:
        "- Cliente agenda horário livre sem double-booking\n- Cancelamento respeita regra de 2 h de antecedência\n- Lista de reservas do dia carrega em < 2 s",
    },
  },
];

export function getDomainTemplate(id: DomainTemplateId): DomainTemplate {
  return DOMAIN_TEMPLATES.find((t) => t.id === id) ?? DOMAIN_TEMPLATES[0]!;
}

export function parseDomainTemplateId(raw: unknown): DomainTemplateId {
  const value = String(raw ?? "blank").trim();
  if (DOMAIN_TEMPLATES.some((t) => t.id === value)) {
    return value as DomainTemplateId;
  }
  return "blank";
}

export function domainTemplateLabel(id: DomainTemplateId): string {
  return getDomainTemplate(id).title;
}

export function domainTemplateBrief(id: DomainTemplateId): string | null {
  if (id === "blank") return null;
  return `Template de domínio: ${domainTemplateLabel(id)} — use como referência de escopo e vocabulário do produto.`;
}
