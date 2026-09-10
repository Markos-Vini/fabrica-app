"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { USER_GUIDE_SECTIONS } from "@/lib/user-guide/sections";
import type { GuideBlock } from "@/lib/user-guide/types";

function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="text-sm leading-relaxed text-muted">{block.text}</p>;
    case "h3":
      return (
        <h3 className="pt-2 text-base font-semibold text-ink">{block.text}</h3>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-line bg-bg-2">
              <tr>
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-steel"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {block.rows.map((row) => (
                <tr key={row.join("-")} className="bg-panel/40">
                  <td className="px-4 py-3 align-top font-medium text-ink">
                    {row[0]}
                  </td>
                  <td className="px-4 py-3 align-top text-muted">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const styles =
        block.variant === "warn"
          ? "border-bad/40 bg-accent-bad text-bad"
          : block.variant === "tip"
            ? "border-copper/30 bg-accent-surface text-on-tint"
            : "border-line bg-bg-2 text-on-tint";
      return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
          {block.title ? (
            <p className="mb-1 font-medium text-ink">{block.title}</p>
          ) : null}
          <p className="leading-relaxed">{block.text}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export function UserGuideView() {
  const [activeId, setActiveId] = useState(USER_GUIDE_SECTIONS[0]?.id ?? "");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollingRef = useRef(false);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current.get(id);
    if (!el) return;
    scrollingRef.current = true;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollingRef.current = false;
    }, 600);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.getAttribute("data-section-id");
        if (top) setActiveId(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of USER_GUIDE_SECTIONS) {
      const el = sectionRefs.current.get(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 font-mono text-xs tracking-[0.25em] text-copper">
          SUMÁRIO
        </p>
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {USER_GUIDE_SECTIONS.map((section) => {
            const active = activeId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`block w-full shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition lg:shrink ${
                  active
                    ? "border-copper bg-accent-surface text-ink"
                    : "border-transparent text-muted hover:border-line hover:bg-bg-2 hover:text-ink"
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 space-y-10">
        {USER_GUIDE_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            data-section-id={section.id}
            ref={(node) => {
              if (node) sectionRefs.current.set(section.id, node);
            }}
            className="scroll-mt-6 space-y-4 rounded-2xl border border-line bg-panel p-5 sm:p-6"
          >
            <header className="space-y-1 border-b border-line pb-4">
              <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
              <p className="text-sm text-muted">{section.summary}</p>
            </header>
            <div className="space-y-4">
              {section.blocks.map((block, index) => (
                <GuideBlockView key={`${section.id}-${index}`} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
