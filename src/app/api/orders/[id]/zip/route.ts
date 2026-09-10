import { NextResponse } from "next/server";
import { buildOrderZipBuffer } from "@/lib/artifacts/order-zip";
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

  try {
    const { buffer, filename } = await buildOrderZipBuffer(id, data.order.name);
    return new NextResponse(Uint8Array.from(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar ZIP";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
