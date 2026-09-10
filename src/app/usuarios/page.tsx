import { AppFrame } from "@/components/AppFrame";
import { UsersPanel } from "@/components/UsersPanel";
import { listUsers } from "@/lib/store";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await requireAdmin();
  const users = await listUsers();
  return (
    <AppFrame>
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs tracking-[0.3em] text-copper">ACESSO</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Quem pode entrar na fábrica e o que cada papel pode fazer. Você está
          logado como{" "}
          <span className="font-medium text-ink">{currentUser.name}</span> (
          {currentUser.email}).
        </p>
        <div className="mt-8">
          <UsersPanel users={users} currentUser={currentUser} />
        </div>
      </div>
    </AppFrame>
  );
}
