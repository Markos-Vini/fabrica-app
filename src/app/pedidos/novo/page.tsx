import Link from "next/link";
import { notFound } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { OrderWizard } from "@/components/OrderWizard";
import {
  canDuplicateOrder,
  duplicateWizardState,
} from "@/lib/order-form";
import { getOrderIfAllowed } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { duplicate } = await searchParams;
  const user = await requireSession();

  let duplicateFrom: string | null = null;
  let initialState = undefined;
  let duplicateBlocked: string | null = null;

  if (duplicate) {
    const loaded = await getOrderIfAllowed(duplicate, user);
    if (!loaded) {
      notFound();
    }
    if (!canDuplicateOrder(loaded.order)) {
      duplicateBlocked =
        "Só é possível duplicar pedidos concluídos ou com falha na esteira.";
    } else {
      duplicateFrom = loaded.order.name;
      initialState = duplicateWizardState(loaded.order);
    }
  }

  return (
    <AppFrame>
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs tracking-[0.3em] text-copper">PEDIDO</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {duplicateFrom ? "Duplicar e editar" : "Novo pedido"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {duplicateFrom ? (
            <>
              Cópia baseada em{" "}
              <strong className="font-medium text-ink">{duplicateFrom}</strong>.
              Ajuste o que mudou e envie como um novo planejamento.
            </>
          ) : (
            <>
              Etapa 1: gere planejamento e documentação para alinhar com gestão e TI.
              Etapa 2: a partir de um planejamento concluído, escolha MVP básico
              ou pacote completo para gerar o software.
            </>
          )}
        </p>
        {duplicateBlocked ? (
          <p className="mt-3 rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-bad">
            {duplicateBlocked}{" "}
            <Link href="/pedidos/novo" className="text-copper-2 underline">
              Novo pedido em branco
            </Link>
          </p>
        ) : null}
        <div className="mt-8">
          {duplicateBlocked ? null : (
            <OrderWizard
              mode={duplicateFrom ? "duplicate" : "create"}
              initialState={initialState}
            />
          )}
        </div>
      </div>
    </AppFrame>
  );
}
