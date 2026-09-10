import { AppShell } from "@/components/AppShell";
import { getPublicSettings } from "@/lib/settings";
import { requireSession } from "@/lib/session";

export async function AppFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, user] = await Promise.all([
    getPublicSettings(),
    requireSession(),
  ]);

  return (
    <AppShell mockMode={settings.mockMode} user={user}>
      {children}
    </AppShell>
  );
}
