"use client";

import type { DataModelDefaults } from "@/lib/data-model-context";
import { ENTITY_GROUPS, ENTITY_OPTIONS } from "@/lib/data-model-context";
import {
  CheckboxCard,
  CheckboxGrid,
  FormField,
  FormSection,
  FormTextarea,
} from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function DataModelFields({
  defaults,
}: {
  defaults?: Partial<DataModelDefaults>;
}) {
  return (
    <FormSection
      title="Modelo de dados inicial"
      hint="Entidades que o sistema persiste. Acelera MODELO-DADOS.md e alinha backend, mobile e painel web."
      info={FIELD_HINTS.entities}
    >
      {ENTITY_GROUPS.map((group) => {
        const items = ENTITY_OPTIONS.filter((opt) => opt.group === group);
        return (
          <CheckboxGrid key={group} legend={group}>
            {items.map((entity) => (
              <CheckboxCard
                key={entity.id}
                name={`entity_${entity.id}`}
                defaultChecked={
                  defaults?.entities?.includes(entity.id) ?? false
                }
                label={entity.label}
                compact
              />
            ))}
          </CheckboxGrid>
        );
      })}

      <FormField
        label="Outras entidades (opcional)"
        name="entitiesCustom"
        defaultValue={defaults?.entitiesCustom ?? ""}
        placeholder="Ex.: Cupom, Estoque, Profissional, Plano de assinatura"
      />

      <FormTextarea
        label="Relações principais (opcional)"
        name="entityRelations"
        rows={3}
        info={FIELD_HINTS.entityRelations}
        defaultValue={defaults?.entityRelations ?? ""}
        placeholder={
          "Descreva cardinalidades e vínculos.\nEx.:\n- Usuário 1:N Tarefa\n- Tarefa N:1 Categoria\n- Pedido N:N Produto (via item do pedido)"
        }
      />
    </FormSection>
  );
}
