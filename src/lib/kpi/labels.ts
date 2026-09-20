import type { TrangThaiKy } from "@/types/database";

export const TRANG_THAI_KY_LABEL: Record<TrangThaiKy, string> = {
  dang_mo: "Đang mở",
  cho_duyet: "Chờ duyệt",
  da_dong: "Đã đóng",
};

export const TRANG_THAI_KY_VARIANT: Record<TrangThaiKy, "teal" | "warning" | "neutral"> = {
  dang_mo: "teal",
  cho_duyet: "warning",
  da_dong: "neutral",
};
