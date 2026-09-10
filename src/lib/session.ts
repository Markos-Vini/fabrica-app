import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, parseSessionUserId } from "@/lib/auth";
import { sessionSecret } from "@/lib/env";
import { getUserById, type SessionUser } from "@/lib/store";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  const userId = parseSessionUserId(token, sessionSecret());
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user || !user.active) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "admin") redirect("/");
  return user;
}
