"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { fmtDate } from "@/lib/format";
import { hrefBaoCao, type KhoaBaoCao } from "@/lib/bao-cao/url";
import type { KyDanhGia } from "@/types/database";
import { TabBaoCao } from "./thanh-dieu-khien";

const NUT_TRON = "flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground";

// Bộ điều khiển cho báo cáo #1/#6/#7 (mục 4.7 — chỉ xem theo kỳ đánh giá): chọn kỳ bất kỳ + nút kỳ liền trước/sau theo thời gian.
export function BoLocKy({
  bc,
  list,
  hienTai,
  truoc,
  sau,
}: {
  bc: KhoaBaoCao;
  list: KyDanhGia[];
  hienTai: KyDanhGia;
  truoc: KyDanhGia | null;
  sau: KyDanhGia | null;
}) {
  const router = useRouter();
  return (
    <div className="grid gap-3">
      <TabBaoCao active={bc} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NativeSelect
          aria-label="Chọn kỳ đánh giá"
          className="w-auto min-w-52"
          value={hienTai.id}
          onChange={(e) => router.push(hrefBaoCao({ bc, ky: e.target.value }))}
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
            <Link href={hrefBaoCao({ bc, ky: truoc.id })} aria-label={`Kỳ trước: ${truoc.ten}`} title={truoc.ten} className={NUT_TRON}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={`${NUT_TRON} opacity-40`}>
              <ChevronLeft className="size-4" />
            </span>
          )}
          {sau ? (
            <Link href={hrefBaoCao({ bc, ky: sau.id })} aria-label={`Kỳ sau: ${sau.ten}`} title={sau.ten} className={NUT_TRON}>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className={`${NUT_TRON} opacity-40`}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
