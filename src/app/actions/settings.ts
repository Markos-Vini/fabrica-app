"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";

export async function saveSettingsAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    const agentModels: Record<string, string> = {};
    for (const agent of ["pm", "architect", "backend", "frontend", "qa", "devops"]) {
      const value = String(formData.get(`model_${agent}`) ?? "");
      if (value) agentModels[agent] = value;
    }
    await updateSettings({
      mockMode: formData.get("mockMode") === "on",
      buildGateEnabled: formData.get("buildGateEnabled") === "on",
      ollamaBaseUrl: String(formData.get("ollamaBaseUrl") ?? "").trim(),
      agentModels,
      publicBaseUrl: String(formData.get("publicBaseUrl") ?? "").trim(),
      openaiKey: String(formData.get("openaiKey") ?? ""),
      anthropicKey: String(formData.get("anthropicKey") ?? ""),
      geminiKey: String(formData.get("geminiKey") ?? ""),
      cursorKey: String(formData.get("cursorKey") ?? ""),
      githubToken: String(formData.get("githubToken") ?? ""),
      vercelToken: String(formData.get("vercelToken") ?? ""),
    });
    revalidatePath("/configuracoes");
    revalidatePath("/");
    revalidatePath("/pedidos/novo");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao salvar.",
    };
  }
}
