import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { TrendPill } from "@/components/trend-pill";
import { cn } from "@/lib/utils";

export type Hue = "blue" | "navy" | "teal" | "green";

const HUE_BADGE: Record<Hue, string> = {
  blue: "bg-grad-blue text-hue-blue",
  navy: "bg-grad-navy text-hue-navy",
  teal: "bg-grad-teal text-hue-teal",
  green: "bg-grad-green text-hue-green",
};

// Icon badge vuông bo góc, nền gradient của 1 trong 4 màu gốc (mục 8.1) — như icon cạnh "Products/Customers/Orders" trong ảnh mẫu.
export function IconBadge({ icon: Icon, hue = "blue", className }: { icon: LucideIcon; hue?: Hue; className?: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", HUE_BADGE[hue], className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

// KPI Stat Tile (mục 8.5 / 4.7b): icon badge + nhãn, số lớn tabular-nums, trend pill; children = sparkline (nếu có).
export function StatTile({
  icon,
  hue,
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
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-center gap-2">
        <IconBadge icon={icon} hue={hue} />
        <span className="flex-1 text-sm text-muted-foreground">{label}</span>
        <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-3xl leading-none font-bold tabular-nums">{value}</span>
        {trend !== undefined && <TrendPill value={trend} />}
      </div>
      {children}
    </div>
  );
}
