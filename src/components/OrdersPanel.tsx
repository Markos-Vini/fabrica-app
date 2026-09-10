"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import { OrdersAlertsBanner } from "@/components/OrdersAlertsBanner";
import { ProductProjectCard } from "@/components/ProductProjectCard";
import { DELIVERABLE_OPTIONS } from "@/lib/constants";
import { domainTemplateLabel, parseDomainTemplateId } from "@/lib/domain-templates";
import { ORDER_KIND_LABEL } from "@/lib/factory-mode";
import {
  buildProductProjects,
  getOrderAlerts,
  projectMatchesFilters,
} from "@/lib/order-projects";
import { SCOPE_PRESETS, type OrderScope } from "@/lib/order-scope";
import type { OrderRecord, SessionUser } from "@/lib/store";
import type { OrderKind } from "@/lib/factory-mode";

type StatusFilterKey = "active" | "completed" | "failed";
type KindFilterKey = OrderKind;
type ViewMode = "projects" | "orders";

const ORDER_KIND_TONE: Record<OrderKind, string> = {
  planning:
    "border-sky-400/35 bg-sky-950/40 text-sky-300 light:border-sky-400/50 light:bg-sky-100 light:text-sky-800",
  software: "border-copper/40 bg-accent-surface text-copper-2",
};

const STATUS: Record<
  OrderRecord["status"],
  { label: string; tone: string; dot: string }
> = {
  queued: {
    label: "Na fila",
    tone: "border-line bg-bg-2 text-steel",
    dot: "bg-steel",
  },
  running: {
    label: "Em produção",
    tone: "border-copper/40 bg-accent-surface text-copper-2",
    dot: "bg-copper animate-pulse",
  },
  completed: {
    label: "Concluído",
    tone: "border-ok/40 bg-ok/5 text-ok",
    dot: "bg-ok",
  },
  failed: {
    label: "Falhou",
    tone: "border-bad/40 bg-bad/5 text-bad",
    dot: "bg-bad",
  },
};

const STATUS_FILTER_LABELS: Record<StatusFilterKey, string> = {
  active: "Ativos",
  completed: "Concluídos",
  failed: "Falhas",
};

const KIND_FILTER_LABELS: Record<KindFilterKey, string> = {
  planning: "Planejamento",
  software: "Software",
};

const SCOPE_CHIPS: { key: keyof OrderScope; label: string }[] = [
  { key: "includeMobile", label: "App mobile" },
  { key: "includeFrontend", label: "Web" },
  { key: "includeBackend", label: "API" },
  { key: "includeDatabase", label: "Banco" },
  { key: "includeAuth", label: "Login" },
  { key: "includeAdmin", label: "Admin" },
];

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function scopePresetTitle(preset: string | undefined): string | null {
  if (!preset || preset === "custom") return null;
  return SCOPE_PRESETS.find((p) => p.id === preset)?.title ?? preset;
}

function orderPathLabel(
  order: OrderRecord,
  deliverableTitle: string | undefined,
): string {
  if (order.orderKind === "planning") {
    return "Etapa 1 · documentação para TI";
  }
  if (order.sourcePlanningOrderId) {
    return `Etapa 2 · software${deliverableTitle ? ` (${deliverableTitle})` : ""}`;
  }
  return `MVP direto${deliverableTitle ? ` · ${deliverableTitle}` : ""}`;
}

function stackSummary(order: OrderRecord): string[] {
  const lines: string[] = [];
  if (order.includeMobile && order.mobileStack) {
    lines.push(`Mobile: ${order.mobileStack}`);
  }
  if (order.includeFrontend && order.frontendStack) {
    lines.push(`Web: ${order.frontendStack}`);
  }
  if (order.includeBackend && order.backendStack) {
    lines.push(`API: ${order.backendStack}`);
  }
  if (order.includeDatabase && order.databaseStack) {
    lines.push(`Banco: ${order.databaseStack}`);
  }
  return lines;
}

function deliveryBadges(order: OrderRecord): { label: string; ok: boolean }[] {
  if (order.status !== "completed") return [];
  const badges: { label: string; ok: boolean }[] = [{ label: "ZIP", ok: true }];
  if (order.githubUrl || order.githubError) {
    badges.push({ label: "GitHub", ok: Boolean(order.githubUrl) });
  }
  if (order.includeMobile && order.generateTestBuild) {
    badges.push({
      label: "APK",
      ok: order.apkStatus === "success",
    });
  }
  return badges;
}

function matchesStatusFilter(
  order: OrderRecord,
  filters: Set<StatusFilterKey>,
): boolean {
  if (filters.size === 0) return true;
  if (filters.has("active") && (order.status === "queued" || order.status === "running")) {
    return true;
  }
  if (filters.has("completed") && order.status === "completed") return true;
  if (filters.has("failed") && order.status === "failed") return true;
  return false;
}

function matchesKindFilter(
  order: OrderRecord,
  filters: Set<KindFilterKey>,
): boolean {
  if (filters.size === 0) return true;
  const kind = order.orderKind ?? "software";
  return filters.has(kind);
}

function countForStatusFilter(orders: OrderRecord[], key: StatusFilterKey): number {
  if (key === "active") {
    return orders.filter((o) => o.status === "queued" || o.status === "running").length;
  }
  if (key === "completed") return orders.filter((o) => o.status === "completed").length;
  return orders.filter((o) => o.status === "failed").length;
}

function countForKindFilter(orders: OrderRecord[], key: KindFilterKey): number {
  return orders.filter((o) => (o.orderKind ?? "software") === key).length;
}

/** Agrupa planejamento + software derivado em sequência para leitura mais clara. */
function sortOrdersGrouped(orders: OrderRecord[]): OrderRecord[] {
  const byId = new Map(orders.map((o) => [o.id, o]));
  const used = new Set<string>();
  const result: OrderRecord[] = [];

  const roots = [...orders]
    .filter((o) => {
      if (o.orderKind === "planning") return true;
      if (!o.sourcePlanningOrderId) return true;
      return !byId.has(o.sourcePlanningOrderId);
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  for (const root of roots) {
    if (used.has(root.id)) continue;
    result.push(root);
    used.add(root.id);

    if (root.orderKind === "planning" && root.derivedSoftwareOrderId) {
      const derived = byId.get(root.derivedSoftwareOrderId);
      if (derived && !used.has(derived.id)) {
        result.push(derived);
        used.add(derived.id);
      }
    }
  }

  for (const order of orders) {
    if (!used.has(order.id)) result.push(order);
  }

  return result;
}

type TeamMember = { id: string; name: string; email: string };

export function OrdersPanel({
  orders,
  currentUser,
  team = [],
}: {
  orders: OrderRecord[];
  currentUser: SessionUser;
  team?: TeamMember[];
}) {
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilterKey>>(new Set());
  const [kindFilters, setKindFilters] = useState<Set<KindFilterKey>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("projects");
  const [showArchived, setShowArchived] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("all");

  const isAdmin = currentUser.role === "admin";
  const userNames = useMemo(
    () => new Map(team.map((member) => [member.id, member.name])),
    [team],
  );

  const visibleOrders = useMemo(() => {
    let next = showArchived ? orders : orders.filter((order) => !order.archived);
    if (isAdmin && userFilter !== "all") {
      next = next.filter((order) => order.userId === userFilter);
    }
    return next;
  }, [orders, showArchived, isAdmin, userFilter]);
  const archivedCount = useMemo(
    () => orders.filter((order) => order.archived).length,
    [orders],
  );

  const orderNames = useMemo(
    () => new Map(visibleOrders.map((o) => [o.id, o.name])),
    [visibleOrders],
  );

  const userOrderCounts = useMemo(() => {
    const base = showArchived ? orders : orders.filter((order) => !order.archived);
    const counts = new Map<string, number>();
    for (const order of base) {
      counts.set(order.userId, (counts.get(order.userId) ?? 0) + 1);
    }
    return counts;
  }, [orders, showArchived]);

  const projects = useMemo(() => buildProductProjects(visibleOrders), [visibleOrders]);
  const alerts = useMemo(() => getOrderAlerts(visibleOrders), [visibleOrders]);

  const stats = useMemo(
    () => ({
      total: visibleOrders.length,
      projects: projects.length,
      active: countForStatusFilter(visibleOrders, "active"),
      completed: countForStatusFilter(visibleOrders, "completed"),
      failed: countForStatusFilter(visibleOrders, "failed"),
      planning: countForKindFilter(visibleOrders, "planning"),
      software: countForKindFilter(visibleOrders, "software"),
    }),
    [visibleOrders, projects.length],
  );

  const filteredOrders = useMemo(
    () =>
      sortOrdersGrouped(
        visibleOrders.filter(
          (order) =>
            matchesStatusFilter(order, statusFilters) &&
            matchesKindFilter(order, kindFilters),
        ),
      ),
    [visibleOrders, statusFilters, kindFilters],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        projectMatchesFilters(project, statusFilters, kindFilters),
      ),
    [projects, statusFilters, kindFilters],
  );

  const hasActiveFilters = statusFilters.size > 0 || kindFilters.size > 0;

  const toggleStatusFilter = (key: StatusFilterKey) => {
    setStatusFilters((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleKindFilter = (key: KindFilterKey) => {
    setKindFilters((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilters(new Set());
    setKindFilters(new Set());
  };

  const listCount = viewMode === "projects" ? filteredProjects.length : filteredOrders.length;

  return (
    <div className="space-y-6">
      <OrdersAlertsBanner alerts={alerts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
          Visualização
        </p>
        <div className="inline-flex rounded-lg border border-line bg-bg-2 p-1">
          <ViewModeButton
            active={viewMode === "projects"}
            onClick={() => setViewMode("projects")}
            label={`Por produto (${stats.projects})`}
          />
          <ViewModeButton
            active={viewMode === "orders"}
            onClick={() => setViewMode("orders")}
            label={`Por pedido (${stats.total})`}
          />
        </div>
        {archivedCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              showArchived
                ? "border-copper/50 bg-accent-surface text-copper-2"
                : "border-line bg-bg-2 text-steel hover:border-copper/30 hover:text-ink"
            }`}
          >
            {showArchived ? "Ocultar arquivados" : `Arquivados (${archivedCount})`}
          </button>
        ) : null}
      </div>

      {isAdmin && team.length > 1 ? (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            Responsável
          </p>
          <div className="flex flex-wrap gap-2">
            <UserFilterChip
              label="Todos"
              count={showArchived ? orders.length : orders.filter((o) => !o.archived).length}
              selected={userFilter === "all"}
              onClick={() => setUserFilter("all")}
            />
            {team.map((member) => (
              <UserFilterChip
                key={member.id}
                label={member.id === currentUser.id ? `${member.name} (você)` : member.name}
                count={userOrderCounts.get(member.id) ?? 0}
                selected={userFilter === member.id}
                onClick={() => setUserFilter(member.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            Status
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FilterStatCard
              label="Total"
              value={stats.total}
              selected={statusFilters.size === 0 && kindFilters.size === 0}
              onClick={clearFilters}
            />
            <FilterStatCard
              label={STATUS_FILTER_LABELS.active}
              value={stats.active}
              accent="copper"
              selected={statusFilters.has("active")}
              onClick={() => toggleStatusFilter("active")}
            />
            <FilterStatCard
              label={STATUS_FILTER_LABELS.completed}
              value={stats.completed}
              accent="ok"
              selected={statusFilters.has("completed")}
              onClick={() => toggleStatusFilter("completed")}
            />
            <FilterStatCard
              label={STATUS_FILTER_LABELS.failed}
              value={stats.failed}
              accent="bad"
              selected={statusFilters.has("failed")}
              onClick={() => toggleStatusFilter("failed")}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            Tipo de pedido
          </p>
          <div className="flex flex-wrap gap-2">
            <KindFilterChip
              label="Todos os tipos"
              count={stats.total}
              selected={kindFilters.size === 0}
              onClick={() => setKindFilters(new Set())}
            />
            <KindFilterChip
              label={KIND_FILTER_LABELS.planning}
              count={stats.planning}
              tone="planning"
              selected={kindFilters.has("planning")}
              onClick={() => toggleKindFilter("planning")}
            />
            <KindFilterChip
              label={KIND_FILTER_LABELS.software}
              count={stats.software}
              tone="software"
              selected={kindFilters.has("software")}
              onClick={() => toggleKindFilter("software")}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {viewMode === "projects"
              ? "Cada produto agrupa planejamento e software (Etapa 1 + 2) quando existirem."
              : "Um mesmo produto pode ter dois pedidos: planejamento (docs) e software (código). Use os filtros de tipo para separar."}
          </p>
        </div>

        <p className="text-xs text-muted">
          {!hasActiveFilters ? (
            "Combine filtros de status e tipo — selecione mais de um em cada grupo."
          ) : (
            <>
              Mostrando {listCount}{" "}
              {viewMode === "projects" ? "produto" : "pedido"}
              {listCount === 1 ? "" : "s"} de{" "}
              {viewMode === "projects" ? stats.projects : orders.length} ·{" "}
              <button
                type="button"
                onClick={clearFilters}
                className="text-copper hover:underline"
              >
                Limpar filtros
              </button>
            </>
          )}
        </p>
      </div>

      {(viewMode === "projects" ? filteredProjects.length : filteredOrders.length) === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel/50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhum {viewMode === "projects" ? "produto" : "pedido"} neste filtro
          </p>
          <p className="mt-1 text-xs text-muted">
            Ajuste a seleção nos cards acima ou limpe os filtros.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-lg border border-line px-4 py-2 text-xs text-muted transition hover:border-copper/50 hover:text-ink"
          >
            Ver todos
          </button>
        </div>
      ) : viewMode === "projects" ? (
        <ul className="space-y-3">
          {filteredProjects.map((project) => {
            const ownerId =
              project.planningOrder?.userId ??
              project.softwareOrders[0]?.userId ??
              project.allOrders[0]?.userId ??
              null;
            return (
              <ProductProjectCard
                key={project.id}
                project={project}
                authorName={ownerId ? userNames.get(ownerId) ?? null : null}
              />
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map((order, index) => {
            const prev = index > 0 ? filteredOrders[index - 1] : null;
            const isLinkedChild =
              prev?.orderKind === "planning" &&
              prev.derivedSoftwareOrderId === order.id;

            return (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedIds.has(order.id)}
                onToggleExpand={() => toggleExpanded(order.id)}
                linkedAsChild={isLinkedChild}
                orderNames={orderNames}
                authorName={
                  isAdmin ? userNames.get(order.userId) ?? "Desconhecido" : null
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggleExpand,
  linkedAsChild,
  orderNames,
  authorName,
}: {
  order: OrderRecord;
  expanded: boolean;
  onToggleExpand: () => void;
  linkedAsChild?: boolean;
  orderNames: Map<string, string>;
  authorName?: string | null;
}) {
  const kind = order.orderKind ?? "software";
  const deliverable = DELIVERABLE_OPTIONS.find((d) => d.id === order.deliverableType);
  const status = STATUS[order.status];
  const presetTitle = scopePresetTitle(order.scopePreset);
  const templateId = parseDomainTemplateId(order.domainTemplateId);
  const templateLabel =
    templateId !== "blank" ? domainTemplateLabel(templateId) : null;
  const pathLabel = orderPathLabel(order, deliverable?.title);
  const stacks = stackSummary(order);
  const deliveries = deliveryBadges(order);
  const problemPreview = truncate(order.problem, 120);

  const linkedPlanningId = order.sourcePlanningOrderId;
  const linkedSoftwareId = order.derivedSoftwareOrderId;

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-panel transition hover:border-copper/45 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] ${
        linkedAsChild
          ? "ml-4 border-l-[3px] border-l-copper/50 border-line"
          : order.archived
            ? "border-line/80 opacity-90"
            : "border-line"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/pedidos/${order.id}`}
                className="text-lg font-semibold text-ink transition hover:text-copper-2"
              >
                {order.name}
              </Link>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${ORDER_KIND_TONE[kind]}`}
              >
                {ORDER_KIND_LABEL[kind]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${status.tone}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {order.archived ? (
                <span className="badge-neutral">Arquivado</span>
              ) : null}
              {authorName ? (
                <span className="rounded-full border border-line bg-bg-2 px-2.5 py-0.5 text-[10px] text-steel">
                  {authorName}
                </span>
              ) : null}
            </div>

            {linkedAsChild ? (
              <p className="mt-1 text-[11px] font-medium text-copper-2">
                Etapa 2 · software gerado a partir do planejamento acima
              </p>
            ) : null}

            {(linkedPlanningId || linkedSoftwareId) && !linkedAsChild ? (
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {linkedPlanningId ? (
                  <Link
                    href={`/pedidos/${linkedPlanningId}`}
                    className="text-sky-300 transition hover:text-sky-200 hover:underline"
                  >
                    ← Planejamento: {orderNames.get(linkedPlanningId) ?? "ver origem"}
                  </Link>
                ) : null}
                {linkedSoftwareId ? (
                  <Link
                    href={`/pedidos/${linkedSoftwareId}`}
                    className="text-copper-2 transition hover:text-copper hover:underline"
                  >
                    Software gerado → {orderNames.get(linkedSoftwareId) ?? "ver código"}
                  </Link>
                ) : null}
              </div>
            ) : null}

            {problemPreview ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{problemPreview}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {presetTitle ? (
                <span className="rounded-md border border-line bg-bg-2/80 px-2 py-0.5 text-[11px] font-medium text-ink">
                  {presetTitle}
                </span>
              ) : null}
              {SCOPE_CHIPS.map(({ key, label }) => {
                const active = order[key];
                return (
                  <span
                    key={key}
                    className={`rounded-md border px-2 py-0.5 text-[11px] ${
                      active
                        ? "border-copper/30 bg-copper/10 text-copper-2"
                        : "border-line/60 bg-transparent text-steel/50 line-through decoration-steel/40"
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel">
              <span className="font-medium text-muted">{pathLabel}</span>
              {templateLabel ? (
                <>
                  <span aria-hidden className="text-line">
                    ·
                  </span>
                  <span>Template {templateLabel}</span>
                </>
              ) : null}
              {order.status === "running" && order.currentAgent ? (
                <>
                  <span aria-hidden className="text-line">
                    ·
                  </span>
                  <span className="text-copper-2">
                    Agente:{" "}
                    {AGENT_CATALOG.find((a) => a.id === order.currentAgent)?.name ??
                      order.currentAgent}
                  </span>
                </>
              ) : null}
              {deliveries.length > 0 ? (
                <>
                  <span aria-hidden className="text-line">
                    ·
                  </span>
                  <span className="inline-flex flex-wrap gap-1.5">
                    {deliveries.map((d) => (
                      <span
                        key={d.label}
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                          d.ok
                            ? "bg-ok/10 text-ok"
                            : "bg-bad/10 text-bad"
                        }`}
                      >
                        {d.label}
                        {d.ok ? " ✓" : " ✗"}
                      </span>
                    ))}
                  </span>
                </>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] text-steel">
              Criado {formatWhen(order.createdAt)}
              {order.updatedAt !== order.createdAt ? (
                <> · Atualizado {formatWhen(order.updatedAt)}</>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-copper/40 hover:text-ink"
            >
              {expanded ? "Menos" : "Mais info"}
            </button>
            <Link
              href={`/pedidos/${order.id}`}
              className="rounded-lg bg-copper/15 px-3 py-1.5 text-xs font-medium text-copper-2 ring-1 ring-copper/25 transition hover:bg-copper/25"
            >
              Abrir →
            </Link>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-line/80 bg-bg-2/40 px-5 py-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            {order.problem ? (
              <DetailField label="Problema" value={order.problem} className="sm:col-span-2" />
            ) : null}
            {order.audience ? (
              <DetailField label="Público" value={order.audience} />
            ) : null}
            {order.businessRules ? (
              <DetailField label="Regras de negócio" value={order.businessRules} />
            ) : null}
            {deliverable ? (
              <DetailField
                label="Tipo de saída"
                value={`${deliverable.id} — ${deliverable.title}`}
              />
            ) : null}
            {stacks.length > 0 ? (
              <DetailField label="Stacks" value={stacks.join(" · ")} className="sm:col-span-2" />
            ) : null}
            {order.orderKind === "software" && order.sourcePlanningOrderId ? (
              <DetailField
                label="Planejamento origem"
                value={
                  orderNames.get(order.sourcePlanningOrderId) ??
                  `Pedido #${order.sourcePlanningOrderId.slice(0, 8)}…`
                }
              />
            ) : null}
            {order.orderKind === "planning" && order.derivedSoftwareOrderId ? (
              <DetailField
                label="Software derivado"
                value={
                  orderNames.get(order.derivedSoftwareOrderId) ??
                  `Pedido #${order.derivedSoftwareOrderId.slice(0, 8)}…`
                }
              />
            ) : null}
            {order.status === "failed" && order.errorMessage ? (
              <DetailField
                label="Erro"
                value={order.errorMessage}
                className="sm:col-span-2 text-bad"
              />
            ) : null}
          </dl>
        </div>
      ) : null}
    </li>
  );
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-steel">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

function ViewModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-xs transition ${
        active
          ? "bg-panel font-medium text-ink shadow-sm ring-1 ring-line"
          : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function KindFilterChip({
  label,
  count,
  selected,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  tone?: "planning" | "software";
  onClick: () => void;
}) {
  const toneSelected =
    tone === "planning"
      ? "border-sky-400/50 bg-sky-950/50 text-sky-300 ring-1 ring-sky-400/25 light:border-sky-400/50 light:bg-sky-100 light:text-sky-800"
      : tone === "software"
        ? "border-copper/50 bg-accent-surface text-copper-2 ring-1 ring-copper/30"
        : "border-copper bg-accent-surface text-ink ring-1 ring-copper/30";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition ${
        selected
          ? toneSelected
          : "border-line bg-panel text-muted hover:border-copper/40 hover:text-ink"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] tabular-nums opacity-80">{count}</span>
    </button>
  );
}

function UserFilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition ${
        selected
          ? "border-copper/50 bg-accent-surface text-copper-2 ring-1 ring-copper/30"
          : "border-line bg-panel text-muted hover:border-copper/40 hover:text-ink"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] tabular-nums opacity-80">{count}</span>
    </button>
  );
}

function FilterStatCard({
  label,
  value,
  accent,
  selected,
  onClick,
}: {
  label: string;
  value: number;
  accent?: "copper" | "ok" | "bad";
  selected: boolean;
  onClick: () => void;
}) {
  const valueTone =
    accent === "copper"
      ? "text-copper-2"
      : accent === "ok"
        ? "text-ok"
        : accent === "bad"
          ? "text-bad"
          : "text-ink";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-copper bg-accent-surface ring-1 ring-copper/30 shadow-[0_0_20px_rgba(212,137,74,0.1)]"
          : "border-line bg-panel hover:border-copper/40"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}>
        {value}
      </p>
    </button>
  );
}
