import type { OrderInput } from "@/lib/types";

export type UiStyle = "modern" | "minimal" | "corporate" | "playful";

export const UI_STYLE_OPTIONS: {
  id: UiStyle;
  title: string;
  description: string;
}[] = [
  {
    id: "modern",
    title: "Moderno",
    description: "Material 3, cards arredondados, hierarquia clara.",
  },
  {
    id: "minimal",
    title: "Minimalista",
    description: "Poucos elementos, muito espaço em branco, tipografia limpa.",
  },
  {
    id: "corporate",
    title: "Corporativo",
    description: "Visual sóbrio, densidade confortável, tons neutros.",
  },
  {
    id: "playful",
    title: "Descontraído",
    description: "Cores vivas, ícones expressivos, tom amigável.",
  },
];

const SEED_PALETTE = [
  "2563EB",
  "0891B2",
  "7C3AED",
  "059669",
  "D4894A",
  "DC2626",
  "DB2777",
  "EA580C",
] as const;

export function parseUiStyle(raw: unknown): UiStyle {
  const value = String(raw ?? "modern").trim();
  if (UI_STYLE_OPTIONS.some((opt) => opt.id === value)) {
    return value as UiStyle;
  }
  return "modern";
}

export function parsePrimaryColor(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const normalized = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function mixHex(colorA: string, colorB: string, weightB: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w,
  );
}

export function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * factor, g * factor, b * factor);
}

export type PreviewTheme = {
  accent: string;
  accentSoft: string;
  accentMuted: string;
  surface: string;
  border: string;
  chip: string;
  chipSecondary: string;
  webSidebar: string;
  webHeader: string;
};

const STYLE_BASE: Record<
  UiStyle,
  Omit<PreviewTheme, "accent" | "accentSoft" | "accentMuted" | "chip" | "chipSecondary" | "webSidebar" | "webHeader">
> = {
  modern: {
    surface: "#F8FAFC",
    border: "#E2E8F0",
  },
  minimal: {
    surface: "#FFFFFF",
    border: "#E5E5E5",
  },
  corporate: {
    surface: "#F4F6F8",
    border: "#CBD5E1",
  },
  playful: {
    surface: "#FFFBEB",
    border: "#FDE68A",
  },
};

const DEFAULT_ACCENTS: Record<UiStyle, string> = {
  modern: "#2563EB",
  minimal: "#171717",
  corporate: "#1E3A5F",
  playful: "#DB2777",
};

export function previewThemeForStyle(
  style: UiStyle,
  primaryColor?: string | null,
): PreviewTheme {
  const base = STYLE_BASE[style];
  const accent = parsePrimaryColor(primaryColor) ?? DEFAULT_ACCENTS[style];
  const accentSoft = mixHex(accent, "#FFFFFF", style === "minimal" ? 0.94 : 0.88);
  const accentMuted = mixHex(accent, "#FFFFFF", 0.72);

  let chipSecondary = mixHex(accent, "#F59E0B", 0.45);
  if (style === "playful") {
    chipSecondary = mixHex(accent, "#FBBF24", 0.35);
  } else if (style === "corporate") {
    chipSecondary = mixHex(accent, "#64748B", 0.55);
  } else if (style === "minimal") {
    chipSecondary = mixHex(accent, "#A3A3A3", 0.4);
  }

  const webSidebar =
    style === "minimal"
      ? mixHex(accent, "#F5F5F5", 0.92)
      : darkenHex(accent, style === "corporate" ? 0.55 : 0.48);

  const webHeader =
    style === "minimal"
      ? "#FAFAFA"
      : mixHex(webSidebar, "#FFFFFF", 0.08);

  return {
    ...base,
    accent,
    accentSoft,
    accentMuted,
    chip: accent,
    chipSecondary,
    webSidebar,
    webHeader,
  };
}

export function parseUiReference(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value.slice(0, 500) : null;
}

export function withVisualDefaults(order: OrderInput): OrderInput {
  return {
    ...order,
    uiStyle: order.uiStyle ?? "modern",
    primaryColor: order.primaryColor ?? null,
    uiReference: order.uiReference ?? null,
  };
}

export function derivePrimaryColorHex(order: OrderInput): string {
  const custom = parsePrimaryColor(order.primaryColor);
  if (custom) return custom;

  let hash = 0;
  for (const char of order.name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `#${SEED_PALETTE[hash % SEED_PALETTE.length]}`;
}

export function flutterSeedColorLiteral(order: OrderInput): string {
  const hex = derivePrimaryColorHex(order).slice(1);
  return `0xFF${hex}`;
}

export function uiStyleLabel(style: UiStyle): string {
  return UI_STYLE_OPTIONS.find((opt) => opt.id === style)?.title ?? style;
}

export function visualBriefForPrompt(order: OrderInput): string {
  const normalized = withVisualDefaults(order);
  const lines = [
    `Estilo visual: ${uiStyleLabel(normalized.uiStyle!)} (${normalized.uiStyle}).`,
    `Cor primária sugerida: ${derivePrimaryColorHex(normalized)}.`,
  ];

  if (normalized.uiReference) {
    lines.push(`Referência de UI (texto): ${normalized.uiReference}.`);
  }

  return lines.join("\n");
}

export function flutterUiInstructions(order: OrderInput): string {
  const normalized = withVisualDefaults(order);
  const seed = derivePrimaryColorHex(normalized);
  const theme = previewThemeForStyle(normalized.uiStyle!, normalized.primaryColor);
  const style = normalized.uiStyle!;

  const adminShellRules =
    style === "minimal"
      ? "- Painel web: sidebar clara/neutra; topbar discreta."
      : [
          "- Painel web (frontend/): sidebar lateral com fundo na cor primária escurecida (como preview do wizard).",
          `- Use --sidebar-bg / gradiente com ${seed} (referência sidebar: ${theme.webSidebar}).`,
          `- Topbar/app bar horizontal na área principal com ${theme.webHeader} — NÃO deixe sidebar branca se o estilo for ${style}.`,
          "- Links ativos na sidebar: texto branco sobre fundo semi-transparente; ícones legíveis.",
        ].join("\n");

  return [
    "Diretrizes de UI/UX (obrigatório quando gerar mobile/ ou frontend/):",
    `- Estilo: ${uiStyleLabel(style)} — ${style}.`,
    `- Cor primária: ${seed} (ThemeData.fromSeed / CSS variables equivalentes).`,
    adminShellRules,
    normalized.uiReference
      ? `- Inspire-se em: ${normalized.uiReference} (adaptar, não copiar marcas).`
      : "- Layout moderno, profissional e pronto para demo.",
    "- Material 3 / design system consistente: grid 8pt, border-radius 12–16.",
    "- Tratar estados loading (skeleton ou progress), empty state com CTA, erros com banner/snackbar.",
    "- Flutter: lib/core/theme/ centralizado; AppBar com cor primária quando estilo modern/playful/corporate.",
    "- Evitar telas placeholder, ListTile cru sem hierarquia ou app que só repete o texto do PRD.",
  ].join("\n");
}
