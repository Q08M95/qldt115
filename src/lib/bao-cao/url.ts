import type { KhungThoiGian } from "./khoang";

// 4 báo cáo dùng khung tuần/tháng/quý/năm (mục 4.7). Báo cáo #1, #2, #6, #7 theo kỳ đánh giá sẽ thêm ở lượt sau.
export const BAO_CAO = [
  { khoa: "san-luong", so: 3, nhan: "Sản lượng giảng dạy" },
  { khoa: "ty-le-dang-ky", so: 4, nhan: "Tự đăng ký & nhận lời mời" },
  { khoa: "van-hanh-dang-ky", so: 5, nhan: "Vận hành đăng ký" },
  { khoa: "van-hanh-lop", so: 8, nhan: "Vận hành lớp học" },
] as const;

export type KhoaBaoCao = (typeof BAO_CAO)[number]["khoa"];

export function laKhoaBaoCao(v: string | undefined): v is KhoaBaoCao {
  return BAO_CAO.some((b) => b.khoa === v);
}

export interface ThamSoBaoCao {
  bc: KhoaBaoCao;
  kt: KhungThoiGian;
  moc?: string;
  vt?: string;
}

export function hrefBaoCao(p: ThamSoBaoCao): string {
  const q = new URLSearchParams();
  q.set("bc", p.bc);
  q.set("kt", p.kt);
  if (p.moc) q.set("moc", p.moc);
  if (p.vt && p.vt !== "tat-ca") q.set("vt", p.vt);
  return `/bao-cao?${q.toString()}`;
}
