"use client";

import { useMemo, useState } from "react";
import {
  parsePrimaryColor,
  previewThemeForStyle,
  type PreviewTheme,
  UI_STYLE_OPTIONS,
  type UiStyle,
} from "@/lib/visual-design";
import { InfoTip } from "@/components/InfoTip";
import { choiceCardClass, fieldClass, FieldLabel } from "@/components/FormControls";
import { FIELD_HINTS } from "@/lib/field-hints";

type PreviewSurface = "app" | "web" | "both";

const PREVIEW_MIN_HEIGHT: Record<PreviewSurface, string> = {
  app: "min-h-[220px]",
  web: "min-h-[220px]",
  both: "min-h-[260px]",
};

function PhoneMock({ style, theme }: { style: UiStyle; theme: PreviewTheme }) {
  const radius = style === "minimal" ? 10 : style === "corporate" ? 12 : 20;
  const cardRadius = style === "minimal" ? 6 : style === "playful" ? 20 : 14;

  return (
    <div className="relative mx-auto w-[132px] sm:w-[140px]">
      <div
        className="absolute -inset-1 rounded-[26px] opacity-40 blur-sm"
        style={{
          background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentMuted})`,
        }}
      />
      <div
        className="relative overflow-hidden border shadow-lg"
        style={{
          borderColor: theme.border,
          borderRadius: radius + 6,
          background: theme.surface,
        }}
      >
        <div
          className="mx-auto mt-1.5 h-1 w-10 rounded-full"
          style={{ background: theme.border }}
        />
        <div
          className="mt-1 flex items-center justify-between px-3 py-2"
          style={{
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.chipSecondary})`,
            color: "#fff",
          }}
        >
          <div>
            <p className="text-[7px] font-bold tracking-wide">MEU APP</p>
            <p className="text-[5px] opacity-80">3 tarefas hoje</p>
          </div>
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[8px]"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            ✓
          </div>
        </div>
        <div className="space-y-2 p-2.5 pb-3">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex gap-2 p-2"
              style={{
                background: row === 0 ? theme.accentSoft : theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: cardRadius,
                boxShadow:
                  row === 0 && style !== "minimal"
                    ? `0 4px 12px ${theme.accent}22`
                    : undefined,
              }}
            >
              <div
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2"
                style={{
                  borderColor: row === 0 ? theme.accent : theme.border,
                  background: row === 2 ? theme.accentSoft : "transparent",
                }}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: row === 0 ? "78%" : "62%",
                    background: theme.accent,
                    opacity: row === 2 ? 0.35 : 1,
                  }}
                />
                <div className="flex gap-1">
                  <span
                    className="inline-block h-1.5 rounded-full px-2"
                    style={{
                      width: 18,
                      background: theme.chip,
                      opacity: 0.75,
                    }}
                  />
                  {(style === "playful" || style === "modern") && (
                    <span
                      className="inline-block h-1.5 w-3 rounded-full"
                      style={{ background: theme.chipSecondary }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {style !== "minimal" ? (
          <div className="absolute bottom-3 right-3">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white shadow-md"
              style={{ background: theme.accent }}
            >
              +
            </div>
          </div>
        ) : null}
        <div
          className="mx-4 mb-2 h-1 rounded-full"
          style={{ background: theme.border }}
        />
      </div>
    </div>
  );
}

function WebMock({ style, theme }: { style: UiStyle; theme: PreviewTheme }) {
  const dense = style === "corporate";

  return (
    <div className="relative mx-auto w-[168px] sm:w-[180px]">
      <div
        className="absolute -inset-1 rounded-xl opacity-30 blur-sm"
        style={{ background: theme.webSidebar }}
      />
      <div
        className="relative overflow-hidden border shadow-lg"
        style={{
          borderColor: theme.border,
          borderRadius: style === "playful" ? 14 : 10,
          background: theme.surface,
        }}
      >
        <div
          className="flex items-center gap-1.5 px-2 py-1.5"
          style={{ background: theme.webHeader, borderBottom: `1px solid ${theme.border}` }}
        >
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span
            className="ml-1 flex-1 rounded-md px-2 py-0.5 text-[6px]"
            style={{ background: "#fff", color: "#94A3B8", border: `1px solid ${theme.border}` }}
          >
            app.exemplo.com/painel
          </span>
        </div>
        <div className="flex" style={{ minHeight: 108 }}>
          <div
            className="w-10 shrink-0 space-y-1.5 p-1.5"
            style={{ background: theme.webSidebar }}
          >
            <div
              className="mb-2 h-2 w-2 rounded-sm"
              style={{ background: "rgba(255,255,255,0.9)" }}
            />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-sm"
                style={{
                  background:
                    i === 0
                      ? theme.accent
                      : style === "minimal"
                        ? theme.border
                        : "rgba(255,255,255,0.22)",
                  width: i === 0 ? "100%" : "80%",
                }}
              />
            ))}
          </div>
          <div className={`flex-1 p-2 ${dense ? "space-y-1" : "space-y-1.5"}`}>
            <div className="flex items-center justify-between gap-1">
              <div
                className="h-2.5 rounded-md"
                style={{ width: "45%", background: theme.accent }}
              />
              <div
                className="h-2 w-8 rounded-md"
                style={{ background: theme.accentSoft, border: `1px solid ${theme.border}` }}
              />
            </div>
            <div
              className="grid grid-cols-3 gap-1"
              style={{ display: style === "playful" ? "grid" : "none" }}
            >
              {[theme.accent, theme.chipSecondary, theme.accentMuted].map((c, i) => (
                <div
                  key={i}
                  className="h-6 rounded-md"
                  style={{ background: c, opacity: 0.85 - i * 0.15 }}
                />
              ))}
            </div>
            <div
              className="rounded-md border p-1.5"
              style={{ borderColor: theme.border, background: "#fff" }}
            >
              <div className="mb-1 flex gap-1">
                {[0, 1, 2, 3].map((bar) => (
                  <div
                    key={bar}
                    className="w-2 rounded-sm"
                    style={{
                      height: 8 + bar * 4,
                      background: bar === 3 ? theme.chipSecondary : theme.accent,
                      opacity: 0.35 + bar * 0.18,
                    }}
                  />
                ))}
              </div>
              {[0, 1].map((row) => (
                <div
                  key={row}
                  className="mt-1 flex items-center gap-1 rounded px-1 py-0.5"
                  style={{
                    background: row === 0 ? theme.accentSoft : "transparent",
                  }}
                >
                  <div
                    className="h-1 flex-1 rounded-full"
                    style={{
                      background: theme.chip,
                      opacity: 0.25 + row * 0.15,
                    }}
                  />
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: theme.accent, opacity: 0.6 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StylePreview({
  style,
  surface,
  primaryColor,
}: {
  style: UiStyle;
  surface: PreviewSurface;
  primaryColor?: string | null;
}) {
  const theme = useMemo(
    () => previewThemeForStyle(style, primaryColor),
    [style, primaryColor],
  );

  if (surface === "app") {
    return <PhoneMock style={style} theme={theme} />;
  }
  if (surface === "web") {
    return <WebMock style={style} theme={theme} />;
  }
  return (
    <div className="flex flex-wrap items-end justify-center gap-3 py-1 sm:gap-4">
      <PhoneMock style={style} theme={theme} />
      <WebMock style={style} theme={theme} />
    </div>
  );
}

export function UiStylePicker({
  value,
  onChange,
  primaryColor,
}: {
  value: UiStyle;
  onChange: (style: UiStyle) => void;
  primaryColor?: string | null;
}) {
  const [surface, setSurface] = useState<PreviewSurface>("both");
  const previewHeightClass = PREVIEW_MIN_HEIGHT[surface];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          Estilo visual
          <InfoTip {...FIELD_HINTS.visualStyle} />
        </p>
        <div className="flex rounded-xl border border-line p-1 text-xs">
          {(
            [
              ["both", "App + Web"],
              ["app", "App"],
              ["web", "Web"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSurface(id)}
              className={`rounded-lg px-3 py-1.5 transition ${
                surface === id
                  ? "bg-copper font-medium text-on-copper"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <input type="hidden" name="uiStyle" value={value} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {UI_STYLE_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          const theme = previewThemeForStyle(opt.id, primaryColor);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={selected}
              className={choiceCardClass(
                selected,
                "flex h-full min-h-[360px] flex-col p-4 text-left sm:min-h-[380px]",
              )}
            >
              <div className="relative shrink-0 pr-24">
                {selected ? (
                  <span className="absolute right-0 top-0 rounded-full bg-copper/20 px-2.5 py-0.5 text-[10px] font-medium text-copper-2">
                    Selecionado
                  </span>
                ) : (
                  <span
                    className="absolute right-0 top-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium opacity-0"
                    aria-hidden
                  >
                    Selecionado
                  </span>
                )}
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/10"
                    style={{ background: theme.accent }}
                  />
                  {opt.title}
                </span>
                <span className="mt-1.5 block min-h-[2.75rem] text-xs leading-relaxed text-muted">
                  {opt.description}
                </span>
              </div>

              <div
                className={`mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-xl border px-3 py-5 sm:px-4 ${previewHeightClass}`}
                style={{
                  borderColor: `${theme.border}88`,
                  background: `linear-gradient(180deg, ${theme.accentSoft} 0%, #fafafa 55%, #f1f5f9 100%)`,
                }}
                aria-hidden
              >
                <div className="origin-center scale-100 sm:scale-105 lg:scale-110">
                  <StylePreview
                    style={opt.id}
                    surface={surface}
                    primaryColor={primaryColor}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PrimaryColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parsePrimaryColor(value);
  const pickerValue = parsed ?? "#2563EB";

  return (
    <div className="block space-y-2 text-sm">
      <FieldLabel label="Cor primária (opcional)" info={FIELD_HINTS.primaryColor} />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-bg p-1"
          aria-label="Selecionar cor primária"
        />
        <input
          type="text"
          name="primaryColor"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#2563EB ou 2563EB"
          className={`${fieldClass} min-w-[140px] flex-1 font-mono text-sm`}
          autoComplete="off"
        />
        {value.trim() ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Limpar
          </button>
        ) : null}
      </div>
      <span className="block text-xs text-muted">
        A prévia dos estilos abaixo atualiza em tempo real com a cor escolhida.
      </span>
    </div>
  );
}
