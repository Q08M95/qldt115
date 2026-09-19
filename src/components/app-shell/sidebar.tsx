"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isActive } from "./nav-config";

export interface PeriodInfo {
  name: string;
  daysLeft: number;
}

export function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground">
        <GraduationCap className="size-[18px]" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">QLĐT</span>
    </Link>
  );
}

// Danh sách menu — dùng chung cho sidebar desktop và drawer hamburger mobile
export function NavList({
  isQuanTri,
  onNavigate,
  activeHref,
}: {
  isQuanTri: boolean;
  onNavigate?: () => void;
  // Ghi đè đường dẫn hiện tại (chỉ dùng cho trang demo /design)
  activeHref?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;

  return (
    <nav className="flex flex-col gap-[clamp(0.5rem,2.4vh,1.75rem)]" aria-label="Điều hướng chính">
      {NAV_GROUPS.map((group, i) => {
        const items = group.items.filter((it) => !it.quanTriOnly || isQuanTri);
        if (items.length === 0) return null;
        return (
          <div key={group.label ?? i} className="flex flex-col gap-[clamp(0.125rem,calc((100vh-560px)/12),1rem)]">
            {group.label && (
              <p className="px-3 text-xs font-medium tracking-wider text-muted-foreground/80 uppercase">
                {group.label}
              </p>
            )}
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(current, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-[clamp(2rem,4.8vh,2.6rem)] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 ease-out max-md:h-11",
                    active
                      ? "bg-brand-gradient text-primary-foreground shadow-card"
                      : "text-foreground/80 hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

// Ô dưới cùng sidebar (vị trí "Upgrade plans" trong ảnh mẫu) — bản gọn: 1 card nền tint nhạt,
// tiêu đề + 1 dòng kỳ/ngày còn lại + nút. Cố tình thấp để sidebar không phải scroll.
export function PeriodCard({ period }: { period: PeriodInfo | null }) {
  return (
    <div
      className="rounded-2xl border border-transparent bg-card p-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] dark:border-border"
      style={{ backgroundImage: "linear-gradient(135deg, var(--tint-lime), transparent 80%)" }}
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 shrink-0 text-hue-blue" strokeWidth={1.75} aria-hidden />
        <p className="text-[13px] font-semibold">Kỳ đánh giá hiện tại</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        {period ? (
          <>
            <span className="font-medium text-foreground">{period.name}</span> · còn {period.daysLeft} ngày
          </>
        ) : (
          "Chưa có kỳ đang mở"
        )}
      </p>
      <Button asChild size="sm" className="mt-2.5 h-9 w-full text-xs">
        <Link href="/danh-gia">Xem KPI của tôi</Link>
      </Button>
    </div>
  );
}

// Sidebar desktop cố định ~240px (mục 8.5b). Nền hòa cùng nền trang, không viền, KHÔNG scroll (ảnh mẫu):
// menu co giãn theo chiều cao màn hình; ô kỳ đánh giá ẩn khi màn hình quá thấp (<600px).
export function Sidebar({
  isQuanTri,
  period,
  activeHref,
}: {
  isQuanTri: boolean;
  period: PeriodInfo | null;
  activeHref?: string;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-hidden bg-sidebar px-4 pb-4 md:flex dark:border-r">
      {/* Hàng logo cao bằng topbar (88px) để logo và tiêu đề trang nằm cùng 1 đường ngang như ảnh mẫu */}
      <div className="flex h-[88px] shrink-0 items-center">
        <BrandLogo />
      </div>
      <div className="min-h-0 flex-1">
        <NavList isQuanTri={isQuanTri} activeHref={activeHref} />
      </div>
      <div className="mt-4 shrink-0 [@media(max-height:600px)]:hidden">
        <PeriodCard period={period} />
      </div>
    </aside>
  );
}
