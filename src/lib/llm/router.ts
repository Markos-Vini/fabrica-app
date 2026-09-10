import type { ChatMessage, LlmProviderId, ProviderKeys } from "@/lib/types";
import { completeWithCursor, isCursorModel } from "@/lib/llm/cursor-provider";

export type CompleteOptions = {
  mockMode: boolean;
  model: string;
  messages: ChatMessage[];
  keys: ProviderKeys;
  mockResponse?: string;
  fetchImpl?: typeof fetch;
  /** Workspace isolado do pedido — usado pelo Cursor SDK (nunca a raiz da fábrica). */
  agentCwd?: string;
};

export type CompleteResult = {
  text: string;
  provider: string;
  usedMock: boolean;
};

export function resolveProvider(model: string): LlmProviderId {
  const id = model.toLowerCase();
  if (isCursorModel(model)) return "cursor";
  if (id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3")) {
    return "openai";
  }
  if (id.startsWith("claude")) return "anthropic";
  if (id.startsWith("gemini")) return "gemini";
  return "ollama";
}

const PROVIDER_LABEL: Record<LlmProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  ollama: "Ollama",
  cursor: "Cursor",
};

export async function complete(options: CompleteOptions): Promise<CompleteResult> {
  if (options.mockMode) {
    return {
      text: options.mockResponse ?? "[MOCK] resposta pré-definida",
      provider: "mock",
      usedMock: true,
    };
  }

  const provider = resolveProvider(options.model);
  const key = keyFor(provider, options.keys);
  if (provider !== "ollama" && provider !== "cursor" && !key) {
    throw new Error(
      `Chave da ${PROVIDER_LABEL[provider]} não configurada. Ative o modo MOCK ou cadastre a chave em Configurações.`,
    );
  }
  if (provider === "cursor" && !key) {
    throw new Error(
      "Chave do Cursor não configurada. Gere em cursor.com/dashboard/integrations ou defina CURSOR_API_KEY no .env.",
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const text = await callProvider({
    provider,
    model: options.model,
    messages: options.messages,
    keys: options.keys,
    fetchImpl,
    agentCwd: options.agentCwd,
  });

  return { text, provider, usedMock: false };
}

function keyFor(provider: LlmProviderId, keys: ProviderKeys): string | undefined {
  if (provider === "openai") return keys.openai;
  if (provider === "anthropic") return keys.anthropic;
  if (provider === "gemini") return keys.gemini;
  if (provider === "cursor") return keys.cursor;
  return keys.ollamaBaseUrl;
}

async function callProvider(args: {
  provider: LlmProviderId;
  model: string;
  messages: ChatMessage[];
  keys: ProviderKeys;
  fetchImpl: typeof fetch;
  agentCwd?: string;
}): Promise<string> {
  const { provider, model, messages, keys, fetchImpl, agentCwd } = args;

  if (provider === "openai") {
    const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.openai}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `OpenAI HTTP ${res.status}`);
    }
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": keys.anthropic ?? "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: system || undefined,
        messages: messages.filter((m) => m.role !== "system"),
      }),
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      content?: { text?: string }[];
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Anthropic HTTP ${res.status}`);
    }
    return data.content?.map((c) => c.text ?? "").join("\n") ?? "";
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const system = messages.find((m) => m.role === "system")?.content;
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      }),
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
    }
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("\n") ?? ""
    );
  }

  if (provider === "cursor") {
    return completeWithCursor({
      apiKey: keys.cursor ?? "",
      model,
      messages,
      cwd: agentCwd,
    });
  }

  const base = (keys.ollamaBaseUrl || "http://localhost:11434").replace(
    /\/$/,
    "",
  );
  const res = await fetchImpl(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  const data = (await res.json()) as {
    error?: string;
    message?: { content?: string };
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Ollama HTTP ${res.status}`);
  }
  return data.message?.content ?? "";
}
