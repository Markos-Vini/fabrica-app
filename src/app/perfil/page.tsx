import { AppFrame } from "@/components/AppFrame";
import { ProfilePanel } from "@/components/ProfilePanel";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireSession();

  return (
    <AppFrame>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="font-mono text-xs tracking-[0.3em] text-copper">CONTA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Perfil</h1>
          <p className="mt-2 text-sm text-muted">
            Dados da sua sessão e alteração de senha.
          </p>
        </header>
        <ProfilePanel user={user} />
      </div>
    </AppFrame>
  );
}
