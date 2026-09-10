import { AppFrame } from "@/components/AppFrame";
import { UserGuideView } from "@/components/UserGuideView";

export const dynamic = "force-dynamic";

export default function AjudaPage() {
  return (
    <AppFrame>
      <div className="space-y-8">
        <header>
          <p className="font-mono text-xs tracking-[0.3em] text-copper">AJUDA</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Como funciona a Fábrica
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Guia para criar pedidos de planejamento, gerar software na Etapa 2,
            rodar a esteira de agentes, baixar entregas (ZIP, GitHub, APK) e
            executar o stack gerado localmente. Use o sumário ao lado para navegar.
          </p>
        </header>

        <UserGuideView />
      </div>
    </AppFrame>
  );
}
