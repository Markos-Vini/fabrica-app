import type { DomainTemplateId } from "@/lib/domain-templates";
import { domainTemplateBrief } from "@/lib/domain-templates";

export const USER_ROLE_OPTIONS = [
  { id: "end_user", label: "Usuário final" },
  { id: "admin", label: "Administrador" },
  { id: "guest", label: "Convidado / visitante" },
  { id: "team", label: "Membro de equipe" },
] as const;

export type UserRoleId = (typeof USER_ROLE_OPTIONS)[number]["id"];

export const SCREEN_OPTIONS = [
  { id: "login", label: "Login", group: "Autenticação" },
  { id: "register", label: "Cadastro", group: "Autenticação" },
  { id: "forgot_password", label: "Recuperar senha", group: "Autenticação" },
  { id: "onboarding", label: "Boas-vindas / onboarding", group: "Autenticação" },
  { id: "home", label: "Home / lista principal", group: "App" },
  { id: "detail", label: "Detalhe do item", group: "App" },
  { id: "form", label: "Criar / editar", group: "App" },
  { id: "profile", label: "Perfil do usuário", group: "App" },
  { id: "settings", label: "Configurações", group: "App" },
  { id: "filters", label: "Filtros / busca", group: "App" },
  { id: "notifications", label: "Notificações", group: "App" },
  { id: "dashboard", label: "Dashboard web", group: "Painel web" },
  { id: "admin", label: "Painel admin", group: "Painel web" },
  { id: "reports", label: "Relatórios / gráficos", group: "Painel web" },
  { id: "users_mgmt", label: "Gestão de usuários", group: "Painel web" },
] as const;

export type ScreenId = (typeof SCREEN_OPTIONS)[number]["id"];

export const SCREEN_GROUPS = [
  "Autenticação",
  "App",
  "Painel web",
] as const;

export function parseOptionalText(raw: unknown, maxLen = 4000): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value.slice(0, maxLen);
}

export function parseUserRolesFromForm(formData: FormData): string | null {
  const selected = USER_ROLE_OPTIONS.filter(
    (opt) => formData.get(`userRole_${opt.id}`) === "on",
  ).map((opt) => opt.label);
  const custom = String(formData.get("userRolesCustom") ?? "").trim();
  if (custom) selected.push(custom);
  if (selected.length === 0) return null;
  return selected.join(", ");
}

export function parseScreensFromForm(formData: FormData): string | null {
  const selected = SCREEN_OPTIONS.filter(
    (opt) => formData.get(`screen_${opt.id}`) === "on",
  ).map((opt) => opt.label);
  const custom = String(formData.get("screensCustom") ?? "").trim();
  if (custom) selected.push(custom);
  if (selected.length === 0) return null;
  return selected.join(", ");
}

export function withProductDefaults(order: OrderInput): OrderInput {
  return {
    ...order,
    mvpEssentials: order.mvpEssentials ?? null,
    mvpLater: order.mvpLater ?? null,
    userRoles: order.userRoles ?? null,
    mainFlows: order.mainFlows ?? null,
    expectedScreens: order.expectedScreens ?? null,
    domainTemplateId: order.domainTemplateId ?? "blank",
  };
}

export function productBriefForPrompt(order: OrderInput): string {
  const normalized = withProductDefaults(order);
  const lines: string[] = [];

  if (normalized.mvpEssentials) {
    lines.push(`Essencial no MVP (v1):\n${normalized.mvpEssentials}`);
  }
  if (normalized.mvpLater) {
    lines.push(`Fora do MVP / fase posterior (v2+):\n${normalized.mvpLater}`);
  }
  if (normalized.userRoles) {
    lines.push(`Papéis de usuário: ${normalized.userRoles}`);
  }
  if (normalized.mainFlows) {
    lines.push(`Fluxos principais:\n${normalized.mainFlows}`);
  }
  if (normalized.expectedScreens) {
    lines.push(`Telas / páginas esperadas:\n${normalized.expectedScreens}`);
  }
  const templateHint = domainTemplateBrief(
    normalized.domainTemplateId ?? "blank",
  );
  if (templateHint) {
    lines.push(templateHint);
  }

  if (lines.length === 0) {
    return "";
  }

  return lines.join("\n\n");
}
