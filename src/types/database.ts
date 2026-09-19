// Kiểu dữ liệu tay cho Giai đoạn 1 (khớp supabase/migrations). Sẽ thay bằng type sinh tự động nếu dùng Supabase CLI.

export type PhanQuyenHeThong = "admin" | "giang_day";

export type VaiTroGiangDay = "giang_vien" | "tro_giang";

// Chỉ dùng phía Admin/Quản lý lớp — GV/TG không đọc được (RLS chặn ở bảng nhan_su_nhom)
export type NhomNhanSu =
  | "ban_giam_doc"
  | "gv_bac_si"
  | "gv_khong_bac_si"
  | "tg_bac_si"
  | "tg_khong_bac_si";

export interface Profile {
  id: string;
  email: string;
  ho_ten: string;
  so_dien_thoai: string | null;
  avatar_url: string | null;
  phan_quyen: PhanQuyenHeThong;
  co_quyen_quan_ly_lop: boolean;
  vai_tro_giang_day: VaiTroGiangDay | null;
  created_at: string;
  updated_at: string;
}
