import type {
  LoaiDeXuat,
  NhomNhanSu,
  TrangThaiDeXuat,
  TrangThaiThamGia,
  VaiTroGiangDay,
} from "@/types/database";

export const NHOM_LABEL: Record<NhomNhanSu, string> = {
  ban_giam_doc: "Ban giám đốc",
  gv_bac_si: "Giảng viên là bác sĩ",
  gv_khong_bac_si: "Giảng viên không là bác sĩ",
  tg_bac_si: "Trợ giảng là bác sĩ",
  tg_khong_bac_si: "Trợ giảng không là bác sĩ",
};

export const NHOM_OPTIONS = Object.entries(NHOM_LABEL) as [NhomNhanSu, string][];

export const VAI_TRO_LABEL: Record<VaiTroGiangDay, string> = {
  giang_vien: "Giảng viên",
  tro_giang: "Trợ giảng",
};

export const TRANG_THAI_LABEL: Record<TrangThaiThamGia, string> = {
  dang_tham_gia: "Đang tham gia",
  tam_ngung: "Tạm ngừng",
  khong_con_tham_gia: "Không còn tham gia",
};

export const TRANG_THAI_OPTIONS = Object.entries(TRANG_THAI_LABEL) as [TrangThaiThamGia, string][];

// Màu badge theo semantic (mục 8.1): đang tham gia = success, tạm ngừng = warning, không còn = neutral
export const TRANG_THAI_VARIANT: Record<TrangThaiThamGia, "success" | "warning" | "neutral"> = {
  dang_tham_gia: "success",
  tam_ngung: "warning",
  khong_con_tham_gia: "neutral",
};

export const LOAI_DE_XUAT_LABEL: Record<LoaiDeXuat, string> = {
  phan_cong: "Tăng/giảm phân công",
  dao_tao: "Đào tạo bồi dưỡng",
  khen_thuong_nhac_nho: "Khen thưởng/nhắc nhở",
  doi_nhom: "Đổi nhóm",
};

export const LOAI_DE_XUAT_OPTIONS = Object.entries(LOAI_DE_XUAT_LABEL) as [LoaiDeXuat, string][];

export const TRANG_THAI_DE_XUAT_LABEL: Record<TrangThaiDeXuat, string> = {
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  bo_qua: "Đã bỏ qua",
};

export const TRANG_THAI_DE_XUAT_VARIANT: Record<TrangThaiDeXuat, "warning" | "success" | "neutral"> = {
  cho_duyet: "warning",
  da_duyet: "success",
  bo_qua: "neutral",
};

// Bỏ dấu để tìm kiếm tên tiếng Việt không phân biệt dấu
export function boDau(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Đổi chữ người dùng nhập (mã như "gv_bac_si" hoặc tên như "Giảng viên là bác sĩ", có/không dấu) về mã nhóm.
// Trả "" nếu để trống, null nếu không nhận ra.
export function resolveNhom(raw: string): NhomNhanSu | "" | null {
  const norm = (s: string) => boDau(s).replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const t = norm(raw);
  if (!t) return "";
  for (const [code, label] of NHOM_OPTIONS) {
    if (t === norm(code) || t === norm(label)) return code;
  }
  return null;
}
