// Logic hiển thị tiến độ phân công theo vai trò (CLAUDE.md mục 4.2). Thuần túy, không phụ thuộc React/Supabase
// để test được bằng node.

export interface TienDoVaiTro {
  // Tổng số slot của vai trò trong cả lớp (Y)
  tong: number;
  // Số slot đã có người được phân công (X) — "X/Y lượt phân công"
  da: number;
  // Số nhân sự khác nhau đang đảm nhiệm (Z ≤ X)
  nhanSu: number;
  // Tên người đảm nhiệm nếu toàn bộ slot do đúng 1 người (view trả sẵn), ngược lại null
  tenDuyNhat: string | null;
}

export type HienThiTienDo =
  // Lớp không cần vai trò này -> không hiển thị
  | { kieu: "khong_can" }
  // Mọi slot của vai trò do đúng 1 người đảm nhiệm và đã đủ -> hiện thẳng tên, không dùng progress bar
  | { kieu: "mot_nguoi"; ten: string }
  // Trường hợp còn lại: progress bar "X/Y lượt phân công" + "Z nhân sự khác nhau"
  | { kieu: "thanh"; da: number; tong: number; nhanSu: number; phanTram: number; du: boolean };

export function hienThiTienDo(t: TienDoVaiTro): HienThiTienDo {
  if (t.tong <= 0) return { kieu: "khong_can" };
  if (t.da === t.tong && t.nhanSu === 1 && t.tenDuyNhat) return { kieu: "mot_nguoi", ten: t.tenDuyNhat };
  return {
    kieu: "thanh",
    da: t.da,
    tong: t.tong,
    nhanSu: t.nhanSu,
    phanTram: Math.min(100, Math.round((t.da / t.tong) * 100)),
    du: t.da >= t.tong,
  };
}
