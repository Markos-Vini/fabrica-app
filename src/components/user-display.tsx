import type { SessionUser, UserRecord, UserRole } from "@/lib/store";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  member: "Membro",
};

export function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        isAdmin
          ? "bg-copper/20 text-copper-2 ring-1 ring-copper/30"
          : "bg-bg text-steel ring-1 ring-line"
      }`}
    >
      {isAdmin ? "Admin" : "Membro"}
    </span>
  );
}

export function UserAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-copper/15 text-sm font-semibold text-copper-2 ring-1 ring-copper/25"
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function CurrentUserCard({
  user,
  title = "Minha conta",
}: {
  user: SessionUser | UserRecord;
  title?: string;
}) {
  return (
    <section className="rounded-2xl border border-copper/30 bg-accent-surface p-6">
      <div className="flex flex-wrap items-start gap-4">
        <UserAvatar name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <RoleBadge role={user.role} />
          </div>
          <p className="mt-1 text-sm text-muted">
            Você está autenticado nesta sessão com as permissões abaixo.
          </p>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line/60 bg-bg-2/50 px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Nome
          </dt>
          <dd className="mt-1 text-sm font-medium text-ink">{user.name}</dd>
        </div>
        <div className="rounded-lg border border-line/60 bg-bg-2/50 px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-steel">
            E-mail
          </dt>
          <dd className="mt-1 text-sm text-ink">{user.email}</dd>
        </div>
        <div className="rounded-lg border border-line/60 bg-bg-2/50 px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Papel
          </dt>
          <dd className="mt-1 text-sm text-ink">{ROLE_LABELS[user.role]}</dd>
        </div>
        <div className="rounded-lg border border-line/60 bg-bg-2/50 px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Permissões
          </dt>
          <dd className="mt-1 text-sm text-muted">
            {user.role === "admin"
              ? "Configurações, usuários e todos os pedidos."
              : "Apenas seus próprios pedidos."}
          </dd>
        </div>
      </dl>
    </section>
  );
}
