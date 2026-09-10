export const MODEL_OPTIONS = [
  {
    provider: "cursor",
    id: "composer-2.5",
    label: "Composer 2.5 (Cursor)",
  },
  {
    provider: "cursor",
    id: "composer-2",
    label: "Composer 2 (Cursor)",
  },
  {
    provider: "cursor",
    id: "cursor-auto",
    label: "Auto (Cursor — provisório)",
  },
  { provider: "openai", id: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { provider: "openai", id: "gpt-4o-mini", label: "GPT-4o mini (OpenAI)" },
  { provider: "openai", id: "o3-mini", label: "o3-mini (OpenAI)" },
  {
    provider: "anthropic",
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5 (Anthropic)",
  },
  {
    provider: "anthropic",
    id: "claude-3-5-sonnet-latest",
    label: "Claude 3.5 Sonnet (Anthropic)",
  },
  {
    provider: "gemini",
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash (Google)",
  },
  {
    provider: "gemini",
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro (Google)",
  },
] as const;

export type ModelOption = (typeof MODEL_OPTIONS)[number];

export function modelOptionsByProvider(
  options: readonly ModelOption[] = MODEL_OPTIONS,
): Record<string, ModelOption[]> {
  const groups: Record<string, ModelOption[]> = {};
  for (const opt of options) {
    groups[opt.provider] ??= [];
    groups[opt.provider].push(opt);
  }
  return groups;
}

export const MODEL_PROVIDER_LABELS: Record<string, string> = {
  cursor: "Cursor (provisório)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};

export const DEFAULT_AGENT_MODELS: Record<string, string> = {
  pm: "gpt-4o",
  architect: "gpt-4o",
  backend: "claude-sonnet-4-5",
  frontend: "claude-sonnet-4-5",
  qa: "gpt-4o",
  devops: "gpt-4o-mini",
};
