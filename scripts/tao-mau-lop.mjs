// Dựng file "mau tao lop.xlsx" ở gốc dự án — mẫu để Admin điền kế hoạch năm rồi xuất CSV, dùng với
// nút "Nhập từ CSV" ở trang Lớp học (src/components/lop-hoc/nhap-csv-lop-drawer.tsx).
// Đọc danh mục nhóm lớp/chứng chỉ THẬT từ Supabase (chỉ đọc, dùng service role) để sheet "Danh mục hiện có"
// luôn khớp đúng chính tả đang dùng — chạy lại script này mỗi khi danh mục đổi.
// Chạy: node scripts/tao-mau-lop.mjs
import fs from "node:fs";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [{ data: nhomLop, error: e1 }, { data: chungChi, error: e2 }] = await Promise.all([
  supabase.from("danh_muc_nhom_lop").select("ten, dang_dung").eq("dang_dung", true).order("thu_tu").order("ten"),
  supabase.from("danh_muc_loai_chung_chi").select("ten, dang_dung").eq("dang_dung", true).order("thu_tu").order("ten"),
]);
if (e1 || e2) {
  console.error("Không đọc được danh mục:", e1?.message, e2?.message);
  process.exit(1);
}

const NHOM_NHAN_SU = ["Ban giám đốc", "Giảng viên là bác sĩ", "Giảng viên không là bác sĩ", "Trợ giảng là bác sĩ", "Trợ giảng không là bác sĩ"];

const CSV_HEADER = [
  "mã lớp",
  "tên lớp",
  "nhóm lớp",
  "đối tượng",
  "loại kinh phí",
  "địa điểm",
  "nhóm đủ điều kiện",
  "chứng chỉ yêu cầu",
  "công khai sớm",
  "tên bài",
  "ngày",
  "giờ bắt đầu",
  "giờ kết thúc",
  "số giảng viên",
  "số trợ giảng",
];

const VI_DU = [
  [
    "ACLS-Q1-01",
    "ACLS khóa 12",
    "ACLS",
    "Nhân viên y tế",
    "Có kinh phí",
    "Hội trường A",
    "Giảng viên là bác sĩ;Trợ giảng là bác sĩ",
    "",
    "không",
    "Lý thuyết hồi sinh tim phổi",
    "15/03/2026",
    "08:00",
    "11:00",
    1,
    0,
  ],
  ["ACLS-Q1-01", "", "", "", "", "", "", "", "", "Thực hành cấp cứu", "15/03/2026", "13:00", "16:00", 1, 3],
  ["ACLS-Q1-01", "", "", "", "", "", "", "", "", "Thi thực hành", "16/03/2026", "08:00", "11:00", 1, 3],
  [
    "BLS-Q1-05",
    "BLS khóa 5",
    "BLS",
    "Cộng đồng",
    "Không kinh phí",
    "Trạm y tế phường 3",
    "Giảng viên không là bác sĩ;Trợ giảng không là bác sĩ",
    "",
    "có",
    "Buổi duy nhất",
    "20/04/2026",
    "08:00",
    "11:30",
    1,
    2,
  ],
];

const HUONG_DAN = [
  ["Cột", "Bắt buộc", "Ý nghĩa", "Ví dụ"],
  ["mã lớp", "Có, mỗi dòng", "Bạn tự đặt, để gộp các dòng Bài cùng 1 lớp. Không lưu vào hệ thống.", "ACLS-Q1-01"],
  ["tên lớp", "Chỉ dòng đầu của mỗi mã lớp", "Tên hiển thị của lớp.", "ACLS khóa 12"],
  ["nhóm lớp", "Chỉ dòng đầu", "Đúng tên trong sheet Danh mục hiện có.", "ACLS"],
  ["đối tượng", "Chỉ dòng đầu", '"Nhân viên y tế" hoặc "Cộng đồng".', "Nhân viên y tế"],
  ["loại kinh phí", "Chỉ dòng đầu", '"Có kinh phí" hoặc "Không kinh phí".', "Có kinh phí"],
  ["địa điểm", "Không bắt buộc", "", "Hội trường A"],
  ["nhóm đủ điều kiện", "Chỉ dòng đầu", "Tên nhóm nhân sự (xem Danh mục hiện có), nhiều nhóm cách nhau bằng dấu ;", "Giảng viên là bác sĩ;Trợ giảng là bác sĩ"],
  ["chứng chỉ yêu cầu", "Không bắt buộc", "Tên chứng chỉ (xem Danh mục hiện có), cách nhau bằng ;. Để trống nếu không yêu cầu.", ""],
  ["công khai sớm", "Không bắt buộc", '"có" hoặc "không" — cho GV/TG thấy lớp khi còn Dự kiến.', "không"],
  ["tên bài", "Có, mỗi dòng", "Nội dung của buổi học (Bài) đó.", "Lý thuyết hồi sinh tim phổi"],
  ["ngày", "Có, mỗi dòng", "Định dạng dd/mm/yyyy.", "15/03/2026"],
  ["giờ bắt đầu / giờ kết thúc", "Có, mỗi dòng", "Định dạng HH:mm (giờ Việt Nam).", "08:00 / 11:00"],
  ["số giảng viên / số trợ giảng", "Có, mỗi dòng", "Số nguyên 0–20; tổng 2 cột phải ≥ 1.", "1 / 3"],
];

const wb = new ExcelJS.Workbook();
wb.created = new Date();

// ---------- Sheet 1: Hướng dẫn ----------
const wsHD = wb.addWorksheet("Hướng dẫn", { views: [{ state: "frozen", ySplit: 1 }] });
wsHD.columns = [
  { header: HUONG_DAN[0][0], key: "cot", width: 26 },
  { header: HUONG_DAN[0][1], key: "bat_buoc", width: 24 },
  { header: HUONG_DAN[0][2], key: "y_nghia", width: 60 },
  { header: HUONG_DAN[0][3], key: "vi_du", width: 34 },
];
HUONG_DAN.slice(1).forEach((r) => wsHD.addRow(r));
wsHD.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
wsHD.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14468A" } };
wsHD.eachRow((row, i) => {
  if (i > 1) row.alignment = { vertical: "top", wrapText: true };
});
wsHD.insertRow(1, ["Mỗi dòng trong sheet \"Mẫu tạo lớp\" là 1 Bài. Các cột của lớp chỉ cần điền ở dòng Bài đầu tiên của mỗi mã lớp — dòng sau để trống là tự lấy lại giá trị dòng trước."]);
wsHD.mergeCells("A1:D1");
wsHD.getRow(1).font = { italic: true, color: { argb: "FF71717A" } };
wsHD.getRow(1).height = 32;
wsHD.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
wsHD.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14468A" } };

// ---------- Sheet 2: Mẫu tạo lớp (điền vào đây) ----------
const wsMau = wb.addWorksheet("Mẫu tạo lớp", { views: [{ state: "frozen", ySplit: 1 }] });
wsMau.columns = CSV_HEADER.map((h, i) => ({ header: h, key: `c${i}`, width: [12, 20, 12, 16, 16, 20, 34, 24, 12, 26, 12, 11, 11, 12, 12][i] }));
VI_DU.forEach((r) => wsMau.addRow(r));
wsMau.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
wsMau.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14468A" } };
wsMau.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CSV_HEADER.length } };

// ---------- Sheet 3: Danh mục hiện có (để copy đúng chính tả) ----------
const wsDM = wb.addWorksheet("Danh mục hiện có");
wsDM.columns = [
  { header: "Nhóm lớp", key: "a", width: 24 },
  { header: "Nhóm nhân sự", key: "b", width: 30 },
  { header: "Loại chứng chỉ", key: "c", width: 30 },
];
wsDM.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
wsDM.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14468A" } };
const soDong = Math.max(nhomLop.length, NHOM_NHAN_SU.length, chungChi.length, 1);
for (let i = 0; i < soDong; i++) {
  wsDM.addRow({ a: nhomLop[i]?.ten ?? "", b: NHOM_NHAN_SU[i] ?? "", c: chungChi[i]?.ten ?? "" });
}

const buf = await wb.xlsx.writeBuffer();
const outPath = new URL("../mau tao lop.xlsx", import.meta.url);
fs.writeFileSync(outPath, Buffer.from(buf));
console.log(`Đã tạo: mau tao lop.xlsx — ${nhomLop.length} nhóm lớp, ${chungChi.length} loại chứng chỉ đang dùng.`);
