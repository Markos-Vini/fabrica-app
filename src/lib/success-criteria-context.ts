import type { OrderInput } from "@/lib/types";
import { parseOptionalText } from "@/lib/product-context";

export type SuccessCriteriaDefaults = {
  successCriteria: string;
};

export function parseSuccessCriteriaFromForm(formData: FormData): string | null {
  return parseOptionalText(formData.get("successCriteria"), 4000);
}

export function successCriteriaBriefForPrompt(order: OrderInput): string {
  const value = order.successCriteria?.trim();
  if (!value) return "";
  return `Critérios de sucesso (mensuráveis):\n${value}\n\nUse como critérios de aceite no PRD, histórias de usuário, DoD e casos de teste da ESTRATEGIA-QA.md. Prefira métricas verificáveis (tempo, taxa, contagem).`;
}

export function successCriteriaReviewFromForm(formData: FormData): string {
  return parseSuccessCriteriaFromForm(formData) ?? "";
}
