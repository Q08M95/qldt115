"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { LuoiThang, type ChamLich } from "@/components/lich/luoi-thang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { congThang, hueLop, ngayVN, thangCua } from "@/lib/lich";
import { cn } from "@/lib/utils";
import type { BaiLich } from "@/lib/dang-ky/queries";

// Lịch tháng của tôi (mục 4.7b) — chỉ các Bài đã được phân công. Lưới tháng + danh sách Bài của ngày đang chọn ở dưới
// (mobile không cần lưới lớn: ô chỉ có chấm, chi tiết nằm ở danh sách — mục 8.9).
export function LichThang({ items }: { items: BaiLich[] }) {
  const homNay = ngayVN(new Date());
  const [thang, setThang] = useState(() => thangCua(homNay));
  const [chon, setChon] = useState(homNay);

  const theoNgay = useMemo(() => {
    const m = new Map<string, BaiLich[]>();
    for (const s of items) {
      const k = ngayVN(s.bai.bat_dau);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [items]);
  const chamTheoNgay = useMemo(
    () => new Map<string, ChamLich[]>([...theoNgay].map(([k, ds]) => [k, ds.map((s) => ({ key: s.slot_id, lopId: s.bai.lop_id }))])),
    [theoNgay],
  );

  const doiThang = (delta: number) => setThang(congThang(thang, delta));
  const veHomNay = () => {
    setThang(thangCua(homNay));
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
        <LuoiThang thang={thang} theoNgay={chamTheoNgay} chon={chon} onChon={setChon} />

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
