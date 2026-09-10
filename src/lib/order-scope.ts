import type { AgentId } from "@/lib/types";

export type OrderScope = {
  includeMobile: boolean;
  includeFrontend: boolean;
  includeBackend: boolean;
  includeDatabase: boolean;
  includeAuth: boolean;
  includeAdmin: boolean;
};

export type ScopePresetId = "app-only" | "app-api" | "web" | "full" | "custom";

export const SCOPE_PRESETS: {
  id: ScopePresetId;
  title: string;
  description: string;
  scope: OrderScope;
}[] = [
  {
    id: "app-only",
    title: "Só app",
    description: "Mobile ou desktop local — sem site, API ou banco.",
    scope: {
      includeMobile: true,
      includeFrontend: false,
      includeBackend: false,
      includeDatabase: false,
      includeAuth: false,
      includeAdmin: false,
    },
  },
  {
    id: "app-api",
    title: "App + API",
    description: "App com back-end e persistência.",
    scope: {
      includeMobile: true,
      includeFrontend: false,
      includeBackend: true,
      includeDatabase: true,
      includeAuth: true,
      includeAdmin: false,
    },
  },
  {
    id: "web",
    title: "Site web",
    description: "Front-end web; API e banco opcionais depois.",
    scope: {
      includeMobile: false,
      includeFrontend: true,
      includeBackend: false,
      includeDatabase: false,
      includeAuth: false,
      includeAdmin: false,
    },
  },
  {
    id: "full",
    title: "Completo",
    description: "Mobile, web, API, banco, login e admin.",
    scope: {
      includeMobile: true,
      includeFrontend: true,
      includeBackend: true,
      includeDatabase: true,
      includeAuth: true,
      includeAdmin: true,
    },
  },
];

export function defaultScopePreset(planningMode: boolean): ScopePresetId {
  return planningMode ? "app-only" : "full";
}

export function scopeFromPreset(preset: ScopePresetId): OrderScope {
  const found = SCOPE_PRESETS.find((p) => p.id === preset);
  if (!found || preset === "custom") {
    return SCOPE_PRESETS[0]!.scope;
  }
  return { ...found.scope };
}

export function parseScopeFromForm(formData: FormData): OrderScope {
  const preset = String(formData.get("scopePreset") ?? "app-only") as ScopePresetId;
  if (preset !== "custom") {
    return scopeFromPreset(preset);
  }
  return {
    includeMobile: formData.get("includeMobile") === "on",
    includeFrontend: formData.get("includeFrontend") === "on",
    includeBackend: formData.get("includeBackend") === "on",
    includeDatabase: formData.get("includeDatabase") === "on",
    includeAuth: formData.get("includeAuth") === "on",
    includeAdmin: formData.get("includeAdmin") === "on",
  };
}

export function normalizeScope(scope: Partial<OrderScope> | undefined): OrderScope {
  return {
    includeMobile: scope?.includeMobile ?? true,
    includeFrontend: scope?.includeFrontend ?? true,
    includeBackend: scope?.includeBackend ?? true,
    includeDatabase: scope?.includeDatabase ?? true,
    includeAuth: scope?.includeAuth ?? true,
    includeAdmin: scope?.includeAdmin ?? true,
  };
}

export function scopeLayersLabel(scope: OrderScope): string {
  const parts: string[] = [];
  if (scope.includeMobile) parts.push("mobile/app");
  if (scope.includeFrontend) parts.push("front-end web");
  if (scope.includeBackend) parts.push("back-end/API");
  if (scope.includeDatabase) parts.push("banco de dados");
  if (scope.includeAuth) parts.push("login/contas");
  if (scope.includeAdmin) parts.push("painel admin");
  return parts.length > 0 ? parts.join(", ") : "escopo mínimo";
}

export function agentsSkippedByScope(scope: OrderScope): AgentId[] {
  const skip: AgentId[] = [];
  if (!scope.includeBackend) skip.push("backend");
  if (!scope.includeFrontend && !scope.includeMobile) skip.push("frontend");
  return skip;
}

export function hasClientLayer(scope: OrderScope): boolean {
  return scope.includeMobile || scope.includeFrontend;
}
