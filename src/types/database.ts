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

// ---------- Giai đoạn 6: KPI ----------
export type TrangThaiKy = "dang_mo" | "cho_duyet" | "da_dong";

export interface KyDanhGia {
  id: string;
  ten: string;
  tu: string; // date 'YYYY-MM-DD'
  den: string;
  trang_thai: TrangThaiKy;
  dong_luc: string | null;
}

export interface NhomTieuChi {
  ma: string;
  ten: string;
  trong_so: number;
  thu_tu: number;
}

export interface TieuChiCon {
  ma: string;
  nhom: string;
  ten: string;
  nguon: string;
  don_vi: string;
  trong_so: number;
  bat: boolean;
  tinh_vao_kpi: boolean;
  thu_tu: number;
}

export interface HeSoDoKho {
  ma: string;
  ten: string;
  gia_tri: number;
}

export interface ThamSoKpi {
  min_nhom: number;
  so_ky_fallback: number;
  gop_c: number; // 0 = trung bình đơn giản, 1 = theo số Bài mỗi lớp
  doi_nhom_x: number;
  doi_nhom_y: number;
  giang_nhom_x: number;
  giang_nhom_y: number;
}

// Danh sách kiểm tra trước khi đóng kỳ (chỉ cảnh báo, không chặn)
export interface KiemTraDongKy {
  chua_ket_thuc: boolean;
  con_ngay: number;
  lop_chua_hoan_thanh: { id: string; ten: string }[];
  lop_thieu_c1: { id: string; ten: string }[];
  lop_thieu_c3: { id: string; ten: string }[];
  luot_thieu_diem_danh: number;
  tong_luot: number;
}

export interface NhatKyKy {
  id: string;
  hanh_dong: "dong" | "mo_lai";
  ly_do: string | null;
  luc: string;
  nguoi_ten: string | null;
}

export interface CauHinhKpi {
  nhom: NhomTieuChi[];
  tieuChi: TieuChiCon[];
  heSo: HeSoDoKho[];
  nhomLop: NhomLop[];
  thamSo: ThamSoKpi;
}

// 1 dòng kết quả KPI của 1 người trong 1 kỳ (kỳ đã đóng: bản khóa; kỳ đang mở/chờ duyệt: tính trực tiếp)
export interface KpiKyRow {
  user_id: string;
  ho_ten: string;
  avatar_url: string | null;
  vai_tro: VaiTroGiangDay | null;
  kpi: number;
  hang: number;
  diem_nhom: Record<string, number>;
  gia_tri: Record<string, number>;
  trong_so_hieu_luc: Record<string, number>;
  gio_thuc: number;
  gio_quy_doi: number;
  so_bai: number;
  so_lop: number;
  a4_ky: number;
  a4_luy_ke: number;
  che_do_a1: "percentile" | "lich_su" | null;
  percentile: number | null;
}

// ---------- Đánh giá chất lượng (Giai đoạn 7) ----------
// Bài của tôi đang trong khung giờ check-in (hàm bai_can_check_in)
export interface BaiCheckIn {
  bai_id: string;
  bai_ten: string;
  lop_id: string;
  lop_ten: string;
  bat_dau: string;
  ket_thuc: string;
  da_check_in: boolean;
  check_in_luc: string | null;
  b1_phan_tram: number | null;
}

// Điểm danh (B1) của 1 người ở 1 Bài
export interface DiemDanh {
  bai_id: string;
  user_id: string;
  check_in_luc: string | null;
  b1_phan_tram: number;
  chinh_tay: boolean;
  ly_do_chinh: string | null;
}

export type MucDuGio = 100 | 80 | 60 | 0;

export interface RubricMuc {
  muc: MucDuGio;
  ten: string;
  mo_ta: string;
}

export interface CauHinhDiemDanh {
  checkin_truoc_phut: number;
  b1_tre_toi_da_phut: number;
  nhac_check_in_truoc_phut: number;
  rubric: RubricMuc[];
}

// 1 lần dự giờ (C2) của 1 người ở 1 Bài — chỉ người quản trị và chính người được chấm đọc được
export interface DuGio {
  bai_id: string;
  user_id: string;
  muc_diem: MucDuGio;
  ghi_chu: string | null;
}

// Bài đã/đang diễn ra mà 1 người được phân công — danh sách để Admin chấm dự giờ / chỉnh điểm danh
export interface BaiDaDay {
  bai_id: string;
  bai_ten: string;
  lop_id: string;
  lop_ten: string;
  bat_dau: string;
  ket_thuc: string;
  vai_tro: VaiTroGiangDay;
  diem_danh: DiemDanh | null;
  du_gio: DuGio | null;
}

// KPI của 1 người trong 1 kỳ (đã chuẩn hóa từ hàm kpi_ca_nhan); kpi = null: kỳ đó không dạy nên chưa có kết quả
export interface KpiCaNhanKy {
  ky_id: string;
  ten: string;
  tu: string;
  den: string;
  trang_thai: TrangThaiKy;
  kpi: number | null;
  diem_nhom: Record<string, number>;
  gia_tri: Record<string, number>;
  trong_so_hieu_luc: Record<string, number>;
  gio_thuc: number;
  gio_quy_doi: number;
  so_bai: number;
  so_lop: number;
  che_do_a1: "percentile" | "lich_su" | null;
  percentile: number | null;
}

// Tiến độ tới ngưỡng đổi nhóm — chỉ trả cho chính người đó hoặc người quản trị; KHÔNG nêu tên nhóm
export interface TienDoDoiNhom {
  huong: "thang" | "giang";
  nguong: number;
  so_ky_can: number;
  so_ky_dat: number;
}

export interface KpiCaNhan {
  ky: KpiCaNhanKy[]; // cũ -> mới
  a4_tong: number;
  so_ky_fallback: number;
  tien_do: TienDoDoiNhom | null;
}

// ============ Thông báo (Giai đoạn 8, mục 4.5) ============
export type MucDoThongBao = "can_hanh_dong" | "thong_tin";
export type LoaiThongBao =
  | "bai_trong_moi"
  | "duoc_moi"
  | "dang_ky_can_duyet"
  | "dang_ky_ket_qua"
  | "loi_moi_ket_qua"
  | "doi_lich"
  | "huy_lop"
  | "huy_phan_cong"
  | "nhac_check_in"
  | "cong_bo_kpi"
  | "ket_qua_doi_nhom"
  | "sua_diem_danh"
  | "quyen_quan_ly_lop"
  | "de_xuat_can_duyet";

export interface ThongBao {
  id: string;
  user_id: string;
  loai: LoaiThongBao;
  muc_do: MucDoThongBao;
  tieu_de: string;
  noi_dung: string | null;
  lien_ket: string | null;
  da_doc: boolean;
  created_at: string;
}
