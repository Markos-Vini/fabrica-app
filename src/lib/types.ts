export type DeliverableType = "A" | "B" | "C" | "D";

export type AgentId =
  | "pm"
  | "architect"
  | "backend"
  | "frontend"
  | "devops"
  | "qa";

export type LlmProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "cursor";

export type OrderScope = import("@/lib/order-scope").OrderScope;

export type UiStyle = import("@/lib/visual-design").UiStyle;
export type DomainTemplateId = import("@/lib/domain-templates").DomainTemplateId;
export type OfflineMode = import("@/lib/nfr-context").OfflineMode;
export type SyncMode = import("@/lib/nfr-context").SyncMode;
export type ScaleTier = import("@/lib/nfr-context").ScaleTier;
export type LocaleScope = import("@/lib/nfr-context").LocaleScope;
export type PrivacyLevel = import("@/lib/nfr-context").PrivacyLevel;

export type OrderInput = {
  name: string;
  problem: string;
  audience: string;
  businessRules: string;
  deliverableType: DeliverableType;
  mobileStack: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
  generateTestBuild: boolean;
  scopePreset: string;
  includeMobile: boolean;
  includeFrontend: boolean;
  includeBackend: boolean;
  includeDatabase: boolean;
  includeAuth: boolean;
  includeAdmin: boolean;
  /** Estilo visual desejado para apps gerados */
  uiStyle?: UiStyle;
  /** Cor primária em hex (#RRGGBB), opcional */
  primaryColor?: string | null;
  /** Referência textual de UI, ex.: "como Todoist" */
  uiReference?: string | null;
  /** Entregas essenciais da v1 */
  mvpEssentials?: string | null;
  /** Escopo para fases posteriores */
  mvpLater?: string | null;
  /** Papéis de usuário (texto consolidado) */
  userRoles?: string | null;
  /** Jornadas / fluxos principais */
  mainFlows?: string | null;
  /** Telas e páginas esperadas (texto consolidado) */
  expectedScreens?: string | null;
  /** Template de domínio usado no wizard */
  domainTemplateId?: DomainTemplateId;
  /** Conectividade: online_only | offline_read | offline_full */
  nfrOffline?: OfflineMode;
  /** Sync entre dispositivos: none | on_demand | realtime */
  nfrSync?: SyncMode;
  /** Escala esperada de usuários */
  nfrScale?: ScaleTier;
  /** Escopo de idiomas */
  nfrLocales?: LocaleScope;
  /** Nível de privacidade / compliance */
  nfrPrivacy?: PrivacyLevel;
  /** Notas livres sobre RNF */
  nfrNotes?: string | null;
  /** Integrações externas (texto consolidado) */
  externalIntegrations?: string | null;
  /** Entidades principais do domínio (texto consolidado) */
  mainEntities?: string | null;
  /** Relações entre entidades */
  entityRelations?: string | null;
  /** Critérios mensuráveis de sucesso do MVP */
  successCriteria?: string | null;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderKeys = {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  ollamaBaseUrl?: string;
  cursor?: string;
};
