import { describe, expect, it } from "vitest";
import { buildRepublishNotice } from "./republish-notice";

describe("buildRepublishNotice", () => {
  it("confirma GitHub e Vercel quando ambos ok", () => {
    expect(
      buildRepublishNotice({
        githubUrl: "https://github.com/o/r",
        githubError: null,
        vercelUrl: "https://app.vercel.app",
        vercelError: null,
        includeFrontend: true,
        vercelConfigured: true,
      }),
    ).toEqual({
      tone: "ok",
      text: "Republicado no GitHub e na Vercel.",
    });
  });

  it("avisa quando Vercel falha mas GitHub ok", () => {
    expect(
      buildRepublishNotice({
        githubUrl: "https://github.com/o/r",
        githubError: null,
        vercelUrl: null,
        vercelError: "Project not found",
        includeFrontend: true,
        vercelConfigured: true,
      }).tone,
    ).toBe("bad");
  });
});
