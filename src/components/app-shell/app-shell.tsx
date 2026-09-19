import { PageLabelsProvider } from "./page-labels";
import { MobileTabBar } from "./mobile-tab-bar";
import { Sidebar, type PeriodInfo } from "./sidebar";
import { Topbar, type ShellUser } from "./topbar";

// Khung ứng dụng (mục 8.5b): sidebar cố định trái (desktop) + topbar cố định + bottom tab bar (mobile).
// Thuần trình bày — dữ liệu người dùng/kỳ đánh giá do layout truyền vào.
export function AppShell({
  user,
  isQuanTri,
  period = null,
  unreadCount = 0,
  activeHref,
  children,
}: {
  user: ShellUser;
  isQuanTri: boolean;
  period?: PeriodInfo | null;
  unreadCount?: number;
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <PageLabelsProvider>
      <div className="min-h-screen bg-background">
        <Sidebar isQuanTri={isQuanTri} period={period} activeHref={activeHref} />
        <div className="md:pl-60">
          <Topbar user={user} isQuanTri={isQuanTri} unreadCount={unreadCount} />
          <main className="max-w-[1400px] p-4 pb-24 md:px-7 md:pt-2 md:pb-7">{children}</main>
        </div>
        <MobileTabBar />
      </div>
    </PageLabelsProvider>
  );
}
