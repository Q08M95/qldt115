// Khung thời gian của báo cáo (mục 4.7): tuần / tháng / quý / năm theo NGÀY GIỜ VIỆT NAM.
// Tuần tính từ thứ Hai đến Chủ nhật. Mọi ngày là chuỗi 'YYYY-MM-DD' và được tính bằng UTC để không lệch múi giờ máy chủ.

export type KhungThoiGian = "tuan" | "thang" | "quy" | "nam";

export const KHUNG_THOI_GIAN: { gia_tri: KhungThoiGian; nhan: string }[] = [
  { gia_tri: "tuan", nhan: "Tuần" },
  { gia_tri: "thang", nhan: "Tháng" },
  { gia_tri: "quy", nhan: "Quý" },
  { gia_tri: "nam", nhan: "Năm" },
];

export interface KhoangBaoCao {
  khung: KhungThoiGian;
  tu: string;
  den: string;
  // Nhãn dễ đọc: "Tuần 03/03 – 09/03/2025", "Tháng 3/2025", "Quý 1/2025", "Năm 2025"
  nhan: string;
  // Ngày trong khoảng liền trước / liền sau (để chuyển kỳ); sau = null nếu khoảng sau chưa bắt đầu
  truoc: string;
  sau: string | null;
  // Khoảng liền trước (để tính xu hướng so kỳ trước)
  tuTruoc: string;
  denTruoc: string;
  laHienTai: boolean;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const cong = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export function homNayVN(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function laKhung(v: string | undefined): v is KhungThoiGian {
  return v === "tuan" || v === "thang" || v === "quy" || v === "nam";
}

function canhKhoang(khung: KhungThoiGian, moc: string): { tu: string; den: string; nhan: string } {
  const d = parse(moc);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (khung === "tuan") {
    const lui = (d.getUTCDay() + 6) % 7;
    const tu = cong(moc, -lui);
    const den = cong(tu, 6);
    return { tu, den, nhan: `Tuần ${ddmm(tu)} – ${ddmm(den)}/${den.slice(0, 4)}` };
  }
  if (khung === "thang") {
    return { tu: iso(new Date(Date.UTC(y, m, 1))), den: iso(new Date(Date.UTC(y, m + 1, 0))), nhan: `Tháng ${m + 1}/${y}` };
  }
  if (khung === "quy") {
    const q = Math.floor(m / 3);
    return { tu: iso(new Date(Date.UTC(y, q * 3, 1))), den: iso(new Date(Date.UTC(y, q * 3 + 3, 0))), nhan: `Quý ${q + 1}/${y}` };
  }
  return { tu: `${y}-01-01`, den: `${y}-12-31`, nhan: `Năm ${y}` };
}

// Khoảng chứa ngày `moc` (mặc định hôm nay); moc sai định dạng thì dùng hôm nay
export function tinhKhoang(khung: KhungThoiGian, moc?: string | null): KhoangBaoCao {
  const homNay = homNayVN();
  const goc = moc && ISO.test(moc) && !Number.isNaN(parse(moc).getTime()) ? moc : homNay;
  const k = canhKhoang(khung, goc);
  const truoc = cong(k.tu, -1);
  const truocK = canhKhoang(khung, truoc);
  const sauNgay = cong(k.den, 1);
  return {
    khung,
    ...k,
    truoc,
    sau: sauNgay <= homNay ? sauNgay : null,
    tuTruoc: truocK.tu,
    denTruoc: truocK.den,
    laHienTai: homNay >= k.tu && homNay <= k.den,
  };
}
