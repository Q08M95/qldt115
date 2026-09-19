import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Trend pill (mục 8.5): mũi tên nhỏ + %, xanh khi tăng, đỏ khi giảm — như "↑12%" / "▽5%" trong ảnh mẫu.
export function TrendPill({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <Badge variant={up ? "success" : "danger"} className={className}>
      <Icon aria-hidden />
      <span className="tabular-nums">{Math.abs(value)}%</span>
    </Badge>
  );
}
