"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { LuoiThang, type ChamLich } from "@/components/lich/luoi-thang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTime } from "@/lib/format";
import { hueLop, ngayVN, type Thang } from "@/lib/lich";
import { TRANG_THAI_LOP_LABEL, TRANG_THAI_LOP_VARIANT } from "@/lib/lop-hoc/labels";
import type { LichLopRow } from "@/lib/lop-hoc/queries";
import { cn } from "@/lib/utils";
import type { TrangThaiLopHienThi } from "@/types/database";

const conThieu = (b: LichLopRow) => b.gv_da < b.gv_tong || b.tg_da < b.tg_tong;

// Lịch lớp toàn đơn vị (mục 4.2/4.3): mọi Bài của lớp đang mở + lớp Dự kiến đã công khai sớm, để GV/TG biết trước và chủ động
// sắp xếp thời gian. Chuyển tháng bằng liên kết (máy chủ tải lại đúng 1 tháng), chọn ngày ở phía trình duyệt.
export function LichLop({
  items,
  thang,
  hrefTruoc,
  hrefSau,
  hrefHomNay,
  laGvTg,
}: {
  items: LichLopRow[];
  thang: Thang;
  hrefTruoc: string;
  hrefSau: string;
  hrefHomNay: string;
  // Người xem có hồ sơ GV/TG: hiện các nhãn riêng "Bạn dạy" / "Trùng lịch của bạn" / "Phù hợp với bạn"
  laGvTg: boolean;
}) {
  const homNay = ngayVN(new Date());
  // Mốc "bây giờ" chốt 1 lần khi dựng (render phải thuần — không gọi Date.now() mỗi lần vẽ lại)
  const [now] = useState(() => Date.now());
  const thangHienTai = homNay.slice(0, 7) === `${thang.nam}-${String(thang.thang).padStart(2, "0")}`;

  const theoNgay = useMemo(() => {
    const m = new Map<string, LichLopRow[]>();
    for (const b of items) {
      const k = ngayVN(b.bat_dau);
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return m;
  }, [items]);

  const { cham, thieuNguoi } = useMemo(() => {
    const cham = new Map<string, ChamLich[]>();
    const thieuNguoi = new Set<string>();
    for (const [k, ds] of theoNgay) {
      cham.set(k, ds.map((b) => ({ key: b.bai_id, lopId: b.lop_id, mo: b.trang_thai_hien_thi === "nhap" })));
      if (ds.some((b) => conThieu(b) && Date.parse(b.bat_dau) > now)) thieuNguoi.add(k);
    }
    return { cham, thieuNguoi };
  }, [theoNgay, now]);

  // Mặc định: hôm nay nếu đang xem tháng hiện tại, không thì ngày đầu tiên có Bài trong tháng
  const [chon, setChon] = useState(() => {
    if (thangHienTai) return homNay;
    const tienTo = `${thang.nam}-${String(thang.thang).padStart(2, "0")}`;
    return [...theoNgay.keys()].filter((k) => k.startsWith(tienTo)).sort()[0] ?? `${tienTo}-01`;
  });

  // Chỉ đếm Bài trong tháng đang xem (lưới còn hiện vài ngày mờ của tháng trước/sau)
  const tienToThang = `${thang.nam}-${String(thang.thang).padStart(2, "0")}`;
  const trongThang = items.filter((b) => ngayVN(b.bat_dau).startsWith(tienToThang));
  const soLop = new Set(trongThang.map((b) => b.lop_id)).size;
  const baiCuaNgay = theoNgay.get(chon) ?? [];
  const [cy, cm, cd] = chon.split("-");

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lịch các lớp
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          {!thangHienTai && (
            <Button asChild variant="ghost" size="sm">
              <Link href={hrefHomNay}>Hôm nay</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href={hrefTruoc} aria-label="Tháng trước">
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href={hrefSau} aria-label="Tháng sau">
              <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        <div className="grid content-start gap-3">
          <p className="text-center text-sm font-semibold tabular-nums" aria-live="polite">
            Tháng {thang.thang}/{thang.nam}
            <span className="ml-2 font-normal text-muted-foreground">
              · {trongThang.length} Bài, {soLop} lớp
            </span>
          </p>
          <LuoiThang thang={thang} theoNgay={cham} thieuNguoi={thieuNguoi} chon={chon} onChon={setChon} />
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-grad-teal" aria-hidden /> Mỗi màu 1 lớp
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border-[1.5px] border-[var(--hue-teal)]" aria-hidden /> Lớp sắp mở
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-grad-danger-solid" aria-hidden /> Còn thiếu người
            </li>
          </ul>
        </div>

        <div className="border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {chon === homNay ? "Hôm nay, " : ""}
            {cd}/{cm}/{cy}
          </p>
          {baiCuaNgay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có Bài nào trong ngày này. Chọn ngày có chấm màu để xem các Bài.</p>
          ) : (
            <ul className="grid gap-2">
              {baiCuaNgay.map((b) => (
                <BaiTrenLich key={b.bai_id} b={b} laGvTg={laGvTg} now={now} />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BaiTrenLich({ b, laGvTg, now }: { b: LichLopRow; laGvTg: boolean; now: number }) {
  const tt = b.trang_thai_hien_thi as TrangThaiLopHienThi;
  const daQua = Date.parse(b.bat_dau) <= now;
  return (
    <li className={cn("grid gap-1.5 rounded-lg border-l-4 bg-muted/50 px-3 py-2", hueLop(b.lop_id).vien)}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/lop-hoc/${b.lop_id}`} className="min-w-0 text-sm font-medium hover:underline">
          <span className="block truncate">{b.bai_ten}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{b.lop_ten}</span>
        </Link>
        <Badge variant={tt === "nhap" ? "outline" : TRANG_THAI_LOP_VARIANT[tt]} className="h-5 shrink-0">
          {tt === "nhap" ? "Sắp mở" : TRANG_THAI_LOP_LABEL[tt]}
        </Badge>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}
        </span>
        {b.dia_diem && <span className="truncate">{b.dia_diem}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {b.gv_tong > 0 && <SlotChip nhan="GV" da={b.gv_da} tong={b.gv_tong} daQua={daQua} />}
        {b.tg_tong > 0 && <SlotChip nhan="TG" da={b.tg_da} tong={b.tg_tong} daQua={daQua} />}
        {laGvTg && b.toi_day && (
          <Badge variant="success" className="h-5">
            Bạn dạy
          </Badge>
        )}
        {laGvTg && !daQua && b.toi_trung_lich && (
          <Badge variant="danger" className="h-5">
            Trùng lịch của bạn
          </Badge>
        )}
        {laGvTg && !daQua && !b.toi_day && !b.toi_trung_lich && b.toi_du_dieu_kien && conThieu(b) && (
          <Badge variant="teal" className="h-5">
            Phù hợp với bạn
          </Badge>
        )}
      </div>
    </li>
  );
}

// "GV 1/2": số slot đã phân công / cần — thiếu người (và Bài chưa diễn ra) thì tô cảnh báo
function SlotChip({ nhan, da, tong, daQua }: { nhan: string; da: number; tong: number; daQua: boolean }) {
  return (
    <Badge variant={da >= tong ? "success" : daQua ? "neutral" : "warning"} className="h-5 tabular-nums">
      {nhan} {da}/{tong}
    </Badge>
  );
}
