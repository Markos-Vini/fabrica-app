"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import QRCode from "qrcode";
import {
  createSoftwareFromPlanningAction,
  cancelDeliveryAction,
  republishAction,
  regeneratePlanningDocsAction,
  triggerApkAction,
} from "@/app/actions/orders";
import { buildRepublishNotice } from "@/lib/delivery/republish-notice";
import { SOFTWARE_FROM_PLANNING_OPTIONS } from "@/lib/constants";
import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";
import { isTasklistOrder } from "@/lib/artifacts/tasklist-order";
import { apkDownloadPath as buildApkDownloadPath } from "@/lib/download-token";
import { isPlanningOrder } from "@/lib/factory-mode";
import {
  canDuplicateOrder,
  planningEditEligibility,
} from "@/lib/order-form";
import { DeliveryJobsHistory } from "@/components/DeliveryJobsHistory";
import { StakeholderDemoSection } from "@/components/StakeholderDemoSection";
import { buildStakeholderDemoState } from "@/lib/delivery/stakeholder-demo";
import type { DemoAccount } from "@/lib/delivery/demo-accounts";
import type { JobRecord } from "@/lib/jobs/types";
import type { OrderRecord } from "@/lib/store";
import { CheckboxCard } from "@/components/FormControls";

type PublishTargetStatus = "publishing" | "ok" | "error" | "idle";

type OrderPollPayload = {
  order: OrderRecord;
  jobs: JobRecord[];
};

function publishJobActive(jobs: JobRecord[]): boolean {
  return jobs.some(
    (job) =>
      job.type === "publish" &&
      (job.status === "pending" || job.status === "running"),
  );
}

function apkJobActive(jobs: JobRecord[]): boolean {
  return jobs.some(
    (job) =>
      job.type === "apk" &&
      (job.status === "pending" || job.status === "running"),
  );
}

function apkSectionHint(order: OrderRecord): string {
  if (isTasklistOrder(order)) {
    return "App funcional em modo demo (tarefas locais). Republicar + gerar APK novamente após atualizações.";
  }
  return `App ${order.name} em modo demo. Republicar + gerar APK novamente após atualizações.`;
}

function publishTargetStatus(
  publishing: boolean,
  url: string | null,
  error: string | null,
): PublishTargetStatus {
  if (publishing) return "publishing";
  if (error) return "error";
  if (url) return "ok";
  return "idle";
}

const publishStatusLabel: Record<PublishTargetStatus, string> = {
  publishing: "Publicando…",
  ok: "Publicado",
  error: "Falhou",
  idle: "Pendente",
};

const publishStatusTone: Record<PublishTargetStatus, string> = {
  publishing: "border-copper/50 bg-accent-surface text-copper-2",
  ok: "border-ok/40 bg-ok/10 text-ok",
  error: "border-bad/40 bg-bad/10 text-bad",
  idle: "border-line bg-panel text-steel",
};

function deliverableCardClass(active = false): string {
  return `rounded-xl border p-4 sm:p-5 transition ${
    active
      ? "border-copper/50 bg-accent-surface ring-1 ring-copper/20"
      : "border-line bg-bg-2"
  }`;
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function shortenUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  const half = Math.floor((max - 1) / 2);
  return `${url.slice(0, half)}…${url.slice(-half)}`;
}

const PLANNING_DOCS = [
  { path: "docs/PRD.md", label: "PRD — visão e requisitos" },
  { path: "docs/HISTORIAS-USUARIO.md", label: "Histórias de usuário" },
  { path: "docs/ARQUITETURA.md", label: "Arquitetura e diagramas" },
  { path: "docs/MODELO-DADOS.md", label: "Modelo de dados" },
  { path: "docs/PLANO-BACKEND.md", label: "Plano back-end" },
  { path: "docs/PLANO-FRONTEND-MOBILE.md", label: "Plano front-end / mobile" },
  { path: "docs/ESTRATEGIA-QA.md", label: "Estratégia de QA" },
  { path: "docs/ROADMAP.md", label: "Roadmap por fases" },
  { path: "docs/TAREFAS.md", label: "Backlog de tasks ordenado" },
  { path: "README.md", label: "Índice do pacote" },
];

export function DeliverablesPanel({
  order: initialOrder,
  derivedSoftware = null,
  publicBaseUrl,
  suggestedLanOrigin = "",
  apkAccessToken = "",
  vercelConfigured = false,
  initialJobs = [],
  demoAccounts = [],
}: {
  order: OrderRecord;
  derivedSoftware?: OrderRecord | null;
  publicBaseUrl: string;
  suggestedLanOrigin?: string;
  apkAccessToken?: string;
  vercelConfigured?: boolean;
  initialJobs?: JobRecord[];
  demoAccounts?: DemoAccount[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [clientOrigin, setClientOrigin] = useState("");
  const [apkQr, setApkQr] = useState("");
  const [publishNotice, setPublishNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);
  const [isRepublishPending, startRepublish] = useTransition();
  const [isApkPending, startApkTrigger] = useTransition();
  const [isCancelPending, startCancelDelivery] = useTransition();
  const [apkStarting, setApkStarting] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>(initialJobs);
  const [regenerating, setRegenerating] = useState(false);
  const [regenNotice, setRegenNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);
  const awaitingPublishResultRef = useRef(false);
  const planning = isPlanningOrder(order);
  const editEligibility = planning
    ? planningEditEligibility(order, derivedSoftware)
    : { allowed: false as const };
  const canDuplicate = canDuplicateOrder(order);
  const apkEligible =
    planning && order.includeMobile && supportsNativeApk(order.mobileStack);
  const [softwareDeliverable, setSoftwareDeliverable] = useState<"B" | "D">(
    apkEligible ? "B" : "D",
  );
  const [generateTestBuild, setGenerateTestBuild] = useState(apkEligible);
  const [softwareState, softwareAction, softwarePending] = useActionState(
    createSoftwareFromPlanningAction,
    null,
  );

  const refreshOrder = useCallback(async (): Promise<OrderPollPayload | null> => {
    const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as OrderPollPayload;
  }, [order.id]);

  const showPublishResult = useCallback(
    (payload: OrderPollPayload) => {
      awaitingPublishResultRef.current = false;
      setPublishNotice(
        buildRepublishNotice({
          githubUrl: payload.order.githubUrl,
          githubError: payload.order.githubError,
          vercelUrl: payload.order.vercelUrl,
          vercelError: payload.order.vercelError,
          includeFrontend: payload.order.includeFrontend,
          vercelConfigured,
        }),
      );
    },
    [vercelConfigured],
  );

  const syncPublishCompletion = useCallback(
    (payload: OrderPollPayload) => {
      if (publishJobActive(payload.jobs)) return;
      if (!awaitingPublishResultRef.current) return;
      showPublishResult(payload);
    },
    [showPublishResult],
  );

  useEffect(() => {
    setJobs(initialJobs);
    awaitingPublishResultRef.current = false;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`fabrica:publish-tracking:${order.id}`);
      sessionStorage.removeItem(`fabrica:delivery-dismissed:${order.id}`);
    }
  }, [initialJobs, order.id]);

  useEffect(() => {
    setOrder(initialOrder);
    if (initialOrder.githubError) {
      setPublishNotice(null);
    }
  }, [initialOrder]);

  useEffect(() => {
    setClientOrigin(window.location.origin);
  }, []);

  const shareOrigin = publicBaseUrl || suggestedLanOrigin || clientOrigin;

  const mockPath = `/api/mock/${order.id}/items`;
  const apkDownloadPathValue = apkAccessToken
    ? buildApkDownloadPath(order.id, apkAccessToken)
    : `/api/orders/${order.id}/apk`;
  const apkShareUrl = useMemo(
    () =>
      shareOrigin
        ? `${shareOrigin.replace(/\/$/, "")}${apkDownloadPathValue}`
        : apkDownloadPathValue,
    [shareOrigin, apkDownloadPathValue],
  );

  useEffect(() => {
    if (planning) return;
    void refreshOrder().then((data) => {
      if (!data) return;
      setJobs(data.jobs);
      setOrder(data.order);
      syncPublishCompletion(data);
    });
  }, [planning, refreshOrder, order.id, syncPublishCompletion]);

  const publishActive = publishJobActive(jobs);
  const apkActive = apkJobActive(jobs);

  useEffect(() => {
    if (planning) return;

    let cancelled = false;

    const poll = async () => {
      const data = await refreshOrder();
      if (!data || cancelled) return;

      const publishingNow = publishJobActive(data.jobs);
      const apkNow = apkJobActive(data.jobs);

      setJobs(data.jobs);
      setOrder(data.order);

      if (
        apkStarting &&
        !apkNow &&
        data.order.apkStatus !== "building" &&
        (data.order.apkStatus === "ready" || data.order.apkStatus === "failed")
      ) {
        setApkStarting(false);
      }

      if (!publishingNow) {
        syncPublishCompletion(data);
      }
    };

    const shouldPoll =
      publishActive ||
      isRepublishPending ||
      apkStarting ||
      apkActive ||
      order.apkStatus === "building";
    if (!shouldPoll) return;

    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    planning,
    refreshOrder,
    syncPublishCompletion,
    isRepublishPending,
    apkStarting,
    publishActive,
    apkActive,
    order.apkStatus,
  ]);

  useEffect(() => {
    if (planning || order.apkStatus !== "ready") {
      setApkQr("");
      return;
    }
    QRCode.toDataURL(apkShareUrl, {
      margin: 1,
      width: 180,
      color: { dark: "#1a120c", light: "#f4ece3" },
    }).then(setApkQr);
  }, [apkShareUrl, order.apkStatus, planning]);

  if (order.status !== "completed") return null;

  if (planning) {
    const handleRegenerate = (mode: "merge" | "template") => {
      setRegenNotice(null);
      setRegenerating(true);
      startRepublish(async () => {
        const result = await regeneratePlanningDocsAction(order.id, mode);
        setRegenerating(false);
        if (result.error) {
          setRegenNotice({ tone: "bad", text: result.error });
        } else {
          setRegenNotice({
            tone: "ok",
            text: `Documentação atualizada (${result.fileCount ?? 0} arquivos). Baixe o ZIP ou PDF novamente.`,
          });
        }
      });
    };

    return (
      <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <header className="space-y-1">
          <p className="font-mono text-xs tracking-[0.3em] text-copper">PLANEJAMENTO</p>
          <p className="text-sm text-on-tint">
            Documentação pronta para TI e gestão. Baixe, revise se precisar e avance para o
            software quando estiver alinhado.
          </p>
        </header>

        <div className="mt-6 space-y-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
              Passo 1 · Baixar
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ResourceLinkCard
                title="ZIP completo"
                description="PRD, backlog, arquitetura e planos técnicos — para a equipe de TI."
                href={`/api/orders/${order.id}/zip`}
                actionLabel="Baixar ZIP"
                internal
                primary
              />
              <ResourceLinkCard
                title="PDF para gestão"
                description="Resumo executivo sem jargão técnico — para stakeholders."
                href={`/api/orders/${order.id}/pdf`}
                actionLabel="Baixar PDF"
                internal
                primary
              />
            </div>
          </div>

          <div className="rounded-xl border border-copper/30 bg-accent-soft p-4 sm:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-copper-2">
              Passo 2 · Software
            </p>
            <h3 className="mt-1 text-base font-semibold text-ink">
              Gerar código a partir deste planejamento
            </h3>

            {order.derivedSoftwareOrderId ? (
              <div className="mt-4">
                <p className="text-sm text-on-tint">
                  Já existe um pedido de software vinculado a este planejamento.
                </p>
                <Link
                  href={`/pedidos/${order.derivedSoftwareOrderId}`}
                  className="mt-3 inline-flex rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-on-copper transition hover:brightness-110"
                >
                  Abrir pedido de software →
                </Link>
              </div>
            ) : (
            <form action={softwareAction} className="mt-4 space-y-4">
              <input type="hidden" name="planningOrderId" value={order.id} />
              <input type="hidden" name="deliverableType" value={softwareDeliverable} />

              <div className="flex flex-wrap gap-2">
                {SOFTWARE_FROM_PLANNING_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSoftwareDeliverable(opt.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      softwareDeliverable === opt.id
                        ? "border-copper bg-accent-surface font-medium text-ink ring-1 ring-copper/30"
                        : "border-line bg-panel text-muted hover:border-copper/40"
                    }`}
                  >
                    <span className="block font-medium">{opt.title}</span>
                  </button>
                ))}
              </div>

              {(() => {
                const selected = SOFTWARE_FROM_PLANNING_OPTIONS.find(
                  (o) => o.id === softwareDeliverable,
                );
                return selected ? (
                  <p className="text-xs leading-relaxed text-on-tint">{selected.description}</p>
                ) : null;
              })()}

              {apkEligible ? (
                <CheckboxCard
                  name="generateTestBuild"
                  checked={generateTestBuild}
                  onChange={setGenerateTestBuild}
                  compact
                  label="Gerar APK de demonstração para stakeholders"
                  description="Pré-marcado para mobile nativo. Requer token GitHub em Configurações. Desmarque se não quiser compilar APK."
                />
              ) : null}

              {softwareState?.error ? (
                <p className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
                  {softwareState.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={softwarePending}
                className="inline-flex items-center gap-2 rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110 disabled:opacity-60"
              >
                {softwarePending ? "Criando pedido…" : "Gerar software"}
              </button>
            </form>
            )}
          </div>

          {(editEligibility.allowed || canDuplicate) && (
            <p className="text-sm text-muted">
              Precisa ajustar requisitos?{" "}
              {editEligibility.allowed ? (
                <Link
                  href={`/pedidos/${order.id}/editar`}
                  className="text-copper-2 hover:underline"
                >
                  Editar planejamento
                </Link>
              ) : editEligibility.reason ? (
                <span className="text-steel">{editEligibility.reason}</span>
              ) : null}
              {canDuplicate && editEligibility.allowed ? " · " : null}
              {canDuplicate ? (
                <Link
                  href={`/pedidos/novo?duplicate=${order.id}`}
                  className="text-copper-2 hover:underline"
                >
                  Duplicar como novo pedido
                </Link>
              ) : null}
            </p>
          )}

          <CollapsiblePanel
            title="Mais opções"
            badge="opcional"
            hint="Manutenção da documentação e lista de arquivos do pacote."
          >
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-ink">Ajustar documentação</p>
                <p className="mt-1 text-xs leading-relaxed text-on-tint">
                  Só use se algum arquivo ficou incompleto.{" "}
                  <strong className="text-emphasis-inline">Regenerar</strong> mantém o texto
                  da IA; <strong className="text-emphasis-inline">Substituir pelo template</strong>{" "}
                  gera um esqueleto curto (demo).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={() => handleRegenerate("merge")}
                    className="inline-flex items-center gap-2 rounded-lg border border-copper/50 bg-accent-surface px-3 py-1.5 text-xs font-medium text-copper-2 transition hover:border-copper disabled:opacity-60"
                  >
                    {regenerating ? "Regenerando…" : "Regenerar documentação"}
                  </button>
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={() => handleRegenerate("template")}
                    className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-muted transition hover:border-copper/50 hover:text-ink disabled:opacity-60"
                  >
                    Substituir pelo template
                  </button>
                </div>
                {regenNotice ? (
                  <p
                    className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                      regenNotice.tone === "ok"
                        ? "border-ok/40 bg-ok/10 text-ok"
                        : "border-bad/40 bg-bad/10 text-bad"
                    }`}
                    role="status"
                  >
                    {regenNotice.text}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium text-ink">
                  Arquivos no ZIP ({PLANNING_DOCS.length})
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PLANNING_DOCS.map((doc) => (
                    <li
                      key={doc.path}
                      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-[10px] text-steel">{doc.path}</span>
                      <p className="text-xs text-ink">{doc.label}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CollapsiblePanel>
        </div>
      </section>
    );
  }

  const softwareFromPlanning = Boolean(order.sourcePlanningOrderId);

  const apkLabel: Record<string, string> = {
    idle: "Aguardando geração",
    building: "Compilando no GitHub Actions…",
    ready: "APK pronto",
    failed: "Falhou",
    skipped: "Não aplicável (PWA ou build desligado)",
  };

  const publishingRemote = publishJobActive(jobs);
  const republishButtonBusy = publishingRemote || isRepublishPending;
  const githubStatus = publishTargetStatus(
    publishingRemote,
    order.githubUrl,
    order.githubError,
  );
  const vercelStatus = publishTargetStatus(
    publishingRemote,
    order.vercelUrl,
    order.vercelError,
  );

  const handleRepublish = () => {
    setPublishNotice(null);
    awaitingPublishResultRef.current = true;
    startRepublish(async () => {
      await republishAction(order.id);
      const data = await refreshOrder();
      if (!data) return;
      setJobs(data.jobs);
      setOrder(data.order);
      syncPublishCompletion(data);
    });
  };

  const handleTriggerApk = () => {
    setApkStarting(true);
    startApkTrigger(async () => {
      await triggerApkAction(order.id);
    });
  };

  const apkBusy =
    apkStarting ||
    isApkPending ||
    order.apkStatus === "building" ||
    apkJobActive(jobs);
  const deliveryBusy =
    publishingRemote || apkBusy || isCancelPending;

  const stakeholderDemo = buildStakeholderDemoState({
    order,
    vercelConfigured,
    demoAccounts,
    publishing: publishingRemote,
    apkBusy,
  });

  const handleCancelDelivery = () => {
    setPublishNotice(null);
    awaitingPublishResultRef.current = false;
    setApkStarting(false);
    startCancelDelivery(async () => {
      const result = await cancelDeliveryAction(order.id);
      const data = await refreshOrder();
      if (data) {
        setOrder(data.order);
        setJobs(data.jobs);
      }
      if (result.error) {
        setPublishNotice({
          tone: "ok",
          text: "Estado da publicação resetado. Você pode tentar de novo.",
        });
        return;
      }
      setPublishNotice({
        tone: "ok",
        text: "Tarefas de publicação/build encerradas. Você pode tentar de novo quando quiser.",
      });
    });
  };
  const displayApkStatus =
    apkBusy && order.apkStatus !== "ready" ? "building" : order.apkStatus;
  const displayApkLabel =
    apkBusy && order.apkStatus !== "ready"
      ? order.apkStatus === "building"
        ? apkLabel.building
        : "Iniciando build…"
      : apkLabel[order.apkStatus];

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <header className="space-y-1">
        <p className="font-mono text-xs tracking-[0.3em] text-copper">ENTREGAS</p>
        <p className="text-sm text-muted">
          Baixe o pacote, publique no GitHub e teste o app gerado.
        </p>
      </header>

      {softwareFromPlanning && order.sourcePlanningOrderId ? (
        <p className="mt-4 rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 text-xs text-on-tint">
          Software gerado a partir do{" "}
          <Link
            href={`/pedidos/${order.sourcePlanningOrderId}`}
            className="text-copper-2 hover:underline"
          >
            planejamento aprovado
          </Link>
          . A esteira seguiu PRD, arquitetura e backlog da documentação.
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        {deliveryBusy ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-copper/35 bg-accent-surface/50 px-4 py-3">
            <p className="text-sm text-muted">
              Publicação no GitHub/Vercel ou build do APK em andamento — pode levar
              vários minutos.
            </p>
            <button
              type="button"
              onClick={handleCancelDelivery}
              disabled={isCancelPending}
              className="shrink-0 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink transition hover:border-bad/50 hover:text-bad disabled:opacity-60"
            >
              {isCancelPending ? "Encerrando…" : "Encerrar tarefas"}
            </button>
          </div>
        ) : null}

        <StakeholderDemoSection
          demo={stakeholderDemo}
          apkDownloadPath={apkDownloadPathValue}
          onOpenApk={handleTriggerApk}
          apkBusy={apkBusy}
        />

        <div>
          <SectionHeading
            title="Pacote gerado"
            hint="Código e documentação prontos para download."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ResourceLinkCard
              title="ZIP completo"
              description="Código, documentação e docker-compose (quando aplicável)."
              href={`/api/orders/${order.id}/zip`}
              actionLabel="Baixar ZIP"
              internal
            />
            {order.includeBackend ? (
              <ResourceLinkCard
                title="API mockada"
                description="Endpoints de exemplo para integrar o front-end."
                href={mockPath}
                actionLabel="Abrir API"
                internal
              />
            ) : (
              <div className={`${deliverableCardClass()} flex flex-col justify-between gap-4`}>
                <div>
                  <p className="font-medium text-ink">App no repositório</p>
                  <p className="mt-1 text-xs text-muted">
                    Abra a pasta <span className="font-mono">mobile/</span> no ZIP
                    ou clone o repo GitHub para rodar o app de verdade.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {order.apkStatus !== "skipped" ? (
          <div>
            <SectionHeading
              title="APK de teste"
              hint={apkSectionHint(order)}
            />
            <div className="mt-4 max-w-xl">
              <ApkDeliverableCard
                orderId={order.id}
                orderName={order.name}
                apkStatus={displayApkStatus}
                apkLabel={displayApkLabel}
                apkDownloadPath={apkDownloadPathValue}
                apkShareUrl={apkShareUrl}
                apkQr={apkQr}
                apkRunUrl={order.apkRunUrl}
                apkError={apkBusy ? null : order.apkError}
                githubUrl={order.githubUrl}
                apkBusy={apkBusy}
                onTriggerApk={handleTriggerApk}
              />
            </div>
          </div>
        ) : null}

        <RemotePublishSection
          githubStatus={githubStatus}
          githubUrl={order.githubUrl}
          githubError={order.githubError}
          vercelStatus={vercelStatus}
          vercelUrl={order.vercelUrl}
          vercelError={order.vercelError}
          showVercel={order.includeFrontend}
          vercelConfigured={vercelConfigured}
          publishing={publishingRemote}
          publishNotice={publishNotice}
          onRepublish={handleRepublish}
          disabled={republishButtonBusy}
          onCancel={deliveryBusy ? handleCancelDelivery : undefined}
          cancelPending={isCancelPending}
        />

        <DeliveryJobsHistory jobs={jobs} />
      </div>
    </section>
  );
}

function RemotePublishSection({
  githubStatus,
  githubUrl,
  githubError,
  vercelStatus,
  vercelUrl,
  vercelError,
  showVercel,
  vercelConfigured = false,
  publishing,
  publishNotice,
  onRepublish,
  disabled,
  onCancel,
  cancelPending = false,
}: {
  githubStatus: PublishTargetStatus;
  githubUrl: string | null;
  githubError: string | null;
  vercelStatus: PublishTargetStatus;
  vercelUrl: string | null;
  vercelError: string | null;
  showVercel: boolean;
  vercelConfigured?: boolean;
  publishing: boolean;
  publishNotice: { tone: "ok" | "bad"; text: string } | null;
  onRepublish: () => void;
  disabled: boolean;
  onCancel?: () => void;
  cancelPending?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">GitHub</p>
          <p className="text-xs text-muted">
            Repositório privado com o código gerado e workflow de APK.
          </p>
        </div>
        {publishing ? (
          <div className="flex items-center gap-2 text-xs text-copper-2">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-copper border-t-transparent"
              aria-hidden
            />
            Publicando…
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <PublishTargetCard
          name="Repositório"
          hint="Criado automaticamente na sua conta GitHub"
          status={githubStatus}
          url={githubUrl}
          error={githubError}
          idleHint="Cadastre o token em Configurações e clique em Republicar."
        />
      </div>

      {showVercel ? (
        <div className="mt-4">
          <PublishTargetCard
            name="Vercel"
            hint="Deploy opcional do front-end gerado"
            status={vercelStatus}
            url={vercelUrl}
            error={vercelError}
            idleHint="Cadastre o token da Vercel em Configurações e republica o pedido."
          />
        </div>
      ) : null}

      {publishNotice ? (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
            publishNotice.tone === "ok"
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-bad/40 bg-bad/10 text-bad"
          }`}
          role="status"
        >
          {publishNotice.text}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRepublish}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-xs font-medium text-ink transition hover:border-copper/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {publishing ? (
            <>
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-copper border-t-transparent"
                aria-hidden
              />
              Publicando…
            </>
          ) : showVercel && vercelConfigured ? (
            "Republicar no GitHub e na Vercel"
          ) : (
            "Republicar no GitHub"
          )}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelPending}
            className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-xs text-muted transition hover:border-bad/50 hover:text-bad disabled:opacity-60"
          >
            {cancelPending ? "Encerrando…" : "Encerrar"}
          </button>
        ) : null}
        {!publishing && !publishNotice ? (
          <p className="text-xs text-muted">
            Use após alterar o token ou reprocessar o pedido.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PublishTargetCard({
  name,
  hint,
  status,
  url,
  error,
  idleHint,
}: {
  name: string;
  hint: string;
  status: PublishTargetStatus;
  url: string | null;
  error: string | null;
  idleHint: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${publishStatusTone[status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{name}</p>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${publishStatusTone[status]}`}
        >
          {publishStatusLabel[status]}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-xs">
        {status === "publishing" ? (
          <p className="flex items-center gap-2 text-copper-2">
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-copper border-t-transparent"
              aria-hidden
            />
            Enviando arquivos…
          </p>
        ) : null}
        {url ? (
          <p>
            <a
              href={url}
              className="break-all text-copper hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {url}
            </a>
          </p>
        ) : null}
        {error ? (
          <p className="text-bad">
            {error}
            {/not found/i.test(error) ? (
              <span className="mt-1 block text-muted">
                Verifique em Configurações se o token GitHub tem permissão{" "}
                <strong className="text-emphasis-inline">repo</strong> (e{" "}
                <strong className="text-emphasis-inline">workflow</strong> para APK)
                na mesma conta do repositório.
              </span>
            ) : null}
          </p>
        ) : null}
        {status === "idle" && !url && !error ? (
          <p className="text-muted">{idleHint}</p>
        ) : null}
      </div>
    </div>
  );
}

function ApkDeliverableCard({
  orderId,
  orderName,
  apkStatus,
  apkLabel,
  apkDownloadPath,
  apkShareUrl,
  apkQr,
  apkRunUrl,
  apkError,
  githubUrl,
  apkBusy = false,
  onTriggerApk,
}: {
  orderId: string;
  orderName: string;
  apkStatus: string;
  apkLabel: string;
  apkDownloadPath: string;
  apkShareUrl: string;
  apkQr: string;
  apkRunUrl: string | null;
  apkError: string | null;
  githubUrl: string | null;
  apkBusy?: boolean;
  onTriggerApk: () => void;
}) {
  const apkDownloadFilename = `${orderName.replace(/[^a-z0-9-_]+/gi, "-")}-debug.zip`;
  const tone =
    apkStatus === "ready"
      ? "border-ok/40 bg-ok/10 text-ok"
      : apkStatus === "failed"
        ? "border-bad/40 bg-bad/10 text-bad"
        : apkStatus === "building"
          ? "border-copper/50 bg-accent-surface text-copper-2"
          : "border-line bg-panel text-steel";

  return (
    <div className={deliverableCardClass()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">APK de teste</p>
          <p className="mt-0.5 text-xs text-muted">
            Build debug via GitHub Actions — Flutter ou React Native.
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${tone}`}
        >
          {apkLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <QrFrame
          src={apkQr}
          alt="QR Code do APK"
          placeholder={
            apkStatus === "building" ? (
              <div className="flex flex-col items-center gap-2 text-xs text-copper-2">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-copper border-t-transparent" />
                Compilando…
              </div>
            ) : apkStatus === "ready" ? null : (
              <span className="px-3 text-center text-xs text-muted">
                QR disponível após o build
              </span>
            )
          }
        />
        <div className="min-w-0 flex-1 space-y-3">
          {apkStatus === "ready" ? (
            <>
              <UrlField label="Link para o celular (mesma Wi‑Fi)" url={apkShareUrl} />
              <div className="flex flex-wrap gap-2">
                <ActionLink href={apkDownloadPath} download={apkDownloadFilename}>
                  Baixar APK
                </ActionLink>
                <CopyButton value={apkShareUrl} />
              </div>
            </>
          ) : apkStatus === "building" ? (
            <p className="text-xs text-copper-2">
              O GitHub Actions está compilando. Isso pode levar alguns minutos.
            </p>
          ) : githubUrl ? (
            <div className="space-y-3">
              {apkStatus === "idle" ? (
                <p className="text-xs text-muted">
                  Após republicar no GitHub, gere o APK novamente. Links ou QR codes antigos deixam de
                  funcionar.
                </p>
              ) : null}
              <button
                type="button"
                onClick={onTriggerApk}
                disabled={apkBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-copper/50 bg-accent-surface px-4 py-2 text-xs font-medium text-copper-2 transition hover:border-copper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {apkBusy ? (
                  <>
                    <span
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-copper border-t-transparent"
                      aria-hidden
                    />
                    {apkStatus === "building"
                      ? "Compilando APK…"
                      : "Iniciando build…"}
                  </>
                ) : apkStatus === "failed" ? (
                  "Tentar gerar APK novamente"
                ) : (
                  "Gerar APK de teste"
                )}
              </button>
              {apkBusy ? (
                <p className="text-xs text-copper-2" role="status" aria-live="polite">
                  Build em andamento no GitHub Actions — Flutter costuma levar{" "}
                  <strong className="font-normal text-copper-2">5 a 12 minutos</strong>.
                  Esta página atualiza sozinha.
                </p>
              ) : null}
              {apkRunUrl ? (
                <ActionLink href={apkRunUrl} external>
                  Ver progresso no GitHub Actions
                </ActionLink>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted">
              Publique no GitHub antes de gerar o APK.
            </p>
          )}
          {apkRunUrl ? (
            <ActionLink href={apkRunUrl} external>
              {apkStatus === "building"
                ? "Ver progresso no GitHub Actions"
                : "Ver workflow no GitHub"}
            </ActionLink>
          ) : null}
          {apkError ? (
            <div className="space-y-2">
              <p className="text-xs text-bad">{apkError}</p>
              {/timeout/i.test(apkError) && githubUrl ? (
                <ActionLink
                  href={`${githubUrl.replace(/\/$/, "")}/actions/workflows/android-debug.yml`}
                  external
                >
                  Abrir GitHub Actions
                </ActionLink>
              ) : null}
              {/republicar/i.test(apkError) ? (
                <p className="text-xs text-on-tint">
                  Passo a passo: (1) role até <strong className="text-emphasis-inline">GitHub</strong>{" "}
                  abaixo → clique em <strong className="text-emphasis-inline">Republicar no GitHub</strong>;
                  (2) aguarde “Publicado”; (3) clique aqui em{" "}
                  <strong className="text-emphasis-inline">Tentar gerar APK novamente</strong>.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CollapsiblePanel({
  title,
  badge,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-line bg-bg-2"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{title}</p>
          {hint ? <p className="mt-0.5 text-xs text-on-tint">{hint}</p> : null}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="badge-neutral">
              {badge}
            </span>
          ) : null}
          <span
            className="text-steel transition group-open:rotate-180"
            aria-hidden
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function ResourceLinkCard({
  title,
  description,
  href,
  actionLabel,
  internal = false,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  internal?: boolean;
  primary?: boolean;
}) {
  return (
    <div
      className={`${deliverableCardClass(primary)} flex flex-col justify-between gap-4`}
    >
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
        {!internal ? (
          <p
            className="mt-3 truncate font-mono text-[11px] text-steel"
            title={href}
          >
            {shortenUrl(href, 48)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionLink href={href} external={!internal} download={internal} primary={primary}>
          {actionLabel}
        </ActionLink>
        {!internal ? <CopyButton value={href} /> : null}
      </div>
    </div>
  );
}

function QrFrame({
  src,
  alt,
  placeholder,
}: {
  src: string;
  alt: string;
  placeholder?: React.ReactNode;
}) {
  return (
    <div className="mx-auto shrink-0 sm:mx-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-[148px] w-[148px] rounded-xl border border-line bg-white p-1.5"
        />
      ) : (
        <div className="flex h-[148px] w-[148px] items-center justify-center rounded-xl border border-dashed border-line bg-panel">
          {placeholder ?? <span className="text-xs text-muted">Gerando QR…</span>}
        </div>
      )}
    </div>
  );
}

function UrlField({
  label,
  url,
  muted = false,
}: {
  label: string;
  url: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-steel">
        {label}
      </p>
      <p
        className={`truncate font-mono text-xs ${muted ? "text-muted" : "text-ink"}`}
        title={url}
      >
        {shortenUrl(url, 52)}
      </p>
    </div>
  );
}

function ActionLink({
  href,
  children,
  external = false,
  download = false,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  download?: boolean | string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        primary
          ? "border-copper/50 bg-accent-surface text-copper-2 hover:border-copper hover:brightness-110"
          : "border-line bg-panel text-ink hover:border-copper/50 hover:text-copper-2"
      }`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...(download ? { download: true } : {})}
    >
      {children}
    </a>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-muted transition hover:border-copper/50 hover:text-ink"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
