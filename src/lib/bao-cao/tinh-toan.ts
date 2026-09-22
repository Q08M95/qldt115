import type { DeXuatThongKe, LoaiDeXuat, VaiTroGiangDay } from "@/types/database";
import type { DiemNgayDangKy, DongLop, DongSanLuong, DongTyLe } from "./types";

export type LocVaiTro = "tat-ca" | VaiTroGiangDay;

export function laLocVaiTro(v: string | undefined): v is LocVaiTro {
  return v === "tat-ca" || v === "giang_vien" || v === "tro_giang";
}

export const phanTram = (tu: number, mau: number): number | null => (mau > 0 ? Math.round((tu / mau) * 1000) / 10 : null);

// Chênh lệch tương đối (%) giữa kỳ này và kỳ trước cho trend pill; kỳ trước = 0 hoặc thiếu thì không có xu hướng
export function xuHuong(hienTai: number | null, truoc: number | null): number | undefined {
  if (hienTai === null || truoc === null || truoc === 0) return undefined;
  return Math.round(((hienTai - truoc) / truoc) * 100);
}

// ===== Báo cáo #3 =====
export interface TongHopSanLuong {
  nguoi: DongSanLuong[];
  soNguoi: number;
  tongGio: number;
  tongBai: number;
  gioTB: number;
  gioCaoNhat: number;
  soNguoiKhongDay: number;
  // Chỉ số đồng đều 0–100 (100 = mọi người dạy bằng nhau) = (1 − Gini) × 100; null khi chưa đủ dữ liệu
  chiSoDongDeu: number | null;
  // Tỷ lệ tổng giờ do 20% người dạy nhiều nhất đảm nhiệm
  top20: number | null;
  muc: { nhan: string; so: number }[];
}

// Chỉ tính người đang tham gia (người đã nghỉ nhưng từng dạy trong khoảng vẫn hiện trong bảng nhưng không kéo lệch chỉ số công bằng)
export function tongHopSanLuong(rows: DongSanLuong[], loc: LocVaiTro): TongHopSanLuong {
  const nguoi = rows.filter((r) => loc === "tat-ca" || r.vai_tro === loc);
  const dang = nguoi.filter((r) => r.dang_tham_gia);
  const gio = dang.map((r) => r.gio_thuc).sort((a, b) => a - b);
  const tong = gio.reduce((s, g) => s + g, 0);
  const n = gio.length;
  let chiSo: number | null = null;
  if (n >= 2 && tong > 0) {
    const gini = (2 * gio.reduce((s, g, i) => s + (i + 1) * g, 0)) / (n * tong) - (n + 1) / n;
    chiSo = Math.round((1 - Math.max(0, Math.min(1, gini))) * 100);
  }
  let top20: number | null = null;
  if (n >= 5 && tong > 0) {
    const k = Math.max(1, Math.ceil(n * 0.2));
    top20 = Math.round((gio.slice(-k).reduce((s, g) => s + g, 0) / tong) * 100);
  }
  // Chia người theo mức giờ đã dạy để thấy dạng phân bố (nhiều người 0 giờ hay dồn ở mức cao)
  const cat = [
    { nhan: "0 giờ", tu: 0, den: 0 },
    { nhan: "Dưới 4 giờ", tu: 0.0001, den: 4 },
    { nhan: "4 – 8 giờ", tu: 4.0001, den: 8 },
    { nhan: "8 – 16 giờ", tu: 8.0001, den: 16 },
    { nhan: "Trên 16 giờ", tu: 16.0001, den: Infinity },
  ];
  return {
    nguoi,
    soNguoi: n,
    tongGio: Math.round(tong * 10) / 10,
    tongBai: nguoi.reduce((s, r) => s + r.so_bai, 0),
    gioTB: n > 0 ? Math.round((tong / n) * 10) / 10 : 0,
    gioCaoNhat: gio.length ? gio[gio.length - 1] : 0,
    soNguoiKhongDay: gio.filter((g) => g === 0).length,
    chiSoDongDeu: chiSo,
    top20,
    muc: cat.map((c) => ({ nhan: c.nhan, so: gio.filter((g) => g >= c.tu && g <= c.den).length })),
  };
}

// ===== Báo cáo #4 =====
export interface DongTyLeTinh extends DongTyLe {
  a2: number | null;
  a3: number | null;
  soMoi: number;
}

export interface TongHopTyLe {
  dong: DongTyLeTinh[];
  a2: number | null;
  a3: number | null;
  soNguoi: number;
  tongMoi: number;
  tongTuDangKy: number;
}

export function tongHopTyLe(rows: DongTyLe[], loc: LocVaiTro): TongHopTyLe {
  const dong = rows
    .filter((r) => loc === "tat-ca" || r.vai_tro === loc)
    .map((r) => ({
      ...r,
      soMoi: r.so_moi_dong_y + r.so_moi_tu_choi,
      a2: phanTram(r.so_tu_dang_ky, r.so_bai_da_day),
      a3: phanTram(r.so_moi_dong_y, r.so_moi_dong_y + r.so_moi_tu_choi),
    }));
  const daDay = dong.reduce((s, r) => s + r.so_bai_da_day, 0);
  const tuDk = dong.reduce((s, r) => s + r.so_tu_dang_ky, 0);
  const dongY = dong.reduce((s, r) => s + r.so_moi_dong_y, 0);
  const moi = dong.reduce((s, r) => s + r.soMoi, 0);
  return { dong, a2: phanTram(tuDk, daDay), a3: phanTram(dongY, moi), soNguoi: dong.length, tongMoi: moi, tongTuDangKy: tuDk };
}

// ===== Báo cáo #5 =====
// Gộp chuỗi theo ngày thành tối đa `toiDa` điểm (khoảng dài như quý/năm) để sparkline không quá dày
export function gopSerie(serie: DiemNgayDangKy[], toiDa = 30): DiemNgayDangKy[] {
  if (serie.length <= toiDa) return serie;
  const buoc = Math.ceil(serie.length / toiDa);
  const out: DiemNgayDangKy[] = [];
  for (let i = 0; i < serie.length; i += buoc) {
    const nhom = serie.slice(i, i + buoc);
    out.push({ ngay: nhom[0].ngay, dang_ky: nhom.reduce((s, x) => s + x.dang_ky, 0), phan_cong: nhom.reduce((s, x) => s + x.phan_cong, 0) });
  }
  return out;
}

// ===== Báo cáo #8 =====
export interface TongHopLop {
  tong: number;
  theoTrangThai: { khoa: string; so: number }[];
  theoNhomLop: { nhan: string; so: number }[];
  kinhPhi: { co: number; khong: number };
  doiTuong: { yTe: number; congDong: number };
  slotTong: number;
  slotDaPhanCong: number;
}

export function tongHopLop(rows: DongLop[]): TongHopLop {
  const dem = <K extends string>(khoa: (r: DongLop) => K) => {
    const m = new Map<K, number>();
    rows.forEach((r) => m.set(khoa(r), (m.get(khoa(r)) ?? 0) + 1));
    return [...m.entries()];
  };
  return {
    tong: rows.length,
    theoTrangThai: dem((r) => r.trang_thai_hien_thi as string).map(([khoa, so]) => ({ khoa, so })),
    theoNhomLop: dem((r) => r.nhom_lop_ten)
      .map(([nhan, so]) => ({ nhan, so }))
      .sort((a, b) => b.so - a.so || a.nhan.localeCompare(b.nhan, "vi")),
    kinhPhi: { co: rows.filter((r) => r.loai_kinh_phi === "co_kinh_phi").length, khong: rows.filter((r) => r.loai_kinh_phi === "khong_kinh_phi").length },
    doiTuong: { yTe: rows.filter((r) => r.doi_tuong === "nhan_vien_y_te").length, congDong: rows.filter((r) => r.doi_tuong === "cong_dong").length },
    slotTong: rows.reduce((s, r) => s + r.slot_tong, 0),
    slotDaPhanCong: rows.reduce((s, r) => s + r.slot_da_phan_cong, 0),
  };
}

// ===== Báo cáo #7 =====
const TAT_CA_LOAI: LoaiDeXuat[] = ["phan_cong", "dao_tao", "khen_thuong_nhac_nho", "doi_nhom"];

// Đảm bảo đủ 4 loại (kể cả loại chưa có đề xuất nào) để bảng luôn hiển thị ổn định, đúng thứ tự LOAI_DE_XUAT_OPTIONS
export function chuanHoaDeXuat(d: DeXuatThongKe) {
  const theo_loai = TAT_CA_LOAI.map((loai) => d.theo_loai.find((x) => x.loai === loai) ?? { loai, cho_duyet: 0, da_duyet: 0, bo_qua: 0 });
  const daXuLy = d.da_duyet + d.bo_qua;
  return { theo_loai, cho_duyet: d.cho_duyet, da_duyet: d.da_duyet, bo_qua: d.bo_qua, tong: d.cho_duyet + daXuLy, tyLeDuyet: phanTram(d.da_duyet, daXuLy) };
}
