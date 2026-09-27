// Nhập nhanh lớp học + Bài từ danh sách Excel/CSV theo kế hoạch năm đã có sẵn (mục 4.2).
// Mỗi dòng = 1 Bài; các cột thông tin của LỚP chỉ cần điền ở dòng Bài đầu tiên của "mã lớp" đó,
// dòng sau cùng mã lớp để trống là tự lấy lại giá trị dòng trước (đỡ gõ lặp trong Excel).
// File thuần (không import DB) để dễ kiểm thử; việc khớp danh mục nằm ở resolveLopHocCsv (nhận danh mục làm tham số).

import { boDau } from "@/lib/nhan-su/labels";
import type { DoiTuongLop, LoaiKinhPhi, NhomNhanSu } from "@/types/database";

export const CSV_HEADER =
  "mã lớp,tên lớp,nhóm lớp,đối tượng,loại kinh phí,địa điểm,nhóm đủ điều kiện,chứng chỉ yêu cầu,công khai sớm,tên bài,ngày,giờ bắt đầu,giờ kết thúc,số giảng viên,số trợ giảng";

// Các cột "cấp lớp" — kế thừa từ dòng trước cùng mã lớp khi để trống
type LopColKey = "tenLop" | "nhomLop" | "doiTuong" | "loaiKinhPhi" | "diaDiem" | "nhomDuDieuKien" | "chungChiYeuCau" | "congKhaiSom";

export interface BaiCsvRow {
  dong: number; // số dòng trong văn bản gốc (từ 1), để báo lỗi chính xác
  maLop: string;
  tenLop: string;
  nhomLop: string;
  doiTuong: string;
  loaiKinhPhi: string;
  diaDiem: string;
  nhomDuDieuKien: string;
  chungChiYeuCau: string;
  congKhaiSom: string;
  tenBai: string;
  ngay: string;
  gioBatDau: string;
  gioKetThuc: string;
  soGv: string;
  soTg: string;
}

// Tách 1 dòng theo dấu phân cách, hỗ trợ ô đặt trong ngoặc kép
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Excel dán vào ô văn bản là dấu tab; file CSV tiếng Việt thường dùng dấu chấm phẩy; còn lại là dấu phẩy
function detectSeparator(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (first.includes("\t")) return "\t";
  if (first.split(";").length > first.split(",").length) return ";";
  return ",";
}

export function parseLopHocCsv(raw: string): BaiCsvRow[] {
  const text = raw.replace(/^﻿/, "");
  const sep = detectSeparator(text);
  const lines = text.split(/\r?\n/);
  const rows: BaiCsvRow[] = [];
  // Giá trị cấp lớp gần nhất theo từng mã lớp, để kế thừa khi ô để trống
  const gioiHan = new Map<string, Partial<Record<LopColKey, string>>>();

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = splitLine(lines[i], sep);
    // Dòng tiêu đề: ô đầu là chữ "mã lớp" (không phân biệt dấu)
    if (rows.length === 0 && boDau(c[0] ?? "").replace(/\s+/g, " ") === "ma lop") continue;

    const maLop = (c[0] ?? "").trim();
    if (!maLop) continue; // dòng trống hẳn (chỉ có dấu phẩy) thì bỏ qua thay vì báo lỗi khó hiểu

    const truoc = gioiHan.get(maLop) ?? {};
    const lay = (idx: number, key: LopColKey) => {
      const v = (c[idx] ?? "").trim();
      return v || truoc[key] || "";
    };

    const row: BaiCsvRow = {
      dong: i + 1,
      maLop,
      tenLop: lay(1, "tenLop"),
      nhomLop: lay(2, "nhomLop"),
      doiTuong: lay(3, "doiTuong"),
      loaiKinhPhi: lay(4, "loaiKinhPhi"),
      diaDiem: lay(5, "diaDiem"),
      nhomDuDieuKien: lay(6, "nhomDuDieuKien"),
      chungChiYeuCau: lay(7, "chungChiYeuCau"),
      congKhaiSom: lay(8, "congKhaiSom"),
      tenBai: (c[9] ?? "").trim(),
      ngay: (c[10] ?? "").trim(),
      gioBatDau: (c[11] ?? "").trim(),
      gioKetThuc: (c[12] ?? "").trim(),
      soGv: (c[13] ?? "").trim(),
      soTg: (c[14] ?? "").trim(),
    };
    gioiHan.set(maLop, {
      tenLop: row.tenLop,
      nhomLop: row.nhomLop,
      doiTuong: row.doiTuong,
      loaiKinhPhi: row.loaiKinhPhi,
      diaDiem: row.diaDiem,
      nhomDuDieuKien: row.nhomDuDieuKien,
      chungChiYeuCau: row.chungChiYeuCau,
      congKhaiSom: row.congKhaiSom,
    });
    rows.push(row);
  }
  return rows;
}

// ---------- Khớp danh mục + kiểm tra hợp lệ (thuần, nhận danh mục làm tham số để dễ kiểm thử) ----------

const NHOM_NHAN_SU_LABEL: Record<NhomNhanSu, string> = {
  ban_giam_doc: "Ban giám đốc",
  gv_bac_si: "Giảng viên là bác sĩ",
  gv_khong_bac_si: "Giảng viên không là bác sĩ",
  tg_bac_si: "Trợ giảng là bác sĩ",
  tg_khong_bac_si: "Trợ giảng không là bác sĩ",
};

function khopTen<T extends string>(raw: string, options: [T, string][]): T | null {
  const t = boDau(raw).replace(/\s+/g, " ").trim();
  if (!t) return null;
  for (const [code, label] of options) {
    if (t === boDau(code).replace(/\s+/g, " ") || t === boDau(label).replace(/\s+/g, " ")) return code;
  }
  return null;
}

export interface BaiCsvDaXuLy {
  dong: number;
  ten: string;
  batDauIso: string | null;
  ketThucIso: string | null;
  soGv: number | null;
  soTg: number | null;
  loi?: string;
}

export interface LopCsvNhom {
  maLop: string;
  dongDauTien: number;
  ten: string;
  nhomLopId: string | null;
  doiTuong: DoiTuongLop | null;
  loaiKinhPhi: LoaiKinhPhi | null;
  diaDiem: string;
  nhomDuDieuKien: NhomNhanSu[];
  chungChiIds: string[];
  congKhaiSom: boolean;
  bai: BaiCsvDaXuLy[];
  // Lỗi ở cấp lớp (thiếu tên, không khớp danh mục...) — có thì cả lớp không tạo, dù các Bài đều hợp lệ
  loi?: string;
}

// "15/03/2026" + "08:00" -> "2026-03-15T08:00:00+07:00" (giờ Việt Nam, giống localInputToIso)
function ngayGioToIso(ngay: string, gio: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(ngay.trim());
  const h = /^(\d{1,2}):(\d{2})$/.exec(gio.trim());
  if (!m || !h) return null;
  const [, dd, mm, yyyy] = m;
  const [, hh, mi] = h;
  const D = dd.padStart(2, "0"),
    M = mm.padStart(2, "0"),
    H = hh.padStart(2, "0");
  if (+M < 1 || +M > 12 || +D < 1 || +D > 31 || +H > 23 || +mi > 59) return null;
  return `${yyyy}-${M}-${D}T${H}:${mi}:00+07:00`;
}

export function resolveLopHocCsv(
  rows: BaiCsvRow[],
  danhMuc: { nhomLop: { id: string; ten: string }[]; chungChi: { id: string; ten: string }[] },
): LopCsvNhom[] {
  const nhomLopOptions: [string, string][] = danhMuc.nhomLop.map((n) => [n.id, n.ten]);
  const chungChiOptions: [string, string][] = danhMuc.chungChi.map((c) => [c.id, c.ten]);
  const nhomNhanSuOptions = Object.entries(NHOM_NHAN_SU_LABEL) as [NhomNhanSu, string][];

  const nhoms = new Map<string, LopCsvNhom>();
  const thuTu: string[] = [];

  for (const r of rows) {
    if (!nhoms.has(r.maLop)) {
      thuTu.push(r.maLop);

      const ten = r.tenLop.trim();
      const nhomLopId = khopTen(r.nhomLop, nhomLopOptions);
      const doiTuong = khopTen<DoiTuongLop>(r.doiTuong, [
        ["nhan_vien_y_te", "Nhân viên y tế"],
        ["cong_dong", "Cộng đồng"],
      ]);
      const loaiKinhPhi = khopTen<LoaiKinhPhi>(r.loaiKinhPhi, [
        ["co_kinh_phi", "Có kinh phí"],
        ["khong_kinh_phi", "Không kinh phí"],
      ]);
      const nhomDuDieuKien = r.nhomDuDieuKien
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => khopTen<NhomNhanSu>(s, nhomNhanSuOptions));
      const chungChiIds = r.chungChiYeuCau
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => khopTen(s, chungChiOptions));
      const congKhaiSom = /^(co|có|c|x|yes|y|true|1)$/i.test(boDau(r.congKhaiSom.trim()));

      let loi: string | undefined;
      if (!ten) loi = "Thiếu tên lớp.";
      else if (!nhomLopId) loi = `Nhóm lớp không khớp danh mục: "${r.nhomLop}".`;
      else if (!doiTuong) loi = `Đối tượng không hợp lệ: "${r.doiTuong}" (cần "Nhân viên y tế" hoặc "Cộng đồng").`;
      else if (!loaiKinhPhi) loi = `Loại kinh phí không hợp lệ: "${r.loaiKinhPhi}" (cần "Có kinh phí" hoặc "Không kinh phí").`;
      else if (nhomDuDieuKien.length === 0) loi = "Thiếu nhóm đủ điều kiện đăng ký.";
      else if (nhomDuDieuKien.includes(null)) loi = `Nhóm đủ điều kiện không khớp danh mục: "${r.nhomDuDieuKien}".`;
      else if (chungChiIds.includes(null)) loi = `Chứng chỉ yêu cầu không khớp danh mục: "${r.chungChiYeuCau}".`;

      nhoms.set(r.maLop, {
        maLop: r.maLop,
        dongDauTien: r.dong,
        ten,
        nhomLopId,
        doiTuong,
        loaiKinhPhi,
        diaDiem: r.diaDiem.trim(),
        nhomDuDieuKien: nhomDuDieuKien.filter((x): x is NhomNhanSu => !!x),
        chungChiIds: chungChiIds.filter((x): x is string => !!x),
        congKhaiSom,
        bai: [],
        loi,
      });
    }

    const nhom = nhoms.get(r.maLop)!;
    const batDauIso = ngayGioToIso(r.ngay, r.gioBatDau);
    const ketThucIso = ngayGioToIso(r.ngay, r.gioKetThuc);
    const soGv = /^\d+$/.test(r.soGv) ? Number(r.soGv) : null;
    const soTg = /^\d+$/.test(r.soTg) ? Number(r.soTg) : null;

    let loi: string | undefined;
    if (!r.tenBai) loi = "Thiếu tên Bài.";
    else if (!batDauIso || !ketThucIso) loi = `Ngày/giờ không hợp lệ (ngày "${r.ngay}", giờ "${r.gioBatDau}"–"${r.gioKetThuc}").`;
    else if (ketThucIso <= batDauIso) loi = "Giờ kết thúc phải sau giờ bắt đầu.";
    else if (soGv === null || soTg === null || soGv > 20 || soTg > 20) loi = "Số slot mỗi vai trò phải là số nguyên từ 0 đến 20.";
    else if (soGv + soTg === 0) loi = "Mỗi Bài cần ít nhất 1 slot (Giảng viên hoặc Trợ giảng).";

    nhom.bai.push({ dong: r.dong, ten: r.tenBai, batDauIso, ketThucIso, soGv, soTg, loi });
  }

  return thuTu.map((k) => nhoms.get(k)!);
}
