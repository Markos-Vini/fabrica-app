"use client";

import type { NfrDefaults } from "@/lib/nfr-context";
import {
  LOCALE_SCOPE_OPTIONS,
  OFFLINE_MODE_OPTIONS,
  PRIVACY_LEVEL_OPTIONS,
  SCALE_TIER_OPTIONS,
  SYNC_MODE_OPTIONS,
} from "@/lib/nfr-context";
import { FormSection, FormSelect, FormTextarea } from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

export function NfrFields({ defaults }: { defaults?: Partial<NfrDefaults> }) {
  const d = {
    nfrOffline: defaults?.nfrOffline ?? "online_only",
    nfrSync: defaults?.nfrSync ?? "none",
    nfrScale: defaults?.nfrScale ?? "small",
    nfrLocales: defaults?.nfrLocales ?? "pt_br",
    nfrPrivacy: defaults?.nfrPrivacy ?? "standard",
    nfrNotes: defaults?.nfrNotes ?? "",
  };

  return (
    <FormSection
      title="Requisitos não funcionais"
      hint="Opcional, mas orienta arquitetura, backend e QA sobre offline, sync, escala, idiomas e privacidade."
      info={FIELD_HINTS.nfr}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Conectividade"
          name="nfrOffline"
          options={OFFLINE_MODE_OPTIONS}
          defaultValue={d.nfrOffline}
        />
        <FormSelect
          label="Sincronização"
          name="nfrSync"
          options={SYNC_MODE_OPTIONS}
          defaultValue={d.nfrSync}
        />
        <FormSelect
          label="Escala esperada"
          name="nfrScale"
          options={SCALE_TIER_OPTIONS}
          defaultValue={d.nfrScale}
        />
        <FormSelect
          label="Idiomas"
          name="nfrLocales"
          options={LOCALE_SCOPE_OPTIONS}
          defaultValue={d.nfrLocales}
        />
        <FormSelect
          label="Privacidade / compliance"
          name="nfrPrivacy"
          options={PRIVACY_LEVEL_OPTIONS}
          defaultValue={d.nfrPrivacy}
        />
      </div>

      <FormTextarea
        label="Notas adicionais (opcional)"
        name="nfrNotes"
        rows={2}
        defaultValue={d.nfrNotes}
        placeholder="Ex.: SLA 99,9%, retenção de logs 90 dias, backup diário"
      />
    </FormSection>
  );
}
