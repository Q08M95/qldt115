import type { LopHocTongHop, TrangThaiLopHienThi } from "@/types/database";

// Lớp cần chú ý đứng trước: đang mở/đủ đăng ký/đang diễn ra, rồi Nháp, cuối cùng đã hoàn thành/hủy.
// Lớp còn hoạt động xếp theo ngày bắt đầu gần nhất trước (để GV/TG thấy lớp sắp tới); lớp đã kết thúc thì mới nhất trước.
const THU_TU: Record<TrangThaiLopHienThi, number> = {
  dang_mo: 0,
  da_du_dang_ky: 1,
  dang_dien_ra: 2,
  nhap: 3,
  da_hoan_thanh: 4,
  da_huy: 5,
};

export function sapXepLop<T extends Pick<LopHocTongHop, "trang_thai_hien_thi" | "ngay_bat_dau" | "ten">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const wa = THU_TU[a.trang_thai_hien_thi];
    const wb = THU_TU[b.trang_thai_hien_thi];
    if (wa !== wb) return wa - wb;
    const dai = wa >= 4; // đã kết thúc -> mới nhất trước
    const cmp = a.ngay_bat_dau.localeCompare(b.ngay_bat_dau);
    return cmp !== 0 ? (dai ? -cmp : cmp) : a.ten.localeCompare(b.ten, "vi");
  });
}
