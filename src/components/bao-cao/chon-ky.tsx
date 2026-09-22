"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { fmtDate } from "@/lib/format";
import { hrefBaoCao } from "@/lib/bao-cao/url";
import type { KhungThoiGian } from "@/lib/bao-cao/khoang";
import type { KyDanhGia } from "@/types/database";
import { nutTron } from "./thanh-dieu-khien";

// Chọn kỳ đánh giá + nút kỳ liền trước/sau theo thời gian — dùng 1 lần cho cả nhóm "Theo kỳ đánh giá" (mục 4.7).
// Giữ nguyên khung thời gian (kt/moc) đang chọn ở nhóm kia để chuyển qua lại không mất ngữ cảnh.
export function BoLocKy({
  list,
  hienTai,
  truoc,
  sau,
  kt,
  moc,
  vt,
}: {
  list: KyDanhGia[];
  hienTai: KyDanhGia;
  truoc: KyDanhGia | null;
  sau: KyDanhGia | null;
  kt?: KhungThoiGian;
  moc?: string;
  vt?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NativeSelect
        aria-label="Chọn kỳ đánh giá"
        className="w-auto min-w-52"
        value={hienTai.id}
        onChange={(e) => router.push(hrefBaoCao({ nhom: "ky", ky: e.target.value, kt, moc, vt }))}
      >
        {list.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ten} ({fmtDate(k.tu)} – {fmtDate(k.den)})
            {k.trang_thai === "cho_duyet" ? " · Chờ duyệt" : k.trang_thai === "dang_mo" ? " · Đang mở" : ""}
          </option>
        ))}
      </NativeSelect>
      <div className="flex items-center gap-1.5">
        {truoc ? (
          <Link href={hrefBaoCao({ nhom: "ky", ky: truoc.id, kt, moc, vt })} aria-label={`Kỳ trước: ${truoc.ten}`} title={truoc.ten} className={nutTron}>
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className={`${nutTron} opacity-40`}>
            <ChevronLeft className="size-4" />
          </span>
        )}
        {sau ? (
          <Link href={hrefBaoCao({ nhom: "ky", ky: sau.id, kt, moc, vt })} aria-label={`Kỳ sau: ${sau.ten}`} title={sau.ten} className={nutTron}>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className={`${nutTron} opacity-40`}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
