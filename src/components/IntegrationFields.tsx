"use client";

import type { IntegrationDefaults } from "@/lib/integrations-context";
import {
  INTEGRATION_GROUPS,
  INTEGRATION_OPTIONS,
} from "@/lib/integrations-context";
import {
  CheckboxCard,
  CheckboxGrid,
  FormField,
  FormSection,
} from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function IntegrationFields({
  defaults,
}: {
  defaults?: Partial<IntegrationDefaults>;
}) {
  return (
    <FormSection
      title="Integrações externas"
      hint="Marque serviços de terceiros que o app precisa usar. Isso orienta arquitetura, backend e gestão de secrets antes do código."
      info={FIELD_HINTS.integrations}
    >
      {INTEGRATION_GROUPS.map((group) => {
        const items = INTEGRATION_OPTIONS.filter((opt) => opt.group === group);
        return (
          <CheckboxGrid key={group} legend={group}>
            {items.map((integration) => (
              <CheckboxCard
                key={integration.id}
                name={`integration_${integration.id}`}
                defaultChecked={
                  defaults?.integrations?.includes(integration.id) ?? false
                }
                label={integration.label}
                description={integration.hint}
                compact
              />
            ))}
          </CheckboxGrid>
        );
      })}

      <FormField
        label="Outras integrações (opcional)"
        name="integrationsCustom"
        defaultValue={defaults?.integrationsCustom ?? ""}
        placeholder="Ex.: ERP SAP, WhatsApp Business API, Open Banking"
      />
    </FormSection>
  );
}
