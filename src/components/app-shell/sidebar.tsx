"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
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
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">QLĐT</span>
    </Link>
  );
}

// Danh sách menu — dùng chung cho sidebar desktop và drawer hamburger mobile
export function NavList({ isQuanTri, onNavigate }: { isQuanTri: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Điều hướng chính">
      {NAV_GROUPS.map((group, i) => {
        const items = group.items.filter((it) => !it.quanTriOnly || isQuanTri);
        if (items.length === 0) return null;
        return (
          <div key={group.label ?? i} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
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
                      : "text-foreground/80 hover:bg-background hover:text-foreground",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
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

// Ô dưới cùng sidebar (vị trí "Upgrade plans" trong ảnh mẫu) — hiển thị Kỳ đánh giá hiện tại
export function PeriodCard({ period }: { period: PeriodInfo | null }) {
  return (
    <div className="rounded-2xl border bg-grad-blue p-4">
      <p className="text-xs font-medium text-hue-blue">Kỳ đánh giá hiện tại</p>
      {period ? (
        <>
          <p className="mt-1 text-sm font-semibold">{period.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">Còn {period.daysLeft} ngày đến khi đóng kỳ</p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Chưa có kỳ đang mở</p>
      )}
      <Button asChild size="sm" className="mt-3 w-full">
        <Link href="/danh-gia">Xem KPI của tôi</Link>
      </Button>
    </div>
  );
}

// Sidebar desktop cố định ~240px (mục 8.5b). Ẩn dưới md — mobile dùng MobileNav.
export function Sidebar({ isQuanTri, period }: { isQuanTri: boolean; period: PeriodInfo | null }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
      <BrandLogo />
      <div className="flex-1 overflow-y-auto">
        <NavList isQuanTri={isQuanTri} />
      </div>
      <PeriodCard period={period} />
    </aside>
  );
}
