import type { OrderRecord } from "@/lib/store";

export type ProductProject = {
  /** ID do pedido principal (planejamento, se existir). */
  id: string;
  name: string;
  planningOrder: OrderRecord | null;
  softwareOrders: OrderRecord[];
  allOrders: OrderRecord[];
  updatedAt: string;
  createdAt: string;
};

export type ProjectDeliveryBadge = {
  label: string;
  ok: boolean;
  applicable: boolean;
};

export type OrderAlert = {
  kind: "failed" | "stuck";
  order: OrderRecord;
  message: string;
};

const STUCK_THRESHOLD_MS = 30 * 60 * 1000;

export function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function maxIso(dates: string[]): string {
  return dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

function minIso(dates: string[]): string {
  return dates.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
}

class UnionFind {
  private parent = new Map<string, string>();

  constructor(ids: string[]) {
    for (const id of ids) this.parent.set(id, id);
  }

  find(id: string): string {
    let root = this.parent.get(id) ?? id;
    while (root !== (this.parent.get(root) ?? root)) {
      root = this.parent.get(root) ?? root;
    }
    let current = id;
    while (current !== root) {
      const next = this.parent.get(current) ?? current;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

/** Agrupa pedidos ligados ou com o mesmo nome em projetos de produto. */
export function buildProductProjects(orders: OrderRecord[]): ProductProject[] {
  if (orders.length === 0) return [];

  const byId = new Map(orders.map((o) => [o.id, o]));
  const uf = new UnionFind(orders.map((o) => o.id));

  for (const order of orders) {
    if (order.derivedSoftwareOrderId && byId.has(order.derivedSoftwareOrderId)) {
      uf.union(order.id, order.derivedSoftwareOrderId);
    }
    if (order.sourcePlanningOrderId && byId.has(order.sourcePlanningOrderId)) {
      uf.union(order.id, order.sourcePlanningOrderId);
    }
  }

  const byName = new Map<string, string[]>();
  for (const order of orders) {
    const key = normalizeProjectName(order.name);
    const bucket = byName.get(key) ?? [];
    bucket.push(order.id);
    byName.set(key, bucket);
  }
  for (const ids of byName.values()) {
    const first = ids[0];
    if (!first) continue;
    for (let i = 1; i < ids.length; i++) {
      uf.union(first, ids[i]!);
    }
  }

  const groups = new Map<string, OrderRecord[]>();
  for (const order of orders) {
    const root = uf.find(order.id);
    const bucket = groups.get(root) ?? [];
    bucket.push(order);
    groups.set(root, bucket);
  }

  const projects: ProductProject[] = [];

  for (const group of groups.values()) {
    const planningOrder =
      group.find((o) => o.orderKind === "planning") ??
      null;
    const softwareOrders = group.filter((o) => o.orderKind === "software");
    const primary =
      planningOrder ??
      [...group].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0]!;

    projects.push({
      id: primary.id,
      name: primary.name,
      planningOrder,
      softwareOrders,
      allOrders: group,
      updatedAt: maxIso(group.map((o) => o.updatedAt)),
      createdAt: minIso(group.map((o) => o.createdAt)),
    });
  }

  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function findProjectContainingOrder(
  orders: OrderRecord[],
  orderId: string,
): ProductProject | null {
  return (
    buildProductProjects(orders).find((p) =>
      p.allOrders.some((o) => o.id === orderId),
    ) ?? null
  );
}

export function findProductProject(
  orders: OrderRecord[],
  projectId: string,
): ProductProject | null {
  return buildProductProjects(orders).find((p) => p.id === projectId) ?? null;
}

export type ProjectOverallStatus = OrderRecord["status"] | "partial";

export function projectOverallStatus(project: ProductProject): ProjectOverallStatus {
  const statuses = project.allOrders.map((o) => o.status);
  if (statuses.some((s) => s === "failed")) return "failed";
  if (statuses.some((s) => s === "running" || s === "queued")) return "running";
  if (statuses.every((s) => s === "completed")) return "completed";
  return "partial";
}

export function projectDeliveryBadges(project: ProductProject): ProjectDeliveryBadge[] {
  const badges: ProjectDeliveryBadge[] = [];

  if (project.planningOrder) {
    badges.push({
      label: "Docs",
      ok: project.planningOrder.status === "completed",
      applicable: true,
    });
  }

  const software =
    project.softwareOrders.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0] ?? null;

  if (software) {
    badges.push({
      label: "ZIP",
      ok: software.status === "completed",
      applicable: true,
    });
    if (software.githubUrl || software.githubError) {
      badges.push({
        label: "GitHub",
        ok: Boolean(software.githubUrl),
        applicable: true,
      });
    }
    if (software.includeMobile && software.generateTestBuild) {
      badges.push({
        label: "APK",
        ok: software.apkStatus === "ready",
        applicable: true,
      });
    }
  }

  return badges;
}

export function getOrderAlerts(
  orders: OrderRecord[],
  nowMs: number = Date.now(),
): OrderAlert[] {
  const alerts: OrderAlert[] = [];

  for (const order of orders) {
    if (order.status === "failed") {
      alerts.push({
        kind: "failed",
        order,
        message: order.errorMessage
          ? `Falhou: ${truncateAlert(order.errorMessage, 80)}`
          : "A esteira falhou — abra o pedido para ver detalhes.",
      });
      continue;
    }

    if (order.status === "running" || order.status === "queued") {
      const elapsed = nowMs - new Date(order.updatedAt).getTime();
      if (elapsed >= STUCK_THRESHOLD_MS) {
        const minutes = Math.floor(elapsed / 60_000);
        alerts.push({
          kind: "stuck",
          order,
          message:
            order.status === "running"
              ? `Em produção há ${minutes} min sem atualizar — verifique a esteira.`
              : `Na fila há ${minutes} min — pode estar aguardando processamento.`,
        });
      }
    }
  }

  return alerts.sort(
    (a, b) => (a.kind === "failed" ? 0 : 1) - (b.kind === "failed" ? 0 : 1),
  );
}

export function getContinueTarget(orders: OrderRecord[]): OrderRecord | null {
  if (orders.length === 0) return null;

  const active = orders
    .filter((o) => o.status === "running" || o.status === "queued")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  if (active[0]) return active[0];

  const failed = orders
    .filter((o) => o.status === "failed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  if (failed[0]) return failed[0];

  return [...orders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]!;
}

export function getContinueProject(orders: OrderRecord[]): ProductProject | null {
  const target = getContinueTarget(orders);
  if (!target) return null;
  return (
    buildProductProjects(orders).find((p) =>
      p.allOrders.some((o) => o.id === target.id),
    ) ?? null
  );
}

function truncateAlert(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function projectMatchesFilters(
  project: ProductProject,
  statusFilters: Set<"active" | "completed" | "failed">,
  kindFilters: Set<"planning" | "software">,
): boolean {
  const statusMatch =
    statusFilters.size === 0 ||
    project.allOrders.some((o) => {
      if (statusFilters.has("active") && (o.status === "queued" || o.status === "running")) {
        return true;
      }
      if (statusFilters.has("completed") && o.status === "completed") return true;
      if (statusFilters.has("failed") && o.status === "failed") return true;
      return false;
    });

  const kindMatch =
    kindFilters.size === 0 ||
    project.allOrders.some((o) => kindFilters.has(o.orderKind ?? "software"));

  return statusMatch && kindMatch;
}
