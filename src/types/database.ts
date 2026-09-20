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

// ---------- Lớp học (Giai đoạn 4) ----------
export type DoiTuongLop = "nhan_vien_y_te" | "cong_dong";
export type LoaiKinhPhi = "co_kinh_phi" | "khong_kinh_phi";
export type TrangThaiLop = "nhap" | "dang_mo" | "da_hoan_thanh" | "da_huy";
// Trạng thái hiển thị: thêm 2 trạng thái SUY RA (không lưu) — xem view lop_hoc_tong_hop
export type TrangThaiLopHienThi = TrangThaiLop | "da_du_dang_ky" | "dang_dien_ra";
export type TrangThaiSlot = "trong" | "cho_duyet" | "da_phan_cong";
export type NguonC1 = "khao_sat" | "nhap_tay";

export interface NhomLop {
  id: string;
  ten: string;
  he_so_d1: number;
  thu_tu: number;
  dang_dung: boolean;
}

export interface LopHocTongHop {
  id: string;
  ten: string;
  nhom_lop_id: string;
  nhom_lop_ten: string;
  he_so_d1: number;
  doi_tuong: DoiTuongLop;
  loai_kinh_phi: LoaiKinhPhi;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  dia_diem: string | null;
  trang_thai: TrangThaiLop;
  trang_thai_hien_thi: TrangThaiLopHienThi;
  cong_khai_som: boolean;
  c1_phan_tram: number | null;
  c1_nguon: NguonC1 | null;
  c3_phan_tram: number | null;
  so_bai: number;
  gv_tong: number;
  gv_da_phan_cong: number;
  gv_nhan_su: number;
  gv_ten_duy_nhat: string | null;
  tg_tong: number;
  tg_da_phan_cong: number;
  tg_nhan_su: number;
  tg_ten_duy_nhat: string | null;
}

export interface SlotGiangDay {
  id: string;
  vai_tro: VaiTroGiangDay;
  vi_tri: number;
  trang_thai: TrangThaiSlot;
  nguoi: { id: string; ho_ten: string; avatar_url: string | null } | null;
}

export interface BaiHoc {
  id: string;
  lop_id: string;
  thu_tu: number;
  ten: string;
  bat_dau: string;
  ket_thuc: string;
  slots: SlotGiangDay[];
}

// ---------- Đăng ký giảng dạy (Giai đoạn 5) ----------
export type LoaiDangKy = "tu_dang_ky" | "duoc_moi";
export type TrangThaiDangKy = "cho_xu_ly" | "da_duyet" | "tu_choi" | "da_huy";

// 1 dòng gợi ý (matching-score) cho 1 Bài + vai trò. Không chứa nhãn nhóm.
export interface UngVien {
  bai_id: string;
  vai_tro: VaiTroGiangDay;
  user_id: string;
  ho_ten: string;
  avatar_url: string | null;
  diem: number;
  hang: number;
  gio_ky: number;
  so_lop_khong_kinh_phi: number;
  cung_lop: number;
  // Chỉ có với người quản trị hoặc chính chủ
  trang_thai_hien_co: "dang_ky" | "duoc_moi" | null;
  dang_ky_id: string | null;
}

export interface DangKyCho {
  id: string;
  bai_id: string;
  vai_tro: VaiTroGiangDay;
  user_id: string;
  ho_ten: string;
  avatar_url: string | null;
  loai: LoaiDangKy;
  created_at: string;
  // Mời ngoại lệ vượt lọc cứng (chỉ người quản trị/chính chủ đọc được lý do)
  ngoai_le: boolean;
  ly_do_ngoai_le: string | null;
  vuot_loc: string | null;
}

// 1 dòng trong hộp thoại "Mời người ngoài đề xuất": ly_do = null nghĩa là vốn đủ điều kiện
export interface NhanSuChoMoi {
  user_id: string;
  ho_ten: string;
  ly_do: string | null;
  // true = không thể mời kể cả ngoại lệ (trùng lịch / đã có đăng ký hoặc lời mời ở Bài này)
  chan_cung: boolean;
}

// Khả năng đăng ký của chính người xem cho 1 Bài: ly_do = null nghĩa là đăng ký được
export interface KhaNangBai {
  bai_id: string;
  ly_do: string | null;
  da_dang_ky: boolean;
}

// 1 dòng lịch sử giảng dạy của 1 người (1 Bài đã/đang được phân công)
export interface LichSuBai {
  slot_id: string;
  vai_tro: VaiTroGiangDay;
  bai_id: string;
  bai_ten: string;
  bat_dau: string;
  ket_thuc: string;
  lop_id: string;
  lop_ten: string;
  loai_kinh_phi: LoaiKinhPhi;
  lop_trang_thai: TrangThaiLop;
  // Bài chưa kết thúc tính đến lúc đọc dữ liệu (tính ở tầng truy vấn)
  sap_dien_ra: boolean;
}

export interface KhaoSatLop {
  token: string;
  mo: boolean;
  so_phan_hoi: number;
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
