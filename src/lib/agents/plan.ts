import type { AgentId, DeliverableType } from "@/lib/types";
import type { FactoryMode, OrderKind } from "@/lib/factory-mode";
import { isPlanningMode } from "@/lib/factory-mode";
import { agentsSkippedByScope, type OrderScope } from "@/lib/order-scope";

const ALL: AgentId[] = [
  "pm",
  "architect",
  "backend",
  "frontend",
  "qa",
  "devops",
];

function mergeSkip(...groups: AgentId[][]): AgentId[] {
  return [...new Set(groups.flat())];
}

export function agentsForDeliverable(type: DeliverableType): {
  run: AgentId[];
  skip: AgentId[];
} {
  const skip: AgentId[] =
    type === "A" ? ["backend", "frontend"] : type === "B" ? ["pm"] : [];
  const run = ALL.filter((id) => !skip.includes(id));
  return { run, skip };
}

export type PipelinePlanOptions = {
  /** Software gerado a partir de planejamento aprovado — evita refazer PM/Arquiteto. */
  fromApprovedPlanning?: boolean;
};

export function agentsForPipeline(
  orderKind: OrderKind | FactoryMode,
  type: DeliverableType,
  scope: OrderScope,
  options?: PipelinePlanOptions,
): {
  run: AgentId[];
  skip: AgentId[];
} {
  const scopeSkip = agentsSkippedByScope(scope);
  if (isPlanningMode(orderKind as FactoryMode)) {
    const skip = scopeSkip;
    return { run: ALL.filter((id) => !skip.includes(id)), skip };
  }
  const deliverable = agentsForDeliverable(type);
  const planningSkip: AgentId[] =
    options?.fromApprovedPlanning ? ["pm", "architect"] : [];
  const skip = mergeSkip(deliverable.skip, scopeSkip, planningSkip);
  return { run: ALL.filter((id) => !skip.includes(id)), skip };
}
