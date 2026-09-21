import type { LoaiNhatKy } from "@/types/database";
import { NHOM_LABEL, TRANG_THAI_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "neutral" | "blue" | "navy" | "teal" | "green";

// Nhãn + màu badge theo loại hành động (chỉ dùng 4 màu gốc + semantic, mục 8.1)
export const LOAI_NHAT_KY: Record<LoaiNhatKy, { nhan: string; variant: BadgeVariant }> = {
  duyet_dang_ky: { nhan: "Duyệt đăng ký", variant: "success" },
  tu_choi_dang_ky: { nhan: "Từ chối đăng ký", variant: "danger" },
  moi_giang_day: { nhan: "Mời dạy", variant: "blue" },
  phan_hoi_loi_moi: { nhan: "Trả lời lời mời", variant: "blue" },
  thu_hoi_loi_moi: { nhan: "Thu hồi lời mời", variant: "neutral" },
  huy_phan_cong: { nhan: "Hủy phân công", variant: "danger" },
  xu_ly_de_xuat: { nhan: "Xử lý đề xuất", variant: "teal" },
  sua_lop: { nhan: "Sửa lớp", variant: "navy" },
  huy_lop: { nhan: "Hủy lớp", variant: "danger" },
  doi_lich_bai: { nhan: "Đổi lịch Bài", variant: "navy" },
  nhap_ket_qua_lop: { nhan: "Nhập kết quả lớp", variant: "navy" },
  doi_trang_thai_tham_gia: { nhan: "Trạng thái tham gia", variant: "teal" },
  doi_cau_hinh: { nhan: "Đổi cấu hình", variant: "green" },
  doi_ky_danh_gia: { nhan: "Kỳ đánh giá", variant: "green" },
  doi_phan_quyen: { nhan: "Đổi phân quyền", variant: "warning" },
  gan_quyen_quan_ly_lop: { nhan: "Quyền Quản lý lớp", variant: "warning" },
  sua_diem_danh: { nhan: "Chỉnh điểm danh", variant: "warning" },
  nhap_du_gio: { nhan: "Dự giờ (C2)", variant: "teal" },
  sua_ho_so: { nhan: "Sửa hồ sơ", variant: "default" },
  doi_nhom: { nhan: "Đổi nhóm", variant: "warning" },
  tai_khoan: { nhan: "Tài khoản", variant: "default" },
  tao_lop: { nhan: "Tạo lớp", variant: "navy" },
  xoa_lop: { nhan: "Xóa lớp", variant: "danger" },
  them_bai: { nhan: "Thêm Bài", variant: "navy" },
  sua_bai: { nhan: "Sửa Bài", variant: "navy" },
  xoa_bai: { nhan: "Xóa Bài", variant: "danger" },
  tao_de_xuat: { nhan: "Tạo đề xuất", variant: "teal" },
};

export const LOAI_NHAT_KY_OPTIONS = Object.entries(LOAI_NHAT_KY).map(([v, o]) => [v, o.nhan] as const);

// Tên trường dễ đọc trong bảng "trước/sau"
const TRUONG: Record<string, string> = {
  trang_thai: "Trạng thái",
  trang_thai_tham_gia: "Trạng thái tham gia",
  co_quyen_quan_ly_lop: "Quyền Quản lý lớp",
  phan_quyen: "Phân quyền",
  nhom: "Nhóm",
  b1_phan_tram: "Điểm B1 (%)",
  chinh_tay: "Sửa tay",
  check_in_luc: "Giờ check-in",
  muc_diem: "Mức điểm",
  bat_dau: "Bắt đầu",
  ket_thuc: "Kết thúc",
  ten: "Tên",
  mo_ta: "Mô tả",
  gia_tri: "Giá trị",
  khoa: "Khóa",
  ma: "Mã",
  muc: "Mức",
  trong_so: "Trọng số",
  thu_tu: "Thứ tự",
  bat: "Bật",
  tinh_vao_kpi: "Tính vào KPI",
  dang_dung: "Đang dùng",
  nhom_lop: "Nhóm lớp",
  doi_tuong: "Đối tượng",
  loai_kinh_phi: "Loại kinh phí",
  ngay_bat_dau: "Ngày bắt đầu",
  ngay_ket_thuc: "Ngày kết thúc",
  dia_diem: "Địa điểm",
  c1_phan_tram: "C1 (%)",
  c3_phan_tram: "C3 (%)",
  tu: "Từ ngày",
  den: "Đến ngày",
  ho_ten: "Họ tên",
  so_dien_thoai: "Số điện thoại",
  avatar_url: "Ảnh đại diện",
  email: "Email",
  nguoi_phan_cong: "Người phân công",
  loai: "Loại",
  so_chung_chi: "Số chứng chỉ",
  noi_dung: "Nội dung",
  ngay_cap: "Ngày cấp",
  noi_cap: "Nơi cấp",
  co_hinh_anh: "Có hình ảnh",
  chuyen_mon: "Chuyên môn",
  chi_tiet: "Chi tiết",
  nguon: "Nguồn",
  don_vi: "Đơn vị",
};

const GIA_TRI_ENUM: Record<string, string> = {
  cho_xu_ly: "Chờ xử lý",
  da_duyet: "Đã duyệt",
  tu_choi: "Từ chối",
  da_huy: "Đã hủy",
  dong_y: "Đồng ý",
  cho_duyet: "Chờ duyệt",
  bo_qua: "Bỏ qua",
  dang_mo: "Đang mở",
  da_dong: "Đã đóng",
  nhap: "Nháp",
  da_hoan_thanh: "Đã hoàn thành",
  admin: "Admin",
  giang_day: "Giảng dạy",
  nhan_vien_y_te: "Nhân viên y tế",
  cong_dong: "Cộng đồng",
  co_kinh_phi: "Có kinh phí",
  khong_kinh_phi: "Không kinh phí",
  ...TRANG_THAI_LABEL,
  ...VAI_TRO_LABEL,
  ...NHOM_LABEL,
};

export function nhanTruong(k: string) {
  return TRUONG[k] ?? k;
}

// Giá trị hiển thị: ngày/giờ theo giờ Việt Nam, mã enum -> tiếng Việt, bool -> Có/Không, rỗng -> —
export function hienGiaTri(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "number") return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return fmtDateTime(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtDate(v);
    return GIA_TRI_ENUM[v] ?? v;
  }
  return JSON.stringify(v);
}
