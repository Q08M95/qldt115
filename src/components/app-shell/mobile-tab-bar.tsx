"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, isActive } from "./nav-config";

// Bottom tab bar mobile (mục 8.9): 4 icon lớn dễ bấm ngón cái; touch target >= 44px.
// Tab có tham số (vd "Lịch" = /lop-hoc?xem=lich) chỉ sáng khi URL đúng tham số đó — chế độ Danh sách cùng đường dẫn thì không.
// useSearchParams cần Suspense (trang tĩnh); lúc chờ thì so theo đường dẫn như cũ.
export function MobileTabBar() {
  return (
    <Suspense fallback={<ThanhTab search={null} />}>
      <ThanhTabTheoUrl />
    </Suspense>
  );
}

function ThanhTabTheoUrl() {
  return <ThanhTab search={useSearchParams()} />;
}

function ThanhTab({ search }: { search: URLSearchParams | null }) {
  const pathname = usePathname();
  const khopThamSo = (href: string) => {
    const q = href.split("?")[1];
    if (!q || !search) return true;
    return [...new URLSearchParams(q)].every(([k, v]) => search.get(k) === v);
  };

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href) && khopThamSo(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-150",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-6" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
