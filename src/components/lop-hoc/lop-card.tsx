import Link from "next/link";
import { CalendarDays, MapPin, Layers } from "lucide-react";
import { TienDoLop } from "@/components/lop-hoc/tien-do-vai-tro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import {
  DOI_TUONG_LABEL,
  LOAI_KINH_PHI_LABEL,
  TRANG_THAI_LOP_LABEL,
  TRANG_THAI_LOP_VARIANT,
} from "@/lib/lop-hoc/labels";
import type { LopHocTongHop } from "@/types/database";

// Thẻ lớp trong lưới danh sách (mục 8.8): badge nhóm lớp + trạng thái, progress bar mini theo vai trò
export function LopCard({ lop, href }: { lop: LopHocTongHop; href: string }) {
  return (
    <Link href={href} className="group block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-shadow group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge>{lop.nhom_lop_ten}</Badge>
            <Badge variant={TRANG_THAI_LOP_VARIANT[lop.trang_thai_hien_thi]}>{TRANG_THAI_LOP_LABEL[lop.trang_thai_hien_thi]}</Badge>
          </div>

          <div className="grid gap-2">
            <h3 className="line-clamp-2 text-[17px] leading-snug font-semibold">{lop.ten}</h3>
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                <span className="tabular-nums">
                  {fmtDate(lop.ngay_bat_dau)}
                  {lop.ngay_ket_thuc !== lop.ngay_bat_dau && ` – ${fmtDate(lop.ngay_ket_thuc)}`}
                </span>
              </li>
              {lop.dia_diem && (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{lop.dia_diem}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Layers className="size-4 shrink-0" aria-hidden />
                {lop.so_bai} Bài
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{DOI_TUONG_LABEL[lop.doi_tuong]}</Badge>
            <Badge variant="outline">{LOAI_KINH_PHI_LABEL[lop.loai_kinh_phi]}</Badge>
          </div>

          <div className="mt-auto border-t pt-4">
            {lop.gv_tong + lop.tg_tong === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có Bài nào.</p>
            ) : (
              <TienDoLop lop={lop} />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
