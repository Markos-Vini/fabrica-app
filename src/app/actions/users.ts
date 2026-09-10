"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  createUser,
  resetUserPassword,
  setUserActive,
  type UserRole,
} from "@/lib/store";

export async function createUserAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    const role = String(formData.get("role") ?? "member") as UserRole;
    if (role !== "admin" && role !== "member") {
      return { error: "Papel inválido." };
    }
    await createUser({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      role,
    });
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao criar usuário.",
    };
  }
}

export async function toggleUserActiveAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdmin();
  try {
    const userId = String(formData.get("userId") ?? "");
    const nextActive = formData.get("active") === "true";
    if (!userId) {
      return { error: "Usuário inválido." };
    }
    if (userId === admin.id && !nextActive) {
      return { error: "Você não pode desativar a própria conta." };
    }
    await setUserActive(userId, nextActive);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao atualizar usuário.",
    };
  }
}

export async function resetUserPasswordAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    const userId = String(formData.get("userId") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!userId) {
      return { error: "Usuário inválido." };
    }
    await resetUserPassword(userId, password);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao redefinir senha.",
    };
  }
}
