"use client";

import type { DomainFormDefaults } from "@/lib/domain-templates";
import { USER_ROLE_OPTIONS } from "@/lib/product-context";
import {
  CheckboxCard,
  CheckboxGrid,
  fieldClass,
  FormSection,
  FormTextarea,
} from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function ProductContextFields({
  defaults,
}: {
  defaults?: Partial<DomainFormDefaults>;
}) {
  return (
    <FormSection
      title="Produto e MVP"
      hint="Detalhe o que entra na primeira versão e como as pessoas usam o app. Isso melhora PRD, backlog e planos técnicos."
    >
      <FormTextarea
        label="Essencial no MVP (v1)"
        name="mvpEssentials"
        rows={4}
        info={FIELD_HINTS.mvpEssentials}
        defaultValue={defaults?.mvpEssentials ?? ""}
        placeholder={
          "Liste 3–5 entregas obrigatórias da primeira versão.\nEx.:\n- Login e cadastro\n- CRUD de tarefas no mobile\n- Lista com filtros por status"
        }
      />

      <FormTextarea
        label="Depois do MVP (v2+)"
        name="mvpLater"
        rows={3}
        info={FIELD_HINTS.mvpLater}
        defaultValue={defaults?.mvpLater ?? ""}
        placeholder={
          "O que fica para fases futuras.\nEx.:\n- Gráficos no painel web\n- Sync em tempo real\n- Painel admin"
        }
      />

      <CheckboxGrid legend="Papéis de usuário" legendInfo={FIELD_HINTS.userRoles}>
        {USER_ROLE_OPTIONS.map((role) => (
          <CheckboxCard
            key={role.id}
            name={`userRole_${role.id}`}
            defaultChecked={defaults?.userRoles?.includes(role.id) ?? false}
            label={role.label}
            compact
          />
        ))}
      </CheckboxGrid>

      <label className="block space-y-2 text-sm">
        <span className="sr-only">Outro papel de usuário</span>
        <input
          type="text"
          name="userRolesCustom"
          defaultValue={defaults?.userRolesCustom ?? ""}
          placeholder="Outro papel (opcional), ex.: Supervisor, Cliente B2B"
          className={fieldClass}
        />
      </label>

      <FormTextarea
        label="Fluxos principais"
        name="mainFlows"
        rows={4}
        info={FIELD_HINTS.mainFlows}
        defaultValue={defaults?.mainFlows ?? ""}
        placeholder={
          "Descreva 2–4 jornadas do usuário, uma por linha.\nEx.:\n1. Cadastro → Login → Home com lista de tarefas\n2. Criar tarefa → Definir prioridade e data → Salvar\n3. Filtrar pendentes → Concluir tarefa"
        }
      />
    </FormSection>
  );
}
