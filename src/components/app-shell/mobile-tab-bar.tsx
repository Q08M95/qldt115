"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, isActive } from "./nav-config";

// Bottom tab bar mobile (mục 8.9): 4 icon lớn dễ bấm ngón cái; touch target >= 44px.
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
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
