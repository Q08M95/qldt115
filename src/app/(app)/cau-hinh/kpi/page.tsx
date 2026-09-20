import { CauHinhDiemDanhForm } from "@/components/kpi/cau-hinh-diem-danh-form";
import { CauHinhKpiForm } from "@/components/kpi/cau-hinh-kpi-form";
import { requireQuanTri } from "@/lib/auth/session";
import { getCauHinhDiemDanh } from "@/lib/danh-gia/queries";
import { getCauHinhKpi } from "@/lib/kpi/queries";

// Cấu hình KPI (mục 4.8/7): trọng số, Bật/Tắt tiêu chí, hệ số độ khó D1/D2/D3, ngưỡng percentile và đổi nhóm;
// kèm cấu hình điểm danh B1 (khung check-in, ngưỡng trễ) và rubric dự giờ C2.
export default async function CauHinhKpiPage() {
  const [, cauHinh, diemDanh] = await Promise.all([requireQuanTri(), getCauHinhKpi(), getCauHinhDiemDanh()]);
  return (
    <div className="flex flex-col gap-5">
      <CauHinhKpiForm cauHinh={cauHinh} />
      <CauHinhDiemDanhForm cauHinh={diemDanh} />
    </div>
  );
}
