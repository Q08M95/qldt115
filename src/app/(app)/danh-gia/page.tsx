import Link from "next/link";
import { KpiCaNhanBoard } from "@/components/danh-gia/kpi-ca-nhan";
import { KpiSoSanhCards } from "@/components/danh-gia/kpi-so-sanh";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getKpiCaNhan } from "@/lib/danh-gia/queries";

// Đánh giá chất lượng (mục 4.4): Bảng KPI cá nhân của chính mình. KPI của người khác xem từ hồ sơ nhân sự.
// Banner check-in chỉ ở Trang chủ (không lặp lại ở đây). Bố cục 2 cột như hồ sơ nhân sự: Bảng KPI (trái) | thêm biểu đồ A/B/C qua các kỳ + so sánh từng tiêu chí với kỳ trước (phải).
// Lịch sử giảng dạy đã có ở hồ sơ nhân sự nên không lặp lại ở đây.
export default async function DanhGiaPage() {
  const { profile } = await requireSession();
  const kpi = await getKpiCaNhan(profile.id);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-5">
        <KpiCaNhanBoard data={kpi} tieuDe="KPI của tôi" />
        <div>
          <Button variant="outline" asChild>
            <Link href={`/nhan-su/${profile.id}`}>Xem hồ sơ của tôi</Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <KpiSoSanhCards data={kpi} />
      </div>
    </div>
  );
}
