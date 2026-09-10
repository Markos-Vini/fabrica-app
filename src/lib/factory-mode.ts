/** Tipo de pedido — planejamento (etapa 1) ou software (etapa 2). */
export type OrderKind = "planning" | "software";

/** @deprecated Preferir OrderKind por pedido; mantido só para dados legados em settings. */
export type FactoryMode = "app" | "planning";

export const ORDER_KIND_OPTIONS: {
  id: OrderKind;
  title: string;
  description: string;
  badge: string;
  recommended?: boolean;
}[] = [
  {
    id: "planning",
    title: "Planejamento",
    description:
      "Gera documentação completa — PRD, arquitetura, roadmap e backlog. Obrigatório antes do software.",
    badge: "Etapa 1",
    recommended: true,
  },
];

export const ORDER_KIND_LABEL: Record<OrderKind, string> = {
  planning: "Planejamento",
  software: "Software",
};

export function inferOrderKind(
  order: {
    orderKind?: OrderKind;
    sourcePlanningOrderId?: string | null;
    derivedSoftwareOrderId?: string | null;
  },
  factoryMode: FactoryMode = "app",
): OrderKind {
  if (order.sourcePlanningOrderId) return "software";
  if (order.derivedSoftwareOrderId) return "planning";
  if (order.orderKind === "planning" || order.orderKind === "software") {
    return order.orderKind;
  }
  return factoryMode === "planning" ? "planning" : "software";
}

export function isPlanningOrder(
  order: {
    orderKind?: OrderKind;
    sourcePlanningOrderId?: string | null;
    derivedSoftwareOrderId?: string | null;
  },
  factoryMode: FactoryMode = "app",
): boolean {
  return inferOrderKind(order, factoryMode) === "planning";
}

export function isPlanningMode(mode: FactoryMode | OrderKind): boolean {
  return mode === "planning";
}

export function orderKindFromForm(value: FormDataEntryValue | null): OrderKind {
  return value === "software" ? "software" : "planning";
}
