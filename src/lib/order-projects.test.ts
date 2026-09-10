import { describe, expect, it } from "vitest";
import {
  buildProductProjects,
  findProductProject,
  getContinueTarget,
  getOrderAlerts,
  normalizeProjectName,
  projectDeliveryBadges,
  projectOverallStatus,
} from "./order-projects";
import type { OrderRecord } from "./store";

function baseOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "a1",
    userId: "u1",
    name: "EducaFlex",
    problem: "LMS",
    audience: "Empresas",
    businessRules: "Regras",
    deliverableType: "A",
    mobileStack: "Flutter",
    frontendStack: "Next.js",
    backendStack: "NestJS",
    databaseStack: "MySQL",
    generateTestBuild: true,
    scopePreset: "full",
    includeMobile: true,
    includeFrontend: true,
    includeBackend: true,
    includeDatabase: true,
    includeAuth: true,
    includeAdmin: true,
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
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("order-projects", () => {
  it("agrupa planejamento com software derivado", () => {
    const planning = baseOrder({
      id: "plan1",
      orderKind: "planning",
      derivedSoftwareOrderId: "soft1",
    });
    const software = baseOrder({
      id: "soft1",
      orderKind: "software",
      deliverableType: "B",
      sourcePlanningOrderId: "plan1",
      apkStatus: "failed",
    });

    const projects = buildProductProjects([planning, software]);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.id).toBe("plan1");
    expect(projects[0]!.planningOrder?.id).toBe("plan1");
    expect(projects[0]!.softwareOrders[0]!.id).toBe("soft1");
  });

  it("agrupa pedidos com mesmo nome não ligados", () => {
    const planning = baseOrder({
      id: "p1",
      name: "TaskList",
      orderKind: "planning",
    });
    const software = baseOrder({
      id: "s1",
      name: "TaskList",
      orderKind: "software",
      deliverableType: "B",
    });

    const projects = buildProductProjects([planning, software]);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.allOrders).toHaveLength(2);
  });

  it("mantém MVPs diretos como projetos solo", () => {
    const mvp = baseOrder({
      id: "mvp1",
      orderKind: "software",
      name: "Calculadora",
      deliverableType: "B",
    });
    const projects = buildProductProjects([mvp]);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.planningOrder).toBeNull();
    expect(projects[0]!.softwareOrders[0]!.id).toBe("mvp1");
  });

  it("calcula status e entregas do projeto", () => {
    const planning = baseOrder({
      id: "plan1",
      derivedSoftwareOrderId: "soft1",
    });
    const software = baseOrder({
      id: "soft1",
      orderKind: "software",
      sourcePlanningOrderId: "plan1",
      githubUrl: "https://github.com/x/y",
      apkStatus: "success",
    });
    const project = buildProductProjects([planning, software])[0]!;

    expect(projectOverallStatus(project)).toBe("completed");
    const badges = projectDeliveryBadges(project);
    expect(badges.find((b) => b.label === "Docs")?.ok).toBe(true);
    expect(badges.find((b) => b.label === "GitHub")?.ok).toBe(true);
    expect(badges.find((b) => b.label === "APK")?.ok).toBe(true);
  });

  it("detecta alertas de falha e esteira parada", () => {
    const failed = baseOrder({ id: "f1", status: "failed", errorMessage: "Timeout" });
    const stuck = baseOrder({
      id: "s1",
      status: "running",
      updatedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    });
    const alerts = getOrderAlerts([failed, stuck], Date.now());
    expect(alerts.some((a) => a.kind === "failed")).toBe(true);
    expect(alerts.some((a) => a.kind === "stuck")).toBe(true);
  });

  it("prioriza pedido ativo em continuar", () => {
    const done = baseOrder({ id: "d1", status: "completed" });
    const running = baseOrder({
      id: "r1",
      status: "running",
      updatedAt: "2026-09-05T16:00:00.000Z",
    });
    expect(getContinueTarget([done, running])?.id).toBe("r1");
  });

  it("resolve projeto por id", () => {
    const planning = baseOrder({ id: "plan-x", derivedSoftwareOrderId: "soft-x" });
    const software = baseOrder({
      id: "soft-x",
      orderKind: "software",
      sourcePlanningOrderId: "plan-x",
    });
    expect(findProductProject([planning, software], "plan-x")?.name).toBe("EducaFlex");
  });

  it("normaliza nomes de projeto", () => {
    expect(normalizeProjectName("  Educa Flex  ")).toBe("educa flex");
  });
});
