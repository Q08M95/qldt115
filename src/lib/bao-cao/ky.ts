import type { KyDanhGia } from "@/types/database";

export interface KyDieuHuong {
  hienTai: KyDanhGia;
  truoc: KyDanhGia | null;
  sau: KyDanhGia | null;
}

// Chọn kỳ đang xem cho báo cáo #1/#6/#7 (mục 4.7 — chỉ xem theo kỳ đánh giá): ưu tiên `ky` trên URL nếu hợp lệ,
// mặc định kỳ chứa hôm nay, không có thì lấy kỳ mới nhất (list đã sắp theo tu giảm dần — cùng thứ tự getKyList).
export function chonKy(list: KyDanhGia[], ky: string | undefined): KyDieuHuong | null {
  if (list.length === 0) return null;
  const homNay = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const hienTai = (ky && list.find((k) => k.id === ky)) || list.find((k) => k.tu <= homNay && homNay <= k.den) || list[0];
  // Sắp lại tăng dần theo tu để tìm kỳ liền trước/sau theo thời gian
  const tangDan = [...list].sort((a, b) => a.tu.localeCompare(b.tu));
  const idx = tangDan.findIndex((k) => k.id === hienTai.id);
  return { hienTai, truoc: idx > 0 ? tangDan[idx - 1] : null, sau: idx >= 0 && idx < tangDan.length - 1 ? tangDan[idx + 1] : null };
}
