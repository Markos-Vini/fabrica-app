"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createOrderAction, updatePlanningOrderAction } from "@/app/actions/orders";
import {
  BACKEND_STACKS,
  DATABASE_STACKS,
  FRONTEND_STACKS,
  MOBILE_STACKS,
} from "@/lib/constants";
import {
  defaultScopePreset,
  SCOPE_PRESETS,
  scopeFromPreset,
  scopeLayersLabel,
  type OrderScope,
  type ScopePresetId,
} from "@/lib/order-scope";

import {
  ORDER_KIND_LABEL,
  type OrderKind,
} from "@/lib/factory-mode";
import { DomainTemplatePicker } from "@/components/DomainTemplatePicker";
import {
  getDomainTemplate,
  type DomainTemplateId,
  domainTemplateLabel,
} from "@/lib/domain-templates";
import { UI_STYLE_OPTIONS, type UiStyle } from "@/lib/visual-design";
import { ProductContextFields } from "@/components/ProductContextFields";
import { ScreenChecklistFields } from "@/components/ScreenChecklistFields";
import { NfrFields } from "@/components/NfrFields";
import { IntegrationFields } from "@/components/IntegrationFields";
import { DataModelFields } from "@/components/DataModelFields";
import { SuccessCriteriaFields } from "@/components/SuccessCriteriaFields";
import { UiStylePicker, PrimaryColorField } from "@/components/UiStylePicker";
import { SCREEN_OPTIONS } from "@/lib/product-context";
import { nfrReviewSummaryFromForm } from "@/lib/nfr-context";
import { integrationsReviewFromForm } from "@/lib/integrations-context";
import { dataModelReviewFromForm } from "@/lib/data-model-context";
import { successCriteriaReviewFromForm } from "@/lib/success-criteria-context";
import type { WizardInitialState, WizardMode } from "@/lib/order-form";
import {
  CheckboxCard,
  CheckboxGrid,
  ChoiceCard,
  FormField,
  FormSelect,
  FormTextarea,
  SectionLabel,
} from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";
import { InfoTip } from "@/components/InfoTip";

type StackDefaults = {
  mobileStack: string;
  frontendStack: string;
  backendStack: string;
  databaseStack: string;
};

type ReviewSnapshot = {
  domainTemplateLabel: string;
  name: string;
  problem: string;
  audience: string;
  businessRules: string;
  mvpEssentials: string;
  mvpLater: string;
  userRoles: string;
  mainFlows: string;
  expectedScreens: string;
  nfrSummary: string;
  externalIntegrations: string;
  dataModelSummary: string;
  successCriteria: string;
  uiStyleLabel: string;
  primaryColor: string;
  uiReference: string;
  orderKindLabel: string;
  stacks: string[];
};

const TOTAL_STEPS = 5;

function wizardStateFromInitial(initial?: WizardInitialState) {
  const blank = getDomainTemplate("blank").defaults;
  if (!initial) {
    return {
      orderKind: "planning" as const,
      deliverableType: "C",
      preset: defaultScopePreset(true),
      scope: scopeFromPreset(defaultScopePreset(true)),
      uiStyle: "modern" as UiStyle,
      primaryColor: "",
      domainTemplateId: "blank" as const,
      formDefaults: blank,
      stackDefaults: {
        mobileStack: blank.mobileStack,
        frontendStack: blank.frontendStack,
        backendStack: blank.backendStack,
        databaseStack: blank.databaseStack,
      },
    };
  }
  return {
    orderKind: initial.orderKind,
    deliverableType: initial.deliverableType,
    preset: initial.preset,
    scope: initial.scope,
    uiStyle: initial.uiStyle,
    primaryColor: initial.primaryColor,
    domainTemplateId: initial.domainTemplateId,
    formDefaults: initial.formDefaults,
    stackDefaults: initial.stackDefaults,
  };
}

export function OrderWizard({
  mode = "create",
  orderId,
  initialState,
}: {
  mode?: WizardMode;
  orderId?: string;
  initialState?: WizardInitialState;
}) {
  const boot = wizardStateFromInitial(initialState);
  const isEdit = mode === "edit";
  const isDuplicate = mode === "duplicate";
  const formRef = useRef<HTMLFormElement>(null);
  const wizardAnchorRef = useRef<HTMLDivElement>(null);
  const skipInitialScrollRef = useRef(true);
  const [step, setStep] = useState(1);
  const [createState, createAction, createPending] = useActionState(
    createOrderAction,
    null,
  );
  const [editState, editAction, editPending] = useActionState(
    updatePlanningOrderAction,
    null,
  );
  const state = isEdit ? editState : createState;
  const action = isEdit ? editAction : createAction;
  const pending = isEdit ? editPending : createPending;
  const [orderKind] = useState<OrderKind>("planning");
  const stepCount = TOTAL_STEPS;

  function sectionForStep(wizardStep: number): number {
    return wizardStep;
  }

  const activeSection = sectionForStep(step);
  const [preset, setPreset] = useState<ScopePresetId>(boot.preset);
  const [scope, setScope] = useState<OrderScope>(boot.scope);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewSnapshot | null>(null);
  const [uiStyle, setUiStyle] = useState<UiStyle>(boot.uiStyle);
  const [primaryColor, setPrimaryColor] = useState(boot.primaryColor);
  const [domainTemplateId, setDomainTemplateId] = useState(
    boot.domainTemplateId,
  );
  const [formSeed, setFormSeed] = useState(initialState ? 1 : 0);
  const [formDefaults, setFormDefaults] = useState(() => boot.formDefaults);
  const [stackDefaults, setStackDefaults] = useState<StackDefaults>(
    () => boot.stackDefaults,
  );

  const isCustom = preset === "custom";

  const applyDomainTemplate = (id: DomainTemplateId) => {
    const template = getDomainTemplate(id);
    setDomainTemplateId(id);
    setFormDefaults(template.defaults);
    setUiStyle(template.defaults.uiStyle);
    setPrimaryColor(template.defaults.primaryColor);
    setPreset(template.defaults.scopePreset);
    setScope(scopeFromPreset(template.defaults.scopePreset));
    setStackDefaults({
      mobileStack: template.defaults.mobileStack,
      frontendStack: template.defaults.frontendStack,
      backendStack: template.defaults.backendStack,
      databaseStack: template.defaults.databaseStack,
    });
    setFormSeed((current) => current + 1);
  };

  const applyPreset = (id: ScopePresetId) => {
    setPreset(id);
    setScopeError(null);
    if (id !== "custom") setScope(scopeFromPreset(id));
  };

  const toggleScope = (key: keyof OrderScope, value: boolean) => {
    setPreset("custom");
    setScopeError(null);
    setScope((current) => ({ ...current, [key]: value }));
  };

  const stepLabels = useMemo(
    () => [
      "Identificação",
      "Produto",
      "Requisitos",
      "Escopo e stack",
      "Revisão",
    ],
    [],
  );

  const presetTitle =
    SCOPE_PRESETS.find((item) => item.id === preset)?.title ??
    (isCustom ? "Personalizado" : preset);

  const captureReview = (): ReviewSnapshot | null => {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);

    const stacks: string[] = [];
    if (scope.includeMobile) {
      stacks.push(`Mobile: ${String(fd.get("mobileStack") ?? MOBILE_STACKS[0])}`);
    }
    if (scope.includeFrontend) {
      stacks.push(
        `Front-end: ${String(fd.get("frontendStack") ?? FRONTEND_STACKS[0])}`,
      );
    }
    if (scope.includeBackend) {
      stacks.push(
        `Back-end: ${String(fd.get("backendStack") ?? BACKEND_STACKS[0])}`,
      );
    }
    if (scope.includeDatabase) {
      stacks.push(
        `Banco: ${String(fd.get("databaseStack") ?? DATABASE_STACKS[0])}`,
      );
    }

    return {
      domainTemplateLabel: domainTemplateLabel(domainTemplateId),
      name: String(fd.get("name") ?? "").trim(),
      problem: String(fd.get("problem") ?? "").trim(),
      audience: String(fd.get("audience") ?? "").trim(),
      businessRules: String(fd.get("businessRules") ?? "").trim(),
      mvpEssentials: String(fd.get("mvpEssentials") ?? "").trim(),
      mvpLater: String(fd.get("mvpLater") ?? "").trim(),
      userRoles: [
        ...["end_user", "admin", "guest", "team"]
          .filter((id) => fd.get(`userRole_${id}`) === "on")
          .map((id) => {
            const labels: Record<string, string> = {
              end_user: "Usuário final",
              admin: "Administrador",
              guest: "Convidado / visitante",
              team: "Membro de equipe",
            };
            return labels[id];
          }),
        String(fd.get("userRolesCustom") ?? "").trim(),
      ]
        .filter(Boolean)
        .join(", "),
      mainFlows: String(fd.get("mainFlows") ?? "").trim(),
      expectedScreens: [
        ...SCREEN_OPTIONS.filter((s) => fd.get(`screen_${s.id}`) === "on").map(
          (s) => s.label,
        ),
        String(fd.get("screensCustom") ?? "").trim(),
      ]
        .filter(Boolean)
        .join(", "),
      nfrSummary: nfrReviewSummaryFromForm(fd),
      externalIntegrations: integrationsReviewFromForm(fd),
      dataModelSummary: dataModelReviewFromForm(fd),
      successCriteria: successCriteriaReviewFromForm(fd),
      uiStyleLabel:
        UI_STYLE_OPTIONS.find((o) => o.id === String(fd.get("uiStyle") ?? "modern"))
          ?.title ?? "Moderno",
      primaryColor: String(fd.get("primaryColor") ?? "").trim(),
      uiReference: String(fd.get("uiReference") ?? "").trim(),
      orderKindLabel: ORDER_KIND_LABEL.planning,
      stacks,
    };
  };

  const validateScope = () => {
    if (!scope.includeMobile && !scope.includeFrontend && !scope.includeBackend) {
      setScopeError(
        "Selecione ao menos uma camada: mobile/app, front-end ou back-end.",
      );
      return false;
    }
    setScopeError(null);
    return true;
  };

  const validateStep = (currentStep: number): boolean => {
    const form = formRef.current;
    if (!form) return false;

    if (currentStep === 1) {
      const section = form.querySelector('[data-wizard-step="1"]');
      const fields = section?.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select");
      for (const field of fields ?? []) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
    }

    if (currentStep === 4 && !validateScope()) return false;
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    const scopeStep = 4;
    if (step === scopeStep) setReview(captureReview());
    setStep((current) => Math.min(current + 1, stepCount));
  };

  const goToStep = (target: number) => {
    if (target >= 1 && target < step) {
      setStep(target);
    }
  };

  const scrollWizardToTop = useCallback(() => {
    requestAnimationFrame(() => {
      const anchor = wizardAnchorRef.current;
      if (!anchor) return;
      const header = document.querySelector("header");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const top =
        anchor.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (skipInitialScrollRef.current) {
      skipInitialScrollRef.current = false;
      return;
    }
    scrollWizardToTop();
  }, [step, scrollWizardToTop]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (step !== stepCount) {
      event.preventDefault();
      return;
    }
    if (!validateScope()) {
      event.preventDefault();
      setStep(4);
    }
  };

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      <input type="hidden" name="orderKind" value={orderKind} />
      {isEdit && orderId ? (
        <input type="hidden" name="orderId" value={orderId} />
      ) : null}
      <input type="hidden" name="scopePreset" value={preset} />
      {(
        [
          "includeMobile",
          "includeFrontend",
          "includeBackend",
          "includeDatabase",
          "includeAuth",
          "includeAdmin",
        ] as const
      ).map((key) =>
        scope[key] ? (
          <input key={key} type="hidden" name={key} value="on" />
        ) : null,
      )}

      <div ref={wizardAnchorRef} className="scroll-mt-24" aria-hidden />

      <nav aria-label="Etapas do pedido">
        <ol
          className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible"
        >
          {stepLabels.map((label, index) => {
            const n = index + 1;
            const active = step === n;
            const done = step > n;
            const clickable = done;
            const className = `min-w-[9.5rem] shrink-0 rounded-xl border px-3 py-3 text-left transition sm:min-w-0 ${
              active
                ? "border-copper bg-accent-surface shadow-[0_0_20px_rgba(212,137,74,0.12)]"
                : done
                  ? "border-ok/40 bg-bg-2 hover:border-ok/60"
                  : "border-line bg-bg-2/60"
            }`;

            const content = (
              <>
                <p
                  className={`font-mono text-[11px] tracking-wider ${
                    active ? "text-copper-2" : done ? "text-ok" : "text-steel"
                  }`}
                >
                  {done ? "✓" : String(n).padStart(2, "0")}
                </p>
                <p
                  className={`mt-1 text-sm font-medium leading-snug ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  {label}
                </p>
              </>
            );

            return (
              <li key={`wizard-step-${n}`}>
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => goToStep(n)}
                    className={`${className} w-full`}
                    aria-current={active ? "step" : undefined}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={className} aria-current={active ? "step" : undefined}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-2">
          <div
            className="h-full rounded-full bg-copper transition-all duration-300"
            style={{
              width: `${((step - 1) / (stepCount - 1)) * 100}%`,
            }}
          />
        </div>
      </nav>

      <div className="min-h-[320px] rounded-2xl border border-line bg-panel p-6 sm:p-8">
        <section
          data-wizard-step="1"
          className={activeSection === 1 ? "space-y-5" : "hidden"}
          aria-hidden={activeSection !== 1}
        >
            {!isEdit ? (
            <div className="rounded-xl border border-copper/30 bg-accent-surface px-4 py-4 text-sm text-on-tint">
              <p className="font-medium text-ink">Etapa 1 · Planejamento</p>
              <p className="mt-1">
                Este pedido gera documentação completa (PRD, arquitetura, backlog,
                planos técnicos). Depois de concluído, você escolhe{" "}
                <strong className="text-ink">MVP básico</strong> ou{" "}
                <strong className="text-ink">pacote completo</strong> para gerar o
                software.
              </p>
            </div>
            ) : (
            <div className="rounded-xl border border-copper/30 bg-accent-surface px-4 py-3 text-sm text-on-tint">
              Editando requisitos do planejamento. Ao salvar, a esteira regenera
              toda a documentação com os dados atualizados.
            </div>
            )}

            <header className={isEdit ? "" : "pt-2"}>
              <h2 className="text-lg font-semibold text-ink">Sobre o projeto</h2>
              <p className="mt-1 text-sm text-muted">
                Escolha um template ou descreva do zero. Nas próximas etapas você
                detalha produto, requisitos e escopo técnico.
              </p>
            </header>

            <DomainTemplatePicker
              value={domainTemplateId}
              onChange={applyDomainTemplate}
            />

            <div key={formSeed} className="space-y-5">
            <FormField
              label="Nome do app"
              name="name"
              required
              placeholder="Ex.: Calcfacil"
              defaultValue={formDefaults.name}
            />
            <FormTextarea
              label="Problema / objetivo"
              name="problem"
              required
              info={FIELD_HINTS.problem}
              placeholder="Qual dor ou objetivo o app resolve?"
              defaultValue={formDefaults.problem}
            />
            <FormField
              label="Público-alvo"
              name="audience"
              required
              info={FIELD_HINTS.audience}
              placeholder="Quem vai usar?"
              defaultValue={formDefaults.audience}
            />
            <FormTextarea
              label="Regras de negócio principais"
              name="businessRules"
              required
              info={FIELD_HINTS.businessRules}
              placeholder="Liste regras, limites e comportamentos esperados."
              defaultValue={formDefaults.businessRules}
            />
            </div>
          </section>

        <section
          data-wizard-step="2"
          className={activeSection === 2 ? "space-y-5" : "hidden"}
          aria-hidden={activeSection !== 2}
        >
            <header>
              <h2 className="text-lg font-semibold text-ink">Produto e experiência</h2>
              <p className="mt-1 text-sm text-muted">
                MVP, papéis, fluxos, telas e como medir sucesso. Tudo opcional,
                mas melhora muito o planejamento.
              </p>
            </header>

            <div key={formSeed} className="space-y-5">
            <ProductContextFields defaults={formDefaults} />
            <ScreenChecklistFields defaults={formDefaults} />
            <SuccessCriteriaFields defaults={formDefaults} />
            </div>
          </section>

        <section
          data-wizard-step="3"
          className={activeSection === 3 ? "space-y-5" : "hidden"}
          aria-hidden={activeSection !== 3}
        >
            <header>
              <h2 className="text-lg font-semibold text-ink">Requisitos e visual</h2>
              <p className="mt-1 text-sm text-muted">
                Restrições técnicas, integrações, modelo de dados e diretriz
                visual. Pule o que não se aplicar.
              </p>
            </header>

            <div key={formSeed} className="space-y-5">
            <NfrFields defaults={formDefaults} />
            <IntegrationFields defaults={formDefaults} />
            <DataModelFields defaults={formDefaults} />

            <div className="space-y-4 rounded-xl border border-line bg-bg-2 p-4">
              <SectionLabel
                title="Diretriz visual (opcional)"
                hint="Escolha um estilo e veja a prévia do app e do painel web. A esteira usa isso como guia visual."
                info={FIELD_HINTS.visualStyle}
              />
              <PrimaryColorField value={primaryColor} onChange={setPrimaryColor} />
              <UiStylePicker
                value={uiStyle}
                onChange={setUiStyle}
                primaryColor={primaryColor}
              />
              <FormTextarea
                label="Referência visual (texto)"
                name="uiReference"
                info={FIELD_HINTS.uiReference}
                placeholder='Ex.: "layout limpo como Todoist", "cards arredondados estilo Nubank"'
                defaultValue={formDefaults.uiReference}
              />
            </div>
            </div>
          </section>

        <section
          data-wizard-step="4"
          className={activeSection === 4 ? "space-y-8" : "hidden"}
          aria-hidden={activeSection !== 4}
        >
            <header>
              <h2 className="text-lg font-semibold text-ink">Escopo e tecnologia</h2>
              <p className="mt-1 text-sm text-muted">
                Escolha só o que precisa — evite camadas desnecessárias.
              </p>
            </header>

            <div className="space-y-3">
              <SectionLabel
                title="Escopo do projeto"
                hint="Quais partes do software serão geradas."
                info={FIELD_HINTS.scope}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {SCOPE_PRESETS.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    selected={preset === item.id}
                    onClick={() => applyPreset(item.id)}
                    title={item.title}
                    description={item.description}
                  />
                ))}
                <ChoiceCard
                  selected={isCustom}
                  onClick={() => applyPreset("custom")}
                  title="Personalizado"
                  description="Marque camadas individualmente abaixo."
                  className="sm:col-span-2"
                />
              </div>
            </div>

            {isCustom ? (
              <section className="rounded-2xl border border-line/80 bg-bg-2/70 p-5">
                <CheckboxGrid columns={2}>
                <CheckboxCard
                  label="Mobile / app"
                  checked={scope.includeMobile}
                  onChange={(v) => toggleScope("includeMobile", v)}
                  compact
                />
                <CheckboxCard
                  label="Front-end web"
                  checked={scope.includeFrontend}
                  onChange={(v) => toggleScope("includeFrontend", v)}
                  compact
                />
                <CheckboxCard
                  label="Back-end / API"
                  checked={scope.includeBackend}
                  onChange={(v) => toggleScope("includeBackend", v)}
                  compact
                />
                <CheckboxCard
                  label="Banco de dados"
                  checked={scope.includeDatabase}
                  onChange={(v) => toggleScope("includeDatabase", v)}
                  compact
                />
                <CheckboxCard
                  label="Login / contas"
                  checked={scope.includeAuth}
                  onChange={(v) => toggleScope("includeAuth", v)}
                  compact
                />
                <CheckboxCard
                  label="Painel admin"
                  checked={scope.includeAdmin}
                  onChange={(v) => toggleScope("includeAdmin", v)}
                  compact
                />
              </CheckboxGrid>
              </section>
            ) : null}

            {scopeError ? (
              <p className="rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-bad">
                {scopeError}
              </p>
            ) : null}

            <input type="hidden" name="deliverableType" value="C" />

            {(scope.includeMobile ||
              scope.includeFrontend ||
              scope.includeBackend ||
              scope.includeDatabase) ? (
              <div className="space-y-3">
                <SectionLabel
                  title="Stack tecnológica"
                  hint="Frameworks usados em cada camada ativa."
                  info={FIELD_HINTS.stacks}
                />
                <div key={formSeed} className="grid gap-4 sm:grid-cols-2">
                  {scope.includeMobile ? (
                    <FormSelect
                      label="Mobile / App"
                      name="mobileStack"
                      options={MOBILE_STACKS}
                      defaultValue={stackDefaults.mobileStack}
                    />
                  ) : null}
                  {scope.includeFrontend ? (
                    <FormSelect
                      label="Front-end web"
                      name="frontendStack"
                      options={FRONTEND_STACKS}
                      defaultValue={stackDefaults.frontendStack}
                    />
                  ) : null}
                  {scope.includeBackend ? (
                    <FormSelect
                      label="Back-end / API"
                      name="backendStack"
                      options={BACKEND_STACKS}
                      defaultValue={stackDefaults.backendStack}
                    />
                  ) : null}
                  {scope.includeDatabase ? (
                    <FormSelect
                      label="Banco de dados"
                      name="databaseStack"
                      options={DATABASE_STACKS}
                      defaultValue={stackDefaults.databaseStack}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

        <section
          data-wizard-step="5"
          className={activeSection === 5 ? "space-y-5" : "hidden"}
          aria-hidden={activeSection !== 5}
        >
          {review ? (
            <>
            <header>
              <h2 className="text-lg font-semibold text-ink">Revisão antes de enviar</h2>
              <p className="mt-1 text-sm text-muted">
                Confira os dados. Ao confirmar, o pedido entra na esteira de
                produção.
              </p>
            </header>

            <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-2">
              {review.domainTemplateLabel !== "Em branco" ? (
                <ReviewRow label="Template" value={review.domainTemplateLabel} />
              ) : null}
              <ReviewRow label="Nome" value={review.name} />
              <ReviewRow label="Problema" value={review.problem} multiline />
              <ReviewRow label="Público" value={review.audience} />
              <ReviewRow label="Regras" value={review.businessRules} multiline />
              {review.mvpEssentials ? (
                <ReviewRow label="MVP v1" value={review.mvpEssentials} multiline />
              ) : null}
              {review.mvpLater ? (
                <ReviewRow label="Depois v2+" value={review.mvpLater} multiline />
              ) : null}
              {review.userRoles ? (
                <ReviewRow label="Papéis" value={review.userRoles} />
              ) : null}
              {review.mainFlows ? (
                <ReviewRow label="Fluxos" value={review.mainFlows} multiline />
              ) : null}
              {review.expectedScreens ? (
                <ReviewRow label="Telas" value={review.expectedScreens} multiline />
              ) : null}
              {review.nfrSummary ? (
                <ReviewRow label="RNF" value={review.nfrSummary} multiline />
              ) : null}
              {review.externalIntegrations ? (
                <ReviewRow
                  label="Integrações"
                  value={review.externalIntegrations}
                  multiline
                />
              ) : null}
              {review.dataModelSummary ? (
                <ReviewRow
                  label="Entidades"
                  value={review.dataModelSummary}
                  multiline
                />
              ) : null}
              {review.successCriteria ? (
                <ReviewRow
                  label="Sucesso"
                  value={review.successCriteria}
                  multiline
                />
              ) : null}
              <ReviewRow label="Estilo visual" value={review.uiStyleLabel} />
              {review.primaryColor ? (
                <ReviewRow label="Cor primária" value={review.primaryColor} />
              ) : null}
              {review.uiReference ? (
                <ReviewRow
                  label="Referência UI"
                  value={review.uiReference}
                  multiline
                />
              ) : null}
              <ReviewRow label="Tipo" value={review.orderKindLabel} />
              <ReviewRow label="Preset" value={presetTitle} />
              <ReviewRow label="Camadas" value={scopeLayersLabel(scope)} />
              {review.stacks.map((stack) => (
                <ReviewRow key={stack} label="Stack" value={stack} />
              ))}
            </dl>

            <p className="rounded-xl border border-copper/30 bg-accent-surface px-4 py-3 text-sm text-on-tint">
              A esteira gera documentação alinhada ao escopo. Depois você escolhe
              MVP básico ou pacote completo para gerar o software.
            </p>
            </>
          ) : null}
          </section>
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-bad">
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 px-6 py-4 backdrop-blur">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 1))}
            className="rounded-lg border border-line px-5 py-2.5 text-sm transition hover:border-copper/40"
          >
            Voltar
          </button>
        ) : (
          <p className="text-sm text-muted">
            {step === stepCount
              ? "Revise os dados antes de enviar."
              : "Preencha a etapa e continue."}
          </p>
        )}

        {step < stepCount ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goNext();
            }}
            className="ml-auto rounded-lg bg-copper px-6 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110"
          >
            Continuar
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="ml-auto min-w-[180px] rounded-lg bg-copper px-6 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110 disabled:opacity-60"
          >
            {pending
              ? isEdit
                ? "Salvando…"
                : "Colocando na esteira…"
              : isEdit
                ? "Salvar e regenerar planejamento"
                : isDuplicate
                  ? "Criar cópia do planejamento"
                  : "Gerar planejamento"}
          </button>
        )}
      </div>
    </form>
  );
}

function ReviewRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="font-mono text-xs uppercase tracking-wide text-steel">{label}</dt>
      <dd
        className={`text-sm text-ink ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
