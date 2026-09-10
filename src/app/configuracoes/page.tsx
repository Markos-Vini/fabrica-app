import { AppFrame } from "@/components/AppFrame";
import { SettingsForm } from "@/components/SettingsForm";
import { getPublicSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getPublicSettings();
  return (
    <AppFrame>
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs tracking-[0.3em] text-copper">ROTEADOR</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Configurações
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Provedores de IA, modelos por agente, modo de demonstração e entrega
          remota. Salve ao final para aplicar nos próximos pedidos.
        </p>
        <div className="mt-8">
          <SettingsForm key={settings.updatedAt} initial={settings} />
        </div>
      </div>
    </AppFrame>
  );
}
