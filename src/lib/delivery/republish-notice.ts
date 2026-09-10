export type RepublishOrderState = {
  githubUrl: string | null;
  githubError: string | null;
  vercelUrl: string | null;
  vercelError: string | null;
  includeFrontend: boolean;
  vercelConfigured?: boolean;
};

export function buildRepublishNotice(
  order: RepublishOrderState,
): { tone: "ok" | "bad"; text: string } {
  const githubOk = Boolean(order.githubUrl) && !order.githubError;
  const githubFailed = Boolean(order.githubError);
  const wantsVercel = order.includeFrontend;
  const vercelOk = wantsVercel && Boolean(order.vercelUrl) && !order.vercelError;
  const vercelFailed = wantsVercel && Boolean(order.vercelError);

  if (githubFailed && vercelFailed) {
    return {
      tone: "bad",
      text: "Falha ao republicar no GitHub e na Vercel. Veja os detalhes abaixo.",
    };
  }
  if (githubFailed) {
    return {
      tone: "bad",
      text: "Falha ao republicar no GitHub. Veja o detalhe abaixo.",
    };
  }
  if (!githubOk) {
    return {
      tone: "bad",
      text: "Nada foi publicado. Cadastre o token do GitHub em Configurações.",
    };
  }

  if (!wantsVercel) {
    return { tone: "ok", text: "Repositório republicado no GitHub." };
  }
  if (vercelOk) {
    return { tone: "ok", text: "Republicado no GitHub e na Vercel." };
  }
  if (vercelFailed) {
    return {
      tone: "bad",
      text: `GitHub atualizado, mas a Vercel falhou: ${order.vercelError}`,
    };
  }
  if (!order.vercelConfigured) {
    return {
      tone: "ok",
      text: "Republicado no GitHub. Cadastre o token da Vercel em Configurações para publicar o front-end.",
    };
  }
  return {
    tone: "ok",
    text: "Republicado no GitHub. Nenhum arquivo em frontend/ foi enviado à Vercel.",
  };
}
