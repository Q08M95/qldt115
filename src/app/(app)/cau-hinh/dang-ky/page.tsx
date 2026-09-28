import { CauHinhDangKyForm } from "@/components/cau-hinh/dang-ky-form";
import { requireAdmin } from "@/lib/auth/session";
import { getCauHinhDangKy } from "@/lib/cau-hinh/queries";

// Đăng ký & matching (mục 4.3/4.8): ngưỡng cảnh báo pool nhỏ / dồn tải và tỷ trọng matching-score.
// Chỉ Admin gốc sửa được (theo yêu cầu người dùng, mục 4.8/Giai đoạn 11b) — Quản lý lớp không còn vào được.
export default async function CauHinhDangKyPage() {
  const [, cauHinh] = await Promise.all([requireAdmin(), getCauHinhDangKy()]);
  return <CauHinhDangKyForm cauHinh={cauHinh} />;
}
