import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { ViecCuaToi } from "@/lib/dang-ky/queries";

const VN_TZ = "Asia/Ho_Chi_Minh";

// Nhãn ngày HƯỚNG TƯƠNG LAI (khác nhomNgay ở lib/format.ts vốn hướng quá khứ, dùng cho thông báo) — đúng tinh thần
// mục 8.9: ưu tiên "Hôm nay / Ngày mai / Tuần này" thay vì lưới mini-calendar thu nhỏ, dùng chung mọi cỡ màn hình.
function nhanNgay(iso: string): string {
  const ngayVN = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: VN_TZ });
  const soNgay = Math.round((Date.parse(`${ngayVN(new Date(iso))}T00:00:00Z`) - Date.parse(`${ngayVN(new Date())}T00:00:00Z`)) / 86400000);
  if (soNgay <= 0) return "Hôm nay";
  if (soNgay === 1) return "Ngày mai";
  if (soNgay <= 6) return "Tuần này";
  return fmtDate(iso);
}

type SapToi = ViecCuaToi["da_phan_cong"];

// Timeline lịch dạy sắp tới (mục 4.7b) — dọc, có mốc ngày, thay cho danh sách text thuần hoặc lưới calendar thu nhỏ.
export function LichSapToi({ items }: { items: SapToi }) {
  const rutGon = items.slice(0, 4);
  const nhanNhom = rutGon.map((s) => nhanNgay(s.bai.bat_dau));
  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lịch dạy sắp tới
        </CardTitle>
        <CardAction>
          <Link href="/dang-ky#lich" className="text-xs font-medium text-primary hover:underline">
            Xem lịch tháng
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Bạn chưa có Bài nào sắp diễn ra." />
        ) : (
          <ol className="relative grid gap-0.5 border-l-2 border-border pl-4">
            {rutGon.map((s, i) => {
              const moiNhom = i === 0 || nhanNhom[i] !== nhanNhom[i - 1];
              return (
                <li key={s.slot_id} className="relative py-2">
                  <span className="absolute top-3.5 -left-[21px] size-2.5 rounded-full bg-brand-gradient" aria-hidden />
                  {moiNhom && <p className="mb-1 text-xs font-semibold text-muted-foreground">{nhanNhom[i]}</p>}
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
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
