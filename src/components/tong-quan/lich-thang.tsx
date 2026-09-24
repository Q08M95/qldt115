"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { cn } from "@/lib/utils";
import type { BaiLich } from "@/lib/dang-ky/queries";

const VN_TZ = "Asia/Ho_Chi_Minh";
const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const ngayVN = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: VN_TZ }); // YYYY-MM-DD
// Mỗi lớp 1 màu trong 4 màu gốc (theo mã lớp, ổn định giữa các lần xem) để nhìn lịch biết ngay Bài nào cùng lớp
const HUE = [
  { nen: "bg-grad-blue", chu: "text-[var(--hue-blue-on)]", vien: "border-[var(--hue-blue)]" },
  { nen: "bg-grad-navy", chu: "text-[var(--hue-navy-on)]", vien: "border-[var(--hue-navy)]" },
  { nen: "bg-grad-teal", chu: "text-[var(--hue-teal-on)]", vien: "border-[var(--hue-teal)]" },
  { nen: "bg-grad-green", chu: "text-[var(--hue-green-on)]", vien: "border-[var(--hue-green)]" },
] as const;
const hueLop = (lopId: string) => HUE[[...lopId].reduce((a, c) => a + c.charCodeAt(0), 0) % 4];
const pad = (n: number) => String(n).padStart(2, "0");

// Lịch tháng của tôi (mục 4.7b) — chỉ các Bài đã được phân công. Lưới tháng + danh sách Bài của ngày đang chọn ở dưới
// (mobile không cần lưới lớn: ô chỉ có chấm, chi tiết nằm ở danh sách — mục 8.9).
export function LichThang({ items }: { items: BaiLich[] }) {
  const homNay = ngayVN(new Date());
  const [thang, setThang] = useState(() => ({ nam: Number(homNay.slice(0, 4)), thang: Number(homNay.slice(5, 7)) }));
  const [chon, setChon] = useState(homNay);

  const theoNgay = useMemo(() => {
    const m = new Map<string, BaiLich[]>();
    for (const s of items) {
      const k = ngayVN(s.bai.bat_dau);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [items]);

  // Lưới bắt đầu từ Thứ Hai của tuần chứa ngày 1, dùng UTC thuần để không lệch múi giờ
  const oLich = useMemo(() => {
    const dauThang = new Date(Date.UTC(thang.nam, thang.thang - 1, 1));
    const lui = (dauThang.getUTCDay() + 6) % 7;
    const soNgay = new Date(Date.UTC(thang.nam, thang.thang, 0)).getUTCDate();
    const soO = Math.ceil((lui + soNgay) / 7) * 7;
    return Array.from({ length: soO }, (_, i) => {
      const d = new Date(Date.UTC(thang.nam, thang.thang - 1, 1 - lui + i));
      return { khoa: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, ngay: d.getUTCDate(), trongThang: d.getUTCMonth() === thang.thang - 1 };
    });
  }, [thang]);

  const doiThang = (delta: number) => {
    const d = new Date(Date.UTC(thang.nam, thang.thang - 1 + delta, 1));
    setThang({ nam: d.getUTCFullYear(), thang: d.getUTCMonth() + 1 });
  };
  const veHomNay = () => {
    setThang({ nam: Number(homNay.slice(0, 4)), thang: Number(homNay.slice(5, 7)) });
    setChon(homNay);
  };

  const baiCuaNgay = theoNgay.get(chon) ?? [];
  const [cy, cm, cd] = chon.split("-");

  return (
    <Card id="lich" className="scroll-mt-24 gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lịch dạy của tôi
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={veHomNay}>
            Hôm nay
          </Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Tháng trước" onClick={() => doiThang(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Tháng sau" onClick={() => doiThang(1)}>
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-center text-sm font-semibold tabular-nums" aria-live="polite">
          Tháng {thang.thang}/{thang.nam}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {THU.map((t) => (
            <span key={t} className="pb-1 text-xs font-medium text-muted-foreground">
              {t}
            </span>
          ))}
          {oLich.map((o) => {
            const ds = theoNgay.get(o.khoa) ?? [];
            const laHomNay = o.khoa === homNay;
            const dangChon = o.khoa === chon;
            const hue = ds.length ? hueLop(ds[0].bai.lop_id) : null;
            return (
              <button
                key={o.khoa}
                type="button"
                onClick={() => setChon(o.khoa)}
                aria-pressed={dangChon}
                aria-label={`${o.ngay}/${o.khoa.slice(5, 7)}${ds.length ? `, ${ds.length} Bài` : ""}`}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-transparent py-1 text-sm transition-all duration-150 sm:min-h-14",
                  hue ? `${hue.nen} ${hue.chu} font-semibold hover:brightness-95` : "hover:bg-muted",
                  !o.trongThang && (hue ? "opacity-50" : "text-muted-foreground/50"),
                  dangChon && "border-primary shadow-card",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full tabular-nums",
                    laHomNay && "bg-card font-bold text-primary ring-2 ring-primary",
                  )}
                >
                  {o.ngay}
                </span>
                <span className="flex h-2 items-center gap-0.5" aria-hidden>
                  {ds.slice(0, 3).map((s) => (
                    <span key={s.slot_id} className={cn("size-1.5 rounded-full ring-2 ring-white/90", hueLop(s.bai.lop_id).nen)} />
                  ))}
                  {ds.length > 3 && <span className="text-[10px] leading-none text-muted-foreground">+</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {chon === homNay ? "Hôm nay, " : ""}
            {cd}/{cm}/{cy}
          </p>
          {baiCuaNgay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có Bài nào trong ngày này.</p>
          ) : (
            <ul className="grid gap-2">
              {baiCuaNgay.map((s) => (
                <li key={s.slot_id} className={cn("rounded-lg border-l-4 bg-muted/50 px-3 py-2", hueLop(s.bai.lop_id).vien)}>
                  <Link href={`/lop-hoc/${s.bai.lop_id}`} className="block truncate text-sm font-medium hover:underline">
                    {s.bai.ten}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {fmtTime(s.bai.bat_dau)}–{fmtTime(s.bai.ket_thuc)}
                    </span>
                    <span className="truncate">{s.bai.lop_ten}</span>
                    <Badge variant="success" className="h-5">
                      {VAI_TRO_LABEL[s.vai_tro]}
                    </Badge>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
