import { NextResponse } from "next/server";
import { loadCollectedFiles } from "@/lib/agents/deliver";
import {
  buildPlanningPdfBuffer,
  planningPdfFilename,
} from "@/lib/artifacts/planning-pdf";
import { isPlanningOrder } from "@/lib/factory-mode";
import { canAccessOrder, getOrder } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  const data = await getOrder(id);
  if (!data) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (!canAccessOrder(data.order, user)) {
    return NextResponse.json({ error: "Sem permissão para este pedido" }, { status: 403 });
  }
  if (!isPlanningOrder(data.order)) {
    return NextResponse.json(
      { error: "PDF de documentação disponível apenas em pedidos de planejamento." },
      { status: 400 },
    );
  }
  if (data.order.status !== "completed") {
    return NextResponse.json(
      { error: "Aguarde a conclusão do planejamento para baixar o PDF." },
      { status: 400 },
    );
  }

  const files = await loadCollectedFiles(id);
  if (!files || Object.keys(files).length === 0) {
    return NextResponse.json({ error: "Documentação ainda não disponível." }, { status: 404 });
  }

  try {
    const buffer = await buildPlanningPdfBuffer(data.order, files);
    const filename = planningPdfFilename(data.order.name);
    return new NextResponse(Uint8Array.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
