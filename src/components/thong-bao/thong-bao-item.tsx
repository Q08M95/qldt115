"use client";

import { Badge } from "@/components/ui/badge";
import { ICON_MAC_DINH, ICON_THONG_BAO } from "@/lib/thong-bao/hien-thi";
import { tuongDoi } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ThongBao } from "@/types/database";

// 1 dòng thông báo (mục 8.7): icon theo loại + nội dung + thời gian tương đối.
// "Cần hành động" chưa xử lý: viền trái brand + icon navy để nổi hơn "thông tin".
export function ThongBaoItem({ tb, onChon }: { tb: ThongBao; onChon: (tb: ThongBao) => void }) {
  const Icon = ICON_THONG_BAO[tb.loai] ?? ICON_MAC_DINH;
  const canHanhDong = tb.muc_do === "can_hanh_dong" && !tb.da_doc;

  return (
    <button
      type="button"
      onClick={() => onChon(tb)}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left outline-none transition-colors duration-150 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/40",
        // Thanh dọc gradient bên trái đánh dấu thông báo cần hành động (mục 8.7)
        canHanhDong && "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[linear-gradient(180deg,var(--brand-from),var(--brand-to))]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          canHanhDong ? "bg-grad-navy text-hue-navy-on" : "bg-grad-blue text-hue-blue-on",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-snug", tb.da_doc ? "font-medium text-foreground/75" : "font-semibold")}>{tb.tieu_de}</span>
        {tb.noi_dung && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">{tb.noi_dung}</span>}
        <span className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span suppressHydrationWarning>{tuongDoi(tb.created_at)}</span>
          {canHanhDong && <Badge variant="default">Cần hành động</Badge>}
        </span>
      </span>
      {!tb.da_doc && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-gradient" role="img" aria-label="Chưa đọc" />}
    </button>
  );
}
