import type { KhungThoiGian } from "./khoang";

// 8 báo cáo mục 4.7, đúng thứ tự số trong tài liệu — 2 nhóm điều khiển khác nhau:
//   "thoi_gian": lọc tuần/tháng/quý/năm (#3,4,5,8, lượt 1)
//   "ky": chỉ chọn 1 kỳ đánh giá, có nút kỳ trước/sau (#1,6,7, lượt 2)
//   "khong_loc": không có bộ lọc, luôn hiện nhiều kỳ gần nhất (#2, lượt 2)
export const BAO_CAO = [
  { khoa: "kpi-tong-hop", so: 1, nhan: "KPI tổng hợp", nhom: "ky" },
  { khoa: "xu-huong-kpi", so: 2, nhan: "Xu hướng KPI", nhom: "khong_loc" },
  { khoa: "san-luong", so: 3, nhan: "Sản lượng giảng dạy", nhom: "thoi_gian" },
  { khoa: "ty-le-dang-ky", so: 4, nhan: "Tự đăng ký & nhận lời mời", nhom: "thoi_gian" },
  { khoa: "van-hanh-dang-ky", so: 5, nhan: "Vận hành đăng ký", nhom: "thoi_gian" },
  { khoa: "a4", so: 6, nhan: "A4 — Lớp không kinh phí", nhom: "ky" },
  { khoa: "de-xuat", so: 7, nhan: "Đề xuất nhân sự", nhom: "ky" },
  { khoa: "van-hanh-lop", so: 8, nhan: "Vận hành lớp học", nhom: "thoi_gian" },
] as const;

export type KhoaBaoCao = (typeof BAO_CAO)[number]["khoa"];
export type NhomBaoCao = (typeof BAO_CAO)[number]["nhom"];

export function laKhoaBaoCao(v: string | undefined): v is KhoaBaoCao {
  return BAO_CAO.some((b) => b.khoa === v);
}

export function nhomCuaBaoCao(bc: KhoaBaoCao): NhomBaoCao {
  return BAO_CAO.find((b) => b.khoa === bc)!.nhom;
}

// Xuất Excel (chỉ Admin/Quản lý lớp, mục 4.7): báo cáo #1, #3, #6, #7
const XUAT_DUOC = new Set<KhoaBaoCao>(["kpi-tong-hop", "san-luong", "a4", "de-xuat"]);
export function xuatDuocExcel(bc: KhoaBaoCao): boolean {
  return XUAT_DUOC.has(bc);
}

export interface ThamSoBaoCao {
  bc: KhoaBaoCao;
  kt?: KhungThoiGian;
  moc?: string;
  ky?: string;
  vt?: string;
}

export function hrefBaoCao(p: ThamSoBaoCao): string {
  const q = new URLSearchParams();
  q.set("bc", p.bc);
  if (p.kt) q.set("kt", p.kt);
  if (p.moc) q.set("moc", p.moc);
  if (p.ky) q.set("ky", p.ky);
  if (p.vt && p.vt !== "tat-ca") q.set("vt", p.vt);
  return `/bao-cao?${q.toString()}`;
}
