"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
} from "@/app/actions/users";
import {
  ROLE_LABELS,
  RoleBadge,
  UserAvatar,
} from "@/components/user-display";
import { fieldClass, selectClass } from "@/components/FormControls";
import type { SessionUser, UserRecord, UserRole } from "@/lib/store";

type RoleFilter = "all" | UserRole;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function UserRow({
  user,
  isSelf,
}: {
  user: UserRecord;
  isSelf: boolean;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleUserActiveAction,
    null,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPasswordAction,
    null,
  );
  const [showReset, setShowReset] = useState(false);

  return (
    <li
      className={`rounded-xl border p-4 transition ${
        isSelf
          ? "border-copper/40 bg-accent-surface/60"
          : "border-line bg-bg-2/30 hover:border-copper/30"
      } ${!user.active ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-4">
        <UserAvatar name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{user.name}</p>
            {isSelf ? (
              <span className="rounded-full bg-copper/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-copper-2">
                você
              </span>
            ) : null}
            {!user.active ? (
              <span className="rounded-full border border-bad/40 bg-bad/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-bad">
                inativo
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            Desde {formatWhen(user.createdAt)}
          </p>
        </div>
        <RoleBadge role={user.role} />
      </div>

      {!isSelf ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
          <form action={toggleAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="active"
              value={user.active ? "false" : "true"}
            />
            <button
              type="submit"
              disabled={togglePending}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:border-copper/40 disabled:opacity-60"
            >
              {togglePending
                ? "Salvando…"
                : user.active
                  ? "Desativar"
                  : "Reativar"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowReset((current) => !current)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:border-copper/40"
          >
            {showReset ? "Cancelar senha" : "Nova senha"}
          </button>
          {toggleState?.error ? (
            <p className="w-full text-xs text-bad">{toggleState.error}</p>
          ) : null}
          {toggleState?.ok ? (
            <p className="w-full text-xs text-ok">Status atualizado.</p>
          ) : null}
        </div>
      ) : null}

      {!isSelf && showReset ? (
        <form action={resetAction} className="mt-3 space-y-2 border-t border-line/70 pt-3">
          <input type="hidden" name="userId" value={user.id} />
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Senha nova para {user.name}</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className={fieldClass}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <button
            type="submit"
            disabled={resetPending}
            className="rounded-lg bg-copper px-3 py-1.5 text-xs font-semibold text-on-copper disabled:opacity-60"
          >
            {resetPending ? "Salvando…" : "Redefinir senha"}
          </button>
          {resetState?.error ? (
            <p className="text-xs text-bad">{resetState.error}</p>
          ) : null}
          {resetState?.ok ? (
            <p className="text-xs text-ok">Senha redefinida.</p>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}

export function UsersPanel({
  users,
  currentUser,
}: {
  users: UserRecord[];
  currentUser: SessionUser;
}) {
  const [state, action, pending] = useActionState(createUserAction, null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin" && u.active).length;
    const members = users.filter((u) => u.role === "member" && u.active).length;
    return { total: users.length, admins, members };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!normalized) return true;
      return (
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized)
      );
    });
  }, [users, roleFilter, query]);

  const othersCount = users.filter((u) => u.id !== currentUser.id).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Total
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-copper/30 bg-accent-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Administradores
          </p>
          <p className="mt-1 text-2xl font-semibold text-copper-2">
            {stats.admins}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Membros
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{stats.members}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Equipe</h2>
              <p className="mt-1 text-sm text-muted">
                {othersCount === 0
                  ? "Só você por enquanto. Convide colegas no painel ao lado."
                  : `${users.length} cadastro${users.length === 1 ? "" : "s"} na fábrica.`}
              </p>
            </div>
            {users.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Todos"],
                    ["admin", "Admins"],
                    ["member", "Membros"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRoleFilter(key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      roleFilter === key
                        ? "border-copper/50 bg-accent-surface text-copper-2"
                        : "border-line bg-bg-2 text-steel hover:border-copper/30 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {users.length > 3 ? (
            <label className="mt-4 block">
              <span className="sr-only">Buscar usuário</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail…"
                className={`${fieldClass} mt-0`}
              />
            </label>
          ) : null}

          <ul className="mt-4 space-y-3">
            {filteredUsers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Nenhum usuário corresponde ao filtro.
              </li>
            ) : (
              filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUser.id}
                />
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold text-ink">Convidar</h2>
          <p className="mt-1 text-sm text-muted">
            Membros veem só os próprios pedidos. Admins acessam tudo.
          </p>

          <form action={action} className="mt-5 space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-ink">Nome</span>
              <input name="name" required className={fieldClass} />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-ink">E-mail</span>
              <input
                type="email"
                name="email"
                required
                className={fieldClass}
                placeholder="colega@empresa.com"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-ink">Senha inicial</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className={fieldClass}
                placeholder="Mínimo 6 caracteres"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-ink">Papel</span>
              <select name="role" defaultValue="member" className={selectClass}>
                <option value="member">
                  {ROLE_LABELS.member} — só seus pedidos
                </option>
                <option value="admin">
                  {ROLE_LABELS.admin} — acesso total
                </option>
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-on-copper transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Criando…" : "Criar usuário"}
            </button>
            {state?.ok ? (
              <p className="rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-sm text-ok">
                Usuário criado com sucesso.
              </p>
            ) : null}
            {state?.error ? (
              <p className="rounded-lg border border-bad/40 bg-bad/5 px-3 py-2 text-sm text-bad">
                {state.error}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}
