import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Trend pill (mục 8.5): icon mũi tên trong ô vuông nhỏ + %, xanh khi tăng, đỏ khi giảm.
// plain = không nền pill (như "10%" / "5%" trên thẻ stat trong ảnh mẫu); mặc định có nền nhạt.
export function TrendPill({ value, plain, className }: { value: number; plain?: boolean; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge
      variant={up ? "success" : "danger"}
      className={cn(plain && "h-auto overflow-visible bg-transparent p-0", className)}
    >
      <span className="flex size-4 items-center justify-center rounded-[5px] border border-current">
        <Icon className="size-3" aria-hidden />
      </span>
      <span className="tabular-nums">{Math.abs(value)}%</span>
    </Badge>
  );
}
