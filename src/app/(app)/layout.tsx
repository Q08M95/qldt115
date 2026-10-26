import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getKyHienTai } from "@/lib/kpi/queries";
import { getSoChuaDoc } from "@/lib/thong-bao/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, isQuanTri }, ky, soChuaDoc] = await Promise.all([requireSession(), getKyHienTai(), getSoChuaDoc()]);

  return (
    <AppShell
      user={{ id: profile.id, name: profile.ho_ten, email: profile.email, avatarUrl: profile.avatar_url }}
      isQuanTri={isQuanTri}
      period={ky}
      unreadCount={soChuaDoc}
    >
      {children}
    </AppShell>
  );
}
