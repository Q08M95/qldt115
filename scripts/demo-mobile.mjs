// Bổ sung dữ liệu demo để test giao diện MOBILE (Giai đoạn 12) — chạy SAU `node scripts/demo-gd10-full.mjs tao`.
// Chạy: node scripts/demo-mobile.mjs tao      (dọn: `node scripts/demo-gd10-full.mjs xoa` — đã xóa mọi lớp có địa điểm "Demo GD10-full")
// Thêm cho u01@gd10-full-demo.test (Bùi Anh Khoa, mật khẩu Demo@2026!):
//  - 1 Bài sắp bắt đầu trong ~20 phút (đang trong khung check-in) -> banner "Tôi đã có mặt" ở Trang chủ
//  - 1 Bài nữa cuối ngày hôm nay (2 Bài cùng ngày)
//  - 4 Bài trong CÙNG 1 ngày (ngày kia) thuộc 4 lớp khác nhau -> ô lịch có nhiều chấm + dấu "+"
//  - Bài rải khắp tháng này, tháng sau, và vài Bài đã dạy tháng trước -> chuyển tháng ở lịch có dữ liệu
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn).
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
if (!URL_ || !KEY) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DIA_DIEM = "Demo GD10-full";
const EMAIL = "u01@gd10-full-demo.test";

async function rest(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

const p2 = (n) => String(n).padStart(2, "0");
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;

const hom = homNayVN();
const [hero] = await rest(`profiles?select=id&email=eq.${encodeURIComponent(EMAIL)}`);
if (!hero) throw new Error(`Chưa có ${EMAIL} — chạy 'node scripts/demo-gd10-full.mjs tao' trước.`);
const nhomLop = await rest("danh_muc_nhom_lop?select=id,ten&order=thu_tu");
const TAT_CA_NHOM = ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];

let so = 301;
async function taoLop(nhomIdx, trangThai, tu, den) {
  const nl = nhomLop[nhomIdx % nhomLop.length];
  const [lop] = await rest("lop_hoc", {
    method: "POST",
    prefer: "return=representation",
    body: { ten: `${nl.ten}-${so++}`, nhom_lop_id: nl.id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: "co_kinh_phi", ngay_bat_dau: cong(hom, tu), ngay_ket_thuc: cong(hom, den), dia_diem: DIA_DIEM, trang_thai: trangThai, cong_khai_som: true },
  });
  if (trangThai !== "da_hoan_thanh") await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: TAT_CA_NHOM.map((nh) => ({ lop_id: lop.id, nhom: nh })) });
  return lop;
}
const thuTu = new Map();
async function taoBai(lop, batDauIso, soGio, ten) {
  const n = (thuTu.get(lop.id) ?? 0) + 1;
  thuTu.set(lop.id, n);
  const bd = new Date(batDauIso);
  const [bai] = await rest("bai_hoc", {
    method: "POST",
    prefer: "return=representation",
    body: { lop_id: lop.id, thu_tu: n, ten: ten ?? `Bài ${n}`, bat_dau: bd.toISOString(), ket_thuc: new Date(bd.getTime() + soGio * 3600000).toISOString() },
  });
  await rest("slot_giang_day", { method: "POST", body: [{ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: 1, trang_thai: "da_phan_cong", nguoi_phan_cong: hero.id }] });
  return bai;
}

async function tao() {
  // Đã dạy (tháng trước / tuần trước) — lớp đã hoàn thành
  const lQua = await taoLop(0, "da_hoan_thanh", -40, -5);
  for (const off of [-38, -31, -24, -17, -9]) {
    const bai = await taoBai(lQua, moc(cong(hom, off), 8), 3);
    await rest("diem_danh_bai", { method: "POST", body: [{ bai_id: bai.id, user_id: hero.id, check_in_luc: new Date(new Date(moc(cong(hom, off), 8)).getTime() + 2 * 60000).toISOString(), b1_phan_tram: 93 }] });
  }

  // 4 lớp đang mở (4 màu trên lịch)
  const lA = await taoLop(1, "dang_mo", -1, 40);
  const lB = await taoLop(2, "dang_mo", -1, 40);
  const lC = await taoLop(3, "dang_mo", -1, 40);
  const lD = await taoLop(4, "dang_mo", -1, 40);

  // Hôm nay: 1 Bài bắt đầu sau ~20 phút (khung check-in, banner) + 1 Bài ~3 giờ nữa
  const sau = (phut) => new Date(Date.now() + phut * 60000).toISOString();
  await taoBai(lA, sau(20), 2, "Bài thực hành hôm nay");
  await taoBai(lB, sau(180), 2, "Bài lý thuyết cuối ngày");

  // Ngày kia: 4 Bài / 4 lớp trong cùng 1 ngày (không chồng giờ) -> nhiều chấm + "+"
  const ngayKia = cong(hom, 2);
  await taoBai(lA, moc(ngayKia, 7), 1, "Bài 1 · Khởi động");
  await taoBai(lB, moc(ngayKia, 9), 1, "Bài 2 · Lý thuyết");
  await taoBai(lC, moc(ngayKia, 11), 1, "Bài 3 · Thực hành");
  await taoBai(lD, moc(ngayKia, 14), 2, "Bài 4 · Đánh giá");

  // Rải các ngày còn lại (tháng này + tháng sau)
  const rai = [[1, lC], [4, lD], [7, lA], [9, lB], [12, lC], [15, lD], [18, lA], [22, lB], [27, lC], [33, lD], [38, lA]];
  for (const [off, lop] of rai) await taoBai(lop, moc(cong(hom, off), 8 + (off % 3) * 2), 2);

  console.log(`Xong. Đăng nhập ${EMAIL} / mật khẩu Demo@2026! trên điện thoại.
- Trang chủ: banner check-in (Bài bắt đầu sau ~20 phút — banner chỉ hiện trong khung check-in nên thử sớm), Lịch dạy sắp tới, KPI.
- Đăng ký giảng dạy: lịch tháng (ngày ${ngayKia} có 4 Bài / 4 màu, hôm nay 2 Bài), chuyển sang tháng trước/sau để xem thêm.
Dọn: node scripts/demo-gd10-full.mjs xoa`);
}

if (process.argv[2] === "tao") await tao();
else console.log("Dùng: node scripts/demo-mobile.mjs tao");
