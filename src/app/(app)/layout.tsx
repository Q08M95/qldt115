import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getKyHienTai } from "@/lib/kpi/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, isQuanTri }, ky] = await Promise.all([requireSession(), getKyHienTai()]);

  return (
    <AppShell
      user={{ name: profile.ho_ten, email: profile.email, avatarUrl: profile.avatar_url }}
      isQuanTri={isQuanTri}
      period={ky}
    >
      {children}
    </AppShell>
  );
}
