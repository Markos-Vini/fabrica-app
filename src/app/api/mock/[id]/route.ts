import { NextResponse } from "next/server";
import { buildMockDatabase } from "@/lib/artifacts/mock-api";
import { canAccessOrder, getOrder } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

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
  return NextResponse.json(buildMockDatabase(data.order));
}
