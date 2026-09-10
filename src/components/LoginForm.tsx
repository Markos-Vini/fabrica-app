"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { fieldClass } from "@/components/FormControls";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-5">
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-ink">E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoFocus
          defaultValue="admin@fabrica.local"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-ink">Senha</span>
        <input
          type="password"
          name="password"
          required
          className={fieldClass}
        />
      </label>
      {state?.error ? <p className="text-sm text-bad">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-copper px-4 py-2.5 text-sm font-semibold text-on-copper transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar na fábrica"}
      </button>
    </form>
  );
}
