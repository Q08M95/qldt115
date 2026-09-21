import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { CheckInButton } from "@/components/danh-gia/check-in-button";
import { fmtTime } from "@/lib/format";
import type { BaiCheckIn } from "@/types/database";

const fmtPt = (n: number | null) => (n === null ? "" : `${String(Math.round(n * 100) / 100).replace(".", ",")}%`);

// Banner check-in gọn ở đầu Trang chủ khi có Bài của tôi trong khung giờ check-in (mục 4.4/8.9): hành động di động quan trọng nhất,
// ảnh hưởng trực tiếp điểm B1 nên không chôn trong menu. Chỉ đặt ở Trang chủ (không lặp ở nơi khác); mỗi Bài 1 hàng.
export function CheckInBanner({ items }: { items: BaiCheckIn[] }) {
  if (items.length === 0) return null;
  const conChua = items.some((b) => !b.da_check_in);

  return (
    <section aria-label="Check-in buổi dạy" className="mb-4 overflow-hidden rounded-2xl bg-brand-gradient px-4 py-3 text-white shadow-[0_6px_18px_rgba(20,70,138,0.22)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <Clock className="size-3.5" aria-hidden />
          {conChua ? "Đến giờ check-in" : "Đã check-in đủ"}
        </span>
        {conChua && <span className="text-white/70">Không check-in = B1 0% · trễ càng lâu B1 càng giảm</span>}
      </div>
      <ul className="grid gap-2">
        {items.map((b) => (
          <li key={b.bai_id} className="flex flex-col gap-2 rounded-xl bg-white/12 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <Link href={`/lop-hoc/${b.lop_id}`} className="block truncate text-sm font-semibold hover:underline">
                {b.bai_ten}
              </Link>
              <p className="truncate text-xs text-white/75">
                {b.lop_ten} · <span className="tabular-nums">{fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}</span>
              </p>
            </div>
            {b.da_check_in ? (
              <p className="flex shrink-0 items-center gap-1.5 text-xs font-semibold sm:text-sm">
                <CheckCircle2 className="size-4" aria-hidden />
                {b.check_in_luc ? `Đã check-in ${fmtTime(b.check_in_luc)}` : "Đã điểm danh"} · B1 {fmtPt(b.b1_phan_tram)}
              </p>
            ) : (
              <CheckInButton baiId={b.bai_id} variant="outline" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
