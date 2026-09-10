import Link from "next/link";
import { AppFrame } from "@/components/AppFrame";
import { OrdersPanel } from "@/components/OrdersPanel";
import { listOrdersForUser, listUsers } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireSession();
  const orders = await listOrdersForUser(user, { includeArchived: true });
  const team =
    user.role === "admin"
      ? (await listUsers()).map(({ id, name, email }) => ({ id, name, email }))
      : [];

  return (
    <AppFrame>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-copper">LINHA</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Projetos</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              {user.role === "member"
                ? "Seus produtos na esteira — planejamento, software e entregas em um só lugar."
                : "Todos os produtos da fábrica agrupados por app, com alertas quando algo precisa de atenção."}
            </p>
          </div>
          <Link
            href="/pedidos/novo"
            className="rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110"
          >
            Novo pedido
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-8 py-16 text-center">
            <p className="font-mono text-xs tracking-wider text-copper">ESTEIRA VAZIA</p>
            <p className="mt-3 text-lg font-medium text-ink">Nenhum pedido ainda</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Descreva um app ou pacote de planejamento e a equipe virtual de agentes
              cuida do resto.
            </p>
            <Link
              href="/pedidos/novo"
              className="mt-6 inline-block rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-on-copper"
            >
              Criar primeiro pedido
            </Link>
          </div>
        ) : (
          <OrdersPanel orders={orders} currentUser={user} team={team} />
        )}
      </div>
    </AppFrame>
  );
}
