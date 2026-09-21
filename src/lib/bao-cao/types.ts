import type { TrangThaiLopHienThi, VaiTroGiangDay, DoiTuongLop, LoaiKinhPhi } from "@/types/database";

// Dòng báo cáo #3 — sản lượng giảng dạy theo người (không có nhãn nhóm, chỉ vai trò)
export interface DongSanLuong {
  user_id: string;
  ho_ten: string;
  avatar_url: string | null;
  vai_tro: VaiTroGiangDay;
  dang_tham_gia: boolean;
  so_bai: number;
  so_lop: number;
  gio_thuc: number;
  so_bai_sap: number;
  gio_sap: number;
}

// Dòng báo cáo #4 — A2/A3 theo người
export interface DongTyLe {
  user_id: string;
  ho_ten: string;
  avatar_url: string | null;
  vai_tro: VaiTroGiangDay;
  so_bai_da_day: number;
  so_tu_dang_ky: number;
  so_moi_dong_y: number;
  so_moi_tu_choi: number;
}

export interface DiemNgayDangKy {
  ngay: string;
  dang_ky: number;
  phan_cong: number;
}

// Báo cáo #5 — vận hành đăng ký & phân công
export interface VanHanhDangKy {
  slot_tong: number;
  slot_da_phan_cong: number;
  gio_lap_tb: number | null;
  so_slot_do_duyet: number;
  dang_ky_moi: number;
  loi_moi_gui: number;
  dang_ky_cho: number;
  loi_moi_cho: number;
  serie: DiemNgayDangKy[];
}

export interface CanhBaoPool {
  bai_id: string;
  bai_ten: string;
  lop_id: string;
  lop_ten: string;
  bat_dau: string;
  vai_tro: VaiTroGiangDay;
  slot_trong: number;
  so_ung_vien: number;
}

// Báo cáo #8 — lớp có hoạt động trong khoảng
export interface DongLop {
  id: string;
  ten: string;
  nhom_lop_ten: string;
  doi_tuong: DoiTuongLop;
  loai_kinh_phi: LoaiKinhPhi;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai_hien_thi: TrangThaiLopHienThi;
  so_bai: number;
  slot_tong: number;
  slot_da_phan_cong: number;
}
