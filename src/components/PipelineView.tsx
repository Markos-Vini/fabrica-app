"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AGENT_CATALOG, agentDisplayForScope } from "@/lib/agents/catalog";
import {
  archiveOrderAction,
  cancelPipelineAction,
  deleteOrderAction,
  repairSoftwareDeliveryAction,
  rerunPipelineAction,
  unarchiveOrderAction,
} from "@/app/actions/orders";
import { DeliverablesPanel } from "@/components/DeliverablesPanel";
import { InfoTip } from "@/components/InfoTip";
import { ORDER_KIND_LABEL } from "@/lib/factory-mode";
import { scopeLayersLabel } from "@/lib/order-scope";
import { mergeOrder, mergeRuns, pipelineProgress } from "@/lib/pipeline-state";
import type { DemoAccount } from "@/lib/delivery/demo-accounts";
import type { JobRecord } from "@/lib/jobs/types";
import type { AgentRunRecord, OrderRecord } from "@/lib/store";

type PipelineTab = "entregas" | "esteira" | "tecnico";

const runTone: Record<string, string> = {
  pending: "border-line text-steel",
  running: "border-copper text-copper-2 shadow-[0_0_24px_rgba(212,137,74,0.15)]",
  completed: "border-ok/50 text-ok",
  failed: "border-bad text-bad",
  skipped: "border-line text-steel/50",
};

const runLabel: Record<string, string> = {
  pending: "Aguardando",
  running: "Trabalhando",
  completed: "Concluído",
  failed: "Falhou",
  skipped: "Pulado",
};

function formatElapsed(startedAt: string | null, now: number): string {
  if (!startedAt) return "";
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem.toString().padStart(2, "0")}s`;
}

function defaultTab(order: OrderRecord): PipelineTab {
  if (order.status === "completed") return "entregas";
  return "esteira";
}

export function PipelineView({
  orderId,
  initialOrder,
  initialRuns,
  derivedSoftware = null,
  publicBaseUrl,
  suggestedLanOrigin = "",
  projectId = null,
  apkAccessToken = "",
  vercelConfigured = false,
  initialJobs = [],
  demoAccounts = [],
}: {
  orderId: string;
  initialOrder: OrderRecord;
  initialRuns: AgentRunRecord[];
  derivedSoftware?: OrderRecord | null;
  publicBaseUrl: string;
  suggestedLanOrigin?: string;
  projectId?: string | null;
  apkAccessToken?: string;
  vercelConfigured?: boolean;
  initialJobs?: JobRecord[];
  demoAccounts?: DemoAccount[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [runs, setRuns] = useState(initialRuns);
  const [syncing, setSyncing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [tab, setTab] = useState<PipelineTab>(() => defaultTab(initialOrder));
  const prevStatusRef = useRef(initialOrder.status);
  const [actionNotice, setActionNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);
  const [actionPending, startAction] = useTransition();
  const router = useRouter();

  const inProgress = order.status === "running" || order.status === "queued";
  const progress = useMemo(() => pipelineProgress(runs), [runs]);
  const activeAgentMeta = order.currentAgent
    ? agentDisplayForScope(order.currentAgent, order, order)
    : null;
  const activeRun = runs.find((r) => r.agent === order.currentAgent);
  const logs = runs.filter((r) => r.outputText);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        order: OrderRecord;
        runs: AgentRunRecord[];
      };
      setOrder((prev) => mergeOrder(prev, data.order));
      setRuns((prev) => mergeRuns(prev, data.runs));
    } finally {
      setSyncing(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (prevStatusRef.current !== "completed" && order.status === "completed") {
      setTab("entregas");
      void refresh();
    }
    prevStatusRef.current = order.status;
  }, [order.status, refresh]);

  useEffect(() => {
    if (!inProgress) return;
    void refresh();
    const poll = setInterval(() => void refresh(), 1500);
    return () => clearInterval(poll);
  }, [inProgress, refresh]);

  useEffect(() => {
    if (!inProgress) return;
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [inProgress]);

  const done = order.status === "completed";
  const failed = order.status === "failed";
  const canRepairSoftware = failed && order.orderKind !== "planning";

  const runAction = (task: () => Promise<{ ok?: boolean; error?: string }>) => {
    setActionNotice(null);
    startAction(async () => {
      const result = await task();
      if (result.error) {
        setActionNotice({ tone: "bad", text: result.error });
        return;
      }
      if (result.ok) {
        setActionNotice({ tone: "ok", text: "Ação concluída." });
        await refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {order.archived ? (
        <p className="rounded-lg border border-line bg-bg-2 px-4 py-3 text-sm text-muted">
          Este pedido está <span className="font-medium text-ink">arquivado</span> e oculto
          da lista principal.
        </p>
      ) : null}

      {failed ? (
        <section className="rounded-2xl border border-bad/40 bg-bad/5 p-5">
          <h2 className="text-sm font-semibold text-bad">Esteira interrompida</h2>
          <p className="mt-1 text-sm text-muted">
            {order.errorMessage ??
              "Algo falhou durante a produção. Tente recuperar os arquivos ou reprocessar."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canRepairSoftware ? (
              <button
                type="button"
                disabled={actionPending}
                onClick={() =>
                  runAction(async () => repairSoftwareDeliveryAction(orderId))
                }
                className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-on-copper disabled:opacity-60"
              >
                Recuperar arquivos e finalizar
              </button>
            ) : null}
            <button
              type="button"
              disabled={actionPending}
              onClick={() =>
                runAction(async () => {
                  const result = await rerunPipelineAction(orderId);
                  if (result.ok) setTab("esteira");
                  return result;
                })
              }
              className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-ink transition hover:border-copper/40 disabled:opacity-60"
            >
              Reprocessar esteira inteira
            </button>
          </div>
        </section>
      ) : null}

      {inProgress ? (
        <section className="rounded-2xl border border-copper/30 bg-accent-surface/40 p-5">
          <h2 className="text-sm font-semibold text-ink">Pedido em andamento</h2>
          <p className="mt-1 text-sm text-muted">
            A esteira está na fila ou em produção. Você pode cancelar se criou por engano.
          </p>
          <button
            type="button"
            disabled={actionPending}
            onClick={() => runAction(async () => cancelPipelineAction(orderId))}
            className="mt-4 rounded-lg border border-bad/40 px-4 py-2 text-sm font-medium text-bad transition hover:bg-bad/5 disabled:opacity-60"
          >
            Cancelar pedido
          </button>
        </section>
      ) : null}

      {actionNotice ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            actionNotice.tone === "ok"
              ? "border-ok/40 bg-ok/5 text-ok"
              : "border-bad/40 bg-bad/5 text-bad"
          }`}
        >
          {actionNotice.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-copper">ESTEIRA</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{order.name}</h1>
            <StatusPill order={order} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {order.scopePreset ? `${order.scopePreset} · ` : ""}
            {scopeLayersLabel({
              includeMobile: order.includeMobile,
              includeFrontend: order.includeFrontend,
              includeBackend: order.includeBackend,
              includeDatabase: order.includeDatabase,
              includeAuth: order.includeAuth,
              includeAdmin: order.includeAdmin,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {projectId ? (
              <Link href={`/projetos/${projectId}`} className="text-copper-2 hover:underline">
                Ver projeto →
              </Link>
            ) : null}
            {order.status === "queued" ? (
              <span className="text-steel">
                Na fila — retoma automaticamente após restart do servidor
              </span>
            ) : null}
          </div>
        </div>

        <OrderLifecycleMenu
          order={order}
          disabled={actionPending}
          onArchive={() => runAction(async () => archiveOrderAction(orderId))}
          onUnarchive={() => runAction(async () => unarchiveOrderAction(orderId))}
          onDelete={async () => {
            setActionNotice(null);
            startAction(async () => {
              const result = await deleteOrderAction(orderId);
              if (result.error) {
                setActionNotice({ tone: "bad", text: result.error });
                return;
              }
              router.push("/");
            });
          }}
        />
      </div>

      {failed ? (
        <p className="rounded-lg border border-bad/40 bg-accent-bad px-4 py-3 text-sm text-bad">
          {order.errorMessage ?? "A esteira falhou. Veja a aba Esteira ou o log técnico."}
        </p>
      ) : null}

      {inProgress ? (
        <div
          className="rounded-xl border border-copper/40 bg-accent-surface px-4 py-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="mt-0.5 inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-copper border-t-transparent"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-copper-2">
                  {order.status === "queued" ? "Esteira na fila" : "Esteira em andamento"}
                </p>
                <p className="mt-1 text-xs text-on-tint">
                  {order.status === "queued"
                    ? "Aguardando o worker iniciar o processamento…"
                    : activeAgentMeta
                      ? `${activeAgentMeta.name} — ${activeAgentMeta.role}`
                      : "Preparando próximo agente…"}
                  {activeRun?.startedAt
                    ? ` · ${formatElapsed(activeRun.startedAt, clock)} nesta etapa`
                    : null}
                  {syncing ? " · sincronizando" : null}
                </p>
              </div>
              <div>
                <div className="mb-1 flex justify-between font-mono text-[11px] text-steel">
                  <span>
                    {progress.completed}/{progress.total} etapas concluídas
                  </span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-2">
                  <div
                    className="h-full rounded-full bg-copper transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(progress.percent, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="flex gap-1 border-b border-line">
        <TabButton
          active={tab === "entregas"}
          onClick={() => setTab("entregas")}
          disabled={!done}
          label="Entregas"
          hint={done ? undefined : "Disponível ao concluir"}
        />
        <TabButton active={tab === "esteira"} onClick={() => setTab("esteira")} label="Esteira" />
        <TabButton
          active={tab === "tecnico"}
          onClick={() => setTab("tecnico")}
          label="Log técnico"
          hint={logs.length > 0 ? String(logs.length) : undefined}
        />
      </nav>

      {tab === "entregas" ? (
        done ? (
          <DeliverablesPanel
            order={order}
            derivedSoftware={derivedSoftware}
            publicBaseUrl={publicBaseUrl}
            suggestedLanOrigin={suggestedLanOrigin}
            apkAccessToken={apkAccessToken}
            vercelConfigured={vercelConfigured}
            initialJobs={initialJobs}
            demoAccounts={demoAccounts}
          />
        ) : (
          <EmptyPanel message="As entregas aparecem aqui quando a esteira concluir." />
        )
      ) : null}

      {tab === "esteira" ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            Cada agente da fábrica executa uma etapa. O resultado final vai para os arquivos
            do ZIP — não é necessário ler o log bruto no dia a dia.
          </p>
          <ol className="grid gap-3 md:grid-cols-3">
            {AGENT_CATALOG.map((agent) => {
              const run = runs.find((r) => r.agent === agent.id);
              const status = run?.status ?? "pending";
              const display = agentDisplayForScope(agent.id, order, order);
              const isActive = order.currentAgent === agent.id && status === "running";
              return (
                <li
                  key={agent.id}
                  className={`rounded-xl border bg-panel p-4 ${runTone[status]}`}
                >
                  <p className="font-mono text-xs">
                    {runLabel[status]}
                    {isActive ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-copper-2">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-copper" />
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{display.name}</p>
                    <InfoTip
                      text={agent.help}
                      ariaLabel={`O que faz o agente ${display.name}`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{display.role}</p>
                  {run?.model ? (
                    <p className="mt-2 font-mono text-[11px] text-steel">{run.model}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {inProgress && activeAgentMeta && !activeRun?.outputText ? (
            <div className="rounded-xl border border-dashed border-copper/30 bg-bg-2 px-4 py-6 text-center">
              <p className="font-mono text-xs text-copper">{activeAgentMeta.name}</p>
              <p className="mt-2 text-sm text-muted">
                Gerando saída — pode levar alguns minutos com modelos reais…
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "tecnico" ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-line bg-bg-2 px-4 py-3 text-sm text-on-tint">
            <p className="font-medium text-ink">O que é esta seção?</p>
            <p className="mt-1 leading-relaxed">
              Texto bruto que cada agente (PM, Arquiteto, etc.) produziu durante a esteira.
              O material útil já está nos arquivos do{" "}
              <strong className="text-emphasis-inline">ZIP</strong> (PRD, backlog, planos).
              Use o log técnico só para depuração ou para entender o que a IA gerou antes de
              montar os documentos.
            </p>
          </div>

          {logs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-panel/50 px-4 py-8 text-center text-sm text-muted">
              {inProgress
                ? "Aguardando saída dos agentes…"
                : "Nenhuma saída de agente registrada."}
            </p>
          ) : (
            logs.map((run) => (
              <details
                key={run.id}
                className="group rounded-xl border border-line bg-panel"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-xs text-copper">
                    {agentDisplayForScope(run.agent, order, order).name}
                  </span>
                  <span className="text-xs text-steel transition group-open:rotate-180">▾</span>
                </summary>
                <div className="border-t border-line px-4 py-3">
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">
                    {run.outputText}
                  </pre>
                </div>
              </details>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}

function StatusPill({ order }: { order: OrderRecord }) {
  const kindTone =
    order.orderKind === "planning"
      ? "border-sky-400/35 bg-sky-950/40 text-sky-300 light:border-sky-400/50 light:bg-sky-100 light:text-sky-800"
      : "border-copper/40 bg-accent-surface text-copper-2";

  const statusTone: Record<OrderRecord["status"], string> = {
    queued: "border-line bg-bg-2 text-steel",
    running: "border-copper/40 bg-accent-surface text-copper-2",
    completed: "border-ok/40 bg-ok/5 text-ok",
    failed: "border-bad/40 bg-bad/5 text-bad",
  };

  const statusLabel: Record<OrderRecord["status"], string> = {
    queued: "Na fila",
    running: "Em produção",
    completed: "Concluído",
    failed: "Falhou",
  };

  return (
    <>
      <span
        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${kindTone}`}
      >
        {ORDER_KIND_LABEL[order.orderKind ?? "software"]}
      </span>
      <span
        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusTone[order.status]}`}
      >
        {statusLabel[order.status]}
      </span>
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  hint,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition ${
        active
          ? "border-copper font-medium text-ink"
          : disabled
            ? "cursor-not-allowed border-transparent text-steel/50"
            : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
      {hint ? (
        <span className="rounded-full bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-steel">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function OrderLifecycleMenu({
  order,
  disabled,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  order: OrderRecord;
  disabled: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const canArchive =
    !order.archived && order.status !== "running" && order.status !== "queued";

  return (
    <details className="group relative shrink-0">
      <summary className="cursor-pointer list-none rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-copper/40 hover:text-ink [&::-webkit-details-marker]:hidden">
        Gerenciar pedido ▾
      </summary>
      <div className="absolute right-0 z-10 mt-2 min-w-[220px] rounded-xl border border-line bg-panel p-2 shadow-lg">
        {canArchive ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onArchive}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink transition hover:bg-bg-2 disabled:opacity-60"
          >
            Arquivar pedido
          </button>
        ) : null}
        {order.archived ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onUnarchive}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink transition hover:bg-bg-2 disabled:opacity-60"
          >
            Restaurar do arquivo
          </button>
        ) : null}
        {order.archived ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-bad transition hover:bg-bad/5 disabled:opacity-60"
          >
            Excluir permanentemente
          </button>
        ) : null}
      </div>
    </details>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/50 px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}
