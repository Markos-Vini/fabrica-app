import { NextResponse } from "next/server";
import { buildMockDatabase, collectionOf } from "@/lib/artifacts/mock-api";
import { canAccessOrder, getOrder } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; resource: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id, resource } = await context.params;
  const data = await getOrder(id);
  if (!data) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (!canAccessOrder(data.order, user)) {
    return NextResponse.json({ error: "Sem permissão para este pedido" }, { status: 403 });
  }
  const db = buildMockDatabase(data.order);
  if (resource === "meta") {
    return NextResponse.json(db.meta);
  }
  return NextResponse.json(collectionOf(db, resource));
}
