import { describe, expect, it, vi } from "vitest";
import { complete, resolveProvider } from "./router";

describe("resolveProvider", () => {
  it("mapeia prefixos conhecidos para o provedor certo", () => {
    expect(resolveProvider("gpt-4o")).toBe("openai");
    expect(resolveProvider("o3-mini")).toBe("openai");
    expect(resolveProvider("claude-3-5-sonnet")).toBe("anthropic");
    expect(resolveProvider("gemini-2.0-flash")).toBe("gemini");
    expect(resolveProvider("composer-2.5")).toBe("cursor");
    expect(resolveProvider("cursor-auto")).toBe("cursor");
    expect(resolveProvider("llama3.1")).toBe("ollama");
  });
});

describe("complete", () => {
  it("não chama a rede em modo MOCK e devolve a resposta pré-definida", async () => {
    const fetchMock = vi.fn();
    const result = await complete({
      mockMode: true,
      model: "gpt-4o",
      messages: [{ role: "user", content: "olá" }],
      keys: { openai: "sk-test" },
      mockResponse: "PRD mockado",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      text: "PRD mockado",
      provider: "mock",
      usedMock: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha sem chave do provedor quando o MOCK está desligado", async () => {
    await expect(
      complete({
        mockMode: false,
        model: "gpt-4o",
        messages: [{ role: "user", content: "olá" }],
        keys: {},
      }),
    ).rejects.toThrow(/OpenAI/i);
  });
});
