import type { ChatMessage } from "@/lib/types";

export function isCursorModel(model: string): boolean {
  const id = model.toLowerCase();
  return id.startsWith("composer") || id === "cursor-auto";
}

const CURSOR_MODEL_ALIASES: Record<string, string> = {
  "composer-2.5-fast": "composer-2.5",
};

export function cursorModelId(model: string): string {
  if (model === "cursor-auto") return "auto";
  return CURSOR_MODEL_ALIASES[model] ?? model;
}

export function messagesToPrompt(messages: ChatMessage[]): string {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const dialog = messages
    .filter((m) => m.role !== "system")
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n---\n\n");
  if (system && dialog) {
    return `${system}\n\n---\n\n${dialog}`;
  }
  return system || dialog;
}

export async function completeWithCursor(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  cwd?: string;
}): Promise<string> {
  const { Agent, CursorAgentError } = await import("@cursor/sdk");
  const prompt = messagesToPrompt(args.messages);

  try {
    const result = await Agent.prompt(prompt, {
      apiKey: args.apiKey,
      model: { id: cursorModelId(args.model) },
      local: {
        cwd: args.cwd ?? process.cwd(),
        settingSources: [],
      },
    });

    if (result.status === "error") {
      throw new Error(
        result.error?.message ?? `Cursor agent falhou (run ${result.id})`,
      );
    }

    return result.result?.trim() ?? "";
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(`Cursor: ${error.message}`);
    }
    throw error;
  }
}
