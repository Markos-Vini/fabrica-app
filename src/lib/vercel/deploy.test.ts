import { describe, expect, it, vi } from "vitest";
import { deployToVercel } from "./deploy";

describe("deployToVercel", () => {
  it("envia os arquivos e devolve a URL https", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ url: "fabrica-cafe-delivery-abc.vercel.app" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await deployToVercel({
      token: "vercel_test",
      name: "fabrica-cafe-delivery",
      files: { "index.html": "<h1>Café</h1>" },
      fetchImpl,
    });

    expect(result.url).toBe("https://fabrica-cafe-delivery-abc.vercel.app");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.vercel.com/v13/deployments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("envia framework nextjs e variáveis de ambiente quando aplicável", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ url: "fabrica-educaflex.vercel.app" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await deployToVercel({
      token: "vercel_test",
      name: "fabrica-educaflex",
      files: {
        "package.json": JSON.stringify({ dependencies: { next: "15.0.0" } }),
      },
      env: { NEXT_PUBLIC_USE_MOCK_API: "true" },
      fetchImpl,
    });

    const body = JSON.parse(
      String((fetchImpl.mock.calls[0] as [string, RequestInit])[1]?.body),
    );
    expect(body.projectSettings).toEqual({ framework: "nextjs" });
    expect(body.env).toEqual({ NEXT_PUBLIC_USE_MOCK_API: "true" });
    expect(body.build).toEqual({ env: { NEXT_PUBLIC_USE_MOCK_API: "true" } });
    expect(body.target).toBe("production");
  });

  it("falha sem token", async () => {
    await expect(
      deployToVercel({
        token: "  ",
        name: "x",
        files: { "index.html": "oi" },
      }),
    ).rejects.toThrow(/token/i);
  });
});
