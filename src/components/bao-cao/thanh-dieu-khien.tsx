import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KHUNG_THOI_GIAN, type KhoangBaoCao } from "@/lib/bao-cao/khoang";
import { BAO_CAO, hrefBaoCao, type KhoaBaoCao } from "@/lib/bao-cao/url";
import { cn } from "@/lib/utils";

// Pill đang chọn: nền trắng, viền + chữ màu thương hiệu (mục 8.6 — đúng "03-07 | 10-14 | 17-21" trong ảnh mẫu); pill còn lại chữ xám
const pill = (dang: boolean) =>
  cn(
    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 sm:px-4",
    dang ? "border-primary bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
  );

// Chọn báo cáo (tab) + khung thời gian (tuần/tháng/quý/năm) + chuyển kỳ trước/sau. Toàn bộ là liên kết nên trang vẫn render ở server.
export function ThanhDieuKhien({ bc, khoang, vt }: { bc: KhoaBaoCao; khoang: KhoangBaoCao; vt?: string }) {
  const truoc = hrefBaoCao({ bc, kt: khoang.khung, moc: khoang.truoc, vt });
  const sau = khoang.sau ? hrefBaoCao({ bc, kt: khoang.khung, moc: khoang.sau, vt }) : null;
  return (
    <div className="grid gap-3">
      <nav aria-label="Chọn báo cáo" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {BAO_CAO.map((b) => (
          <Link key={b.khoa} href={hrefBaoCao({ bc: b.khoa, kt: khoang.khung, moc: khoang.laHienTai ? undefined : khoang.tu })} className={pill(b.khoa === bc)} aria-current={b.khoa === bc ? "page" : undefined}>
            {b.nhan}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Khung thời gian" className="flex gap-1 rounded-full">
          {KHUNG_THOI_GIAN.map((k) => (
            <Link
              key={k.gia_tri}
              href={hrefBaoCao({ bc, kt: k.gia_tri, moc: khoang.laHienTai ? undefined : khoang.tu, vt })}
              className={pill(k.gia_tri === khoang.khung)}
              aria-current={k.gia_tri === khoang.khung ? "true" : undefined}
              prefetch={false}
            >
              {k.nhan}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={truoc} aria-label="Kỳ trước" className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <span className="min-w-36 text-center text-sm font-medium tabular-nums">{khoang.nhan}</span>
          {sau ? (
            <Link href={sau} aria-label="Kỳ sau" className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground opacity-40">
              <ChevronRight className="size-4" />
            </span>
          )}
          {!khoang.laHienTai && (
            <Link href={hrefBaoCao({ bc, kt: khoang.khung, vt })} className="ml-1 text-sm font-medium text-primary hover:underline">
              Hiện tại
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Lọc theo vai trò (Giảng viên / Trợ giảng) — vai trò hiển nhiên nên không phải nhãn nhóm (mục 4.7)
export function LocVaiTroLinks({ bc, khoang, vt }: { bc: KhoaBaoCao; khoang: KhoangBaoCao; vt: string }) {
  const ds = [
    { v: "tat-ca", nhan: "Tất cả" },
    { v: "giang_vien", nhan: "Giảng viên" },
    { v: "tro_giang", nhan: "Trợ giảng" },
  ];
  return (
    <div role="group" aria-label="Lọc theo vai trò" className="flex gap-1">
      {ds.map((d) => (
        <Link key={d.v} href={hrefBaoCao({ bc, kt: khoang.khung, moc: khoang.laHienTai ? undefined : khoang.tu, vt: d.v })} className={cn(pill(d.v === vt), "h-8 px-3 text-[13px]")}>
          {d.nhan}
        </Link>
      ))}
    </div>
  );
}
