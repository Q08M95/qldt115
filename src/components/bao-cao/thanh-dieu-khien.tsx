import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KHUNG_THOI_GIAN, type KhoangBaoCao, type KhungThoiGian } from "@/lib/bao-cao/khoang";
import { hrefBaoCao, NHOM_BAO_CAO, type NhomBaoCao } from "@/lib/bao-cao/url";
import { cn } from "@/lib/utils";

// Pill đang chọn: nền trắng, viền + chữ màu thương hiệu (mục 8.6 — đúng "03-07 | 10-14 | 17-21" trong ảnh mẫu); pill còn lại chữ xám
export const pill = (dang: boolean) =>
  cn(
    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 sm:px-4",
    dang
      ? "border-primary bg-card text-primary shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );

export const nutTron = "flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground";

// Chọn 1 trong 2 nhóm báo cáo (mục 4.7) — thay cho việc cuộn ngang qua 8 tab trước đây. Giữ nguyên cả kỳ lẫn khung thời
// gian đang chọn khi chuyển nhóm, để nút "Xuất báo cáo" ở đầu trang luôn có đủ ngữ cảnh. Cùng kiểu pill với các bộ lọc
// khác trong báo cáo (mục 8.6) để nhất quán, không phát minh thêm kiểu chọn mới.
export function ChuyenNhomBaoCao({ nhom, ky, kt, moc, vt }: { nhom: NhomBaoCao; ky?: string; kt?: KhungThoiGian; moc?: string; vt?: string }) {
  return (
    <nav aria-label="Chọn nhóm báo cáo" className="flex flex-wrap gap-1.5">
      {NHOM_BAO_CAO.map((n) => (
        <Link
          key={n.gia_tri}
          href={hrefBaoCao({ nhom: n.gia_tri, ky, kt, moc, vt })}
          className={pill(n.gia_tri === nhom)}
          title={n.mo_ta}
          aria-current={n.gia_tri === nhom ? "page" : undefined}
        >
          {n.nhan}
        </Link>
      ))}
    </nav>
  );
}

// Khung thời gian (tuần/tháng/quý/năm) + chuyển kỳ trước/sau — dùng 1 lần cho cả nhóm "Theo hoạt động" (mục 4.7).
export function BoLocThoiGian({ khoang, ky, vt }: { khoang: KhoangBaoCao; ky?: string; vt?: string }) {
  const truoc = hrefBaoCao({ nhom: "thoi-gian", kt: khoang.khung, moc: khoang.truoc, ky, vt });
  const sau = khoang.sau ? hrefBaoCao({ nhom: "thoi-gian", kt: khoang.khung, moc: khoang.sau, ky, vt }) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Khung thời gian" className="flex gap-1 rounded-full">
        {KHUNG_THOI_GIAN.map((k) => (
          <Link
            key={k.gia_tri}
            href={hrefBaoCao({ nhom: "thoi-gian", kt: k.gia_tri, moc: khoang.laHienTai ? undefined : khoang.tu, ky, vt })}
            className={pill(k.gia_tri === khoang.khung)}
            aria-current={k.gia_tri === khoang.khung ? "true" : undefined}
            prefetch={false}
          >
            {k.nhan}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Link href={truoc} aria-label="Kỳ trước" className={nutTron}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <span className="min-w-36 text-center text-sm font-medium tabular-nums">{khoang.nhan}</span>
        {sau ? (
          <Link href={sau} aria-label="Kỳ sau" className={nutTron}>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className={cn(nutTron, "opacity-40")}>
            <ChevronRight className="size-4" />
          </span>
        )}
        {!khoang.laHienTai && (
          <Link href={hrefBaoCao({ nhom: "thoi-gian", kt: khoang.khung, ky, vt })} className="ml-1 text-sm font-medium text-primary hover:underline">
            Hiện tại
          </Link>
        )}
      </div>
    </div>
  );
}

// Lọc theo vai trò (Giảng viên / Trợ giảng) trong 1 báo cáo con — vai trò hiển nhiên nên không phải nhãn nhóm (mục 4.7)
export function LocVaiTroLinks({ anchor, khoang, ky, vt }: { anchor: string; khoang: KhoangBaoCao; ky?: string; vt: string }) {
  const ds = [
    { v: "tat-ca", nhan: "Tất cả" },
    { v: "giang_vien", nhan: "Giảng viên" },
    { v: "tro_giang", nhan: "Trợ giảng" },
  ];
  return (
    <div role="group" aria-label="Lọc theo vai trò" className="flex gap-1">
      {ds.map((d) => (
        <Link
          key={d.v}
          href={hrefBaoCao({ nhom: "thoi-gian", kt: khoang.khung, moc: khoang.laHienTai ? undefined : khoang.tu, ky, vt: d.v }) + `#${anchor}`}
          className={cn(pill(d.v === vt), "h-8 px-3 text-[13px]")}
        >
          {d.nhan}
        </Link>
      ))}
    </div>
  );
}
