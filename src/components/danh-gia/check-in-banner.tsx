import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { CheckInButton } from "@/components/danh-gia/check-in-button";
import { fmtTime } from "@/lib/format";
import type { BaiCheckIn } from "@/types/database";

const fmtPt = (n: number | null) => (n === null ? "" : `${String(Math.round(n * 100) / 100).replace(".", ",")}%`);

// Banner nổi bật đầu Trang chủ khi có Bài của tôi trong khung giờ check-in (mục 4.4/8.9): hành động di động quan trọng nhất,
// ảnh hưởng trực tiếp điểm B1 nên không chôn trong menu.
export function CheckInBanner({ items }: { items: BaiCheckIn[] }) {
  if (items.length === 0) return null;
  const conChua = items.some((b) => !b.da_check_in);

  return (
    <section
      aria-label="Check-in buổi dạy"
      className="mb-5 overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-[0_8px_24px_rgba(20,70,138,0.25)] sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Clock className="size-4" aria-hidden />
        {conChua ? "Đến giờ check-in — bấm “Tôi đã có mặt” để ghi nhận điểm danh" : "Bạn đã check-in đủ các buổi đang diễn ra"}
      </div>
      <ul className="grid gap-2">
        {items.map((b) => (
          <li key={b.bai_id} className="flex flex-col gap-3 rounded-xl bg-white/12 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={`/lop-hoc/${b.lop_id}`} className="block truncate font-semibold hover:underline">
                {b.bai_ten}
              </Link>
              <p className="truncate text-sm text-white/80">
                {b.lop_ten} · <span className="tabular-nums">{fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}</span>
              </p>
            </div>
            {b.da_check_in ? (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-5" aria-hidden />
                {b.check_in_luc ? `Đã check-in lúc ${fmtTime(b.check_in_luc)}` : "Đã điểm danh"} · B1 {fmtPt(b.b1_phan_tram)}
              </p>
            ) : (
              <CheckInButton baiId={b.bai_id} variant="outline" />
            )}
          </li>
        ))}
      </ul>
      {conChua && <p className="mt-3 text-xs text-white/75">Không check-in trong buổi học sẽ tính B1 = 0%. Trễ giờ học điểm B1 giảm dần theo số phút trễ.</p>}
    </section>
  );
}
