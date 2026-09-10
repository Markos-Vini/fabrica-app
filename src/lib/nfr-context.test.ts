import { describe, expect, it } from "vitest";
import {
  DEFAULT_NFR,
  nfrBriefForPrompt,
  nfrReviewSummary,
  nfrReviewSummaryFromForm,
  parseNfrFromForm,
  parseSyncMode,
} from "./nfr-context";
import type { OrderInput } from "@/lib/types";

const base: OrderInput = {
  name: "TaskList",
  problem: "Tarefas",
  audience: "Todos",
  businessRules: "RN-01",
  deliverableType: "C",
  mobileStack: "Flutter",
  frontendStack: "Next.js",
  backendStack: "Node.js",
  databaseStack: "MySQL",
  generateTestBuild: false,
  scopePreset: "full",
  includeMobile: true,
  includeFrontend: true,
  includeBackend: true,
  includeDatabase: true,
  includeAuth: true,
  includeAdmin: false,
};

describe("nfr-context", () => {
  it("parseia formulário e aplica defaults", () => {
    const fd = new FormData();
    fd.set("nfrOffline", "offline_read");
    fd.set("nfrSync", "realtime");
    fd.set("nfrScale", "large");
    fd.set("nfrLocales", "pt_en");
    fd.set("nfrPrivacy", "lgpd");
    fd.set("nfrNotes", "Backup diário");

    expect(parseNfrFromForm(fd)).toEqual({
      nfrOffline: "offline_read",
      nfrSync: "realtime",
      nfrScale: "large",
      nfrLocales: "pt_en",
      nfrPrivacy: "lgpd",
      nfrNotes: "Backup diário",
    });
    expect(parseSyncMode("invalid")).toBe(DEFAULT_NFR.nfrSync);
  });

  it("monta brief para prompts", () => {
    const brief = nfrBriefForPrompt({
      ...base,
      nfrSync: "realtime",
      nfrPrivacy: "lgpd",
    });
    expect(brief).toContain("Requisitos não funcionais");
    expect(brief).toContain("Tempo real");
    expect(brief).toContain("LGPD");
  });

  it("resume para revisão", () => {
    const summary = nfrReviewSummary({
      ...base,
      nfrOffline: "offline_full",
      nfrScale: "medium",
    });
    expect(summary).toContain("Offline-first");
    expect(summary).toContain("Média");
  });

  it("resume a partir do formulário", () => {
    const fd = new FormData();
    fd.set("nfrSync", "realtime");
    fd.set("nfrPrivacy", "sensitive");
    expect(nfrReviewSummaryFromForm(fd)).toContain("Tempo real");
    expect(nfrReviewSummaryFromForm(fd)).toContain("Dados sensíveis");
  });
});
