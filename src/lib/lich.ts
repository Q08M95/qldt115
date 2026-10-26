// Tiện ích lưới lịch tháng dùng chung cho "Lịch dạy của tôi" (/dang-ky#lich) và "Lịch lớp" (/lop-hoc?xem=lich).

const VN_TZ = "Asia/Ho_Chi_Minh";
export const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const pad = (n: number) => String(n).padStart(2, "0");

// Ngày theo giờ Việt Nam dạng YYYY-MM-DD
export const ngayVN = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: VN_TZ });

export interface Thang {
  nam: number;
  thang: number;
}

export const thangCua = (ngay: string): Thang => ({ nam: Number(ngay.slice(0, 4)), thang: Number(ngay.slice(5, 7)) });

export const congThang = (t: Thang, delta: number): Thang => {
  const d = new Date(Date.UTC(t.nam, t.thang - 1 + delta, 1));
  return { nam: d.getUTCFullYear(), thang: d.getUTCMonth() + 1 };
};

export const khoaThang = (t: Thang) => `${t.nam}-${pad(t.thang)}`;

// "2026-11" -> tháng; sai định dạng thì null
export function docThang(s: string): Thang | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = { nam: Number(m[1]), thang: Number(m[2]) };
  return t.thang >= 1 && t.thang <= 12 && t.nam >= 2000 && t.nam <= 2100 ? t : null;
}

export interface OLich {
  khoa: string; // YYYY-MM-DD
  ngay: number;
  trongThang: boolean;
}

// Các ô của lưới tháng, bắt đầu từ Thứ Hai của tuần chứa ngày 1 (UTC thuần để không lệch múi giờ)
export function oLichThang(t: Thang): OLich[] {
  const dauThang = new Date(Date.UTC(t.nam, t.thang - 1, 1));
  const lui = (dauThang.getUTCDay() + 6) % 7;
  const soNgay = new Date(Date.UTC(t.nam, t.thang, 0)).getUTCDate();
  const soO = Math.ceil((lui + soNgay) / 7) * 7;
  return Array.from({ length: soO }, (_, i) => {
    const d = new Date(Date.UTC(t.nam, t.thang - 1, 1 - lui + i));
    return { khoa: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, ngay: d.getUTCDate(), trongThang: d.getUTCMonth() === t.thang - 1 };
  });
}

// Khoảng thời gian (ISO, giờ VN) phủ đúng các ô của lưới tháng — để lấy luôn Bài ở các ngày mờ đầu/cuối lưới
export function khoangLuoi(t: Thang): { tu: string; den: string } {
  const o = oLichThang(t);
  const cuoi = new Date(`${o[o.length - 1].khoa}T00:00:00Z`);
  cuoi.setUTCDate(cuoi.getUTCDate() + 1);
  return { tu: `${o[0].khoa}T00:00:00+07:00`, den: `${cuoi.toISOString().slice(0, 10)}T00:00:00+07:00` };
}

// Mỗi lớp 1 màu trong 4 màu gốc (theo mã lớp, ổn định giữa các lần xem) để nhìn lịch biết ngay Bài nào cùng lớp
const HUE = [
  { nen: "bg-grad-blue", vien: "border-[var(--hue-blue)]" },
  { nen: "bg-grad-navy", vien: "border-[var(--hue-navy)]" },
  { nen: "bg-grad-teal", vien: "border-[var(--hue-teal)]" },
  { nen: "bg-grad-green", vien: "border-[var(--hue-green)]" },
] as const;
export const hueLop = (lopId: string) => HUE[[...lopId].reduce((a, c) => a + c.charCodeAt(0), 0) % 4];
