"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="max-w-lg rounded-2xl border border-bad/40 bg-bad/5 p-8 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-bad">ERRO</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted">
          Não foi possível carregar esta página. Tente novamente ou volte aos
          projetos.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-on-copper"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="rounded-lg border border-line px-5 py-2.5 text-sm text-ink transition hover:border-copper/40"
          >
            Ir para Projetos
          </Link>
        </div>
      </div>
    </div>
  );
}
