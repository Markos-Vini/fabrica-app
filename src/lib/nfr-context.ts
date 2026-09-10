import type { OrderInput } from "@/lib/types";

export const OFFLINE_MODE_OPTIONS = [
  {
    id: "online_only",
    label: "Só online",
    hint: "App exige conexão; sem cache offline.",
  },
  {
    id: "offline_read",
    label: "Leitura offline",
    hint: "Consulta dados em cache; gravações exigem rede.",
  },
  {
    id: "offline_full",
    label: "Offline-first",
    hint: "Fila local de alterações e sync quando voltar online.",
  },
] as const;

export type OfflineMode = (typeof OFFLINE_MODE_OPTIONS)[number]["id"];

export const SYNC_MODE_OPTIONS = [
  {
    id: "none",
    label: "Sem sync",
    hint: "Um dispositivo ou sem compartilhamento entre sessões.",
  },
  {
    id: "on_demand",
    label: "Sync sob demanda",
    hint: "Pull/refresh manual ou periódico entre dispositivos.",
  },
  {
    id: "realtime",
    label: "Tempo real",
    hint: "WebSocket ou push — mudanças refletem em segundos.",
  },
] as const;

export type SyncMode = (typeof SYNC_MODE_OPTIONS)[number]["id"];

export const SCALE_TIER_OPTIONS = [
  { id: "small", label: "Pequena (até ~100 usuários)" },
  { id: "medium", label: "Média (centenas a poucos mil)" },
  { id: "large", label: "Grande (10 mil+)" },
  { id: "enterprise", label: "Enterprise (100 mil+)" },
] as const;

export type ScaleTier = (typeof SCALE_TIER_OPTIONS)[number]["id"];

export const LOCALE_SCOPE_OPTIONS = [
  { id: "pt_br", label: "Só PT-BR" },
  { id: "pt_en", label: "PT-BR + English" },
  { id: "multi", label: "Multilíngue (3+ idiomas)" },
] as const;

export type LocaleScope = (typeof LOCALE_SCOPE_OPTIONS)[number]["id"];

export const PRIVACY_LEVEL_OPTIONS = [
  {
    id: "standard",
    label: "Padrão",
    hint: "Dados comuns de app; boas práticas básicas.",
  },
  {
    id: "lgpd",
    label: "LGPD",
    hint: "Dados pessoais no Brasil — consentimento, exclusão, auditoria.",
  },
  {
    id: "sensitive",
    label: "Dados sensíveis",
    hint: "Saúde, financeiro ou informações reguladas.",
  },
] as const;

export type PrivacyLevel = (typeof PRIVACY_LEVEL_OPTIONS)[number]["id"];

export type NfrDefaults = {
  nfrOffline: OfflineMode;
  nfrSync: SyncMode;
  nfrScale: ScaleTier;
  nfrLocales: LocaleScope;
  nfrPrivacy: PrivacyLevel;
  nfrNotes: string;
};

export const DEFAULT_NFR: NfrDefaults = {
  nfrOffline: "online_only",
  nfrSync: "none",
  nfrScale: "small",
  nfrLocales: "pt_br",
  nfrPrivacy: "standard",
  nfrNotes: "",
};

function parseEnum<T extends string>(
  raw: unknown,
  options: readonly { id: T }[],
  fallback: T,
): T {
  const value = String(raw ?? fallback).trim();
  return options.some((opt) => opt.id === value) ? (value as T) : fallback;
}

export function parseOfflineMode(raw: unknown): OfflineMode {
  return parseEnum(raw, OFFLINE_MODE_OPTIONS, DEFAULT_NFR.nfrOffline);
}

export function parseSyncMode(raw: unknown): SyncMode {
  return parseEnum(raw, SYNC_MODE_OPTIONS, DEFAULT_NFR.nfrSync);
}

export function parseScaleTier(raw: unknown): ScaleTier {
  return parseEnum(raw, SCALE_TIER_OPTIONS, DEFAULT_NFR.nfrScale);
}

export function parseLocaleScope(raw: unknown): LocaleScope {
  return parseEnum(raw, LOCALE_SCOPE_OPTIONS, DEFAULT_NFR.nfrLocales);
}

export function parsePrivacyLevel(raw: unknown): PrivacyLevel {
  return parseEnum(raw, PRIVACY_LEVEL_OPTIONS, DEFAULT_NFR.nfrPrivacy);
}

export function parseNfrFromForm(formData: FormData): Pick<
  OrderInput,
  "nfrOffline" | "nfrSync" | "nfrScale" | "nfrLocales" | "nfrPrivacy" | "nfrNotes"
> {
  const notes = String(formData.get("nfrNotes") ?? "").trim();
  return {
    nfrOffline: parseOfflineMode(formData.get("nfrOffline")),
    nfrSync: parseSyncMode(formData.get("nfrSync")),
    nfrScale: parseScaleTier(formData.get("nfrScale")),
    nfrLocales: parseLocaleScope(formData.get("nfrLocales")),
    nfrPrivacy: parsePrivacyLevel(formData.get("nfrPrivacy")),
    nfrNotes: notes ? notes.slice(0, 2000) : null,
  };
}

function labelFor<T extends string>(
  id: T | null | undefined,
  options: readonly { id: T; label: string }[],
): string {
  if (!id) return "";
  return options.find((opt) => opt.id === id)?.label ?? id;
}

export function nfrLabels(order: OrderInput): string[] {
  const lines: string[] = [];
  if (order.nfrOffline) {
    lines.push(`Conectividade: ${labelFor(order.nfrOffline, OFFLINE_MODE_OPTIONS)}`);
  }
  if (order.nfrSync) {
    lines.push(`Sync: ${labelFor(order.nfrSync, SYNC_MODE_OPTIONS)}`);
  }
  if (order.nfrScale) {
    lines.push(`Escala: ${labelFor(order.nfrScale, SCALE_TIER_OPTIONS)}`);
  }
  if (order.nfrLocales) {
    lines.push(`Idiomas: ${labelFor(order.nfrLocales, LOCALE_SCOPE_OPTIONS)}`);
  }
  if (order.nfrPrivacy) {
    lines.push(`Privacidade: ${labelFor(order.nfrPrivacy, PRIVACY_LEVEL_OPTIONS)}`);
  }
  if (order.nfrNotes) {
    lines.push(`Notas RNF: ${order.nfrNotes}`);
  }
  return lines;
}

export function withNfrDefaults(order: OrderInput): OrderInput {
  return {
    ...order,
    nfrOffline: order.nfrOffline ?? DEFAULT_NFR.nfrOffline,
    nfrSync: order.nfrSync ?? DEFAULT_NFR.nfrSync,
    nfrScale: order.nfrScale ?? DEFAULT_NFR.nfrScale,
    nfrLocales: order.nfrLocales ?? DEFAULT_NFR.nfrLocales,
    nfrPrivacy: order.nfrPrivacy ?? DEFAULT_NFR.nfrPrivacy,
    nfrNotes: order.nfrNotes ?? null,
  };
}

export function nfrBriefForPrompt(order: OrderInput): string {
  const normalized = withNfrDefaults(order);
  const lines = nfrLabels(normalized);
  if (lines.length === 0) return "";
  return `Requisitos não funcionais:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function nfrReviewSummary(order: OrderInput): string {
  return nfrLabels(withNfrDefaults(order)).join(" · ");
}

export function nfrReviewSummaryFromForm(formData: FormData): string {
  return nfrReviewSummary({
    name: "",
    problem: "",
    audience: "",
    businessRules: "",
    deliverableType: "C",
    mobileStack: "",
    frontendStack: "",
    backendStack: "",
    databaseStack: "",
    generateTestBuild: false,
    scopePreset: "app-only",
    includeMobile: true,
    includeFrontend: false,
    includeBackend: false,
    includeDatabase: false,
    includeAuth: false,
    includeAdmin: false,
    ...parseNfrFromForm(formData),
  });
}
