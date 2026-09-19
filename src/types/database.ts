// Kiểu dữ liệu tay (khớp supabase/migrations). Sẽ thay bằng type sinh tự động nếu dùng Supabase CLI.

export type PhanQuyenHeThong = "admin" | "giang_day";

export type VaiTroGiangDay = "giang_vien" | "tro_giang";

// Chỉ dùng phía Admin/Quản lý lớp — GV/TG không đọc được (RLS chặn ở bảng nhan_su_nhom)
export type NhomNhanSu =
  | "ban_giam_doc"
  | "gv_bac_si"
  | "gv_khong_bac_si"
  | "tg_bac_si"
  | "tg_khong_bac_si";

export type TrangThaiThamGia = "dang_tham_gia" | "tam_ngung" | "khong_con_tham_gia";

export type LoaiDeXuat = "phan_cong" | "dao_tao" | "khen_thuong_nhac_nho" | "doi_nhom";

export type TrangThaiDeXuat = "cho_duyet" | "da_duyet" | "bo_qua";

export interface Profile {
  id: string;
  email: string;
  ho_ten: string;
  so_dien_thoai: string | null;
  avatar_url: string | null;
  phan_quyen: PhanQuyenHeThong;
  co_quyen_quan_ly_lop: boolean;
  vai_tro_giang_day: VaiTroGiangDay | null;
  trang_thai_tham_gia: TrangThaiThamGia;
  kinh_nghiem: string | null;
  created_at: string;
  updated_at: string;
}

export interface DanhMuc {
  id: string;
  ten: string;
  thu_tu: number;
  dang_dung: boolean;
}

export type DanhMucBang = "danh_muc_chuyen_mon" | "danh_muc_loai_chung_chi";

export interface ChuyenMonCuaNguoi {
  chuyen_mon_id: string;
  chi_tiet: string | null;
  ten: string;
}

export interface ChungChi {
  id: string;
  user_id: string;
  loai_id: string;
  loai_ten: string;
  so_chung_chi: string | null;
  noi_dung: string | null;
  ngay_cap: string | null;
  noi_cap: string | null;
  hinh_anh_path: string | null;
  // URL ký tạm thời cho ảnh (bucket riêng tư), null nếu không có ảnh
  hinh_anh_url: string | null;
}

export interface LichSuDoiNhom {
  id: string;
  nhom_cu: NhomNhanSu | null;
  nhom_moi: NhomNhanSu;
  ngay_hieu_luc: string;
  created_at: string;
}

export interface DeXuatNhanSu {
  id: string;
  loai: LoaiDeXuat;
  user_id: string;
  ho_ten: string;
  noi_dung: string;
  trang_thai: TrangThaiDeXuat;
  xu_ly_luc: string | null;
  created_at: string;
}
