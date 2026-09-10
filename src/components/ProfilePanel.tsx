"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction } from "@/app/actions/profile";
import { fieldClass } from "@/components/FormControls";
import { CurrentUserCard } from "@/components/user-display";
import type { SessionUser } from "@/lib/store";

export function ProfilePanel({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState(changeOwnPasswordAction, null);

  return (
    <div className="space-y-8">
      <CurrentUserCard user={user} title="Minha conta" />

      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-lg font-semibold text-ink">Alterar senha</h2>
        <p className="mt-1 text-sm text-muted">
          Use uma senha com pelo menos 6 caracteres. Você precisará entrar de
          novo em outros dispositivos.
        </p>

        <form action={action} className="mt-6 max-w-md space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-xs text-steel">
              Senha atual
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-xs text-steel">
              Nova senha
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-xs text-steel">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
            />
          </div>

          {state?.error ? (
            <p className="rounded-lg border border-bad/40 bg-bad/5 px-3 py-2 text-sm text-bad">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-sm text-ok">
              Senha alterada com sucesso.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-on-copper disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </div>
  );
}
