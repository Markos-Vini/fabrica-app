"use client";

import { ChoiceCard } from "@/components/FormControls";
import { InfoTip } from "@/components/InfoTip";
import {
  DOMAIN_TEMPLATES,
  type DomainTemplateId,
} from "@/lib/domain-templates";
import { FIELD_HINTS } from "@/lib/field-hints";

export function DomainTemplatePicker({
  value,
  onChange,
}: {
  value: DomainTemplateId;
  onChange: (id: DomainTemplateId) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          Template de domínio
          <InfoTip {...FIELD_HINTS.domainTemplate} />
        </p>
        <p className="text-xs text-muted">
          Escolha um modelo para pré-preencher o formulário. Você pode editar
          tudo depois.
        </p>
      </div>
      <input type="hidden" name="domainTemplateId" value={value} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAIN_TEMPLATES.map((template) => (
          <ChoiceCard
            key={template.id}
            selected={value === template.id}
            onClick={() => onChange(template.id)}
            title={template.title}
            description={template.description}
            className="p-3.5"
          />
        ))}
      </div>
    </div>
  );
}
