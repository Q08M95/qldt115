// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 10 lượt 2 (Báo cáo #1 KPI tổng hợp, #2 xu hướng KPI, #6 A4, #7 đề xuất nhân sự).
// Chạy: node scripts/demo-gd10b.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Nhận biết dữ liệu demo: email @gd10b-demo.test, lớp bắt đầu bằng "Demo GD10b - ", kỳ bắt đầu bằng "Demo GD10b - ". Lệnh "xoa" chỉ xóa đúng các thứ đó.
// 4 kỳ demo nằm trọn năm 2024 (Quý 1-4) — không đụng kỳ thật (hiện chỉ có Quý 3/2026). Ghi thẳng bằng service role nên KHÔNG sinh nhật ký hệ thống.
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
const TIEN_TO_LOP = "Demo GD10b - ";
const TIEN_TO_KY = "Demo GD10b - ";
const MIEN = "@gd10b-demo.test";
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
const NHAN_SU = [
  { key: "g1", ho_ten: "GD10b GV1 Dẫn đầu KPI (bác sĩ)", nhom: "gv_bac_si" },
  { key: "g2", ho_ten: "GD10b GV2 KPI trung bình (bác sĩ)", nhom: "gv_bac_si" },
  { key: "g3", ho_ten: "GD10b GV3 Không dạy kỳ này (không bác sĩ)", nhom: "gv_khong_bac_si" },
  { key: "t1", ho_ten: "GD10b TG1 Hay dạy lớp không kinh phí (bác sĩ)", nhom: "tg_bac_si" },
  { key: "t2", ho_ten: "GD10b TG2 KPI thấp (không bác sĩ)", nhom: "tg_khong_bac_si" },
];

const p2 = (n) => String(n).padStart(2, "0");
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;

function ketQuaGiaLap(kyId, userId, kpi, vaiTro, extra = {}) {
  const kep = (x) => Math.max(0, Math.min(100, Math.round(x * 100) / 100));
  return {
    ky_id: kyId,
    user_id: userId,
    kpi: kep(kpi),
    diem_nhom: { A: kep(kpi - 6), B: kep(kpi + 6), C: kep(kpi) },
    gia_tri: { A1: kep(kpi - 8), A2: 60, A3: 100, B1: kep(kpi + 6), C1: 80, C2: kep(kpi), C3: 80 },
    trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
    gio_thuc: 14,
    gio_quy_doi: 15.5,
    so_bai: 6,
    so_lop: 2,
    a4_ky: 0,
    a4_luy_ke: 0,
    che_do_a1: "percentile",
    percentile: kep(kpi - 6),
    ...extra,
  };
}

// ---------- 4 kỳ demo: K1, K2 đã đóng (snapshot) | K3 đang mở (tính live) | K4 chờ duyệt (chỉ Admin xem) ----------
const KY = [
  { ten: "Demo GD10b - Quý 1/2024", tu: "2024-01-01", den: "2024-03-31", trang_thai: "da_dong" },
  { ten: "Demo GD10b - Quý 2/2024", tu: "2024-04-01", den: "2024-06-30", trang_thai: "da_dong" },
  { ten: "Demo GD10b - Quý 3/2024", tu: "2024-07-01", den: "2024-09-30", trang_thai: "dang_mo" },
  { ten: "Demo GD10b - Quý 4/2024", tu: "2024-10-01", den: "2024-12-31", trang_thai: "cho_duyet" },
];

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
      const u = await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } } });
      uid = u.id;
      console.log("  + tài khoản", email);
    }
    id[n.key] = uid;
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
  }

  // 2. 4 kỳ
  const kyId = {};
  for (const ky of KY) {
    const [row] = await rest("ky_danh_gia", { method: "POST", prefer: "return=representation", body: { ten: ky.ten, tu: ky.tu, den: ky.den, trang_thai: ky.trang_thai } });
    kyId[ky.ten] = row.id;
    console.log(`  + ${ky.ten} (${ky.trang_thai})`);
  }
  const k1 = kyId["Demo GD10b - Quý 1/2024"];
  const k2 = kyId["Demo GD10b - Quý 2/2024"];
  const k3 = kyId["Demo GD10b - Quý 3/2024"];
  const k4 = kyId["Demo GD10b - Quý 4/2024"];

  // 3. K1, K2 đã đóng: ghi thẳng ket_qua_kpi (giả lập snapshot đã khóa) — g3 không có kết quả kỳ nào (chưa từng dạy)
  await rest("ket_qua_kpi", {
    method: "POST",
    body: [
      ketQuaGiaLap(k1, id.g1, 88, "giang_vien"),
      ketQuaGiaLap(k1, id.g2, 71, "giang_vien"),
      ketQuaGiaLap(k1, id.t1, 79, "tro_giang"),
      ketQuaGiaLap(k1, id.t2, 55, "tro_giang", { a4_ky: 0 }),
      ketQuaGiaLap(k2, id.g1, 91, "giang_vien"),
      ketQuaGiaLap(k2, id.g2, 74, "giang_vien"),
      ketQuaGiaLap(k2, id.t1, 83, "tro_giang"),
      ketQuaGiaLap(k2, id.t2, 48, "tro_giang"),
    ],
  });

  // 4. K3 đang mở: lớp có kinh phí (đủ điểm danh để KPI tính live) + 2 lớp không kinh phí (A4)
  const [nhomLop] = await rest("danh_muc_nhom_lop?select=id&limit=1");
  const taoLop = async (ten, kinhPhi, tu, den) =>
    (await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten}`, nhom_lop_id: nhomLop.id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: kinhPhi, ngay_bat_dau: tu, ngay_ket_thuc: den, dia_diem: "Demo GD10b", trang_thai: "da_hoan_thanh" },
    }))[0];
  const taoBaiDayXong = async (lop, thuTu, ngay, gioBd, soGio, giao) => {
    const bd = moc(ngay, gioBd);
    const kt = moc(ngay, gioBd + soGio);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd, ket_thuc: kt } });
    const viTri = { giang_vien: 0, tro_giang: 0 };
    await rest("slot_giang_day", { method: "POST", body: giao.map(([key, vaiTro]) => ({ bai_id: bai.id, vai_tro: vaiTro, vi_tri: ++viTri[vaiTro], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] })) });
    await rest("diem_danh_bai", { method: "POST", body: giao.map(([key]) => ({ bai_id: bai.id, user_id: id[key], check_in_luc: bd, b1_phan_tram: 100 })) });
    return bai;
  };

  const lCo3 = await taoLop("Lớp K3 có kinh phí", "co_kinh_phi", "2024-07-05", "2024-07-06");
  await taoBaiDayXong(lCo3, 1, "2024-07-05", 8, 3, [["g1", "giang_vien"], ["g2", "giang_vien"], ["t1", "tro_giang"]]);
  await taoBaiDayXong(lCo3, 2, "2024-07-06", 8, 3, [["g1", "giang_vien"], ["t2", "tro_giang"]]);
  const lKp3a = await taoLop("Lớp K3 không kinh phí A", "khong_kinh_phi", "2024-07-12", "2024-07-12");
  await taoBaiDayXong(lKp3a, 1, "2024-07-12", 8, 2, [["g1", "giang_vien"], ["t1", "tro_giang"]]);
  const lKp3b = await taoLop("Lớp K3 không kinh phí B", "khong_kinh_phi", "2024-08-02", "2024-08-02");
  await taoBaiDayXong(lKp3b, 1, "2024-08-02", 8, 2, [["g2", "giang_vien"], ["t1", "tro_giang"]]);
  // Lớp không kinh phí ở kỳ trước (K1) — để A4 lũy kế của t1 > A4 trong kỳ K3
  const lKp1 = await taoLop("Lớp K1 không kinh phí", "khong_kinh_phi", "2024-02-10", "2024-02-10");
  await taoBaiDayXong(lKp1, 1, "2024-02-10", 8, 2, [["t1", "tro_giang"]]);

  // 5. K4 chờ duyệt: 1 lớp nhỏ để có dữ liệu khi Admin xem, GV/TG không thấy
  const lCo4 = await taoLop("Lớp K4 có kinh phí", "co_kinh_phi", "2024-10-05", "2024-10-05");
  await taoBaiDayXong(lCo4, 1, "2024-10-05", 8, 2, [["g2", "giang_vien"], ["t2", "tro_giang"]]);

  // 6. Đề xuất nhân sự: đổi nhóm gắn ky_id=K1 (đã duyệt); các loại thủ công theo ngày tạo trong K2/K3
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: { loai: "doi_nhom", user_id: id.t1, noi_dung: "Demo: đạt KPI cao liên tục — đề xuất thăng lên Giảng viên.", nhom_cu: "tg_bac_si", nhom_moi: "gv_bac_si", ky_id: k1, trang_thai: "da_duyet" },
  });
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: [
      { loai: "khen_thuong_nhac_nho", user_id: id.g1, noi_dung: "Demo: khen thưởng KPI dẫn đầu kỳ.", trang_thai: "da_duyet", created_at: "2024-04-15T03:00:00+07:00" },
      { loai: "khen_thuong_nhac_nho", user_id: id.t2, noi_dung: "Demo: nhắc nhở KPI thấp.", trang_thai: "cho_duyet", created_at: "2024-07-20T03:00:00+07:00" },
      { loai: "dao_tao", user_id: id.g3, noi_dung: "Demo: cử đào tạo bồi dưỡng.", trang_thai: "da_duyet", created_at: "2024-07-25T03:00:00+07:00" },
      { loai: "phan_cong", user_id: id.g2, noi_dung: "Demo: tăng phân công lớp.", trang_thai: "bo_qua", created_at: "2024-04-20T03:00:00+07:00" },
    ],
  });

  console.log(`
Đã tạo xong 4 kỳ demo (2024) + 5 tài khoản (mật khẩu chung: ${MAT_KHAU}): ${NHAN_SU.map((n) => n.key + MIEN).join(", ")}
Đăng nhập g1@gd10b-demo.test để xem như GV/TG (không có nhãn nhóm); Admin thật để xem đầy đủ + xuất Excel.
Chọn kỳ ở tab "KPI tổng hợp/A4/Đề xuất nhân sự":
 #1 KPI tổng hợp — Quý 1/2024: g1=88, g2=71, t1=79, t2=55 (g3 chưa dạy, không xuất hiện). Quý 2/2024 KPI đều tăng nhẹ.
    Quý 4/2024 (Chờ duyệt): GV/TG không thấy gì; Admin thấy 2 người (g2, t2).
 #2 Xu hướng KPI — xem 2 điểm Quý 1→2/2024 tăng dần (dùng snapshot đã khóa); Quý 3/2024 tính LIVE theo dữ liệu vừa tạo.
 #6 A4 — t1: lũy kế 3 (K1 + K3 A + K3 B), trong Quý 3/2024 = 2. g1/g2 mỗi người 1 lớp không kinh phí trong Quý 3/2024.
 #7 Đề xuất nhân sự — Quý 1/2024: 1 đổi nhóm đã duyệt. Quý 2/2024: 1 khen thưởng đã duyệt, 1 tăng phân công bị bỏ qua.
    Quý 3/2024: 1 khen thưởng chờ duyệt, 1 đào tạo đã duyệt.
Dọn: node scripts/demo-gd10b.mjs xoa`);
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
  const ky = await rest(`ky_danh_gia?select=id,ten&ten=like.${enc(TIEN_TO_KY)}*&order=tu`);
  const rpc = await dangNhap(`g1${MIEN}`);
  for (const k of ky) {
    const kpi = await rpc("bc_kpi_tong_hop", { p_ky: k.id });
    const a4 = await rpc("bc_a4", { p_ky: k.id });
    const dx = await rpc("bc_de_xuat", { p_ky: k.id });
    console.log(`${k.ten}: KPI ${Array.isArray(kpi) ? kpi.length : kpi} người | A4: ${Array.isArray(a4) ? a4.filter((r) => r.a4_ky > 0).map((r) => `${r.ho_ten.split(" ")[1]}=${r.a4_ky}/${r.a4_luy_ke}`).join(", ") : a4} | đề xuất chờ=${dx?.cho_duyet} duyệt=${dx?.da_duyet} bỏ=${dx?.bo_qua}`);
  }
  const xh = await rpc("bc_kpi_theo_ky", { p_gioi_han: 24 });
  console.log("Xu hướng KPI:", Array.isArray(xh) ? xh.filter((r) => r.ten.startsWith("Demo")).map((r) => `${r.ten}: TB=${r.kpi_tb} (${r.so_nguoi} người)`) : xh);
}

async function xoa() {
  const ky = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  for (const k of ky) await rest(`ky_danh_gia?id=eq.${k.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${ky.length} kỳ demo (kéo theo kết quả KPI snapshot).`);

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
else console.log("Dùng: node scripts/demo-gd10b.mjs tao | xoa | kiemtra");
