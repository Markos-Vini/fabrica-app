import Link from "next/link";
import { notFound } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { OrderWizard } from "@/components/OrderWizard";
import {
  duplicateWizardState,
  orderRecordToWizardState,
  planningEditEligibility,
} from "@/lib/order-form";
import { getOrder, getOrderIfAllowed } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession();
  const loaded = await getOrderIfAllowed(id, user);
  if (!loaded) notFound();

  let derived = null;
  if (loaded.order.derivedSoftwareOrderId) {
    derived = (await getOrder(loaded.order.derivedSoftwareOrderId))?.order ?? null;
  }

  const eligibility = planningEditEligibility(loaded.order, derived);
  if (!eligibility.allowed) {
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-line bg-panel p-8">
          <p className="font-mono text-xs tracking-[0.3em] text-copper">EDIÇÃO</p>
          <h1 className="text-2xl font-semibold text-ink">Não é possível editar</h1>
          <p className="text-sm text-muted">{eligibility.reason}</p>
          <Link
            href={`/pedidos/${id}`}
            className="inline-block rounded-lg border border-line px-4 py-2 text-sm hover:border-copper/40"
          >
            Voltar ao pedido
          </Link>
        </div>
      </AppFrame>
    );
  }

  const initialState = orderRecordToWizardState(loaded.order);

  return (
    <AppFrame>
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs tracking-[0.3em] text-copper">EDIÇÃO</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Editar planejamento
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ajuste requisitos, escopo ou MVP de{" "}
          <strong className="font-medium text-ink">{loaded.order.name}</strong>.
          Ao salvar, a esteira regenera o pacote de documentação.
        </p>
        {derived ? (
          <p className="mt-3 max-w-2xl rounded-lg border border-copper/30 bg-accent-surface px-4 py-3 text-xs text-on-tint">
            Já existia software vinculado a este planejamento. Após salvar,
            gere software de novo para alinhar ao pacote revisado.
          </p>
        ) : null}
        <div className="mt-8">
          <OrderWizard mode="edit" orderId={id} initialState={initialState} />
        </div>
      </div>
    </AppFrame>
  );
}
