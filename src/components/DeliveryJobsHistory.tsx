import type { JobRecord } from "@/lib/jobs/types";

const typeLabel: Record<JobRecord["type"], string> = {
  publish: "Publicação GitHub/Vercel",
  apk: "Build APK",
  pipeline: "Esteira de agentes",
};

const statusLabel: Record<JobRecord["status"], string> = {
  pending: "Na fila",
  running: "Em execução",
  completed: "Concluído",
  failed: "Falhou",
};

const statusTone: Record<JobRecord["status"], string> = {
  pending: "border-line text-steel",
  running: "border-copper/50 text-copper-2",
  completed: "border-ok/40 text-ok",
  failed: "border-bad/40 text-bad",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DeliveryJobsHistory({ jobs }: { jobs: JobRecord[] }) {
  const deliveryJobs = jobs
    .filter((job) => job.type === "publish" || job.type === "apk")
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (deliveryJobs.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Histórico de publicação</p>
        <p className="text-xs text-muted">
          Jobs de GitHub, Vercel e APK — útil para diagnosticar falhas.
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {deliveryJobs.map((job) => (
          <li
            key={job.id}
            className="rounded-lg border border-line bg-panel px-3 py-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">{typeLabel[job.type]}</span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${statusTone[job.status]}`}
              >
                {statusLabel[job.status]}
              </span>
            </div>
            <p className="mt-1 text-muted">
              Criado {formatWhen(job.createdAt)}
              {job.finishedAt ? ` · Finalizado ${formatWhen(job.finishedAt)}` : null}
            </p>
            {job.errorMessage ? (
              <p className="mt-1.5 rounded border border-bad/30 bg-bad/5 px-2 py-1 text-bad">
                {job.errorMessage}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
