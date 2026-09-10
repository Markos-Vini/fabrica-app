"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { FieldHint } from "@/lib/field-hints";

type InfoTipProps = FieldHint & {
  ariaLabel?: string;
};

export function InfoTip({
  text,
  helpHref,
  ariaLabel = "Mais informações sobre este campo",
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="group/info relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        title={text}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-steel/50 text-[10px] font-bold leading-none text-steel transition hover:border-copper hover:text-copper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper/40"
      >
        i
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-line bg-bg px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-muted shadow-xl transition-opacity duration-150 sm:w-72 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover/info:pointer-events-auto group-hover/info:opacity-100 group-focus-within/info:pointer-events-auto group-focus-within/info:opacity-100"
        }`}
      >
        {text}
        {helpHref ? (
          <Link
            href={helpHref}
            className="mt-2 inline-block text-copper-2 underline-offset-2 hover:underline"
            onClick={() => setOpen(false)}
          >
            Ver mais na ajuda →
          </Link>
        ) : null}
      </span>
    </span>
  );
}
