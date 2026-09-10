import { describe, expect, it } from "vitest";
import { mermaidLabel, mermaidNode } from "./mermaid-label";

describe("mermaid-label", () => {
  it("coloca aspas em rótulos com parênteses", () => {
    expect(mermaidNode("App", "Flutter (Dart)")).toBe('App["Flutter (Dart)"]');
  });

  it("escapa aspas duplas no texto", () => {
    expect(mermaidLabel('Say "hi"')).toBe('"Say \'hi\'"');
  });
});
