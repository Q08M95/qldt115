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
    <nav className="flex flex-col gap-4" aria-label="Điều hướng chính">
      {NAV_GROUPS.map((group, i) => {
        const items = group.items.filter((it) => !it.quanTriOnly || isQuanTri);
        if (items.length === 0) return null;
        return (
          <div key={group.label ?? i} className="flex flex-col gap-1.5 [@media(min-height:900px)]:gap-3">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-medium tracking-wider text-muted-foreground/80 uppercase">
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
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ease-out max-md:h-11",
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

// Ô dưới cùng sidebar (vị trí "Upgrade plans" trong ảnh mẫu): card trắng nổi nhẹ,
// bên trong là khối gradient nhạt + tiêu đề + mô tả, nút gradient brand bên dưới.
export function PeriodCard({ period }: { period: PeriodInfo | null }) {
  return (
    <div className="rounded-2xl border border-transparent bg-card p-2.5 shadow-card dark:border-border">
      <div
        className="rounded-xl p-3"
        style={{ backgroundImage: "linear-gradient(135deg, var(--tint-lime), transparent 85%)" }}
      >
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-hue-blue" strokeWidth={1.75} aria-hidden />
          <p className="text-sm font-semibold">Kỳ đánh giá hiện tại</p>
        </div>
        {period ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{period.name}</span>
            <br />
            <span className="tabular-nums">Còn {period.daysLeft} ngày đến khi đóng kỳ</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Chưa có kỳ đang mở</p>
        )}
      </div>
      <Button asChild className="mt-2.5 w-full">
        <Link href="/danh-gia">Xem KPI của tôi</Link>
      </Button>
    </div>
  );
}

// Sidebar desktop cố định ~240px (mục 8.5b). Nền hòa cùng nền trang, không viền (ảnh mẫu). Ẩn dưới md — mobile dùng MobileNav.
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 bg-sidebar p-4 md:flex dark:border-r">
      <BrandLogo />
      <div className="flex-1 overflow-y-auto">
        <NavList isQuanTri={isQuanTri} activeHref={activeHref} />
      </div>
      <PeriodCard period={period} />
    </aside>
  );
}
