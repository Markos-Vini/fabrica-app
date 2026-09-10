import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/user-display";
import { BRAND_HEADER } from "@/lib/brand";
import type { SessionUser } from "@/lib/store";

export function AppShell({
  children,
  mockMode,
  user,
}: {
  children: React.ReactNode;
  mockMode?: boolean;
  user: SessionUser;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-bg/95 shadow-[0_8px_24px_var(--header-shadow)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-mono text-xs tracking-[0.3em] text-copper">
              {BRAND_HEADER.kicker}
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {BRAND_HEADER.title}
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted light:text-ink/75">
            <Link href="/" className="hover:text-ink">
              Pedidos
            </Link>
            <Link href="/pedidos/novo" className="hover:text-ink">
              Novo pedido
            </Link>
            {user.role === "admin" ? (
              <>
                <Link href="/usuarios" className="hover:text-ink">
                  Usuários
                </Link>
                <Link href="/configuracoes" className="hover:text-ink">
                  Configurações
                </Link>
              </>
            ) : null}
            <Link href="/ajuda" className="hover:text-ink">
              Ajuda
            </Link>
            <Link href="/perfil" className="hover:text-ink">
              Perfil
            </Link>
            <ThemeToggle compact />
            <div className="flex items-center gap-3 border-l border-line pl-5">
              <Link href="/perfil" className="hidden text-right md:block hover:opacity-90">
                <p className="text-sm font-medium leading-tight text-ink">
                  {user.name}
                </p>
                <p className="max-w-[180px] truncate text-xs text-muted">
                  {user.email}
                </p>
              </Link>
              <UserAvatar name={user.name} />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-copper/40 hover:text-ink"
                >
                  Sair
                </button>
              </form>
            </div>
          </nav>
        </div>
        {mockMode ? (
          <div className="border-t border-line bg-accent-surface px-6 py-2 text-center font-mono text-xs tracking-wide text-copper-2">
            MODO MOCK ATIVO — respostas pré-definidas, nenhum token consumido
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
