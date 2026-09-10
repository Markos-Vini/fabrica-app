import { NextResponse } from "next/server";
import { listJobsForOrder } from "@/lib/jobs/store";
import { getOrderIfAllowed } from "@/lib/store";
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
  const data = await getOrderIfAllowed(id, user, { fresh: true });
  if (!data) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  const jobs = await listJobsForOrder(id);
  return NextResponse.json({ ...data, jobs });
}
