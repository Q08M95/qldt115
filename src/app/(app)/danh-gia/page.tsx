import Link from "next/link";
import { CheckInBanner } from "@/components/danh-gia/check-in-banner";
import { KpiCaNhanBoard } from "@/components/danh-gia/kpi-ca-nhan";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getBaiCanCheckIn, getKpiCaNhan } from "@/lib/danh-gia/queries";

// Đánh giá chất lượng (mục 4.4): Bảng KPI cá nhân của chính mình. KPI của người khác xem từ hồ sơ nhân sự.
export default async function DanhGiaPage() {
  const { profile } = await requireSession();
  const [kpi, baiCheckIn] = await Promise.all([getKpiCaNhan(profile.id), getBaiCanCheckIn()]);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <CheckInBanner items={baiCheckIn} />
      <KpiCaNhanBoard data={kpi} tieuDe="KPI của tôi" />
      <div>
        <Button variant="outline" asChild>
          <Link href={`/nhan-su/${profile.id}`}>Xem hồ sơ của tôi</Link>
        </Button>
      </div>
    </div>
  );
}
