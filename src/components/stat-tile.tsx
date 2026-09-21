import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { TrendPill } from "@/components/trend-pill";
import { cn } from "@/lib/utils";

// KPI Stat Tile (mục 8.5 / 4.7b) theo ảnh mẫu: hàng 1 = icon outline xám-xanh + nhãn + chevron;
// hàng 2 = số bên trái, trend pill (không nền) bên phải. children = sparkline (nếu có).
export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-transparent bg-card px-5 py-4 shadow-card dark:border-border", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-[18px] shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/70" title={label}>
          {label}
        </span>
        <ChevronRight className="size-4 text-muted-foreground/70" aria-hidden />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[26px] leading-none font-medium tabular-nums">{value}</span>
        {trend !== undefined && <TrendPill value={trend} plain />}
      </div>
      {children}
    </div>
  );
}
