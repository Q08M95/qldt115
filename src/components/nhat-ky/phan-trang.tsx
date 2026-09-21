import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Phân trang dạng ‹ 1 2 3 … › (mục 8.5): giữ nguyên các tham số lọc trong URL
export function PhanTrang({ trang, tongTrang, hrefTrang }: { trang: number; tongTrang: number; hrefTrang: (t: number) => string }) {
  if (tongTrang <= 1) return null;
  const hien = new Set([1, tongTrang, trang - 1, trang, trang + 1]);
  const so = [...hien].filter((t) => t >= 1 && t <= tongTrang).sort((a, b) => a - b);
  const o = "flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors hover:bg-background";

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-1 px-5 pt-4">
      {trang > 1 ? (
        <Link href={hrefTrang(trang - 1)} className={o} aria-label="Trang trước">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(o, "opacity-30")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {so.map((t, i) => (
        <span key={t} className="flex items-center gap-1">
          {i > 0 && t - so[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={hrefTrang(t)}
            aria-current={t === trang ? "page" : undefined}
            className={cn(o, t === trang && "bg-brand-gradient font-semibold text-primary-foreground hover:bg-brand-gradient")}
          >
            {t}
          </Link>
        </span>
      ))}
      {trang < tongTrang ? (
        <Link href={hrefTrang(trang + 1)} className={o} aria-label="Trang sau">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(o, "opacity-30")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
