import { describe, expect, it } from "vitest";
import type { OrderRecord } from "@/lib/store";
import {
  duplicateWizardState,
  matchLabelsToOptionIds,
  orderRecordToWizardState,
  planningEditEligibility,
} from "./order-form";
import { USER_ROLE_OPTIONS } from "@/lib/product-context";

const baseOrder: OrderRecord = {
  id: "abc",
  userId: "u1",
  orderKind: "planning",
  sourcePlanningOrderId: null,
  derivedSoftwareOrderId: null,
  status: "completed",
  currentAgent: null,
  errorMessage: null,
  githubUrl: null,
  githubError: null,
  vercelUrl: null,
  vercelError: null,
  apkStatus: "idle",
  apkRunUrl: null,
  apkError: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  name: "TaskList",
  problem: "Tarefas",
  audience: "Todos",
  businessRules: "RN-01",
  deliverableType: "C",
  mobileStack: "Flutter (Dart)",
  frontendStack: "React.js / Next.js",
  backendStack: "Node.js (Express/NestJS)",
  databaseStack: "PostgreSQL",
  generateTestBuild: false,
  scopePreset: "app-api",
  includeMobile: true,
  includeFrontend: false,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: false,
  userRoles: "Usuário final, Supervisor",
  expectedScreens: "Login, Home / lista principal, Checkout",
  externalIntegrations: "Pagamento, WhatsApp API",
  mainEntities: "Usuário, Tarefa / Item, Tag",
  nfrSync: "on_demand",
};

describe("order-form", () => {
  it("reconstrói checkboxes a partir de labels salvas", () => {
    const roles = matchLabelsToOptionIds(
      "Usuário final, Supervisor",
      USER_ROLE_OPTIONS,
    );
    expect(roles.ids).toContain("end_user");
    expect(roles.custom).toBe("Supervisor");

    const state = orderRecordToWizardState(baseOrder);
    expect(state.formDefaults.userRoles).toContain("end_user");
    expect(state.formDefaults.userRolesCustom).toBe("Supervisor");
    expect(state.formDefaults.screensCustom).toBe("Checkout");
    expect(state.formDefaults.integrationsCustom).toBe("WhatsApp API");
    expect(state.formDefaults.entities).toContain("task");
    expect(state.formDefaults.entitiesCustom).toBe("Tag");
  });

  it("duplicar adiciona sufixo e força planejamento", () => {
    const dup = duplicateWizardState(baseOrder);
    expect(dup.formDefaults.name).toBe("TaskList (cópia)");
    expect(dup.orderKind).toBe("planning");
  });

  it("bloqueia edição com software em andamento", () => {
    expect(
      planningEditEligibility(baseOrder, {
        ...baseOrder,
        id: "sw",
        orderKind: "software",
        status: "running",
      }).allowed,
    ).toBe(false);
    expect(planningEditEligibility(baseOrder, null).allowed).toBe(true);
  });
});
