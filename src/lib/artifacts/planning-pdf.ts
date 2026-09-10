import PDFDocument from "pdfkit";
import { nfrLabels, withNfrDefaults } from "@/lib/nfr-context";
import type { OrderScope } from "@/lib/order-scope";
import type { OrderInput } from "@/lib/types";

/** Documentos para apresentação — linguagem acessível; backlog técnico fica no ZIP. */
export type PlanningPdfSection = {
  label: string;
  path: string;
  intro: string;
  /** Se true, inclui nota “seção mais técnica” */
  technical?: boolean;
  maxChars?: number;
};

export const PLANNING_PDF_SECTIONS: PlanningPdfSection[] = [
  {
    label: "Visão geral do projeto",
    path: "README.md",
    intro:
      "Panorama do que foi planejado: objetivo, escopo e como os documentos do pacote se organizam.",
    maxChars: 8000,
  },
  {
    label: "O que o produto deve fazer",
    path: "docs/PRD.md",
    intro:
      "Requisitos em linguagem de negócio: funcionalidades, prioridades e o que fica fora da primeira versão.",
    maxChars: 22000,
  },
  {
    label: "Histórias de usuário",
    path: "docs/HISTORIAS-USUARIO.md",
    intro:
      "Cenários do dia a dia no formato “Como [pessoa], quero [ação] para [benefício]” — ideal para validar com a equipe.",
    maxChars: 16000,
  },
  {
    label: "Cronograma por fases",
    path: "docs/ROADMAP.md",
    intro:
      "Ordem sugerida de entregas: o que entra na v1, o que vem depois e marcos de aprovação.",
    maxChars: 12000,
  },
  {
    label: "Dados que o sistema guarda",
    path: "docs/MODELO-DADOS.md",
    intro:
      "Quais informações o app persiste (clientes, pedidos, tarefas…) e como se relacionam — base do banco de dados.",
    maxChars: 12000,
  },
  {
    label: "Visão técnica da arquitetura",
    path: "docs/ARQUITETURA.md",
    intro:
      "Resumo para a equipe de TI: componentes, integrações e decisões técnicas. Gestores podem pular se preferirem.",
    technical: true,
    maxChars: 14000,
  },
];

const COLORS = {
  copper: "#B87333",
  copperLight: "#F5E6D8",
  ink: "#1A120C",
  muted: "#5C534A",
  line: "#D4C4B0",
  white: "#FFFFFF",
};

const PAGE = { margin: 52, footerH: 36 };
const FONT = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
};

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfLayout = {
  doc: PdfDoc;
  projectName: string;
};

type MarkdownBlock =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "bullet" | "numbered" | "p" | "callout"; text: string };

function orderScope(order: OrderInput): OrderScope {
  return {
    includeMobile: order.includeMobile,
    includeFrontend: order.includeFrontend,
    includeBackend: order.includeBackend,
    includeDatabase: order.includeDatabase,
    includeAuth: order.includeAuth,
    includeAdmin: order.includeAdmin,
  };
}

function scopePlainLanguage(scope: OrderScope): string[] {
  const items: string[] = [];
  if (scope.includeMobile) items.push("Aplicativo para celular");
  if (scope.includeFrontend) items.push("Site ou painel web");
  if (scope.includeBackend) items.push("Servidor / API (lógica e regras no backend)");
  if (scope.includeDatabase) items.push("Banco de dados para guardar informações");
  if (scope.includeAuth) items.push("Login e contas de usuário");
  if (scope.includeAdmin) items.push("Painel administrativo");
  return items;
}

function stripDiagrams(text: string): string {
  return text.replace(
    /```[\s\S]*?```/g,
    "[Diagrama técnico — consulte o pacote ZIP completo ou peça à TI para apresentar.]",
  );
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const lines = stripDiagrams(raw).split("\n");
  const blocks: MarkdownBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1}\s+/.test(trimmed)) {
      blocks.push({ kind: "h1", text: stripMarkdownInline(trimmed.replace(/^#\s+/, "")) });
      continue;
    }
    if (/^#{2}\s+/.test(trimmed)) {
      blocks.push({ kind: "h2", text: stripMarkdownInline(trimmed.replace(/^##\s+/, "")) });
      continue;
    }
    if (/^#{3,6}\s+/.test(trimmed)) {
      blocks.push({ kind: "h3", text: stripMarkdownInline(trimmed.replace(/^#{3,6}\s+/, "")) });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      blocks.push({ kind: "bullet", text: stripMarkdownInline(trimmed.replace(/^[-*]\s+/, "")) });
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      blocks.push({
        kind: "numbered",
        text: stripMarkdownInline(trimmed.replace(/^\d+[.)]\s+/, "")),
      });
      continue;
    }
    if (/^>\s+/.test(trimmed)) {
      blocks.push({ kind: "callout", text: stripMarkdownInline(trimmed.replace(/^>\s+/, "")) });
      continue;
    }
    if (/^\|.*\|$/.test(trimmed) || /^[-|:\s]+$/.test(trimmed)) {
      continue;
    }
    blocks.push({ kind: "p", text: stripMarkdownInline(trimmed) });
  }

  return blocks;
}

function truncateBlocks(blocks: MarkdownBlock[], maxChars: number): MarkdownBlock[] {
  let used = 0;
  const result: MarkdownBlock[] = [];
  for (const block of blocks) {
    if (used + block.text.length > maxChars) {
      result.push({
        kind: "callout",
        text: "O restante deste documento está no pacote ZIP completo (download na Fábrica).",
      });
      break;
    }
    result.push(block);
    used += block.text.length;
  }
  return result;
}

function contentWidth(doc: PdfDoc): number {
  return doc.page.width - PAGE.margin * 2;
}

function writeFooter({ doc, projectName }: PdfLayout): void {
  const savedY = doc.y;
  const footerY = doc.page.height - doc.page.margins.bottom + 14;
  doc.save();
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`Fábrica de Software · ${projectName}`, PAGE.margin, footerY, {
      width: contentWidth(doc),
      align: "center",
      lineBreak: false,
      height: 12,
    });
  doc.restore();
  doc.x = PAGE.margin;
  doc.y = savedY;
}

function startNewPage(layout: PdfLayout): void {
  writeFooter(layout);
  layout.doc.addPage();
  drawPageHeader(layout.doc, layout.projectName);
}

function ensureSpace(layout: PdfLayout, needed: number): void {
  const { doc } = layout;
  const bottom = doc.page.height - PAGE.margin - PAGE.footerH;
  if (doc.y + needed > bottom) {
    startNewPage(layout);
  }
}

function drawPageHeader(doc: PdfDoc, projectName?: string): void {
  const y = PAGE.margin - 8;
  doc
    .save()
    .rect(PAGE.margin, y, contentWidth(doc), 3)
    .fill(COLORS.copper)
    .restore();
  if (projectName) {
    doc
      .font(FONT.regular)
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(projectName, PAGE.margin, y + 8, {
        width: contentWidth(doc),
        align: "left",
      });
    doc.y = Math.max(doc.y, y + 22);
  }
}

function writeRichText(
  doc: PdfDoc,
  text: string,
  options: { width: number; size: number; color?: string; font?: string },
): void {
  const color = options.color ?? COLORS.ink;
  const baseFont = options.font ?? FONT.regular;
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  if (parts.length === 1 && !text.includes("**")) {
    doc.font(baseFont).fontSize(options.size).fillColor(color).text(text, {
      width: options.width,
      lineGap: 3,
    });
    return;
  }

  doc.font(baseFont).fontSize(options.size).fillColor(color);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const bold = part.startsWith("**") && part.endsWith("**");
    const content = bold ? part.slice(2, -2) : part;
    doc.font(bold ? FONT.bold : baseFont).text(content, {
      width: options.width,
      continued: i < parts.length - 1,
      lineGap: 3,
    });
  }
  doc.font(baseFont).text("", { continued: false });
}

function writeSummaryRow(
  layout: PdfLayout,
  label: string,
  value: string | null | undefined,
): void {
  if (!value?.trim()) return;
  const { doc } = layout;
  ensureSpace(layout, 48);
  const width = contentWidth(doc);
  const labelW = 148;
  const startY = doc.y;

  doc
    .font(FONT.bold)
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(label, PAGE.margin, startY, { width: labelW, lineBreak: false });

  const valueBottom = doc.y;
  doc.y = startY;
  doc
    .font(FONT.regular)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(value.trim(), PAGE.margin + labelW, startY, {
      width: width - labelW,
      lineGap: 3,
    });

  doc.y = Math.max(doc.y, valueBottom);
  doc.moveDown(0.6);
  doc
    .moveTo(PAGE.margin, doc.y)
    .lineTo(PAGE.margin + width, doc.y)
    .strokeColor(COLORS.line)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.5);
}

function writeSectionIntro(
  layout: PdfLayout,
  title: string,
  intro: string,
  technical?: boolean,
): void {
  const { doc } = layout;
  ensureSpace(layout, 80);
  doc
    .font(FONT.bold)
    .fontSize(18)
    .fillColor(COLORS.ink)
    .text(title, { width: contentWidth(doc) });
  doc.moveDown(0.4);

  const boxX = PAGE.margin;
  const boxW = contentWidth(doc);
  const boxY = doc.y;
  const introHeight = doc.heightOfString(intro, {
    width: boxW - 24,
    lineGap: 2,
  });
  const technicalNote = technical
    ? doc.heightOfString("Seção mais técnica — pode ser lida pela equipe de TI.", {
        width: boxW - 24,
      }) + 6
    : 0;
  const boxH = Math.max(technical ? 52 : 44, introHeight + technicalNote + 22);

  doc.roundedRect(boxX, boxY, boxW, boxH, 6).fill(COLORS.copperLight);
  doc
    .font(FONT.regular)
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(intro, boxX + 12, boxY + 10, {
      width: boxW - 24,
      lineGap: 2,
    });
  if (technical) {
    doc
      .font(FONT.oblique)
      .fontSize(8.5)
      .fillColor(COLORS.copper)
      .text(
        "Seção mais técnica — pode ser lida pela equipe de TI.",
        boxX + 12,
        doc.y + 4,
        { width: boxW - 24, lineBreak: false },
      );
  }
  doc.y = boxY + boxH + 8;
  doc.moveDown(0.4);
}

function writeMarkdownBlocks(layout: PdfLayout, blocks: MarkdownBlock[]): void {
  const { doc } = layout;
  const width = contentWidth(doc);

  for (const block of blocks) {
    switch (block.kind) {
      case "h1":
        ensureSpace(layout, 36);
        doc.moveDown(0.3);
        doc.font(FONT.bold).fontSize(16).fillColor(COLORS.ink).text(block.text, { width });
        doc.moveDown(0.5);
        break;
      case "h2":
        ensureSpace(layout, 30);
        doc.moveDown(0.25);
        doc.font(FONT.bold).fontSize(13).fillColor(COLORS.ink).text(block.text, { width });
        doc.moveDown(0.35);
        break;
      case "h3":
        ensureSpace(layout, 26);
        doc.font(FONT.bold).fontSize(11).fillColor(COLORS.copper).text(block.text, { width });
        doc.moveDown(0.3);
        break;
      case "bullet":
        ensureSpace(layout, 20);
        doc.font(FONT.regular).fontSize(10).fillColor(COLORS.ink);
        doc.text(`•  ${block.text}`, PAGE.margin + 8, doc.y, {
          width: width - 8,
          lineGap: 2,
        });
        doc.moveDown(0.15);
        break;
      case "numbered":
        ensureSpace(layout, 20);
        doc.font(FONT.regular).fontSize(10).fillColor(COLORS.ink);
        doc.text(`–  ${block.text}`, PAGE.margin + 8, doc.y, {
          width: width - 8,
          lineGap: 2,
        });
        doc.moveDown(0.15);
        break;
      case "callout":
        ensureSpace(layout, 40);
        {
          const boxY = doc.y;
          const boxH = 36;
          doc.roundedRect(PAGE.margin, boxY, width, boxH, 4).fill("#F0F4F8");
          doc
            .font(FONT.oblique)
            .fontSize(9.5)
            .fillColor(COLORS.muted)
            .text(block.text, PAGE.margin + 10, boxY + 8, {
              width: width - 20,
              lineGap: 2,
            });
          doc.y = Math.max(doc.y, boxY + boxH + 4);
        }
        doc.moveDown(0.3);
        break;
      case "p":
        ensureSpace(layout, 24);
        writeRichText(doc, block.text, { width, size: 10, color: COLORS.ink });
        doc.moveDown(0.35);
        break;
    }
  }
}

function writeOrderSummary(layout: PdfLayout, order: OrderInput): void {
  const { doc } = layout;

  doc
    .font(FONT.bold)
    .fontSize(18)
    .fillColor(COLORS.ink)
    .text("Resumo em linguagem simples", { width: contentWidth(doc) });
  doc.moveDown(0.35);
  doc
    .font(FONT.regular)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(
      "Esta página reúne o que você informou no formulário, traduzido para facilitar a leitura por gestores e stakeholders.",
      { width: contentWidth(doc), lineGap: 3 },
    );
  doc.moveDown(0.8);

  writeSummaryRow(layout, "Problema / objetivo", order.problem);
  writeSummaryRow(layout, "Público-alvo", order.audience);
  writeSummaryRow(layout, "Regras de negócio", order.businessRules);
  writeSummaryRow(layout, "Essencial na v1 (MVP)", order.mvpEssentials);
  writeSummaryRow(layout, "Depois da v1", order.mvpLater);
  writeSummaryRow(layout, "Quem usa o sistema", order.userRoles);
  writeSummaryRow(layout, "Fluxos principais", order.mainFlows);
  writeSummaryRow(layout, "Telas previstas", order.expectedScreens);
  writeSummaryRow(layout, "Integrações externas", order.externalIntegrations);
  writeSummaryRow(layout, "Dados guardados", order.mainEntities);
  writeSummaryRow(layout, "Relações entre dados", order.entityRelations);
  writeSummaryRow(layout, "Como medir sucesso", order.successCriteria);

  const scopeItems = scopePlainLanguage(orderScope(order));
  if (scopeItems.length > 0) {
    writeSummaryRow(
      layout,
      "O que será construído",
      scopeItems.map((item) => `• ${item}`).join("\n"),
    );
  }

  const nfrLines = nfrLabels(withNfrDefaults(order));
  if (nfrLines.length > 0) {
    writeSummaryRow(layout, "Requisitos de operação", nfrLines.join("\n"));
  }

  if (order.uiReference?.trim()) {
    writeSummaryRow(layout, "Referência visual", order.uiReference);
  }
}

function writeHowToRead(layout: PdfLayout, sections: PlanningPdfSection[]): void {
  const { doc } = layout;

  doc
    .font(FONT.bold)
    .fontSize(18)
    .fillColor(COLORS.ink)
    .text("Como ler este documento", { width: contentWidth(doc) });
  doc.moveDown(0.5);

  const tips = [
    "Este PDF foi feito para apresentação e aprovação — não é o pacote técnico completo.",
    "Comece pelo Resumo em linguagem simples (página anterior) se você não é da área de tecnologia.",
    "As seções seguintes detalham o produto, cronograma e dados; a parte de arquitetura é opcional para gestores.",
    "O backlog de tarefas para desenvolvimento (TAREFAS.md) fica no ZIP — peça à TI se precisar do detalhe de implementação.",
  ];

  for (const tip of tips) {
    ensureSpace(layout, 28);
    doc.font(FONT.regular).fontSize(10).fillColor(COLORS.ink);
    doc.text(`•  ${tip}`, PAGE.margin + 4, doc.y, {
      width: contentWidth(doc) - 4,
      lineGap: 3,
    });
    doc.moveDown(0.35);
  }

  doc.moveDown(0.6);
  doc.font(FONT.bold).fontSize(13).fillColor(COLORS.ink).text("Índice", {
    width: contentWidth(doc),
  });
  doc.moveDown(0.4);

  doc.font(FONT.regular).fontSize(10).fillColor(COLORS.muted);
  doc.text("1. Resumo em linguagem simples", { width: contentWidth(doc) });
  sections.forEach((section, index) => {
    doc.text(`${index + 2}. ${section.label}`, { width: contentWidth(doc) });
  });
  doc.moveDown(0.5);
  doc
    .font(FONT.oblique)
    .fontSize(9)
    .fillColor(COLORS.copper)
    .text("Dúvidas sobre termos? Consulte Ajuda na Fábrica de Software (/ajuda).", {
      width: contentWidth(doc),
    });
}

function writeCover(doc: PdfDoc, order: OrderInput): void {
  const width = contentWidth(doc);
  const centerX = doc.page.width / 2;

  doc.rect(0, 0, doc.page.width, 120).fill(COLORS.copper);
  doc
    .font(FONT.bold)
    .fontSize(26)
    .fillColor(COLORS.white)
    .text(order.name, PAGE.margin, 42, { width, align: "center" });

  doc.y = 140;
  doc
    .font(FONT.regular)
    .fontSize(14)
    .fillColor(COLORS.ink)
    .text("Documento de planejamento", centerX - width / 2, doc.y, {
      width,
      align: "center",
    });
  doc.moveDown(0.35);
  doc
    .fontSize(11)
    .fillColor(COLORS.muted)
    .text("Para aprovação de gestores, product owners e stakeholders", {
      width,
      align: "center",
    });
  doc.moveDown(0.25);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`, { width, align: "center" });

  doc.moveDown(2);
  doc
    .roundedRect(PAGE.margin, doc.y, width, 100, 8)
    .fill(COLORS.copperLight);
  const boxY = doc.y + 14;
  doc
    .font(FONT.bold)
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text("Em uma frase", PAGE.margin + 16, boxY, { width: width - 32 });
  doc
    .font(FONT.regular)
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(order.problem.trim(), PAGE.margin + 16, boxY + 18, {
      width: width - 32,
      lineGap: 3,
    });

  doc.y += 118;
  doc.moveDown(1);
  doc
    .font(FONT.regular)
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(
      "Produzido pela Fábrica de Software · Pacote completo (Markdown, diagramas e tarefas) disponível em ZIP na plataforma.",
      PAGE.margin,
      doc.y,
      { width, align: "center", lineGap: 3 },
    );
}

export async function buildPlanningPdfBuffer(
  order: OrderInput,
  files: Record<string, string>,
): Promise<Buffer> {
  const includedSections = PLANNING_PDF_SECTIONS.filter((section) =>
    files[section.path]?.trim(),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin + 18,
        bottom: PAGE.margin + PAGE.footerH,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      bufferPages: false,
      info: {
        Title: `${order.name} — Planejamento`,
        Author: "Fábrica de Software",
        Subject: "Documento de planejamento para aprovação",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const layout: PdfLayout = { doc, projectName: order.name };

    writeCover(doc, order);
    startNewPage(layout);
    writeOrderSummary(layout, order);
    startNewPage(layout);
    writeHowToRead(layout, includedSections);

    for (const section of includedSections) {
      const raw = files[section.path]?.trim();
      if (!raw) continue;

      startNewPage(layout);
      writeSectionIntro(layout, section.label, section.intro, section.technical);

      const blocks = truncateBlocks(
        parseMarkdownBlocks(raw),
        section.maxChars ?? 12000,
      );
      writeMarkdownBlocks(layout, blocks);
    }

    writeFooter(layout);
    doc.end();
  });
}

export function planningPdfFilename(orderName: string): string {
  const slug = orderName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "projeto"}-planejamento.pdf`;
}

/** @deprecated use stripDiagrams — mantido para testes legados */
export function stripMarkdownForPdf(text: string): string {
  return stripDiagrams(text)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^[-|:\s]+$/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export { parseMarkdownBlocks, scopePlainLanguage };
