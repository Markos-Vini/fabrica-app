import type { OrderInput } from "@/lib/types";

export const INTEGRATION_GROUPS = [
  "Autenticação",
  "Comunicação",
  "Serviços",
  "Dados",
] as const;

export const INTEGRATION_OPTIONS = [
  {
    id: "sso_google",
    label: "SSO Google",
    group: "Autenticação",
    hint: "Login com conta Google (OAuth).",
  },
  {
    id: "sso_apple",
    label: "Sign in with Apple",
    group: "Autenticação",
    hint: "Login Apple ID (iOS / web).",
  },
  {
    id: "email",
    label: "E-mail transacional",
    group: "Comunicação",
    hint: "Confirmação, recuperação de senha, notificações.",
  },
  {
    id: "push",
    label: "Push notifications",
    group: "Comunicação",
    hint: "FCM / APNs para alertas no dispositivo.",
  },
  {
    id: "sms",
    label: "SMS",
    group: "Comunicação",
    hint: "OTP, confirmação ou lembretes por SMS.",
  },
  {
    id: "payment",
    label: "Pagamento",
    group: "Serviços",
    hint: "Gateway (Stripe, Mercado Pago, Pix simulado no MVP).",
  },
  {
    id: "maps",
    label: "Mapas / geolocalização",
    group: "Serviços",
    hint: "Endereço, entrega, locais próximos.",
  },
  {
    id: "calendar",
    label: "Calendário externo",
    group: "Serviços",
    hint: "Google Calendar, Outlook — sync de eventos.",
  },
  {
    id: "storage",
    label: "Armazenamento de arquivos",
    group: "Dados",
    hint: "Upload de imagens/docs (S3, Cloudinary).",
  },
  {
    id: "analytics",
    label: "Analytics",
    group: "Dados",
    hint: "GA4, Mixpanel, eventos de produto.",
  },
  {
    id: "webhooks",
    label: "Webhooks / API B2B",
    group: "Dados",
    hint: "Notificar sistemas externos ou receber eventos.",
  },
] as const;

export type IntegrationId = (typeof INTEGRATION_OPTIONS)[number]["id"];

export type IntegrationDefaults = {
  integrations: IntegrationId[];
  integrationsCustom: string;
};

export function parseIntegrationsFromForm(formData: FormData): string | null {
  const selected = INTEGRATION_OPTIONS.filter(
    (opt) => formData.get(`integration_${opt.id}`) === "on",
  ).map((opt) => opt.label);
  const custom = String(formData.get("integrationsCustom") ?? "").trim();
  if (custom) selected.push(custom);
  if (selected.length === 0) return null;
  return selected.join(", ");
}

export function integrationsBriefForPrompt(order: OrderInput): string {
  const value = order.externalIntegrations?.trim();
  if (!value) return "";
  return `Integrações externas necessárias:\n${value}\n\nPlaneje APIs, filas, secrets e mocks/stubs para o MVP quando a integração real não estiver no escopo v1.`;
}

export function integrationsReviewFromForm(formData: FormData): string {
  return parseIntegrationsFromForm(formData) ?? "";
}

export function integrationLabels(ids: IntegrationId[]): string {
  return ids
    .map((id) => INTEGRATION_OPTIONS.find((opt) => opt.id === id)?.label ?? id)
    .join(", ");
}
