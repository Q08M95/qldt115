// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 6 (KPI, kỳ đánh giá). Chạy: node scripts/demo-kpi.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Nhận biết dữ liệu demo: email @kpi-demo.test, lớp bắt đầu bằng "Demo KPI - ", kỳ bắt đầu bằng "Demo - ".
// Lệnh "xoa" chỉ xóa đúng các thứ đó. NÊN chạy "xoa" của script này TRƯỚC khi chạy "xoa" của scripts/demo-data.mjs.
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
const MAT_KHAU = "Demo@2026!";
const TIEN_TO_LOP = "Demo KPI - ";
const TIEN_TO_KY = "Demo - ";
const MIEN = "@kpi-demo.test";

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
async function rpc(fn, args) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
  const text = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function authAdmin(path, { method = "GET", body } = {}) {
  const r = await fetch(`${URL_}/auth/v1/admin/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth ${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const tatCaUsers = async () => (await authAdmin("users?per_page=1000")).users ?? [];
const enc = (s) => encodeURIComponent(s);

// ---------- Nhân sự demo (mỗi người có "hồ sơ" hành vi để KPI ra khác nhau) ----------
// b1: % điểm danh · dk: cách nhận Bài ("self" tự đăng ký, "invite" được mời, "none" không có đăng ký) · moiTuChoi: số lời mời đã từ chối
const NHAN_SU = [
  { key: "g1", ho_ten: "KPI GV1 Xuất sắc (bác sĩ)", nhom: "gv_bac_si", b1: 100, dk: ["self"], moiTuChoi: 0 },
  { key: "g2", ho_ten: "KPI GV2 Khá (bác sĩ)", nhom: "gv_bac_si", b1: 90, dk: ["self"], moiTuChoi: 0 },
  { key: "g3", ho_ten: "KPI GV3 Chỉ nhận lời mời (bác sĩ)", nhom: "gv_bac_si", b1: 80, dk: ["invite"], moiTuChoi: 0 },
  { key: "g4", ho_ten: "KPI GV4 Hay từ chối lời mời (bác sĩ)", nhom: "gv_bac_si", b1: 70, dk: ["invite"], moiTuChoi: 1 },
  { key: "g5", ho_ten: "KPI GV5 Trung bình (bác sĩ)", nhom: "gv_bac_si", b1: 95, dk: ["self"], moiTuChoi: 0 },
  { key: "g6", ho_ten: "KPI GV6 Yếu (bác sĩ)", nhom: "gv_bac_si", b1: 15, dk: ["none"], moiTuChoi: 2 },
  { key: "t1", ho_ten: "KPI TG1 Xuất sắc (bác sĩ)", nhom: "tg_bac_si", b1: 100, dk: ["self", "invite", "invite"], moiTuChoi: 0 },
  { key: "t2", ho_ten: "KPI TG2 Khá (bác sĩ)", nhom: "tg_bac_si", b1: 85, dk: ["self"], moiTuChoi: 0 },
  { key: "t3", ho_ten: "KPI TG3 Trung bình (bác sĩ)", nhom: "tg_bac_si", b1: 75, dk: ["self"], moiTuChoi: 0 },
  { key: "t4", ho_ten: "KPI TG4 Yếu (bác sĩ)", nhom: "tg_bac_si", b1: 20, dk: ["none"], moiTuChoi: 1 },
];

// ---------- 3 kỳ quý trong quá khứ (không đụng kỳ thật Quý 3/2026) ----------
const KY = [
  { ten: "Demo - Quý 4/2025", tu: "2025-10-01", den: "2025-12-31", dk: { lechC1: 0, choPhepThieuDiemDanh: false } },
  { ten: "Demo - Quý 1/2026", tu: "2026-01-01", den: "2026-03-31", dk: { lechC1: 0, choPhepThieuDiemDanh: true } },
  { ten: "Demo - Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", dk: { lechC1: 0, choPhepThieuDiemDanh: true, ky3: true } },
];

// Mỗi kỳ có 3 lớp; Bài: ngày lệch so với đầu kỳ, giờ bắt đầu-kết thúc, người dạy
const LOP = [
  {
    ma: "ACLS", nhomLop: "ACLS", doiTuong: "nhan_vien_y_te", kinhPhi: "co_kinh_phi", c1: 92, c3: 94,
    bai: [
      { ngay: 9, gio: [8, 11], gv: "g1", tg: "t1", c2: { g1: 100, t1: 100 } },
      { ngay: 10, gio: [8, 11], gv: "g1", tg: "t1" },
      { ngay: 11, gio: [8, 11], gv: "g2", tg: "t2", c2: { g2: 80 } },
    ],
  },
  {
    ma: "BLS", nhomLop: "BLS", doiTuong: "cong_dong", kinhPhi: "khong_kinh_phi", c1: 85, c3: 82,
    bai: [
      { ngay: 20, gio: [8, 12], gv: "g3", tg: "t3" },
      { ngay: 21, gio: [8, 12], gv: "g4", tg: "t1" },
    ],
  },
  {
    ma: "ABCDE", nhomLop: "ABCDE", doiTuong: "nhan_vien_y_te", kinhPhi: "co_kinh_phi", c1: 55, c3: 50, khongDiemDanhKhiThieu: true,
    bai: [
      { ngay: 30, gio: [13, 16], gv: "g5", tg: "t2" },
      { ngay: 31, gio: [13, 16], gv: "g6", tg: "t4", c2: { g6: 0, t4: 60 } },
    ],
  },
];

const p2 = (n) => String(n).padStart(2, "0");
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;

async function tao() {
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
  }
  const nhan = Object.fromEntries(NHAN_SU.map((n) => [n.key, n]));

  const dmNhomLop = await rest("danh_muc_nhom_lop?select=id,ten");
  const nhomLopId = (ten) => (dmNhomLop.find((x) => x.ten.toUpperCase() === ten) ?? dmNhomLop[0]).id;

  const daCo = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  if (daCo.length > 0) {
    console.log("Đã có kỳ demo — chạy 'xoa' rồi 'tao' nếu muốn làm mới.");
    return;
  }

  // 2. Từng kỳ
  const kyIds = [];
  for (const [ki, ky] of KY.entries()) {
    const [kyRow] = await rest("ky_danh_gia", { method: "POST", body: { ten: ky.ten, tu: ky.tu, den: ky.den }, prefer: "return=representation" });
    kyIds.push(kyRow.id);
    const tenKy = ky.ten.replace(TIEN_TO_KY, "");
    const dangKy = [];
    const diemDanh = [];
    const duGio = [];
    const dem = {}; // đếm số Bài của mỗi người trong kỳ để chọn cách đăng ký

    for (const lopTpl of LOP) {
      const ngayBd = cong(ky.tu, lopTpl.bai[0].ngay);
      const ngayKt = cong(ky.tu, lopTpl.bai.at(-1).ngay);
      // Kỳ 3: lớp ABCDE chưa "Đã hoàn thành" và lớp BLS thiếu C1 => để thử danh sách kiểm tra trước khi đóng kỳ
      const chuaHoanThanh = ky.dk.ky3 && lopTpl.ma === "ABCDE";
      const thieuC1 = ky.dk.ky3 && lopTpl.ma === "BLS";
      const [lop] = await rest("lop_hoc", {
        method: "POST",
        prefer: "return=representation",
        body: {
          ten: `${TIEN_TO_LOP}${lopTpl.ma} (${tenKy})`,
          nhom_lop_id: nhomLopId(lopTpl.nhomLop),
          doi_tuong: lopTpl.doiTuong,
          loai_kinh_phi: lopTpl.kinhPhi,
          ngay_bat_dau: ngayBd,
          ngay_ket_thuc: ngayKt,
          dia_diem: "Demo KPI",
          trang_thai: chuaHoanThanh ? "dang_mo" : "da_hoan_thanh",
          // Lớp chưa hoàn thành thì chưa nhập được C1/C3
          ...(thieuC1 || chuaHoanThanh ? {} : { c1_phan_tram: lopTpl.c1, c1_nguon: "nhap_tay" }),
          ...(chuaHoanThanh ? {} : { c3_phan_tram: lopTpl.c3 }),
        },
      });

      for (const [bi, b] of lopTpl.bai.entries()) {
        const ngay = cong(ky.tu, b.ngay);
        const [bai] = await rest("bai_hoc", {
          method: "POST",
          prefer: "return=representation",
          body: { lop_id: lop.id, thu_tu: bi + 1, ten: `Bài ${bi + 1} - ${lopTpl.ma}`, bat_dau: moc(ngay, b.gio[0]), ket_thuc: moc(ngay, b.gio[1]) },
        });
        const slots = await rest("slot_giang_day", {
          method: "POST",
          prefer: "return=representation",
          body: [
            { bai_id: bai.id, vai_tro: "giang_vien", vi_tri: 1, trang_thai: "da_phan_cong", nguoi_phan_cong: id[b.gv] },
            { bai_id: bai.id, vai_tro: "tro_giang", vi_tri: 1, trang_thai: "da_phan_cong", nguoi_phan_cong: id[b.tg] },
          ],
        });
        for (const [key, vaiTro] of [[b.gv, "giang_vien"], [b.tg, "tro_giang"]]) {
          const slot = slots.find((s) => s.vai_tro === vaiTro);
          const lan = (dem[key] = (dem[key] ?? -1) + 1);
          const cach = nhan[key].dk[lan % nhan[key].dk.length];
          if (cach !== "none") {
            dangKy.push({
              bai_id: bai.id, vai_tro: vaiTro, user_id: id[key], slot_id: slot.id, trang_thai: "da_duyet",
              loai: cach === "self" ? "tu_dang_ky" : "duoc_moi",
            });
          }
          // Điểm danh: kỳ 2, 3 không có điểm danh cho lớp ABCDE
          if (!(ky.dk.choPhepThieuDiemDanh && lopTpl.khongDiemDanhKhiThieu)) {
            diemDanh.push({ bai_id: bai.id, user_id: id[key], b1_phan_tram: nhan[key].b1 });
          }
          const c2 = b.c2?.[key];
          if (c2 !== undefined) duGio.push({ bai_id: bai.id, user_id: id[key], muc_diem: c2, ghi_chu: "Demo dự giờ" });
        }
        b.__baiId = { ...(b.__baiId ?? {}), [ki]: bai.id };
      }
    }

    // Lời mời đã từ chối (kéo A3 xuống): gắn vào Bài đầu của lớp ACLS cùng kỳ
    for (const n of NHAN_SU) {
      for (let i = 0; i < n.moiTuChoi; i++) {
        const bai = LOP[0].bai[i % LOP[0].bai.length].__baiId[ki];
        dangKy.push({
          bai_id: bai, vai_tro: n.nhom.startsWith("gv") ? "giang_vien" : "tro_giang", user_id: id[n.key],
          loai: "duoc_moi", trang_thai: "tu_choi", slot_id: null,
        });
      }
    }
    if (dangKy.length) await rest("dang_ky_giang_day", { method: "POST", body: dangKy });
    if (diemDanh.length) await rest("diem_danh_bai", { method: "POST", body: diemDanh });
    if (duGio.length) await rest("danh_gia_du_gio", { method: "POST", body: duGio });
    console.log(`  + ${ky.ten}: 3 lớp, ${dangKy.length} đăng ký/lời mời, ${diemDanh.length} điểm danh, ${duGio.length} dự giờ`);
  }

  await inKetQua(kyIds);
  console.log(`\nTài khoản demo (mật khẩu chung: ${MAT_KHAU}): ${NHAN_SU.map((n) => n.key + MIEN).join(", ")}`);
}

async function inKetQua(kyIds) {
  const ky = kyIds ?? (await rest(`ky_danh_gia?select=id,ten&ten=like.${enc(TIEN_TO_KY)}*&order=tu`)).map((k) => k.id);
  const ten = Object.fromEntries((await rest(`ky_danh_gia?select=id,ten`)).map((k) => [k.id, k.ten]));
  for (const k of ky) {
    const rows = await rpc("kpi_ky", { p_ky: k });
    console.log(`\nKPI ${ten[k]} (tính trực tiếp):`);
    for (const r of rows) {
      const g = r.gia_tri;
      const ct = ["A1", "A2", "A3", "B1", "C1", "C2", "C3"].filter((m) => g[m] !== undefined).map((m) => `${m}=${Math.round(g[m])}`).join(" ");
      console.log(`  #${r.hang} ${r.ho_ten.padEnd(38)} KPI ${String(r.kpi).padStart(6)}  ${ct}${r.che_do_a1 === "lich_su" ? "  [A1 theo lịch sử]" : ""}`);
    }
  }
}

async function xoa() {
  // Thứ tự: kỳ (kéo theo kết quả KPI, nhật ký) → đề xuất → lớp (kéo theo Bài, slot, đăng ký, điểm danh, dự giờ) → tài khoản
  const ky = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  for (const k of ky) await rest(`ky_danh_gia?id=eq.${k.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${ky.length} kỳ demo.`);

  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  if (ids.length) {
    const inList = `in.(${ids.join(",")})`;
    await rest(`de_xuat_nhan_su?user_id=${inList}`, { method: "DELETE" });
  }
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
else if (lenh === "kiemtra") await inKetQua();
else console.log("Dùng: node scripts/demo-kpi.mjs tao | xoa | kiemtra");
