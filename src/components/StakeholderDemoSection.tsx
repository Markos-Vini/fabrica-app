"use client";

import type { StakeholderDemoState } from "@/lib/delivery/stakeholder-demo";

function DemoAccountsList({
  accounts,
}: {
  accounts: StakeholderDemoState["accounts"];
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted">
        Credenciais demo no pacote: <span className="font-mono">docs/DEMO-ACCOUNTS.md</span>
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-xs text-on-tint">
      {accounts.map((account) => (
        <li key={account.email}>
          <span className="font-medium text-ink">{account.role}:</span>{" "}
          <span className="font-mono">{account.email}</span> /{" "}
          <span className="font-mono">{account.password}</span>
        </li>
      ))}
    </ul>
  );
}

export function StakeholderDemoSection({
  demo,
  apkDownloadPath,
  onOpenApk,
  apkBusy,
}: {
  demo: StakeholderDemoState;
  apkDownloadPath?: string;
  onOpenApk?: () => void;
  apkBusy?: boolean;
}) {
  if (!demo.showSection) return null;

  return (
    <div className="rounded-xl border border-copper/40 bg-accent-surface/40 p-4 sm:p-5">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-copper">
          Demonstração
        </p>
        <p className="text-sm font-medium text-ink">
          Ver como ficou — sem clonar repositório
        </p>
        <p className="text-xs text-muted">
          Links para gestores e stakeholders testarem web e mobile com contas demo.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {demo.web.available || demo.web.hint ? (
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-sm font-medium text-ink">Web</p>
            <p className="mt-0.5 text-xs text-muted">
              Painel no ar — mock API, sem back-end local.
            </p>
            {demo.web.available && demo.web.url ? (
              <a
                href={demo.web.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-copper px-4 py-2 text-xs font-semibold text-on-copper transition hover:brightness-110"
              >
                Abrir demo na Vercel
              </a>
            ) : demo.web.pending ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-copper-2">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-copper border-t-transparent"
                  aria-hidden
                />
                Publicando…
              </p>
            ) : demo.web.hint ? (
              <p className="mt-3 text-xs text-muted">{demo.web.hint}</p>
            ) : null}
          </div>
        ) : null}

        {!demo.mobile.skipped ? (
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-sm font-medium text-ink">Mobile</p>
            <p className="mt-0.5 text-xs text-muted">
              APK debug para instalar e testar login no celular.
            </p>
            {demo.mobile.available && apkDownloadPath ? (
              <a
                href={apkDownloadPath}
                download
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-copper/50 bg-accent-surface px-4 py-2 text-xs font-medium text-copper-2 transition hover:border-copper"
              >
                Baixar APK de demo
              </a>
            ) : demo.mobile.status === "building" || apkBusy ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-copper-2">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-copper border-t-transparent"
                  aria-hidden
                />
                Compilando APK…
              </p>
            ) : demo.mobile.canTrigger && onOpenApk ? (
              <button
                type="button"
                onClick={onOpenApk}
                disabled={apkBusy}
                className="mt-3 inline-flex rounded-lg border border-copper/50 bg-accent-surface px-4 py-2 text-xs font-medium text-copper-2 transition hover:border-copper disabled:opacity-60"
              >
                Gerar APK de demo
              </button>
            ) : demo.mobile.hint ? (
              <p className="mt-3 text-xs text-muted">{demo.mobile.hint}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-line/80 bg-bg-2 px-3 py-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-steel">
          Contas demo
        </p>
        <div className="mt-2">
          <DemoAccountsList accounts={demo.accounts} />
        </div>
      </div>
    </div>
  );
}
