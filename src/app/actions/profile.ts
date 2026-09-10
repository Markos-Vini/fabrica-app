"use server";

import { revalidatePath } from "next/cache";
import { changeUserPassword } from "@/lib/store";
import { requireSession } from "@/lib/session";

export async function changeOwnPasswordAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireSession();
  try {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!currentPassword || !newPassword) {
      return { error: "Preencha a senha atual e a nova senha." };
    }
    if (newPassword !== confirmPassword) {
      return { error: "A confirmação não coincide com a nova senha." };
    }
    if (newPassword === currentPassword) {
      return { error: "A nova senha deve ser diferente da atual." };
    }

    await changeUserPassword(user.id, currentPassword, newPassword);
    revalidatePath("/perfil");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao alterar senha.",
    };
  }
}
