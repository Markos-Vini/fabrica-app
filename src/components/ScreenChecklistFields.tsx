"use client";

import type { DomainFormDefaults } from "@/lib/domain-templates";
import {
  SCREEN_GROUPS,
  SCREEN_OPTIONS,
} from "@/lib/product-context";
import {
  CheckboxCard,
  CheckboxGrid,
  FormField,
  FormSection,
} from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function ScreenChecklistFields({
  defaults,
}: {
  defaults?: Partial<DomainFormDefaults>;
}) {
  return (
    <FormSection
      title="Telas e páginas"
      hint="Marque o que o app ou painel web deve ter. Isso orienta o plano front-end/mobile e o backlog de implementação."
      info={FIELD_HINTS.screens}
    >
      {SCREEN_GROUPS.map((group) => {
        const items = SCREEN_OPTIONS.filter((opt) => opt.group === group);
        return (
          <CheckboxGrid key={group} legend={group}>
            {items.map((screen) => (
              <CheckboxCard
                key={screen.id}
                name={`screen_${screen.id}`}
                defaultChecked={defaults?.screens?.includes(screen.id) ?? false}
                label={screen.label}
                compact
              />
            ))}
          </CheckboxGrid>
        );
      })}

      <FormField
        label="Outras telas (opcional)"
        name="screensCustom"
        defaultValue={defaults?.screensCustom ?? ""}
        placeholder="Ex.: Checkout, Mapa, Chat de suporte"
      />
    </FormSection>
  );
}
