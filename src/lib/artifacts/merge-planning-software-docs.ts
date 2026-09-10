import { hasClientLayer, type OrderScope } from "@/lib/order-scope";
import { PLANNING_DOC_KEYS } from "@/lib/planning-context";
import type { DeliverableType } from "@/lib/types";

/** Docs gerados/atualizados pela esteira de software — prevalecem sobre o planejamento. */
const SOFTWARE_DOC_OVERRIDES = new Set(["docs/QA.md"]);

/** Docs condicionais ao escopo do pedido (mesma regra do planning-factory). */
export function planningDocKeysForScope(scope: OrderScope): readonly string[] {
  const keys: string[] = [];

  for (const key of PLANNING_DOC_KEYS) {
    if (key === "docs/MODELO-DADOS.md") {
      if (scope.includeDatabase || scope.includeBackend) keys.push(key);
      continue;
    }
    if (key === "docs/PLANO-BACKEND.md") {
      if (scope.includeBackend) keys.push(key);
      continue;
    }
    if (key === "docs/PLANO-FRONTEND-MOBILE.md") {
      if (hasClientLayer(scope)) keys.push(key);
      continue;
    }
    keys.push(key);
  }

  return keys;
}

/**
 * Incorpora documentação aprovada do planejamento no pacote de software (tipos B/C/D).
 * Mantém QA (e similares) gerados na esteira de código quando existirem.
 */
export function mergePlanningDocsForSoftware(
  planningFiles: Record<string, string>,
  collected: Record<string, string>,
  deliverableType: DeliverableType,
  scope?: OrderScope,
): Record<string, string> {
  if (deliverableType === "A") return collected;

  const merged = { ...collected };
  const keys = scope ? planningDocKeysForScope(scope) : PLANNING_DOC_KEYS;

  for (const key of keys) {
    const fromPlanning = planningFiles[key]?.trim();
    if (!fromPlanning) continue;

    if (SOFTWARE_DOC_OVERRIDES.has(key) && merged[key]?.trim()) {
      continue;
    }

    merged[key] = fromPlanning;
  }

  return merged;
}
