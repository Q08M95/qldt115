import type { LucideIcon } from "lucide-react";
import { TrendPill } from "@/components/trend-pill";
import { cn } from "@/lib/utils";

// KPI Stat Tile (mục 8.5 / 4.7b) theo ảnh mẫu: hàng 1 = icon outline xám-xanh + nhãn (không chevron: thẻ không bấm được);
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
    <div className={cn("rounded-2xl border border-transparent bg-card px-3 py-3 shadow-card sm:px-5 sm:py-4 dark:border-border", className)}>
      <div className="flex items-start gap-1.5 sm:items-center sm:gap-2">
        <Icon className="mt-px size-4 shrink-0 text-slate-500 sm:mt-0 sm:size-[18px] dark:text-slate-400" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 text-xs leading-tight font-medium text-foreground/70 sm:truncate sm:text-sm" title={label}>
          {label}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:mt-3">
        <span className="text-[22px] leading-none font-medium tabular-nums sm:text-[26px]">{value}</span>
        {trend !== undefined && <TrendPill value={trend} plain />}
      </div>
      {children}
    </div>
  );
}
