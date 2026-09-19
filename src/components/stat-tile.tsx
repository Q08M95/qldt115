import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { TrendPill } from "@/components/trend-pill";
import { cn } from "@/lib/utils";

export type Hue = "blue" | "navy" | "teal" | "green";

const HUE_ICON: Record<Hue, string> = {
  blue: "text-hue-blue",
  navy: "text-hue-navy",
  teal: "text-hue-teal",
  green: "text-hue-green",
};

// KPI Stat Tile (mục 8.5 / 4.7b) theo ảnh mẫu: hàng 1 = icon outline màu + nhãn + chevron;
// hàng 2 = số lớn bên trái, trend pill bên phải. children = sparkline (nếu có).
export function StatTile({
  icon: Icon,
  hue = "blue",
  label,
  value,
  trend,
  children,
  className,
}: {
  icon: LucideIcon;
  hue?: Hue;
  label: string;
  value: string | number;
  trend?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-transparent bg-card px-5 py-4 shadow-card dark:border-border", className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("size-5 shrink-0", HUE_ICON[hue])} strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-sm text-muted-foreground">{label}</span>
        <ChevronRight className="size-4 text-muted-foreground/70" aria-hidden />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-2xl leading-none font-semibold tabular-nums">{value}</span>
        {trend !== undefined && <TrendPill value={trend} />}
      </div>
      {children}
    </div>
  );
}
