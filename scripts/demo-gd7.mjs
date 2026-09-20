// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 7 (check-in B1, chỉnh điểm danh, nhập C2, Bảng KPI cá nhân).
// Chạy: node scripts/demo-gd7.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Nhận biết dữ liệu demo: email @gd7-demo.test, lớp bắt đầu bằng "Demo GD7 - ", kỳ bắt đầu bằng "Demo GD7 - ". Lệnh "xoa" chỉ xóa đúng các thứ đó.
// Các Bài "hôm nay" tính theo GIỜ CHẠY LỆNH (khung check-in chỉ kéo dài vài giờ) — muốn test lại check-in thì chạy "xoa" rồi "tao".
// Lưu ý: 3 kỳ quá khứ được tạo ở trạng thái ĐÃ ĐÓNG kèm kết quả KPI giả lập để có sẵn lịch sử vẽ biểu đồ xu hướng/tiến độ đổi nhóm.
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

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const MAT_KHAU = "Demo@2026!";
const TIEN_TO_LOP = "Demo GD7 - ";
const TIEN_TO_KY = "Demo GD7 - ";
const MIEN = "@gd7-demo.test";
const enc = (s) => encodeURIComponent(s);

async function rest(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function authAdmin(path, { method = "GET", body } = {}) {
  const r = await fetch(`${URL_}/auth/v1/admin/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth ${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const tatCaUsers = async () => (await authAdmin("users?per_page=1000")).users ?? [];

// ---------- Nhân sự demo ----------
// kpi: KPI giả lập của 3 kỳ đã đóng [Q4/2025, Q1/2026, Q2/2026] (null = kỳ đó không dạy => không có kết quả)
const NHAN_SU = [
  { key: "ad", ho_ten: "GD7 Admin (có hồ sơ giảng viên)", nhom: "gv_bac_si", admin: true, kpi: [80, 82, 84], ghi: "Admin có hồ sơ GV: thử KHÔNG tự chấm C2 cho mình, vẫn chỉnh được điểm danh" },
  { key: "g1", ho_ten: "GD7 GV1 Đang dạy hôm nay (bác sĩ)", nhom: "gv_bac_si", kpi: [65, 72, 78], ghi: "Có Bài trong khung check-in + Bài chưa tới giờ + KPI tăng dần" },
  { key: "g2", ho_ten: "GD7 GV2 KPI thấp liên tiếp (bác sĩ)", nhom: "gv_bac_si", kpi: [60, 42, 38], ghi: "Đang dạy trễ 20 phút (check-in bị trừ điểm); KPI dưới 50 hai kỳ liên tiếp => tiến độ giáng 2/3" },
  { key: "t1", ho_ten: "GD7 TG1 Sắp đủ thăng nhóm (bác sĩ)", nhom: "tg_bac_si", kpi: [70, 88, 91], ghi: "KPI >= 85 hai kỳ liên tiếp => tiến độ thăng 2/3" },
  { key: "t2", ho_ten: "GD7 TG2 Mới dạy (bác sĩ)", nhom: "tg_bac_si", kpi: [null, null, null], ghi: "Chưa có kỳ nào đã đóng — thử bảng KPI mới bắt đầu" },
];

// ---------- 3 kỳ quá khứ đã đóng (không đụng kỳ thật Quý 3/2026) ----------
const KY = [
  { ten: "Demo GD7 - Quý 4/2025", tu: "2025-10-01", den: "2025-12-31" },
  { ten: "Demo GD7 - Quý 1/2026", tu: "2026-01-01", den: "2026-03-31" },
  { ten: "Demo GD7 - Quý 2/2026", tu: "2026-04-01", den: "2026-06-30" },
];

const p2 = (n) => String(n).padStart(2, "0");
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;
const iso = (phut) => new Date(Date.now() + phut * 60000).toISOString();

function ketQuaGiaLap(kyId, userId, kpi) {
  const kep = (x) => Math.max(0, Math.min(100, Math.round(x * 100) / 100));
  return {
    ky_id: kyId,
    user_id: userId,
    kpi,
    diem_nhom: { A: kep(kpi - 6), B: kep(kpi + 6), C: kep(kpi) },
    gia_tri: { A1: kep(kpi - 8), A2: 60, A3: 100, B1: kep(kpi + 6), C1: 80, C2: kep(kpi), C3: 80 },
    trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
    gio_thuc: 12,
    gio_quy_doi: 13.2,
    so_bai: 5,
    so_lop: 2,
    a4_ky: 0,
    a4_luy_ke: 0,
    che_do_a1: "percentile",
    percentile: kep(kpi - 6),
  };
}

async function tao() {
  const daCo = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  if (daCo.length > 0) {
    console.log("Đã có dữ liệu demo — chạy 'xoa' rồi 'tao' nếu muốn làm mới.");
    return;
  }

  // 1. Tài khoản + nhóm
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const id = {};
  for (const n of NHAN_SU) {
    const email = `${n.key}${MIEN}`;
    let uid = co.get(email);
    if (!uid) {
      const u = await authAdmin("users", {
        method: "POST",
        body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } },
      });
      uid = u.id;
      console.log("  + tài khoản", email);
    }
    id[n.key] = uid;
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    if (n.admin) await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { phan_quyen: "admin" } });
  }

  // 2. 3 kỳ quá khứ ĐÃ ĐÓNG + kết quả KPI giả lập
  let snapshot = null;
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/cau_hinh_kpi_hien_tai`, { method: "POST", headers: H, body: "{}" });
    if (r.ok) snapshot = await r.json();
  } catch {}
  for (const [ki, ky] of KY.entries()) {
    const [row] = await rest("ky_danh_gia", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: ky.ten, tu: ky.tu, den: ky.den, trang_thai: "da_dong", cau_hinh_snapshot: snapshot, dong_luc: `${cong(ky.den, 1)}T03:00:00+07:00` },
    });
    const ketQua = NHAN_SU.filter((n) => n.kpi[ki] !== null).map((n) => ketQuaGiaLap(row.id, id[n.key], n.kpi[ki]));
    if (ketQua.length) await rest("ket_qua_kpi", { method: "POST", body: ketQua });
    console.log(`  + ${ky.ten} (đã đóng, ${ketQua.length} kết quả KPI giả lập)`);
  }

  // 3. Lớp + Bài của kỳ hiện tại (giờ tính theo lúc chạy lệnh)
  const [nhomLop] = await rest("danh_muc_nhom_lop?select=id&limit=1");
  const hom = homNayVN();
  const taoLop = async (ten, kinhPhi) =>
    (await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten}`, nhom_lop_id: nhomLop.id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: kinhPhi, ngay_bat_dau: cong(hom, -6), ngay_ket_thuc: cong(hom, 1), dia_diem: "Demo GD7", trang_thai: "dang_mo" },
    }))[0];
  const lopCo = await taoLop("Lớp có kinh phí", "co_kinh_phi");
  const lopKhong = await taoLop("Lớp không kinh phí (A4)", "khong_kinh_phi");

  const taoBai = async (lop, thuTu, ten, batDau, ketThuc, slots) => {
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten, bat_dau: batDau, ket_thuc: ketThuc } });
    const dong = [];
    const dem = { giang_vien: 0, tro_giang: 0 };
    for (const [key, vaiTro] of slots) dong.push({ bai_id: bai.id, vai_tro: vaiTro, vi_tri: ++dem[vaiTro], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] });
    const sl = await rest("slot_giang_day", { method: "POST", prefer: "return=representation", body: dong });
    return { id: bai.id, slot: (key) => sl.find((s) => s.nguoi_phan_cong === id[key]) };
  };

  // Trong khung check-in: g1 (GV) + t1 (TG) bắt đầu sau 15 phút — đăng nhập g1/t1 sẽ thấy banner và nút "Tôi đã có mặt"
  const bA = await taoBai(lopCo, 1, "Bài 1 - Sắp bắt đầu (trong khung check-in)", iso(15), iso(195), [["g1", "giang_vien"], ["t1", "tro_giang"]]);
  // Đang diễn ra, đã trễ ~20 phút: g2 (GV) + t2 (TG) — check-in bây giờ sẽ được B1 khoảng 33%
  const bB = await taoBai(lopCo, 2, "Bài 2 - Đang diễn ra (trễ 20 phút)", iso(-20), iso(100), [["g2", "giang_vien"], ["t2", "tro_giang"]]);
  // Chưa tới giờ (sau 5 giờ): g1 — nút check-in KHÔNG hiện
  const bC = await taoBai(lopCo, 3, "Bài 3 - Chưa tới giờ check-in", iso(300), iso(420), [["g1", "giang_vien"]]);
  // Đã diễn ra hôm qua, CHƯA ai check-in: để Admin thử "chỉnh điểm danh" và chấm C2
  const bD = await taoBai(lopCo, 4, "Bài 4 - Hôm qua (chưa check-in)", moc(cong(hom, -1), 8), moc(cong(hom, -1), 11), [["g1", "giang_vien"], ["t1", "tro_giang"]]);
  // 3 ngày trước: đã có điểm danh + C2
  const bE = await taoBai(lopCo, 5, "Bài 5 - 3 ngày trước (đã điểm danh, đã dự giờ)", moc(cong(hom, -3), 8), moc(cong(hom, -3), 11), [["g2", "giang_vien"], ["t2", "tro_giang"]]);
  // 5 ngày trước: Admin (có hồ sơ GV) dạy — thử không tự chấm C2
  const bF = await taoBai(lopCo, 6, "Bài 6 - 5 ngày trước (Admin dạy)", moc(cong(hom, -5), 13), moc(cong(hom, -5), 16), [["ad", "giang_vien"], ["t1", "tro_giang"]]);
  // Lớp không kinh phí: A4 của g1, g2
  const bG = await taoBai(lopKhong, 1, "Bài 1 - Lớp không kinh phí (4 ngày trước)", moc(cong(hom, -4), 8), moc(cong(hom, -4), 12), [["g1", "giang_vien"], ["g2", "giang_vien"], ["t2", "tro_giang"]]);

  // 4. Điểm danh + dự giờ + đăng ký (cho A2/A3)
  const dd = (bai, key, b1, o = {}) => ({ bai_id: bai.id, user_id: id[key], check_in_luc: null, b1_phan_tram: b1, chinh_tay: false, ly_do_chinh: null, chinh_luc: null, ...o });
  await rest("diem_danh_bai", {
    method: "POST",
    body: [
      dd(bE, "g2", 100, { check_in_luc: moc(cong(hom, -3), 8) }),
      dd(bE, "t2", 60, { check_in_luc: moc(cong(hom, -3), 8) }),
      dd(bF, "ad", 100, { check_in_luc: moc(cong(hom, -5), 13) }),
      dd(bG, "g1", 66.67, { check_in_luc: moc(cong(hom, -4), 8) }),
      dd(bG, "g2", 30, { chinh_tay: true, ly_do_chinh: "Demo: Admin chỉnh tay do mạng chậm", chinh_luc: iso(-60 * 24 * 3) }),
    ],
  });
  await rest("danh_gia_du_gio", {
    method: "POST",
    body: [
      { bai_id: bE.id, user_id: id.g2, muc_diem: 80, ghi_chu: "Demo: truyền đạt rõ, còn chậm phần thực hành" },
      { bai_id: bF.id, user_id: id.t1, muc_diem: 100, ghi_chu: "Demo: xuất sắc" },
    ],
  });
  const dangKy = [];
  for (const [bai, key, vaiTro, loai] of [
    [bA, "g1", "giang_vien", "tu_dang_ky"], [bA, "t1", "tro_giang", "duoc_moi"], [bB, "g2", "giang_vien", "duoc_moi"],
    [bD, "g1", "giang_vien", "tu_dang_ky"], [bE, "g2", "giang_vien", "tu_dang_ky"], [bF, "t1", "tro_giang", "tu_dang_ky"],
  ]) {
    dangKy.push({ bai_id: bai.id, vai_tro: vaiTro, user_id: id[key], slot_id: bai.slot(key).id, trang_thai: "da_duyet", loai });
  }
  await rest("dang_ky_giang_day", { method: "POST", body: dangKy });

  console.log("\nĐã tạo xong. Tài khoản demo (mật khẩu chung: " + MAT_KHAU + "):");
  for (const n of NHAN_SU) console.log(`  ${(n.key + MIEN).padEnd(24)} ${n.ho_ten}\n      → ${n.ghi}`);
  console.log(`
Gợi ý kịch bản test:
  1. Đăng nhập g1@gd7-demo.test  → Trang chủ có banner check-in (Bài 1). Bấm "Tôi đã có mặt" → B1 = 100%; Bài 3 chưa tới giờ nên không có nút.
  2. Đăng nhập g2@gd7-demo.test  → Bài 2 đã trễ ~20 phút: check-in sẽ được B1 ≈ 33% (giảm tuyến tính, ngưỡng 30 phút).
  3. Đăng nhập Admin thật → vào lớp "Demo GD7 - Lớp có kinh phí": thấy badge B1 từng slot; Bài 4 (hôm qua) "Chưa check-in" → bút chì chỉnh điểm danh (bắt buộc lý do).
  4. Admin thật → Nhân sự → GD7 GV1 → khối "Dự giờ và điểm danh": chấm C2 cho Bài 4; xem Bảng KPI cá nhân (xu hướng 4 kỳ, radar, top X%, A4).
  5. Admin demo (ad@…) → hồ sơ của chính mình: KHÔNG có nút chấm dự giờ (cấm tự chấm), vẫn chỉnh được điểm danh.
  6. Đăng nhập t1@… → /danh-gia: tiến độ thăng 2/3 kỳ. g2@… → tiến độ giáng 2/3 kỳ. t2@… → chưa có kỳ đóng nào.
  7. Cấu hình → Cấu hình KPI (cuối trang): đổi khung check-in / ngưỡng trễ B1 / mô tả rubric.
  8. (Tùy chọn) Chặn sửa Bài thuộc kỳ đã đóng: các Bài demo đều nằm trong kỳ thật Quý 3/2026 — muốn thử phải đóng kỳ đó rồi MỞ LẠI (có lý do); 3 kỳ demo quá khứ không có Bài nên không thử được.
Lưu ý: từ ngày mai, Bài đã dạy xong mà không check-in sẽ tính B1 = 0% (hôm nay & trước đó vẫn là "thiếu dữ liệu").`);
}

async function dangNhap(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: MAT_KHAU }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Đăng nhập demo lỗi: " + email);
  const Hu = { apikey: ANON, Authorization: `Bearer ${j.access_token}`, "Content-Type": "application/json" };
  return async (fn, args) => {
    const x = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: Hu, body: JSON.stringify(args ?? {}) });
    return x.json();
  };
}

async function kiemTra() {
  for (const n of NHAN_SU) {
    const rpc = await dangNhap(`${n.key}${MIEN}`);
    const cin = await rpc("bai_can_check_in");
    const kpi = await rpc("kpi_ca_nhan", { p_user: (await tatCaUsers()).find((u) => u.email === `${n.key}${MIEN}`).id });
    const ds = (kpi.ky ?? []).map((k) => `${k.ten.replace(TIEN_TO_KY, "")}: ${k.kpi ?? "—"}`).join(" | ");
    console.log(`${n.key}: ${cin.length} Bài trong khung check-in | ${ds} | A4=${kpi.a4_tong} | tiến độ: ${JSON.stringify(kpi.tien_do)}`);
  }
}

async function xoa() {
  // Thứ tự: kỳ (kéo theo kết quả KPI) → đề xuất → lớp (kéo theo Bài, slot, đăng ký, điểm danh, dự giờ) → tài khoản
  const ky = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  for (const k of ky) await rest(`ky_danh_gia?id=eq.${k.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${ky.length} kỳ demo.`);

  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  if (ids.length) await rest(`de_xuat_nhan_su?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
  const lop = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);

  for (const u of users) {
    await authAdmin(`users/${u.id}`, { method: "DELETE" });
    console.log("  - đã xóa", u.email);
  }
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-gd7.mjs tao | xoa | kiemtra");
