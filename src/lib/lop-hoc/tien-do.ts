// Logic hiển thị tiến độ phân công theo vai trò (CLAUDE.md mục 4.2). Thuần túy, không phụ thuộc React/Supabase
// để test được bằng node.

export interface TienDoVaiTro {
  // Tổng số slot của vai trò trong cả lớp (Y)
  tong: number;
  // Số slot đã có người được phân công (X) — "X/Y lượt phân công"
  da: number;
  // Số nhân sự khác nhau đang đảm nhiệm (Z ≤ X)
  nhanSu: number;
}

export type HienThiTienDo =
  // Lớp không cần vai trò này -> không hiển thị
  | { kieu: "khong_can" }
  // Luôn hiện dạng thanh "X/Y lượt phân công" + "Z nhân sự khác nhau", kể cả khi chỉ 1 người đảm nhiệm toàn bộ
  // (đã bỏ kiểu hiện thẳng tên theo phản hồi người dùng: giữ đồng nhất với các thanh tiến độ khác)
  | { kieu: "thanh"; da: number; tong: number; nhanSu: number; phanTram: number; du: boolean };

export function hienThiTienDo(t: TienDoVaiTro): HienThiTienDo {
  if (t.tong <= 0) return { kieu: "khong_can" };
  return {
    kieu: "thanh",
    da: t.da,
    tong: t.tong,
    nhanSu: t.nhanSu,
    phanTram: Math.min(100, Math.round((t.da / t.tong) * 100)),
    du: t.da >= t.tong,
  };
}
