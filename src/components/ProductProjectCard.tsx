import Link from "next/link";
import {
  projectDeliveryBadges,
  projectOverallStatus,
  type ProductProject,
} from "@/lib/order-projects";
import { ORDER_KIND_LABEL } from "@/lib/factory-mode";
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

const PROJECT_STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: "Na fila", tone: "border-line bg-bg-2 text-steel" },
  running: { label: "Em produção", tone: "border-copper/40 bg-accent-surface text-copper-2" },
  completed: { label: "Concluído", tone: "border-ok/40 bg-ok/5 text-ok" },
  failed: { label: "Com falha", tone: "border-bad/40 bg-bad/5 text-bad" },
  partial: { label: "Parcial", tone: "border-line bg-bg-2 text-steel" },
};

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function stageLabel(order: OrderRecord): string {
  if (order.orderKind === "planning") return "Etapa 1 · Planejamento";
  if (order.sourcePlanningOrderId) return "Etapa 2 · Software";
  return "MVP direto";
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ProductProjectCard({
  project,
  authorName,
}: {
  project: ProductProject;
  authorName?: string | null;
}) {
  const overall = projectOverallStatus(project);
  const overallTone = PROJECT_STATUS[overall] ?? PROJECT_STATUS.partial!;
  const deliveryBadges = projectDeliveryBadges(project);
  const problemPreview = truncate(
    project.planningOrder?.problem ??
      project.softwareOrders[0]?.problem ??
      project.allOrders[0]?.problem ??
      "",
    100,
  );

  const stages = [...project.allOrders].sort((a, b) => {
    const rank = (order: OrderRecord) => {
      if (order.orderKind === "planning") return 0;
      if (order.sourcePlanningOrderId) return 1;
      return 2;
    };
    const byStage = rank(a) - rank(b);
    if (byStage !== 0) return byStage;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  if (stages.length === 0 && project.allOrders[0]) {
    stages.push(project.allOrders[0]);
  }

  const isFullyArchived =
    project.allOrders.length > 0 && project.allOrders.every((order) => order.archived);

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-panel transition hover:border-copper/45 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${
        isFullyArchived ? "border-line/80 opacity-90" : "border-line"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/projetos/${project.id}`}
                className="text-lg font-semibold text-ink transition hover:text-copper-2"
              >
                {project.name}
              </Link>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${overallTone.tone}`}
              >
                {overallTone.label}
              </span>
              {isFullyArchived ? (
                <span className="badge-neutral">Arquivado</span>
              ) : null}
              {authorName ? (
                <span className="rounded-full border border-line bg-bg-2 px-2.5 py-0.5 text-[10px] text-steel">
                  {authorName}
                </span>
              ) : null}
              <span className="font-mono text-[10px] uppercase tracking-wider text-steel">
                {project.allOrders.length} pedido
                {project.allOrders.length === 1 ? "" : "s"}
              </span>
            </div>

            {problemPreview ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{problemPreview}</p>
            ) : null}

            <ul className="mt-4 space-y-2">
              {stages.map((order) => {
                const status = STATUS[order.status];
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/80 bg-bg-2/50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-ink">{stageLabel(order)}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-steel">
                        {ORDER_KIND_LABEL[order.orderKind ?? "software"]}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${status.tone}`}
                      >
                        <span className={`h-1 w-1 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      {order.archived ? (
                        <span className="badge-neutral">Arquivado</span>
                      ) : null}
                    </div>
                    <Link
                      href={`/pedidos/${order.id}`}
                      className="text-xs text-copper-2 hover:underline"
                    >
                      Abrir pedido →
                    </Link>
                  </li>
                );
              })}
            </ul>

            {deliveryBadges.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {deliveryBadges.map((b) => (
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
              </div>
            ) : null}

            <p className="mt-2 text-[11px] text-steel">
              Atualizado {formatWhen(project.updatedAt)}
            </p>
          </div>

          <Link
            href={`/projetos/${project.id}`}
            className="shrink-0 rounded-lg bg-copper/15 px-3 py-1.5 text-xs font-medium text-copper-2 ring-1 ring-copper/25 transition hover:bg-copper/25"
          >
            Ver projeto →
          </Link>
        </div>
      </div>
    </li>
  );
}
