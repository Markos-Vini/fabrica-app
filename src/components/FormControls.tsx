"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { InfoTip } from "@/components/InfoTip";
import type { FieldHint } from "@/lib/field-hints";

/** Classes base compartilhadas por inputs nativos */
export const fieldClass =
  "w-full rounded-xl border border-line/90 bg-input px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition placeholder:text-steel/60 hover:border-line focus:border-copper/70 focus:ring-2 focus:ring-copper/15 disabled:cursor-not-allowed disabled:opacity-50";

export const selectClass = `${fieldClass} form-select cursor-pointer pr-10`;

export const textareaClass = `${fieldClass} min-h-[100px] resize-y leading-relaxed`;

export function choiceCardClass(selected: boolean, className = ""): string {
  return [
    "group relative w-full rounded-xl border p-4 text-left text-sm transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    selected
      ? "border-copper/80 bg-gradient-to-br from-accent-surface to-accent-surface-end shadow-[0_0_24px_rgba(212,137,74,0.12)] ring-1 ring-copper/25"
      : "border-line/80 bg-bg-2/80 hover:border-copper/35 hover:bg-bg-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function ChoiceIndicator({ selected, kind }: { selected: boolean; kind: "radio" | "check" }) {
  return (
    <span
      aria-hidden
      className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
        selected
          ? "border-copper bg-copper"
          : "border-line/90 bg-bg group-hover:border-copper/40"
      }`}
    >
      {selected ? (
        kind === "radio" ? (
          <span className="h-2 w-2 rounded-full bg-accent-soft" />
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-on-copper" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      ) : null}
    </span>
  );
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  badge,
  kind = "radio",
  className,
  showIndicator = true,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  kind?: "radio" | "check";
  className?: string;
  showIndicator?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={choiceCardClass(selected, `${showIndicator ? "pr-10" : ""} ${className ?? ""}`)}
    >
      {showIndicator ? <ChoiceIndicator selected={selected} kind={kind} /> : null}
      {badge ? <div className="mb-2">{badge}</div> : null}
      <span className="block font-medium text-ink">{title}</span>
      {description ? (
        <span className="mt-1 block text-xs leading-relaxed text-on-tint">{description}</span>
      ) : null}
      {children}
    </button>
  );
}

export function FormSection({
  title,
  hint,
  info,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  info?: FieldHint;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 rounded-2xl border border-line/80 bg-bg-2/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${className}`}>
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-ink">
          {title}
          {info ? <InfoTip {...info} ariaLabel={`Mais informações: ${title}`} /> : null}
        </p>
        {hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function FieldLabel({
  label,
  hint,
  info,
  required,
}: {
  label: string;
  hint?: string;
  info?: FieldHint;
  required?: boolean;
}) {
  return (
    <span className="block space-y-1">
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-copper-2">*</span> : null}
        {info ? <InfoTip {...info} ariaLabel={`Mais informações: ${label}`} /> : null}
      </span>
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </span>
  );
}

export function SectionLabel({
  title,
  hint,
  info,
}: {
  title: string;
  hint?: string;
  info?: FieldHint;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {title}
        {info ? <InfoTip {...info} ariaLabel={`Mais informações: ${title}`} /> : null}
      </p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormField({
  label,
  hint,
  info,
  required,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  info?: FieldHint;
  required?: boolean;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block space-y-2 text-sm ${className ?? ""}`}>
      <FieldLabel label={label} hint={hint} info={info} required={required} />
      <input required={required} className={fieldClass} {...props} />
    </label>
  );
}

export function FormTextarea({
  label,
  hint,
  info,
  required,
  rows = 4,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  info?: FieldHint;
  required?: boolean;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block space-y-2 text-sm ${className ?? ""}`}>
      <FieldLabel label={label} hint={hint} info={info} required={required} />
      <textarea required={required} rows={rows} className={textareaClass} {...props} />
    </label>
  );
}

export function FormSelect<T extends string>({
  label,
  hint,
  info,
  options,
  defaultValue,
  name,
  className,
}: {
  label: string;
  hint?: string;
  info?: FieldHint;
  options: readonly { id: T; label: string; hint?: string }[] | readonly string[];
  defaultValue?: T | string;
  name: string;
  className?: string;
}) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { id: opt, label: opt } : opt,
  );

  return (
    <label className={`block space-y-2 text-sm ${className ?? ""}`}>
      <FieldLabel label={label} hint={hint} info={info} />
      <select name={name} defaultValue={defaultValue} className={selectClass}>
        {normalized.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FieldsetLegend({
  children,
  info,
}: {
  children: ReactNode;
  info?: FieldHint;
}) {
  return (
    <legend className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-steel">
      {children}
      {info ? (
        <InfoTip {...info} ariaLabel={`Mais informações: ${String(children)}`} />
      ) : null}
    </legend>
  );
}

function CheckboxIndicator() {
  return (
    <span
      aria-hidden
      className="checkbox-indicator mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-line/90 bg-input transition group-has-[:checked]:border-copper group-has-[:checked]:bg-copper group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-copper/30"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-3 w-3 text-on-copper opacity-0 transition group-has-[:checked]:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function CheckboxCard({
  name,
  defaultChecked,
  checked,
  onChange,
  label,
  description,
  compact = false,
  disabled = false,
  className = "",
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const controlled = checked !== undefined;

  return (
    <label
      className={`group flex items-start gap-3 rounded-xl border border-line/70 bg-input/40 transition hover:border-copper/30 has-[:checked]:border-copper/55 has-[:checked]:bg-accent-surface/45 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/25 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${
        compact ? "px-3 py-2.5" : "px-3.5 py-3"
      } ${className}`}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={controlled ? checked : undefined}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer sr-only"
      />
      <CheckboxIndicator />
      <span className="min-w-0 flex-1">
        <span className={`block text-ink ${compact ? "text-sm" : "text-sm font-medium"}`}>
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function CheckboxGrid({
  legend,
  legendInfo,
  children,
  columns = 2,
}: {
  legend?: ReactNode;
  legendInfo?: FieldHint;
  children: ReactNode;
  columns?: 2 | 3;
}) {
  const gridClass =
    columns === 3
      ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-2 sm:grid-cols-2";

  return (
    <fieldset className="space-y-2">
      {legend ? (
        <FieldsetLegend info={legendInfo}>{legend}</FieldsetLegend>
      ) : null}
      <div className={gridClass}>{children}</div>
    </fieldset>
  );
}
