import type {
  DoiTuongLop,
  LoaiKinhPhi,
  TrangThaiLopHienThi,
  TrangThaiSlot,
} from "@/types/database";

export const DOI_TUONG_LABEL: Record<DoiTuongLop, string> = {
  nhan_vien_y_te: "Nhân viên y tế",
  cong_dong: "Cộng đồng",
};

export const LOAI_KINH_PHI_LABEL: Record<LoaiKinhPhi, string> = {
  co_kinh_phi: "Có kinh phí",
  khong_kinh_phi: "Không kinh phí",
};

export const TRANG_THAI_LOP_LABEL: Record<TrangThaiLopHienThi, string> = {
  nhap: "Dự kiến",
  dang_mo: "Đang mở đăng ký",
  da_du_dang_ky: "Đã đủ đăng ký",
  dang_dien_ra: "Đang diễn ra",
  da_hoan_thanh: "Đã hoàn thành",
  da_huy: "Đã hủy",
};

// Màu badge theo semantic (mục 8.1): mở đăng ký = xanh dương, đủ đăng ký = xanh lá, đang diễn ra = xanh ngọc,
// hoàn thành = navy, hủy = danger, dự kiến = neutral
export const TRANG_THAI_LOP_VARIANT: Record<
  TrangThaiLopHienThi,
  "neutral" | "blue" | "green" | "teal" | "navy" | "danger"
> = {
  nhap: "neutral",
  dang_mo: "blue",
  da_du_dang_ky: "green",
  dang_dien_ra: "teal",
  da_hoan_thanh: "navy",
  da_huy: "danger",
};

export const TRANG_THAI_LOP_OPTIONS = Object.entries(TRANG_THAI_LOP_LABEL) as [TrangThaiLopHienThi, string][];

export const TRANG_THAI_SLOT_LABEL: Record<TrangThaiSlot, string> = {
  trong: "Còn trống",
  cho_duyet: "Chờ duyệt",
  da_phan_cong: "Đã phân công",
};

export const TRANG_THAI_SLOT_VARIANT: Record<TrangThaiSlot, "neutral" | "warning" | "success"> = {
  trong: "neutral",
  cho_duyet: "warning",
  da_phan_cong: "success",
};
