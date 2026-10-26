"use client";

import { hueLop, ngayVN, oLichThang, THU, type Thang } from "@/lib/lich";
import { cn } from "@/lib/utils";

export interface ChamLich {
  key: string;
  lopId: string;
  // Bài của lớp chưa mở đăng ký (Dự kiến công khai sớm) — chấm rỗng (chỉ viền) để không lẫn với màu lớp nhạt
  mo?: boolean;
}

// Lưới tháng dùng chung (Lịch dạy của tôi + Lịch lớp): ô ngày có chấm theo màu lớp (tối đa 3 + dấu "+"), ngày có Bài còn
// thiếu người được đánh dấu bằng 1 vạch đỏ nhạt dưới chấm. Chi tiết Bài của ngày đang chọn do component cha hiển thị.
export function LuoiThang({
  thang,
  theoNgay,
  thieuNguoi,
  chon,
  onChon,
}: {
  thang: Thang;
  theoNgay: Map<string, ChamLich[]>;
  thieuNguoi?: Set<string>;
  chon: string;
  onChon: (ngay: string) => void;
}) {
  const homNay = ngayVN(new Date());
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {THU.map((t) => (
        <span key={t} className="pb-1 text-xs font-medium text-muted-foreground">
          {t}
        </span>
      ))}
      {oLichThang(thang).map((o) => {
        const ds = theoNgay.get(o.khoa) ?? [];
        const thieu = thieuNguoi?.has(o.khoa);
        const dangChon = o.khoa === chon;
        return (
          <button
            key={o.khoa}
            type="button"
            onClick={() => onChon(o.khoa)}
            aria-pressed={dangChon}
            aria-label={`${o.ngay}/${o.khoa.slice(5, 7)}${ds.length ? `, ${ds.length} Bài` : ""}${thieu ? ", có Bài còn thiếu người" : ""}`}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-sm transition-all duration-150 sm:min-h-14",
              "hover:bg-muted",
              !o.trongThang && "text-muted-foreground/50",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full tabular-nums",
                dangChon ? "bg-brand-gradient font-semibold text-white" : o.khoa === homNay && "font-bold text-primary ring-2 ring-primary/40",
              )}
            >
              {o.ngay}
            </span>
            <span className="flex h-2 items-center gap-0.5" aria-hidden>
              {ds.slice(0, 3).map((c) => (
                <span key={c.key} className={cn("size-2 rounded-full", c.mo ? cn("border-[1.5px]", hueLop(c.lopId).vien) : hueLop(c.lopId).nen)} />
              ))}
              {ds.length > 3 && <span className="text-[10px] leading-none text-muted-foreground">+</span>}
            </span>
            {thieu && <span className="h-0.5 w-4 rounded-full bg-grad-danger-solid" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
