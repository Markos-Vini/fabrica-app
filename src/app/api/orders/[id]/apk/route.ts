import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { NextResponse } from "next/server";
import { apkFilePath } from "@/lib/agents/apk-build";
import { verifyResourceDownloadToken } from "@/lib/download-token";
import { sessionSecret } from "@/lib/env";
import { canAccessOrder, getOrder } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

function apkErrorPage(message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Download indisponível</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:0 1rem;color:#1a1a1a">
  <h1 style="font-size:1.125rem">Download indisponível</h1>
  <p>${message}</p>
  <p style="color:#666;font-size:0.875rem">Abra o pedido na Fábrica, gere o APK novamente e use o link atualizado.</p>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getSessionUser();
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const tokenOk = verifyResourceDownloadToken(token, id, "apk", sessionSecret());

  if (!user && !tokenOk) {
    return apkErrorPage("Link expirado ou inválido. Escaneie o QR code novamente na página do pedido.", 401);
  }

  const data = await getOrder(id);
  if (!data) {
    return apkErrorPage("Pedido não encontrado.", 404);
  }
  if (user && !canAccessOrder(data.order, user)) {
    return apkErrorPage("Sem permissão para este pedido.", 403);
  }
  if (data.order.apkStatus !== "ready") {
    const stale =
      data.order.apkStatus === "idle"
        ? "O APK foi invalidado após republicar no GitHub. Gere um novo build na página do pedido."
        : data.order.apkStatus === "building"
          ? "O APK ainda está sendo compilado. Aguarde alguns minutos e tente de novo."
          : "APK ainda não disponível. Gere o build na página do pedido.";
    return apkErrorPage(stale, 404);
  }
  const filePath = apkFilePath(id);
  if (!existsSync(filePath)) {
    return apkErrorPage("Arquivo APK não encontrado no servidor. Gere o build novamente.", 404);
  }
  const buffer = await readFile(filePath);
  const filename = `${data.order.name.replace(/[^a-z0-9-_]+/gi, "-")}-debug.zip`;
  return new NextResponse(Uint8Array.from(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
