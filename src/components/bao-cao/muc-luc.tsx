"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Mục lục "Xem nhanh" (mục 4.7) — theo dõi mục nào đang thực sự nằm trong tầm nhìn (IntersectionObserver) để tô đậm
// đúng chip tương ứng, nhờ đó biết đang xem báo cáo nào khi cuộn dài mà không cần liếc lại tiêu đề. rootMargin trừ đi
// khoảng topbar + thanh mục lục sticky (mục 8.5b) để "đường ngắm" nằm ngay dưới 2 lớp che đó, không phải mép trên cùng.
// Nơi gọi truyền key={nhom} để component được dựng lại (state active reset tự nhiên) khi đổi nhóm báo cáo.
export function MucLuc({ items }: { items: readonly { khoa: string; nhan: string }[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.khoa ?? null);

  useEffect(() => {
    const els = items.map((m) => document.getElementById(m.khoa)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const dangHien = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (dangHien.length > 0) setActive(dangHien[0].target.id);
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Mục lục báo cáo" className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="mr-0.5 text-muted-foreground/70">Xem nhanh:</span>
      {items.map((m) => (
        <Link
          key={m.khoa}
          href={`#${m.khoa}`}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1.5 font-medium transition-colors duration-150",
            m.khoa === active
              ? "border-primary bg-card text-primary shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              : "border-transparent bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          {m.nhan}
        </Link>
      ))}
    </nav>
  );
}
