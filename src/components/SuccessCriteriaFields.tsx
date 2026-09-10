"use client";

import type { SuccessCriteriaDefaults } from "@/lib/success-criteria-context";
import { FormSection, FormTextarea } from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function SuccessCriteriaFields({
  defaults,
}: {
  defaults?: Partial<SuccessCriteriaDefaults>;
}) {
  return (
    <FormSection
      title="Critérios de sucesso"
      hint="Como sabemos que o MVP deu certo? Métricas e resultados observáveis para PM, QA e stakeholders."
      info={FIELD_HINTS.successCriteria}
    >
      <FormTextarea
        label="Como medir o sucesso (opcional)"
        name="successCriteria"
        rows={4}
        defaultValue={defaults?.successCriteria ?? ""}
        placeholder={
          "Liste 2–5 critérios mensuráveis.\nEx.:\n- Usuário cria 5 tarefas em < 2 min no mobile demo\n- Login + CRUD completo sem erro no fluxo guiado\n- 90% dos testes críticos passam no CI"
        }
      />
    </FormSection>
  );
}
