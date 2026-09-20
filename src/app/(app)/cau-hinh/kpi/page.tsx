import { CauHinhKpiForm } from "@/components/kpi/cau-hinh-kpi-form";
import { requireQuanTri } from "@/lib/auth/session";
import { getCauHinhKpi } from "@/lib/kpi/queries";

// Cấu hình KPI (mục 4.8/7): trọng số, Bật/Tắt tiêu chí, hệ số độ khó D1/D2/D3, ngưỡng percentile và đổi nhóm.
export default async function CauHinhKpiPage() {
  const [, cauHinh] = await Promise.all([requireQuanTri(), getCauHinhKpi()]);
  return <CauHinhKpiForm cauHinh={cauHinh} />;
}
