import Link from "next/link";
import {
  projectDeliveryBadges,
  projectOverallStatus,
  type ProductProject,
} from "@/lib/order-projects";
import { DELIVERABLE_OPTIONS, softwareTierLabel } from "@/lib/constants";
import { ORDER_KIND_LABEL } from "@/lib/factory-mode";
import { scopeLayersLabel } from "@/lib/order-scope";
import type { OrderRecord } from "@/lib/store";

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

const OVERALL: Record<string, string> = {
  queued: "Na fila",
  running: "Em produção",
  completed: "Concluído",
  failed: "Com falha",
  partial: "Parcial",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function stageTitle(order: OrderRecord): string {
  if (order.orderKind === "planning") return "Etapa 1 · Planejamento";
  if (order.sourcePlanningOrderId) return "Etapa 2 · Software";
  return "MVP direto · Software";
}

function orderDeliverable(order: OrderRecord): string {
  if (order.orderKind === "software" && order.sourcePlanningOrderId) {
    return softwareTierLabel(order.deliverableType);
  }
  const d = DELIVERABLE_OPTIONS.find((o) => o.id === order.deliverableType);
  return d ? `${d.id} — ${d.title}` : order.deliverableType;
}

function StagePanel({ order }: { order: OrderRecord }) {
  const status = STATUS[order.status];
  const scope = scopeLayersLabel({
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  });

  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copper-2">
            {stageTitle(order)}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            {ORDER_KIND_LABEL[order.orderKind ?? "software"]}
          </h2>
          <p className="mt-1 text-sm text-on-tint">{orderDeliverable(order)}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${status.tone}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {order.problem ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{order.problem}</p>
      ) : null}

      <p className="mt-3 text-xs text-steel">{scope}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/pedidos/${order.id}`}
          className="rounded-lg bg-copper px-4 py-2 text-xs font-semibold text-on-copper transition hover:brightness-110"
        >
          Abrir esteira →
        </Link>
        {order.orderKind === "planning" && order.status === "completed" ? (
          <Link
            href={`/pedidos/${order.id}/editar`}
            className="rounded-lg border border-line bg-panel px-4 py-2 text-xs text-muted transition hover:border-copper/40 hover:text-ink"
          >
            Editar planejamento
          </Link>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] text-steel">
        Criado {formatWhen(order.createdAt)}
        {order.updatedAt !== order.createdAt ? (
          <> · Atualizado {formatWhen(order.updatedAt)}</>
        ) : null}
      </p>

      {order.status === "failed" && order.errorMessage ? (
        <p className="mt-3 rounded-lg border border-bad/40 bg-accent-bad px-3 py-2 text-xs text-bad">
          {order.errorMessage}
        </p>
      ) : null}
    </section>
  );
}

export function ProjectDetailView({ project }: { project: ProductProject }) {
  const overall = projectOverallStatus(project);
  const badges = projectDeliveryBadges(project);
  const primary = project.planningOrder ?? project.allOrders[0]!;

  const stages = [
    ...(project.planningOrder ? [project.planningOrder] : []),
    ...project.softwareOrders,
  ];
  if (stages.length === 0) stages.push(primary);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/"
          className="inline-flex text-xs text-muted transition hover:text-copper-2"
        >
          ← Voltar aos projetos
        </Link>
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-copper">PROJETO</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.name}</h1>
          {primary.problem ? (
            <p className="mt-2 max-w-2xl text-sm text-muted">{primary.problem}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line bg-bg-2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
            {OVERALL[overall] ?? overall}
          </span>
          {badges.map((b) => (
            <span
              key={b.label}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                b.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"
              }`}
            >
              {b.label}
              {b.ok ? " ✓" : " ✗"}
            </span>
          ))}
          <span className="text-xs text-steel">
            {project.allOrders.length} pedido{project.allOrders.length === 1 ? "" : "s"} ·
            Atualizado {formatWhen(project.updatedAt)}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {stages.map((order) => (
          <StagePanel key={order.id} order={order} />
        ))}
      </div>

      {project.planningOrder &&
      project.planningOrder.status === "completed" &&
      project.softwareOrders.length === 0 ? (
        <div className="rounded-xl border border-copper/30 bg-accent-soft p-5">
          <p className="font-mono text-xs tracking-[0.25em] text-copper-2">PRÓXIMO PASSO</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">
            Gerar software a partir deste planejamento
          </h3>
          <p className="mt-1 text-sm text-on-tint">
            A documentação está pronta. Abra o pedido de planejamento na seção de entregas
            para criar o pedido de software (Etapa 2).
          </p>
          <Link
            href={`/pedidos/${project.planningOrder.id}`}
            className="mt-4 inline-block rounded-lg bg-copper px-4 py-2 text-xs font-semibold text-on-copper transition hover:brightness-110"
          >
            Ir para entregas do planejamento →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
