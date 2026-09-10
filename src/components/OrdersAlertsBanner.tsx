import Link from "next/link";
import type { OrderAlert } from "@/lib/order-projects";
import { ORDER_KIND_LABEL } from "@/lib/factory-mode";

export function OrdersAlertsBanner({ alerts }: { alerts: OrderAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={`${alert.kind}-${alert.order.id}`}
          className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
            alert.kind === "failed"
              ? "border-bad/40 bg-accent-bad"
              : "border-copper/35 bg-accent-surface"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                alert.kind === "failed" ? "text-bad" : "text-copper-2"
              }`}
            >
              {alert.kind === "failed" ? "Pedido com falha" : "Esteira parada"}
              {" · "}
              {alert.order.name}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider opacity-80">
                {ORDER_KIND_LABEL[alert.order.orderKind ?? "software"]}
              </span>
            </p>
            <p className="mt-1 text-xs text-on-tint">{alert.message}</p>
          </div>
          <Link
            href={`/pedidos/${alert.order.id}`}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              alert.kind === "failed"
                ? "border border-bad/40 text-bad hover:bg-bad/10"
                : "border border-copper/40 text-copper-2 hover:bg-copper/10"
            }`}
          >
            Ver pedido →
          </Link>
        </div>
      ))}
    </div>
  );
}
