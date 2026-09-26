import type { LucideIcon } from "lucide-react";
import { TrendPill } from "@/components/trend-pill";
import { cn } from "@/lib/utils";

// Màu số liệu: đúng 4 màu gốc (mục 8.1), dùng biến solid --hue-* nên tự đổi sáng/tối theo dark mode.
export type MauSo = "navy" | "teal" | "green" | "blue";
const MAU_SO: Record<MauSo, string> = {
  navy: "text-[var(--hue-navy)]",
  teal: "text-[var(--hue-teal)]",
  green: "text-[var(--hue-green)]",
  blue: "text-[var(--hue-blue)]",
};

// KPI Stat Tile (mục 8.5 / 4.7b). Desktop theo ảnh mẫu: hàng 1 = icon outline xám-xanh + nhãn (không chevron: thẻ không bấm được);
// hàng 2 = số bên trái, trend pill (không nền) bên phải. Mobile: căn giữa như thẻ "KPI của tôi" — icon + nhãn (tối đa 2 dòng,
// các thẻ cùng chiều cao), số lớn, trend/chú thích dưới số. Số được tô 1 trong 4 màu gốc (prop `mau`, StatRow tự luân phiên).
// children = sparkline hoặc chú thích (nếu có).
export function StatTile({
  icon: Icon,
  label,
  value,
  trend,
  mau = "navy",
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;
  mau?: MauSo;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-transparent bg-card px-3 py-3 text-center shadow-card sm:px-5 sm:py-4 sm:text-left dark:border-border", className)}>
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
        <Icon className="size-4 shrink-0 text-slate-500 sm:size-[18px] dark:text-slate-400" strokeWidth={1.75} aria-hidden />
        <span
          className="line-clamp-2 min-h-8 min-w-0 text-xs leading-tight font-medium text-foreground/70 sm:line-clamp-none sm:min-h-0 sm:flex-1 sm:truncate sm:text-sm"
          title={label}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 flex flex-col items-center gap-1 sm:mt-3 sm:flex-row sm:justify-between sm:gap-2">
        <span className={cn("text-[24px] leading-none font-semibold tabular-nums sm:text-[26px]", MAU_SO[mau])}>{value}</span>
        {trend !== undefined && <TrendPill value={trend} plain />}
      </div>
      {children}
    </div>
  );
}
