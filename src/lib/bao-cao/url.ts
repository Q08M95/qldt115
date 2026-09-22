import type { KhungThoiGian } from "./khoang";

// 8 báo cáo mục 4.7, gộp thành 2 nhóm theo đúng bộ lọc dùng chung — thay cho 8 tab cuộn ngang trước đây (phản hồi người
// dùng): mỗi nhóm hiển thị TRỌN VẸN các báo cáo của mình xếp dọc trên cùng 1 trang, chỉ 1 lần chọn bộ lọc cho cả nhóm.
export type NhomBaoCao = "ky" | "thoi-gian";

export const NHOM_BAO_CAO: { gia_tri: NhomBaoCao; nhan: string; mo_ta: string }[] = [
  { gia_tri: "ky", nhan: "Theo kỳ đánh giá", mo_ta: "KPI, A4, đề xuất nhân sự — gắn với kỳ đánh giá (quý)" },
  { gia_tri: "thoi-gian", nhan: "Theo hoạt động", mo_ta: "Sản lượng, đăng ký, vận hành lớp — lọc tuần/tháng/quý/năm" },
];

export const BAO_CAO_KY = [
  { khoa: "kpi-tong-hop", so: 1, nhan: "KPI tổng hợp" },
  { khoa: "xu-huong-kpi", so: 2, nhan: "Xu hướng KPI" },
  { khoa: "a4", so: 6, nhan: "A4 — Lớp không kinh phí" },
  { khoa: "de-xuat", so: 7, nhan: "Đề xuất nhân sự" },
] as const;

export const BAO_CAO_THOI_GIAN = [
  { khoa: "san-luong", so: 3, nhan: "Sản lượng giảng dạy" },
  { khoa: "ty-le-dang-ky", so: 4, nhan: "Tự đăng ký & nhận lời mời" },
  { khoa: "van-hanh-dang-ky", so: 5, nhan: "Vận hành đăng ký" },
  { khoa: "van-hanh-lop", so: 8, nhan: "Vận hành lớp học" },
] as const;

export type KhoaBaoCao = (typeof BAO_CAO_KY)[number]["khoa"] | (typeof BAO_CAO_THOI_GIAN)[number]["khoa"];

export function laNhomBaoCao(v: string | undefined): v is NhomBaoCao {
  return v === "ky" || v === "thoi-gian";
}

export interface ThamSoBaoCao {
  nhom: NhomBaoCao;
  ky?: string;
  kt?: KhungThoiGian;
  moc?: string;
  vt?: string;
}

// Giữ nguyên cả 2 chiều lọc (kỳ đánh giá + khung thời gian) mỗi khi chuyển liên kết, để nút "Xuất báo cáo" luôn có đủ
// ngữ cảnh dù người dùng đang xem nhóm nào (mục 4.7 — xuất 1 chỗ, gộp cả báo cáo theo kỳ lẫn theo thời gian).
export function hrefBaoCao(p: ThamSoBaoCao): string {
  const q = new URLSearchParams();
  q.set("nhom", p.nhom);
  if (p.ky) q.set("ky", p.ky);
  if (p.kt) q.set("kt", p.kt);
  if (p.moc) q.set("moc", p.moc);
  if (p.vt && p.vt !== "tat-ca") q.set("vt", p.vt);
  return `/bao-cao?${q.toString()}`;
}
