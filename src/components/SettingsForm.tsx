"use client";

import { useActionState, useMemo, useState } from "react";
import { saveSettingsAction } from "@/app/actions/settings";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import { InfoTip } from "@/components/InfoTip";
import {
  MODEL_OPTIONS,
  MODEL_PROVIDER_LABELS,
  modelOptionsByProvider,
} from "@/lib/llm/model-catalog";
import type { PublicSettings } from "@/lib/settings";
import { CheckboxCard, fieldClass, selectClass } from "@/components/FormControls";

type SettingsTab = "provedores" | "agentes" | "operacao" | "entrega";

const modelGroups = modelOptionsByProvider();

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "accent";
}) {
  const toneClass =
    tone === "ok"
      ? "border-ok/40 bg-ok/5 text-ok"
      : tone === "warn"
        ? "border-bad/40 bg-bad/5 text-bad"
        : tone === "accent"
          ? "border-copper/40 bg-accent-surface text-copper-2"
          : "border-line bg-panel text-ink";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SettingsTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm transition ${
        active
          ? "border-copper font-medium text-ink"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function AgentModelSelect({
  agentId,
  agentName,
  agentRole,
  agentHelp,
  defaultValue,
}: {
  agentId: string;
  agentName: string;
  agentRole: string;
  agentHelp: string;
  defaultValue: string;
}) {
  return (
    <label className="flex h-full min-h-[168px] flex-col rounded-xl border border-line bg-bg-2/50 p-4 transition hover:border-copper/30">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink">{agentName}</span>
        <span className="shrink-0">
          <InfoTip text={agentHelp} ariaLabel={`O que faz o agente ${agentName}`} />
        </span>
      </div>
      <p className="mt-2 min-h-[2.75rem] flex-1 text-xs leading-relaxed text-muted">
        {agentRole}
      </p>
      <select
        name={`model_${agentId}`}
        defaultValue={defaultValue}
        className={`${selectClass} mt-3 shrink-0`}
      >
        {Object.entries(modelGroups).map(([provider, options]) => (
          <optgroup
            key={provider}
            label={MODEL_PROVIDER_LABELS[provider] ?? provider}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label.replace(/\s*\([^)]+\)\s*$/, "")}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function KeyField({
  label,
  name,
  masked,
  configured,
  hint,
}: {
  label: string;
  name: string;
  masked: string;
  configured: boolean;
  hint?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
        {label}
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            configured
              ? "bg-ok/10 text-ok ring-1 ring-ok/30"
              : "bg-bg text-steel ring-1 ring-line"
          }`}
        >
          {configured ? `salva ${masked}` : "não configurada"}
        </span>
      </span>
      <input
        type="password"
        name={name}
        placeholder={configured ? "Nova chave (opcional)" : "Cole a chave"}
        className={fieldClass}
        autoComplete="off"
      />
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function SettingsForm({ initial }: { initial: PublicSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  const [tab, setTab] = useState<SettingsTab>("provedores");

  const providerStats = useMemo(() => {
    const items = [
      initial.openaiConfigured,
      initial.anthropicConfigured,
      initial.geminiConfigured,
      initial.cursorConfigured,
    ];
    const configured = items.filter(Boolean).length;
    return { configured, total: items.length };
  }, [initial]);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatusPill
          label="Modo MOCK"
          value={initial.mockMode ? "Ativo" : "Desligado"}
          tone={initial.mockMode ? "accent" : "default"}
        />
        <StatusPill
          label="Chaves de IA"
          value={`${providerStats.configured}/${providerStats.total}`}
          tone={
            providerStats.configured === 0 && !initial.mockMode
              ? "warn"
              : providerStats.configured > 0
                ? "ok"
                : "default"
          }
        />
        <StatusPill
          label="GitHub"
          value={initial.githubConfigured ? "Configurado" : "Pendente"}
          tone={initial.githubConfigured ? "ok" : "default"}
        />
        <StatusPill
          label="Vercel"
          value={initial.vercelConfigured ? "Configurado" : "Pendente"}
          tone={initial.vercelConfigured ? "ok" : "default"}
        />
        <StatusPill
          label="Última alteração"
          value={formatWhen(initial.updatedAt)}
        />
      </div>

      <div className="overflow-x-auto border-b border-line">
        <div className="flex min-w-max gap-1">
          <SettingsTabButton
            active={tab === "provedores"}
            onClick={() => setTab("provedores")}
            label="Provedores"
          />
          <SettingsTabButton
            active={tab === "agentes"}
            onClick={() => setTab("agentes")}
            label="Agentes"
          />
          <SettingsTabButton
            active={tab === "operacao"}
            onClick={() => setTab("operacao")}
            label="Operação"
          />
          <SettingsTabButton
            active={tab === "entrega"}
            onClick={() => setTab("entrega")}
            label="Entrega"
          />
        </div>
      </div>

      <div className={tab === "provedores" ? "space-y-6" : "hidden"} aria-hidden={tab !== "provedores"}>
          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <header className="mb-5">
              <h2 className="text-lg font-semibold text-ink">Chaves de API</h2>
              <p className="mt-1 text-sm text-muted">
                Configure as chaves dos provedores em nuvem. Armazenadas cifradas
                no servidor — deixe em branco para manter a chave atual.
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <KeyField
                label="OpenAI"
                name="openaiKey"
                masked={initial.openaiMasked}
                configured={initial.openaiConfigured}
              />
              <KeyField
                label="Anthropic"
                name="anthropicKey"
                masked={initial.anthropicMasked}
                configured={initial.anthropicConfigured}
              />
              <KeyField
                label="Google Gemini"
                name="geminiKey"
                masked={initial.geminiMasked}
                configured={initial.geminiConfigured}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <header className="mb-5">
              <h2 className="text-lg font-semibold text-ink">Ollama (local)</h2>
              <p className="mt-1 text-sm text-muted">
                URL base do Ollama na sua máquina ou rede. Modelos locais (ex.{" "}
                <code className="text-xs">llama3.1</code>) usam esse endpoint
                sem chave de API.
              </p>
            </header>
            <label className="block max-w-xl space-y-2 text-sm">
              <span className="font-medium text-ink">URL base</span>
              <input
                name="ollamaBaseUrl"
                defaultValue={initial.ollamaBaseUrl}
                placeholder="http://localhost:11434"
                className={fieldClass}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-copper/30 bg-accent-surface/40 p-6 sm:p-8">
            <header className="mb-5">
              <h2 className="text-lg font-semibold text-ink">Cursor (provisório)</h2>
              <p className="mt-1 text-sm text-muted">
                Integração experimental via Cursor SDK. Gere a chave em{" "}
                <a
                  href="https://cursor.com/dashboard/integrations"
                  target="_blank"
                  rel="noreferrer"
                  className="text-copper-2 underline"
                >
                  cursor.com/dashboard/integrations
                </a>
                . Também aceita{" "}
                <code className="text-xs">CURSOR_API_KEY</code> no{" "}
                <code className="text-xs">.env</code>.
              </p>
            </header>
            <div className="max-w-xl">
              <KeyField
                label="Cursor API key"
                name="cursorKey"
                masked={initial.cursorMasked}
                configured={initial.cursorConfigured}
              />
            </div>
          </div>
      </div>

      <div className={tab === "agentes" ? "" : "hidden"} aria-hidden={tab !== "agentes"}>
        <section className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <header className="mb-5">
            <h2 className="text-lg font-semibold text-ink">
              Mapeamento agente → modelo
            </h2>
            <p className="mt-1 text-sm text-muted">
              Escolha qual provedor cada etapa da esteira usa. Exige a chave
              correspondente na aba Provedores (ou Ollama local para modelos
              locais).
            </p>
          </header>
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {AGENT_CATALOG.map((agent) => (
              <AgentModelSelect
                key={agent.id}
                agentId={agent.id}
                agentName={agent.name}
                agentRole={agent.role}
                agentHelp={agent.help}
                defaultValue={
                  initial.agentModels[agent.id] ?? MODEL_OPTIONS[0].id
                }
              />
            ))}
          </div>
        </section>
      </div>

      <div className={tab === "operacao" ? "" : "hidden"} aria-hidden={tab !== "operacao"}>
        <section className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-ink">Modo MOCK</h2>
            <p className="mt-1 text-sm text-muted">
              Respostas pré-definidas — ideal para apresentar a esteira sem
              consumir tokens ou depender de chaves externas.
            </p>
          </header>
          <CheckboxCard
            name="mockMode"
            defaultChecked={initial.mockMode}
            label="Ativar modo MOCK"
            description="A esteira usa templates locais em vez de chamar APIs externas."
          />
          <CheckboxCard
            name="buildGateEnabled"
            defaultChecked={initial.buildGateEnabled}
            label="Gate de build antes de publicar"
            description="Compila o front-end (npm run build) e analisa o Flutter antes de enviar ao GitHub/Vercel. Recomendado para demo com cliente."
          />
          {initial.mockMode ? (
            <p className="mt-4 rounded-lg border border-copper/30 bg-accent-surface px-4 py-3 text-sm text-muted">
              MOCK está <span className="font-medium text-copper-2">ativo</span>.
              Pedidos novos não consumirão tokens até você desligar e salvar.
            </p>
          ) : (
            <p className="mt-4 rounded-lg border border-line bg-bg-2/50 px-4 py-3 text-sm text-muted">
              MOCK desligado — cada agente usa o modelo configurado na aba
              Agentes e exige a chave do provedor correspondente.
            </p>
          )}
        </section>
      </div>

      <div className={tab === "entrega" ? "" : "hidden"} aria-hidden={tab !== "entrega"}>
        <section className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <header className="mb-5">
            <h2 className="text-lg font-semibold text-ink">Entrega remota</h2>
            <p className="mt-1 text-sm text-muted">
              Publicação automática após a esteira: repositório GitHub, deploy
              Vercel (quando aplicável) e URL pública para QR do APK na rede
              local.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <KeyField
              label="GitHub personal access token"
              name="githubToken"
              masked={initial.githubMasked}
              configured={initial.githubConfigured}
              hint="PAT com permissão de repositório — a Fábrica cria o repo ao concluir."
            />
            <KeyField
              label="Vercel token"
              name="vercelToken"
              masked={initial.vercelMasked}
              configured={initial.vercelConfigured}
              hint="Deploy web opcional via API da Vercel."
            />
            <label className="block space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-ink">URL pública da Fábrica</span>
              <input
                name="publicBaseUrl"
                defaultValue={initial.publicBaseUrl}
                placeholder="http://192.168.0.10:3000"
                className={fieldClass}
              />
              <span className="block text-xs text-muted">
                IP da sua máquina na rede Wi‑Fi — usado no QR do APK de teste.
              </span>
            </label>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel/95 px-6 py-4 backdrop-blur">
        <div>
          {state?.error ? (
            <p className="rounded-lg border border-bad/40 bg-bad/5 px-3 py-2 text-sm text-bad">
              {state.error}
            </p>
          ) : state?.ok ? (
            <p className="rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-sm text-ok">
              Configurações salvas.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Alterações aplicadas na próxima esteira disparada.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-copper px-6 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
