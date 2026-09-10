import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { DEFAULT_AGENT_MODELS } from "@/lib/llm/model-catalog";
import { getSettings, saveSettings, type SettingRecord } from "@/lib/store";
import type { ProviderKeys } from "@/lib/types";

function encryptionKey(): string {
  return (
    process.env.FABRICA_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "fabrica-dev-key-nao-usar-em-producao"
  );
}

function decode(value: string | null): string {
  if (!value) return "";
  try {
    return decryptSecret(value, encryptionKey());
  } catch {
    return "";
  }
}

function encode(value: string): string {
  return encryptSecret(value, encryptionKey());
}

import type { FactoryMode } from "@/lib/factory-mode";

export type PublicSettings = {
  mockMode: boolean;
  factoryMode: FactoryMode;
  buildGateEnabled: boolean;
  ollamaBaseUrl: string;
  publicBaseUrl: string;
  agentModels: Record<string, string>;
  updatedAt: string;
  openaiConfigured: boolean;
  anthropicConfigured: boolean;
  geminiConfigured: boolean;
  cursorConfigured: boolean;
  githubConfigured: boolean;
  vercelConfigured: boolean;
  openaiMasked: string;
  anthropicMasked: string;
  geminiMasked: string;
  cursorMasked: string;
  githubMasked: string;
  vercelMasked: string;
};

export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  const openai = decode(s.openaiKey);
  const anthropic = decode(s.anthropicKey);
  const gemini = decode(s.geminiKey);
  const cursor = decode(s.cursorKey) || process.env.CURSOR_API_KEY?.trim() || "";
  const github = decode(s.githubToken);
  const vercel = decode(s.vercelToken);
  return {
    mockMode: s.mockMode,
    factoryMode: s.factoryMode ?? "app",
    buildGateEnabled: s.buildGateEnabled ?? true,
    ollamaBaseUrl: s.ollamaBaseUrl,
    publicBaseUrl: s.publicBaseUrl ?? "",
    agentModels: { ...DEFAULT_AGENT_MODELS, ...s.agentModels },
    updatedAt: s.updatedAt,
    openaiConfigured: Boolean(openai),
    anthropicConfigured: Boolean(anthropic),
    geminiConfigured: Boolean(gemini),
    cursorConfigured: Boolean(cursor),
    githubConfigured: Boolean(github),
    vercelConfigured: Boolean(vercel),
    openaiMasked: openai ? mask(openai) : "",
    anthropicMasked: anthropic ? mask(anthropic) : "",
    geminiMasked: gemini ? mask(gemini) : "",
    cursorMasked: cursor ? mask(cursor) : "",
    githubMasked: github ? mask(github) : "",
    vercelMasked: vercel ? mask(vercel) : "",
  };
}

function mask(value: string): string {
  if (value.length < 8) return "••••";
  return `••••${value.slice(-4)}`;
}

export async function getGithubToken(): Promise<string> {
  const s = await getSettings();
  return decode(s.githubToken);
}

export async function getVercelToken(): Promise<string> {
  const s = await getSettings();
  return decode(s.vercelToken);
}

export async function getProviderKeys(): Promise<ProviderKeys> {
  const s = await getSettings();
  const cursorFromStore = decode(s.cursorKey);
  return {
    openai: decode(s.openaiKey) || undefined,
    anthropic: decode(s.anthropicKey) || undefined,
    gemini: decode(s.geminiKey) || undefined,
    cursor:
      cursorFromStore ||
      process.env.CURSOR_API_KEY?.trim() ||
      undefined,
    ollamaBaseUrl: s.ollamaBaseUrl,
  };
}

export async function updateSettings(input: {
  mockMode?: boolean;
  factoryMode?: FactoryMode;
  buildGateEnabled?: boolean;
  ollamaBaseUrl?: string;
  publicBaseUrl?: string;
  agentModels?: Record<string, string>;
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  cursorKey?: string;
  githubToken?: string;
  vercelToken?: string;
}): Promise<SettingRecord> {
  const current = await getSettings();
  const patch: Partial<SettingRecord> = {};
  if (typeof input.mockMode === "boolean") patch.mockMode = input.mockMode;
  if (typeof input.buildGateEnabled === "boolean") {
    patch.buildGateEnabled = input.buildGateEnabled;
  }
  if (input.factoryMode === "app" || input.factoryMode === "planning") {
    patch.factoryMode = input.factoryMode;
  }
  if (input.ollamaBaseUrl !== undefined) patch.ollamaBaseUrl = input.ollamaBaseUrl;
  if (input.publicBaseUrl !== undefined) {
    patch.publicBaseUrl = input.publicBaseUrl.replace(/\/$/, "");
  }
  if (input.agentModels) {
    patch.agentModels = { ...DEFAULT_AGENT_MODELS, ...input.agentModels };
  }
  if (input.openaiKey?.trim()) patch.openaiKey = encode(input.openaiKey.trim());
  if (input.anthropicKey?.trim()) {
    patch.anthropicKey = encode(input.anthropicKey.trim());
  }
  if (input.geminiKey?.trim()) patch.geminiKey = encode(input.geminiKey.trim());
  if (input.cursorKey?.trim()) patch.cursorKey = encode(input.cursorKey.trim());
  if (input.githubToken?.trim()) patch.githubToken = encode(input.githubToken.trim());
  if (input.vercelToken?.trim()) patch.vercelToken = encode(input.vercelToken.trim());
  return saveSettings({ ...current, ...patch });
}
