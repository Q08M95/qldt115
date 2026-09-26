import { CauHinhDangKyForm } from "@/components/cau-hinh/dang-ky-form";
import { requireQuanTri } from "@/lib/auth/session";
import { getCauHinhDangKy } from "@/lib/cau-hinh/queries";

// Đăng ký & matching (mục 4.3/4.8): ngưỡng cảnh báo pool nhỏ / dồn tải và tỷ trọng matching-score.
export default async function CauHinhDangKyPage() {
  const [, cauHinh] = await Promise.all([requireQuanTri(), getCauHinhDangKy()]);
  return <CauHinhDangKyForm cauHinh={cauHinh} />;
}
