import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Trend pill (mục 8.5): icon mũi tên trong ô vuông nhỏ + %, xanh khi tăng, đỏ khi giảm — như "10%" / "5%" trong ảnh mẫu.
export function TrendPill({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={up ? "success" : "danger"} className={className}>
      <span className="flex size-4 items-center justify-center rounded-[5px] border border-current">
        <Icon className="size-3" aria-hidden />
      </span>
      <span className="tabular-nums">{Math.abs(value)}%</span>
    </Badge>
  );
}
