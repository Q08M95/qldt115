// Bộ dữ liệu demo để CHỤP ẢNH MINH HỌA cho "huong dan su dung.pdf" (docs/huong-dan/).
// Chạy: node scripts/demo-huong-dan.mjs tao | dong-ky | xoa | kiemtra
//   tao      — tạo 51 tài khoản (tên thật theo danh sách nhân sự do người dùng cung cấp) + danh mục + lớp/Bài
//              trải ĐÚNG 4 quý gần nhất (12 tháng, kết thúc ở quý hiện tại) + 1 tài khoản Admin demo riêng.
//   dong-ky  — đóng 3 quý đã qua bằng ĐÚNG RPC thật (doi_trang_thai_ky, không giả lập số) để có KPI/xu hướng thật.
//              Chạy SAU "tao". Tách riêng vì cần chờ "tao" ghi xong toàn bộ điểm danh mới đóng.
//   xoa      — xóa sạch (tài khoản domain @huongdan-demo.test, lớp có created_by = Admin demo, các kỳ vừa tạo).
//   kiemtra  — in nhanh vài số liệu để đối chiếu trước khi chụp ảnh.
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local — CHỈ chạy trên máy, không commit, không chạy nhắm production.
// 2 người trùng tên với tài khoản THẬT đang có trên project dev (Nguyễn Hoàng Tú Minh, Hồ Khuê Tú) được
// CHỦ ĐỘNG BỎ QUA (không tạo demo trùng) — còn lại đúng 51 người.
import fs from "node:fs";

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
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
if (URL_.includes("tsrtmxeophzovnbgkvoj")) throw new Error("AN TOÀN: .env.local đang trỏ project PRODUCTION — dừng lại, không chạy demo ở đây.");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const MAT_KHAU = "HuongDan@2026!";
const MIEN = "@huongdan-demo.test";
const enc = (s) => encodeURIComponent(s);

async function rest(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}
async function authAdmin(path, { method = "GET", body } = {}) {
  const r = await fetch(`${URL_}/auth/v1/admin/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth ${method} ${path} -> ${r.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}
const tatCaUsers = async () => (await authAdmin("users?per_page=1000")).users ?? [];

const p2 = (n) => String(n).padStart(2, "0");
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;
function taoRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
// Ngày ngẫu nhiên (kèm giờ 07:00-16:00) trong 1 khoảng [tu, den] (chuỗi YYYY-MM-DD)
function ngayNgauNhien(rng, tu, den, gio) {
  const t1 = new Date(`${tu}T00:00:00Z`).getTime();
  const t2 = new Date(`${den}T00:00:00Z`).getTime();
  const ngayIso = new Date(t1 + rng() * (t2 - t1)).toISOString().slice(0, 10);
  return moc(ngayIso, gio ?? 7 + Math.floor(rng() * 9));
}
function quyChua(ngayIso) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  const nam = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3); // 0..3
  const tu = `${nam}-${p2(q * 3 + 1)}-01`;
  const thangKetThuc = q * 3 + 3;
  const denDate = new Date(Date.UTC(nam, thangKetThuc, 0));
  const den = `${denDate.getUTCFullYear()}-${p2(denDate.getUTCMonth() + 1)}-${p2(denDate.getUTCDate())}`;
  return { nam, quy: q + 1, tu, den };
}
function quyTruoc({ nam, quy }) {
  return quy === 1 ? quyChua(`${nam - 1}-12-01`) : quyChua(`${nam}-${p2((quy - 2) * 3 + 1)}-01`);
}

// ============================================================================================
// 51 nhân sự — tên/đơn vị/học vị/văn bằng THEO DANH SÁCH THẬT người dùng cung cấp (đã bỏ 2 người
// trùng tên tài khoản thật đang có trên project: "Nguyễn Hoàng Tú Minh", "Hồ Khuê Tú").
// vanBang phải khớp đúng 1 tên trong danh_muc_chuyen_mon hiện có: Bác sĩ, Điều dưỡng, Cử nhân,
// Chuyên viên, Thạc sĩ, Y sĩ. hocVi = học vị/chức danh chi tiết hơn, lưu vào profile_chuyen_mon.chi_tiet.
// trongSo: trọng số chọn khi phân công Bài (0 = cố tình "chưa dạy" để test trường hợp biên percentile).
// ============================================================================================
const NHAN_SU = [
  // ---- Ban giám đốc (nhóm cố định theo chức vụ hành chính, vai trò Giảng viên) — chỉ 3 người, DƯỚI
  //      ngưỡng percentile 5 người => test đúng cơ chế fallback so với lịch sử bản thân (mục 6) ----
  { key: "u01", ten: "Nguyễn Duy Long", donVi: "Ban Giám đốc", nhom: "ban_giam_doc", vanBang: "Bác sĩ", hocVi: "BS.CKII", trongSo: 2 },
  { key: "u02", ten: "Lê Huy Nguyễn Tuấn", donVi: "Ban Giám đốc", nhom: "ban_giam_doc", vanBang: "Bác sĩ", hocVi: "BS.CKII", trongSo: 2 },
  { key: "u03", ten: "Lê Nguyễn Hoàng", donVi: "Ban Giám đốc", nhom: "ban_giam_doc", vanBang: "Bác sĩ", hocVi: "BS.CKII", trongSo: 1 },
  // ---- Giảng viên là bác sĩ ----
  { key: "u04", ten: "Đào Thị Bích Hằng", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "BS.CKII", trongSo: 5 },
  { key: "u05", ten: "Khuất Hoàng Sơn", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "BS.CKI", trongSo: 5 },
  { key: "u06", ten: "Đồng Ngọc Hiền", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 5 },
  { key: "u07", ten: "Hứa Thành Phước", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 4 },
  { key: "u08", ten: "Nguyễn Thị Ngọc Hương", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 4 },
  { key: "u09", ten: "Vương Dũng Kiệt", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 3 },
  { key: "u10", ten: "Nguyễn Thị Quỳnh Hương", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 3, cc: ["ACLS"] },
  { key: "u11", ten: "Hà Trung Đạo", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 2 },
  { key: "u12", ten: "Phạm Tấn Phát", donVi: "Khoa Điều hành", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Thạc sĩ", trongSo: 2 },
  { key: "u13", ten: "Nguyễn Trọng Hiển", donVi: "Khoa Điều hành", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Thạc sĩ", trongSo: 1 },
  { key: "u14", ten: "Nguyễn Thị Hạnh", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_bac_si", vanBang: "Bác sĩ", hocVi: "Thạc sĩ", trongSo: 0 },
  // ---- Giảng viên không là bác sĩ ----
  { key: "u15", ten: "Đoàn Thị Mỹ Danh", donVi: "Khoa Điều hành", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 5 },
  { key: "u16", ten: "Lê Hoàng Long", donVi: "Khoa Điều hành", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 4 },
  { key: "u17", ten: "Huỳnh Thị Ngọc Huyền", donVi: "Khoa Điều hành", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 4 },
  { key: "u18", ten: "Nguyễn Kim Toàn", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 3 },
  { key: "u19", ten: "Nguyễn Văn Thời", donVi: "Phòng Kế hoạch - Tài chính", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 3 },
  { key: "u20", ten: "Nguyễn Thị Thu Hương", donVi: "Khoa Điều hành", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 3 },
  { key: "u21", ten: "Huỳnh Thị Nhẹ", donVi: "Phòng Kế hoạch - Tài chính", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 2 },
  { key: "u22", ten: "Lê Tuấn Anh", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 2 },
  { key: "u23", ten: "Nguyễn Hữu Hòa", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 2 },
  { key: "u24", ten: "Lý Tuấn Phát", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cử nhân", trongSo: 1 },
  { key: "u25", ten: "Nguyễn Minh Luân", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cao đẳng", trongSo: 1 },
  { key: "u26", ten: "Huỳnh Thúy Loan", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Cử nhân", hocVi: "Cao đẳng", trongSo: 1 },
  { key: "u27", ten: "Trương Chí Công", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "gv_khong_bac_si", vanBang: "Y sĩ", hocVi: "Trung cấp", trongSo: 0 },
  // ---- Trợ giảng là bác sĩ ----
  { key: "u28", ten: "Hoàng Ngọc Kiên", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 5, cc: ["ACLS", "BLS"] },
  { key: "u29", ten: "Trần Thị Yến Ngọc", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 5, cc: ["ACLS"] },
  { key: "u30", ten: "Ngô Khánh Thy", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 4, cc: ["BLS"] },
  { key: "u31", ten: "Phạm Thế Hải", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 4 },
  { key: "u32", ten: "Nguyễn Trần Ý Nhi", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 3, cc: ["Chứng chỉ sư phạm Y học"] },
  { key: "u33", ten: "Vũ Khoa Cát", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 3 },
  { key: "u34", ten: "Nguyễn Ngô Ngọc Quỳnh Như", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 2 },
  { key: "u35", ten: "Huỳnh Hữu Thọ", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 2 },
  { key: "u36", ten: "Trần Nguyễn Đăng Quang", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 1 },
  { key: "u37", ten: "Nguyễn Ngọc Cát Tiên", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 1 },
  { key: "u38", ten: "Nguyễn Trung Nam", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_bac_si", vanBang: "Bác sĩ", hocVi: "Bác sĩ (Hạng III)", trongSo: 0 },
  // ---- Trợ giảng không là bác sĩ ----
  { key: "u39", ten: "Nguyễn Thị Thanh Tâm", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 5 },
  { key: "u40", ten: "Nhâm Ngọc Kim Hiền", donVi: "Khoa Điều hành", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 5 },
  { key: "u41", ten: "Nguyễn Trà Mi", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 4 },
  { key: "u42", ten: "Nguyễn Trọng Phúc", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 4 },
  { key: "u43", ten: "Nguyễn Lê Tiến Hùng", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 3 },
  { key: "u44", ten: "Huỳnh Thị Chi", donVi: "Khoa Điều hành", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 3 },
  { key: "u45", ten: "Phạm Minh Hùng", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Thạc sĩ", hocVi: "Chuyên viên", trongSo: 2 },
  { key: "u46", ten: "Nguyễn Ngọc Quỳnh My", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng III)", trongSo: 2 },
  { key: "u47", ten: "Phạm Đình Phúc", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Điều dưỡng", hocVi: "Điều dưỡng (Hạng IV)", trongSo: 1 },
  { key: "u48", ten: "Lê Quang Trí", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Cử nhân", hocVi: "Điều dưỡng (Hạng IV)", trongSo: 1 },
  { key: "u49", ten: "Lê Trung Tuấn", donVi: "Khoa Điều hành", nhom: "tg_khong_bac_si", vanBang: "Cử nhân", hocVi: "Điều dưỡng (Hạng IV) — Cao đẳng", trongSo: 1 },
  { key: "u50", ten: "Trần Thanh Tân", donVi: "Khoa Điều hành", nhom: "tg_khong_bac_si", vanBang: "Cử nhân", hocVi: "Điều dưỡng (Hạng IV) — Cao đẳng", trongSo: 0 },
  { key: "u51", ten: "Nguyễn Quang Minh", donVi: "Khoa Cấp cứu ngoài bệnh viện", nhom: "tg_khong_bac_si", vanBang: "Y sĩ", hocVi: "Y sĩ (Hạng IV)", trongSo: 0 },
];
// "Hero" — đăng nhập chụp ảnh vai GV bác sĩ / TG không bác sĩ / Ban giám đốc (xem fallback percentile)
const HERO_GV = "u06"; // Đồng Ngọc Hiền
const HERO_TG = "u41"; // Nguyễn Trà Mi
const HERO_BGD = "u01"; // Nguyễn Duy Long

// Tài khoản Admin/Quyền Quản lý lớp RIÊNG cho demo (không trùng người dạy thật nào) — dùng để chụp toàn bộ
// màn hình quản trị + đứng tên gọi RPC đóng kỳ. Xóa hẳn (không chỉ thu hồi quyền) ở bước "xoa".
const ADMIN = { key: "qladmin", ten: "Trần Minh Quản", email: `quanly${MIEN}` };

const DIA_DIEM = [
  "Hội trường Tổ đào tạo - 130 Lê Lai, Quận 1",
  "Trạm Cấp cứu vệ tinh Tân Bình",
  "Trạm Cấp cứu vệ tinh Bình Chánh",
  "Phòng huấn luyện kỹ năng - Trung tâm Cấp cứu 115",
  "Trạm Cấp cứu vệ tinh Thủ Đức",
];

function chonCoTrongSo(rng, ungVien, daChon) {
  const kha = ungVien.filter((u) => !daChon.has(u.key) && u.trongSo > 0);
  if (kha.length === 0) return null;
  const tong = kha.reduce((s, u) => s + u.trongSo, 0);
  let r = rng() * tong;
  for (const u of kha) {
    r -= u.trongSo;
    if (r <= 0) return u;
  }
  return kha[kha.length - 1];
}

async function dangNhap(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: MAT_KHAU }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Đăng nhập demo lỗi: " + email + " -> " + JSON.stringify(j));
  const Hu = { apikey: ANON, Authorization: `Bearer ${j.access_token}`, "Content-Type": "application/json" };
  return async (fn, args) => {
    const x = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: Hu, body: JSON.stringify(args ?? {}) });
    const text = await x.text();
    if (!x.ok) throw new Error(`rpc ${fn} -> ${x.status} ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : null;
  };
}

async function taoTaiKhoan(email, hoTen) {
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  let uid = co.get(email);
  if (!uid) {
    const u = await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: hoTen } } });
    uid = u.id;
  }
  return uid;
}

async function tao() {
  const hom = homNayVN();
  const daCoLop = await rest(`profiles?select=id&email=eq.${enc(ADMIN.email)}`);
  if (daCoLop.length > 0) {
    console.log("Đã có dữ liệu demo hướng dẫn — chạy 'xoa' rồi 'tao' lại nếu muốn làm mới.");
    return;
  }
  const rng = taoRng(20261001);

  // 1. Tài khoản Admin demo (đủ quyền Admin gốc + Quyền Quản lý lớp) ----------------------------
  const adminId = await taoTaiKhoan(ADMIN.email, ADMIN.ten);
  await rest(`profiles?id=eq.${adminId}`, { method: "PATCH", body: { phan_quyen: "admin", co_quyen_quan_ly_lop: true } });
  console.log(`Đã tạo tài khoản Admin demo: ${ADMIN.email} (mật khẩu ${MAT_KHAU}).`);

  // 2. 51 tài khoản nhân sự + nhóm + chuyên môn + chứng chỉ -------------------------------------
  const chuyenMon = await rest("danh_muc_chuyen_mon?select=id,ten");
  const cmId = Object.fromEntries(chuyenMon.map((c) => [c.ten, c.id]));
  const loaiCc = await rest("danh_muc_loai_chung_chi?select=id,ten");
  const ccId = Object.fromEntries(loaiCc.map((c) => [c.ten, c.id]));

  const id = {};
  for (const [i, n] of NHAN_SU.entries()) {
    const email = `${n.key}${MIEN}`;
    const uid = await taoTaiKhoan(email, n.ten);
    id[n.key] = uid;
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    if (!cmId[n.vanBang]) throw new Error(`Thiếu danh mục chuyên môn "${n.vanBang}" cho ${n.ten}`);
    await rest("profile_chuyen_mon?on_conflict=user_id,chuyen_mon_id", {
      method: "POST",
      body: { user_id: uid, chuyen_mon_id: cmId[n.vanBang], chi_tiet: n.hocVi },
      prefer: "resolution=merge-duplicates",
    });
    await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { kinh_nghiem: `Công tác tại ${n.donVi}, Trung tâm Cấp cứu 115 TP.HCM.` } });
    // Chứng chỉ hành nghề cho tất cả (đúng như bảng nhân sự gốc: cột CCHN/GPHN luôn có) + chứng chỉ riêng nếu có
    const ccBody = [{ user_id: uid, loai_id: ccId["Chứng chỉ hành nghề"], so_chung_chi: `CCHN-${n.key.toUpperCase()}`, ngay_cap: cong(hom, -1500) }];
    for (const ten of n.cc ?? []) {
      if (!ccId[ten]) throw new Error(`Thiếu danh mục chứng chỉ "${ten}"`);
      ccBody.push({ user_id: uid, loai_id: ccId[ten], so_chung_chi: `${ten}-${n.key.toUpperCase()}`, ngay_cap: cong(hom, -400) });
    }
    await rest("chung_chi", { method: "POST", body: ccBody });
  }
  console.log(`Đã tạo ${NHAN_SU.length} tài khoản nhân sự demo (mật khẩu chung: ${MAT_KHAU}, email @huongdan-demo.test).`);

  const GV = NHAN_SU.filter((n) => n.nhom === "gv_bac_si" || n.nhom === "gv_khong_bac_si" || n.nhom === "ban_giam_doc");
  const TG = NHAN_SU.filter((n) => n.nhom === "tg_bac_si" || n.nhom === "tg_khong_bac_si");
  const theoNhom = (ds, nhomChoPhep) => ds.filter((n) => nhomChoPhep.includes(n.nhom));
  const TAT_CA_NHOM = ["ban_giam_doc", "gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];
  const NHOM_BAC_SI = ["gv_bac_si", "tg_bac_si"];

  // 3. 4 kỳ đánh giá — ĐÚNG 4 quý gần nhất (12 tháng), kỳ hiện tại để "dang_mo", 3 kỳ trước sẽ đóng ở lệnh "dong-ky"
  const qHienTai = quyChua(hom);
  const qM1 = quyTruoc(qHienTai);
  const qM2 = quyTruoc(qM1);
  const qM3 = quyTruoc(qM2);
  const QUYS = [qM3, qM2, qM1, qHienTai]; // cũ -> mới
  const rpcAdmin = await dangNhap(ADMIN.email);
  const kyId = {};
  for (const q of QUYS) {
    const ten = `Quý ${q.quy}/${q.nam}`;
    const kid = await rpcAdmin("luu_ky", { p_id: null, p_ten: ten, p_tu: q.tu, p_den: q.den });
    kyId[ten] = { id: kid, ...q };
  }
  console.log(`Đã tạo 4 kỳ đánh giá: ${QUYS.map((q) => `Quý ${q.quy}/${q.nam}`).join(", ")} (kỳ cuối đang mở).`);

  // 4. Lớp/Bài — sinh dữ liệu LỊCH SỬ cho 3 quý đã qua + dữ liệu SỐNG cho quý hiện tại -----------
  const nhomLop = await rest("danh_muc_nhom_lop?select=id,ten&order=thu_tu");
  let soHieu = 100;
  const diaDiem = (i) => DIA_DIEM[i % DIA_DIEM.length];

  const taoLop = async (nhomLopIdx, kinhPhi, congDong, trangThai, ngayBd, ngayKt, opt = {}) => {
    const nl = nhomLop[nhomLopIdx % nhomLop.length];
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: {
        ten: `${nl.ten}-${soHieu++}`,
        nhom_lop_id: nl.id,
        doi_tuong: congDong ? "cong_dong" : "nhan_vien_y_te",
        loai_kinh_phi: kinhPhi,
        ngay_bat_dau: ngayBd,
        ngay_ket_thuc: ngayKt,
        dia_diem: diaDiem(soHieu),
        trang_thai: trangThai,
        cong_khai_som: opt.congKhaiSom ?? true,
        created_by: adminId,
      },
    });
    const dsNhom = opt.nhom ?? TAT_CA_NHOM;
    await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: dsNhom.map((nh) => ({ lop_id: lop.id, nhom: nh })) });
    if (opt.cc) await rest("lop_hoc_chung_chi_yeu_cau", { method: "POST", body: [{ lop_id: lop.id, loai_id: ccId[opt.cc] }] });
    return { lop, dsNhom };
  };

  // Bài ĐÃ DẠY XONG: phân công theo trọng số (chỉ trong nhóm đủ điều kiện), điểm danh biến thiên (đa số đúng giờ,
  // ít trễ, ít vắng) để B1 đa dạng; đăng ký đã duyệt (đa số tự đăng ký, ~30% lời mời) cho A2/A3.
  const taoBaiDayXong = async (lop, dsNhom, thuTu, batDauIso, soGio, soGv, soTg) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const gvKha = theoNhom(GV, dsNhom);
    const tgKha = theoNhom(TG, dsNhom);
    const daChon = new Set();
    const giao = [];
    for (let i = 0; i < soGv; i++) { const u = chonCoTrongSo(rng, gvKha, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "giang_vien"]); } }
    for (let i = 0; i < soTg; i++) { const u = chonCoTrongSo(rng, tgKha, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "tro_giang"]); } }
    if (giao.length === 0) return bai;
    const viTri = { giang_vien: 0, tro_giang: 0 };
    await rest("slot_giang_day", { method: "POST", body: giao.map(([key, vt]) => ({ bai_id: bai.id, vai_tro: vt, vi_tri: ++viTri[vt], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] })) });
    const diemDanh = giao.map(([key]) => {
      const r = rng();
      const tre = r > 0.82 ? Math.round(rng() * 40) : 0;
      const vang = r > 0.96;
      return { bai_id: bai.id, user_id: id[key], check_in_luc: vang ? null : new Date(bd.getTime() + tre * 60000).toISOString(), b1_phan_tram: vang ? 0 : Math.max(0, 100 - tre * (100 / 30)) };
    });
    await rest("diem_danh_bai", { method: "POST", body: diemDanh.filter((d) => d.check_in_luc) });
    const dk = giao.map(([key, vt]) => {
      const moi = rng() < 0.3;
      const taoLuc = bd.getTime() - (3 + Math.round(rng() * 10)) * 86400000;
      return { bai_id: bai.id, vai_tro: vt, user_id: id[key], trang_thai: "da_duyet", loai: moi ? "duoc_moi" : "tu_dang_ky", created_at: new Date(taoLuc).toISOString(), xu_ly_luc: new Date(taoLuc + (6 + rng() * 40) * 3600000).toISOString() };
    });
    await rest("dang_ky_giang_day", { method: "POST", body: dk });
    // Dự giờ (C2) cho ~25% Bài — chấm bởi Admin demo, không bao giờ tự chấm (Admin không tham gia dạy)
    if (rng() < 0.25 && giao.length) {
      const [key] = giao[Math.floor(rng() * giao.length)];
      const muc = [100, 100, 80, 80, 60, 0][Math.floor(rng() * 6)];
      await rest("danh_gia_du_gio", { method: "POST", body: { bai_id: bai.id, user_id: id[key], muc_diem: muc, ghi_chu: "Dự giờ định kỳ.", nguoi_cham: adminId } });
    }
    return bai;
  };

  // Bài SẮP TỚI: 1 phần đã phân công, phần còn trống (có thể kèm đăng ký/lời mời đang chờ)
  const taoBaiSapToi = async (lop, dsNhom, thuTu, batDauIso, soGio, ganGv, ganTg, trongGv, trongTg, cho = []) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const gvKha = theoNhom(GV, dsNhom);
    const tgKha = theoNhom(TG, dsNhom);
    const daChon = new Set();
    const giao = [];
    for (let i = 0; i < ganGv; i++) { const u = chonCoTrongSo(rng, gvKha, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "giang_vien"]); } }
    for (let i = 0; i < ganTg; i++) { const u = chonCoTrongSo(rng, tgKha, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "tro_giang"]); } }
    const viTri = { giang_vien: 0, tro_giang: 0 };
    const dong = giao.map(([key, vt]) => ({ bai_id: bai.id, vai_tro: vt, vi_tri: ++viTri[vt], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] }));
    for (let i = 0; i < trongGv; i++) dong.push({ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: ++viTri.giang_vien, trang_thai: "trong", nguoi_phan_cong: null });
    for (let i = 0; i < trongTg; i++) dong.push({ bai_id: bai.id, vai_tro: "tro_giang", vi_tri: ++viTri.tro_giang, trang_thai: "trong", nguoi_phan_cong: null });
    if (dong.length) await rest("slot_giang_day", { method: "POST", body: dong });
    if (cho.length) await rest("dang_ky_giang_day", { method: "POST", body: cho.map(([key, vt, loai]) => ({ bai_id: bai.id, vai_tro: vt, user_id: id[key], trang_thai: "cho_xu_ly", loai })) });
    return bai;
  };

  // ---- 3 quý ĐÃ QUA: mỗi quý ~9 lớp đã hoàn thành (2 Bài/lớp) + nhập C1/C3 ----------------------
  for (const [qi, q] of [qM3, qM2, qM1].entries()) {
    const soLop = 9;
    for (let i = 0; i < soLop; i++) {
      const nhomLopIdx = (qi * soLop + i) % nhomLop.length;
      const chiBacSi = nhomLopIdx === 1 && i % 3 === 0; // vài lớp ACLS chỉ mở cho nhóm bác sĩ (đúng ví dụ CLAUDE.md)
      const congDong = i % 4 === 0;
      const khongKinhPhi = i % 3 === 0;
      const ngay1 = ngayNgauNhien(rng, q.tu, cong(q.den, -3), 8);
      const { lop, dsNhom } = await taoLop(nhomLopIdx, khongKinhPhi ? "khong_kinh_phi" : "co_kinh_phi", congDong, "da_hoan_thanh", ngay1.slice(0, 10), cong(ngay1.slice(0, 10), 2), {
        nhom: chiBacSi ? NHOM_BAC_SI : TAT_CA_NHOM,
      });
      await taoBaiDayXong(lop, dsNhom, 1, ngay1, 3, 1, 2);
      await taoBaiDayXong(lop, dsNhom, 2, moc(cong(ngay1.slice(0, 10), 2), 8), 3, 1, 2);
      await rest(`lop_hoc?id=eq.${lop.id}`, {
        method: "PATCH",
        body: { c1_phan_tram: Math.round(75 + rng() * 22), c1_nguon: "nhap_tay", c3_phan_tram: Math.round(80 + rng() * 19) },
      });
    }
    console.log(`Đã tạo ${soLop} lớp đã hoàn thành cho Quý ${q.quy}/${q.nam} (kèm C1/C3, dự giờ, điểm danh).`);
  }

  // ---- Quý HIỆN TẠI: vài lớp đã hoàn thành đầu quý + các tình huống "sống" cho hôm nay ----------
  for (let i = 0; i < 4; i++) {
    const ngay1 = ngayNgauNhien(rng, qHienTai.tu, cong(hom, -10), 8);
    const { lop, dsNhom } = await taoLop(i, i % 2 === 0 ? "co_kinh_phi" : "khong_kinh_phi", i === 0, "da_hoan_thanh", ngay1.slice(0, 10), cong(ngay1.slice(0, 10), 2));
    await taoBaiDayXong(lop, dsNhom, 1, ngay1, 3, 1, 2);
    await taoBaiDayXong(lop, dsNhom, 2, moc(cong(ngay1.slice(0, 10), 2), 8), 3, 1, 2);
    await rest(`lop_hoc?id=eq.${lop.id}`, { method: "PATCH", body: { c1_phan_tram: Math.round(78 + rng() * 18), c1_nguon: "nhap_tay", c3_phan_tram: Math.round(82 + rng() * 16) } });
  }

  // Đang diễn ra: 1 Bài hôm qua đã xong + 1 Bài hôm nay còn vài giờ nữa (gán HERO_GV) — banner check-in
  const { lop: lDienRa, dsNhom: nDienRa } = await taoLop(3, "co_kinh_phi", false, "dang_mo", cong(hom, -2), cong(hom, 5));
  await taoBaiDayXong(lDienRa, nDienRa, 1, moc(cong(hom, -1), 8), 3, 1, 2);
  const gioHienTaiVN = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false }));
  const gioBaiHomNay = Math.min(20, gioHienTaiVN + 1);
  await taoBaiSapToi(lDienRa, nDienRa, 2, moc(hom, gioBaiHomNay), 2, 0, 0, 1, 1, [[HERO_GV, "giang_vien", "tu_dang_ky"]]);
  await taoBaiSapToi(lDienRa, nDienRa, 3, moc(cong(hom, 1), 8), 3, 1, 1, 0, 1);

  // Đang mở, còn thiếu người (ngày mai) — 1 đăng ký tự do + 1 lời mời đang chờ (HERO_TG)
  const { lop: lNgayMai, dsNhom: nNgayMai } = await taoLop(4, "co_kinh_phi", false, "dang_mo", cong(hom, 1), cong(hom, 2));
  const tgNgayMai = theoNhom(TG, nNgayMai);
  const daChonNgayMai = new Set([HERO_TG]);
  const ungTu = chonCoTrongSo(rng, tgNgayMai, daChonNgayMai);
  daChonNgayMai.add(ungTu.key);
  await taoBaiSapToi(lNgayMai, nNgayMai, 1, moc(cong(hom, 1), 8), 3, 1, 0, 0, 2, [
    [ungTu.key, "tro_giang", "tu_dang_ky"],
    [HERO_TG, "tro_giang", "duoc_moi"],
  ]);

  // Đang mở, nửa chừng trong tuần — có sẵn 1 đăng ký chờ Admin duyệt (chụp "Duyệt đăng ký")
  const { lop: lNuaChung, dsNhom: nNuaChung } = await taoLop(0, "co_kinh_phi", false, "dang_mo", cong(hom, 4), cong(hom, 5));
  await taoBaiSapToi(lNuaChung, nNuaChung, 1, moc(cong(hom, 4), 8), 3, 1, 1, 0, 1);
  const tgKhac = theoNhom(TG, nNuaChung).find((u) => u.key !== HERO_TG);
  await taoBaiSapToi(lNuaChung, nNuaChung, 2, moc(cong(hom, 4), 13), 3, 0, 0, 1, 1, [[tgKhac.key, "tro_giang", "tu_dang_ky"]]);

  // Đã đủ đăng ký (tuần này)
  const { lop: lDuDk, dsNhom: nDuDk } = await taoLop(2, "co_kinh_phi", false, "dang_mo", cong(hom, 5), cong(hom, 6));
  await taoBaiSapToi(lDuDk, nDuDk, 1, moc(cong(hom, 5), 13), 2, 1, 1, 0, 0);

  // Cảnh báo pool ứng viên nhỏ: yêu cầu "Chứng chỉ sư phạm Y học" (chỉ u32 có) + nhóm tg_bac_si, slot còn trống
  const { lop: lPool, dsNhom: nPool } = await taoLop(1, "co_kinh_phi", false, "dang_mo", cong(hom, 9), cong(hom, 9), { nhom: ["tg_bac_si"], cc: "Chứng chỉ sư phạm Y học" });
  await taoBaiSapToi(lPool, nPool, 1, moc(cong(hom, 9), 8), 3, 0, 0, 0, 1);

  // Dự kiến (chỉ Admin/Quyền Quản lý lớp xem, công khai sớm=false)
  const { lop: lDuKien, dsNhom: nDuKien } = await taoLop(3, "co_kinh_phi", false, "nhap", cong(hom, 25), cong(hom, 26), { congKhaiSom: false });
  await taoBaiSapToi(lDuKien, nDuKien, 1, moc(cong(hom, 25), 8), 3, 0, 0, 1, 1);

  // Đã hủy
  const { lop: lHuy, dsNhom: nHuy } = await taoLop(4, "co_kinh_phi", false, "da_huy", cong(hom, -8), cong(hom, -7));
  await taoBaiDayXong(lHuy, nHuy, 1, moc(cong(hom, -8), 8), 3, 1, 1);

  console.log("Đã tạo các lớp \"sống\" của quý hiện tại (đang diễn ra, đang mở, đủ đăng ký, cảnh báo pool, dự kiến, đã hủy).");

  // 5. Đề xuất nhân sự thủ công (khen thưởng/đào tạo/phân công) — đủ trạng thái -------------------
  const hoatDong = NHAN_SU.filter((n) => n.trongSo > 0);
  const pick = (i) => id[hoatDong[i % hoatDong.length].key];
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: [
      { loai: "khen_thuong_nhac_nho", user_id: pick(4), noi_dung: "Dạy đều, điểm danh đúng giờ suốt kỳ.", trang_thai: "da_duyet", created_at: moc(cong(hom, -30), 9) },
      { loai: "khen_thuong_nhac_nho", user_id: pick(9), noi_dung: "Nhắc nhở: KPI thấp 2 kỳ liên tiếp.", trang_thai: "bo_qua", created_at: moc(cong(hom, -25), 9) },
      { loai: "dao_tao", user_id: pick(14), noi_dung: "Cử tham gia lớp bồi dưỡng ACLS nâng cao.", trang_thai: "da_duyet", created_at: moc(cong(hom, -18), 9) },
      { loai: "phan_cong", user_id: pick(2), noi_dung: "Tăng phân công lớp cộng đồng quý tới.", trang_thai: "da_duyet", created_at: moc(cong(hom, -10), 9) },
      { loai: "khen_thuong_nhac_nho", user_id: pick(6), noi_dung: "Khen thưởng dạy đều tuần này.", trang_thai: "cho_duyet", created_at: moc(hom, 8) },
      { loai: "dao_tao", user_id: pick(20), noi_dung: "Cử đào tạo bồi dưỡng chuyên môn.", trang_thai: "cho_duyet", created_at: moc(hom, 8) },
    ],
  });
  console.log("Đã tạo 6 đề xuất nhân sự thủ công (đủ loại/trạng thái).");

  // 6. Thông báo mẫu cho các Hero (widget Thông báo / bell)
  await rest("thong_bao", {
    method: "POST",
    body: [
      { user_id: id[HERO_TG], loai: "duoc_moi", muc_do: "can_hanh_dong", tieu_de: "Bạn được mời dạy Bài 1", noi_dung: "Vai trò Trợ giảng — mời phản hồi trước ngày lớp bắt đầu.", lien_ket: "/dang-ky", da_doc: false },
      { user_id: id[HERO_GV], loai: "nhac_check_in", muc_do: "can_hanh_dong", tieu_de: "Sắp tới giờ dạy — nhớ check-in", noi_dung: "Bài 2 bắt đầu trong ít phút nữa.", lien_ket: "/", da_doc: false },
      { user_id: id[HERO_GV], loai: "cong_bo_kpi", muc_do: "thong_tin", tieu_de: `KPI kỳ Quý ${qM1.quy}/${qM1.nam} đã công bố`, noi_dung: "Xem điểm KPI chính thức của bạn.", lien_ket: "/danh-gia", da_doc: true },
    ],
  });

  console.log(`
Xong bước "tao". Tiếp theo chạy:  node scripts/demo-huong-dan.mjs dong-ky
(đóng 3 quý ${qM3.quy}/${qM3.nam}, ${qM2.quy}/${qM2.nam}, ${qM1.quy}/${qM1.nam} bằng đúng engine KPI thật — PHẢI làm sau khi "tao" ghi xong toàn bộ dữ liệu).

Tài khoản Admin demo : ${ADMIN.email} / ${MAT_KHAU}  (Admin gốc + Quyền Quản lý lớp)
Hero Giảng viên (BS) : ${HERO_GV}${MIEN} — ${NHAN_SU.find((n) => n.key === HERO_GV).ten}
Hero Trợ giảng (KBS) : ${HERO_TG}${MIEN} — ${NHAN_SU.find((n) => n.key === HERO_TG).ten}
Hero Ban giám đốc    : ${HERO_BGD}${MIEN} — ${NHAN_SU.find((n) => n.key === HERO_BGD).ten} (xem KPI fallback nhóm nhỏ)
Mật khẩu chung mọi tài khoản nhân sự: ${MAT_KHAU}`);
}

async function dongKy() {
  const rpcAdmin = await dangNhap(ADMIN.email);
  const hom = homNayVN();
  const qHienTai = quyChua(hom);
  const qM1 = quyTruoc(qHienTai);
  const qM2 = quyTruoc(qM1);
  const qM3 = quyTruoc(qM2);
  for (const q of [qM3, qM2, qM1]) {
    const ten = `Quý ${q.quy}/${q.nam}`;
    const [row] = await rest(`ky_danh_gia?select=id,trang_thai&ten=eq.${enc(ten)}`);
    if (!row) throw new Error(`Không tìm thấy kỳ "${ten}" — chạy "tao" trước.`);
    if (row.trang_thai === "da_dong") { console.log(`${ten}: đã đóng từ trước, bỏ qua.`); continue; }
    if (row.trang_thai === "dang_mo") await rpcAdmin("doi_trang_thai_ky", { p_id: row.id, p_moi: "cho_duyet" });
    const kq = await rpcAdmin("doi_trang_thai_ky", { p_id: row.id, p_moi: "da_dong" });
    console.log(`Đã đóng ${ten}: ${kq.so_ket_qua} kết quả KPI, ${kq.so_de_xuat_doi_nhom} đề xuất đổi nhóm mới sinh ra.`);
  }
  console.log("Xong — 3 kỳ đã đóng bằng engine KPI thật, kỳ hiện tại vẫn đang mở. Có thể chụp ảnh ngay bây giờ.");
}

async function kiemTra() {
  const lop = await rest(`lop_hoc?select=id,ten,trang_thai&created_by=eq.${(await rest(`profiles?select=id&email=eq.${enc(ADMIN.email)}`))[0]?.id}`);
  console.log(`${lop.length} lớp demo. Theo trạng thái:`, Object.entries(lop.reduce((m, l) => ((m[l.trang_thai] = (m[l.trang_thai] ?? 0) + 1), m), {})));
  const ky = await rest("ky_danh_gia?select=ten,trang_thai&order=tu");
  console.log("Kỳ đánh giá:", ky.map((k) => `${k.ten} [${k.trang_thai}]`).join(" · "));
  const rpc = await dangNhap(`${HERO_GV}${MIEN}`);
  const xh = await rpc("bc_kpi_theo_ky", { p_gioi_han: 6 });
  console.log("Xu hướng KPI (6 kỳ gần nhất):", Array.isArray(xh) ? xh.map((r) => `${r.ten}: TB=${r.kpi_tb ?? "–"} (${r.so_nguoi} người)`) : xh);
}

async function xoa() {
  const ky = await rest("ky_danh_gia?select=id,ten,tu");
  const hom = homNayVN();
  const trongPham = ky.filter((k) => k.tu >= cong(hom, -400) && k.tu <= cong(hom, 100));
  for (const k of trongPham) await rest(`ky_danh_gia?id=eq.${k.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${trongPham.length} kỳ đánh giá demo (kéo theo kết quả KPI snapshot + đề xuất đổi nhóm sinh ra).`);

  const adminRow = (await rest(`profiles?select=id&email=eq.${enc(ADMIN.email)}`))[0];
  if (adminRow) {
    const lop = await rest(`lop_hoc?select=id&created_by=eq.${adminRow.id}`);
    for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
    console.log(`Đã xóa ${lop.length} lớp demo.`);
  }

  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await rest(`de_xuat_nhan_su?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
    await rest(`thong_bao?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
  }
  for (const u of users) await authAdmin(`users/${u.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${users.length} tài khoản demo (@huongdan-demo.test, gồm cả Admin demo).`);
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "dong-ky") await dongKy();
else if (lenh === "xoa") await xoa();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-huong-dan.mjs tao | dong-ky | xoa | kiemtra");
