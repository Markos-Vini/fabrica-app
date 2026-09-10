import { describe, expect, it } from "vitest";
import { detectVercelFramework } from "./detect-framework";

describe("detectVercelFramework", () => {
  it("detecta Next.js", () => {
    expect(
      detectVercelFramework({
        "package.json": JSON.stringify({ dependencies: { next: "15.0.0" } }),
      }),
    ).toBe("nextjs");
  });

  it("retorna null sem package.json", () => {
    expect(detectVercelFramework({ "index.html": "<h1>oi</h1>" })).toBeNull();
  });
});
