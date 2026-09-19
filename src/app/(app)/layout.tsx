import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isQuanTri } = await requireSession();

  return (
    <AppShell
      user={{ name: profile.ho_ten, email: profile.email, avatarUrl: profile.avatar_url }}
      isQuanTri={isQuanTri}
    >
      {children}
    </AppShell>
  );
}
