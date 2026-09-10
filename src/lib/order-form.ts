import type { DomainFormDefaults } from "@/lib/domain-templates";
import { parseDomainTemplateId } from "@/lib/domain-templates";
import {
  parseEntityRelationsFromForm,
  parseMainEntitiesFromForm,
  ENTITY_OPTIONS,
  type EntityId,
} from "@/lib/data-model-context";
import {
  parseIntegrationsFromForm,
  INTEGRATION_OPTIONS,
  type IntegrationId,
} from "@/lib/integrations-context";
import { parseNfrFromForm } from "@/lib/nfr-context";
import { orderKindFromForm, isPlanningOrder, type OrderKind } from "@/lib/factory-mode";
import { parseScopeFromForm, type OrderScope, type ScopePresetId } from "@/lib/order-scope";
import {
  parseOptionalText,
  parseScreensFromForm,
  parseUserRolesFromForm,
  SCREEN_OPTIONS,
  USER_ROLE_OPTIONS,
  type ScreenId,
  type UserRoleId,
} from "@/lib/product-context";
import { parseSuccessCriteriaFromForm } from "@/lib/success-criteria-context";
import type { OrderRecord } from "@/lib/store";
import type { DeliverableType, OrderInput } from "@/lib/types";
import {
  parsePrimaryColor,
  parseUiReference,
  parseUiStyle,
  type UiStyle,
} from "@/lib/visual-design";

export type WizardMode = "create" | "edit" | "duplicate";

export type LabelMatchResult<T extends string> = {
  ids: T[];
  custom: string;
};

export function matchLabelsToOptionIds<T extends string>(
  raw: string | null | undefined,
  options: readonly { id: T; label: string }[],
): LabelMatchResult<T> {
  if (!raw?.trim()) return { ids: [], custom: "" };
  const ids: T[] = [];
  const customParts: string[] = [];
  for (const part of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
    const match = options.find((opt) => opt.label === part);
    if (match) ids.push(match.id);
    else customParts.push(part);
  }
  return { ids, custom: customParts.join(", ") };
}

export function parseOrderInputFromForm(
  formData: FormData,
  options: { orderKind: OrderKind },
): { input: OrderInput; scope: OrderScope; error?: string } {
  const planning = options.orderKind === "planning";
  const name = String(formData.get("name") ?? "").trim();
  const problem = String(formData.get("problem") ?? "").trim();
  const audience = String(formData.get("audience") ?? "").trim();
  const businessRules = String(formData.get("businessRules") ?? "").trim();
  const deliverableType = String(
    formData.get("deliverableType") ?? "C",
  ) as DeliverableType;

  if (!name || !problem || !audience || !businessRules) {
    return {
      input: {} as OrderInput,
      scope: parseScopeFromForm(formData),
      error: "Preencha nome, problema, público-alvo e regras de negócio.",
    };
  }
  if (!["A", "B", "C", "D"].includes(deliverableType)) {
    return {
      input: {} as OrderInput,
      scope: parseScopeFromForm(formData),
      error: "Tipo de saída inválido.",
    };
  }

  const scope = parseScopeFromForm(formData);
  if (!scope.includeMobile && !scope.includeFrontend && !scope.includeBackend) {
    return {
      input: {} as OrderInput,
      scope,
      error: "Selecione ao menos uma camada: mobile/app, front-end ou back-end.",
    };
  }

  const input: OrderInput = {
    name,
    problem,
    audience,
    businessRules,
    deliverableType: planning ? "C" : deliverableType,
    mobileStack: String(formData.get("mobileStack") ?? "PWA/Web Mobile"),
    frontendStack: String(formData.get("frontendStack") ?? "React.js / Next.js"),
    backendStack: String(formData.get("backendStack") ?? "Node.js (Express/NestJS)"),
    databaseStack: String(formData.get("databaseStack") ?? "PostgreSQL"),
    generateTestBuild: planning
      ? false
      : formData.get("generateTestBuild") === "on",
    scopePreset: String(formData.get("scopePreset") ?? "app-only"),
    uiStyle: parseUiStyle(formData.get("uiStyle")),
    primaryColor: parsePrimaryColor(formData.get("primaryColor")),
    uiReference: parseUiReference(formData.get("uiReference")),
    mvpEssentials: parseOptionalText(formData.get("mvpEssentials")),
    mvpLater: parseOptionalText(formData.get("mvpLater")),
    userRoles: parseUserRolesFromForm(formData),
    mainFlows: parseOptionalText(formData.get("mainFlows")),
    expectedScreens: parseScreensFromForm(formData),
    domainTemplateId: parseDomainTemplateId(formData.get("domainTemplateId")),
    ...parseNfrFromForm(formData),
    externalIntegrations: parseIntegrationsFromForm(formData),
    mainEntities: parseMainEntitiesFromForm(formData),
    entityRelations: parseEntityRelationsFromForm(formData),
    successCriteria: parseSuccessCriteriaFromForm(formData),
    ...scope,
  };

  return { input, scope };
}

export type WizardInitialState = {
  orderKind: OrderKind;
  deliverableType: DeliverableType;
  preset: ScopePresetId;
  scope: OrderScope;
  uiStyle: UiStyle;
  primaryColor: string;
  domainTemplateId: ReturnType<typeof parseDomainTemplateId>;
  formDefaults: DomainFormDefaults;
  stackDefaults: {
    mobileStack: string;
    frontendStack: string;
    backendStack: string;
    databaseStack: string;
  };
};

export function orderRecordToWizardState(order: OrderRecord): WizardInitialState {
  const roles = matchLabelsToOptionIds<UserRoleId>(
    order.userRoles,
    USER_ROLE_OPTIONS,
  );
  const screens = matchLabelsToOptionIds<ScreenId>(
    order.expectedScreens,
    SCREEN_OPTIONS,
  );
  const integrations = matchLabelsToOptionIds<IntegrationId>(
    order.externalIntegrations,
    INTEGRATION_OPTIONS,
  );
  const entities = matchLabelsToOptionIds<EntityId>(
    order.mainEntities,
    ENTITY_OPTIONS,
  );

  return {
    orderKind: order.orderKind ?? "planning",
    deliverableType: order.deliverableType,
    preset: (order.scopePreset as ScopePresetId) ?? "app-only",
    scope: {
      includeMobile: order.includeMobile,
      includeFrontend: order.includeFrontend,
      includeBackend: order.includeBackend,
      includeDatabase: order.includeDatabase,
      includeAuth: order.includeAuth,
      includeAdmin: order.includeAdmin,
    },
    uiStyle: parseUiStyle(order.uiStyle),
    primaryColor: order.primaryColor ?? "",
    domainTemplateId: parseDomainTemplateId(order.domainTemplateId),
    formDefaults: {
      name: order.name,
      problem: order.problem,
      audience: order.audience,
      businessRules: order.businessRules,
      mvpEssentials: order.mvpEssentials ?? "",
      mvpLater: order.mvpLater ?? "",
      userRoles: roles.ids,
      userRolesCustom: roles.custom,
      mainFlows: order.mainFlows ?? "",
      screens: screens.ids,
      screensCustom: screens.custom,
      uiStyle: parseUiStyle(order.uiStyle),
      primaryColor: order.primaryColor ?? "",
      uiReference: order.uiReference ?? "",
      scopePreset: (order.scopePreset as ScopePresetId) ?? "app-only",
      mobileStack: order.mobileStack,
      frontendStack: order.frontendStack,
      backendStack: order.backendStack,
      databaseStack: order.databaseStack,
      nfrOffline: order.nfrOffline ?? "online_only",
      nfrSync: order.nfrSync ?? "none",
      nfrScale: order.nfrScale ?? "small",
      nfrLocales: order.nfrLocales ?? "pt_br",
      nfrPrivacy: order.nfrPrivacy ?? "standard",
      nfrNotes: order.nfrNotes ?? "",
      integrations: integrations.ids,
      integrationsCustom: integrations.custom,
      entities: entities.ids,
      entitiesCustom: entities.custom,
      entityRelations: order.entityRelations ?? "",
      successCriteria: order.successCriteria ?? "",
    },
    stackDefaults: {
      mobileStack: order.mobileStack,
      frontendStack: order.frontendStack,
      backendStack: order.backendStack,
      databaseStack: order.databaseStack,
    },
  };
}

export function duplicateWizardState(order: OrderRecord): WizardInitialState {
  const base = orderRecordToWizardState(order);
  const copySuffix = " (cópia)";
  const name = base.formDefaults.name.endsWith(copySuffix)
    ? base.formDefaults.name
    : `${base.formDefaults.name}${copySuffix}`;
  return {
    ...base,
    orderKind: "planning",
    deliverableType: "C",
    formDefaults: {
      ...base.formDefaults,
      name,
    },
  };
}

export type PlanningEditEligibility = {
  allowed: boolean;
  reason?: string;
};

export function planningEditEligibility(
  order: OrderRecord,
  derivedSoftware?: OrderRecord | null,
): PlanningEditEligibility {
  if (!isPlanningOrder(order)) {
    return { allowed: false, reason: "Disponível apenas em pedidos de planejamento." };
  }
  if (order.status !== "completed" && order.status !== "failed") {
    return {
      allowed: false,
      reason: "Aguarde a esteira concluir ou falhar antes de editar.",
    };
  }
  if (derivedSoftware) {
    if (
      derivedSoftware.status === "queued" ||
      derivedSoftware.status === "running"
    ) {
      return {
        allowed: false,
        reason:
          "Há um pedido de software em andamento vinculado a este planejamento.",
      };
    }
  }
  return { allowed: true };
}

export function canDuplicateOrder(order: OrderRecord): boolean {
  return order.status === "completed" || order.status === "failed";
}
