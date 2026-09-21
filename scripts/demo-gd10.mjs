// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 10 lượt 1 (Báo cáo #3 sản lượng, #4 A2/A3, #5 vận hành đăng ký, #8 vận hành lớp học).
// Chạy: node scripts/demo-gd10.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Nhận biết dữ liệu demo: email @gd10-demo.test, lớp bắt đầu bằng "Demo GD10 - ", loại chứng chỉ "Demo GD10 ...". Lệnh "xoa" chỉ xóa đúng các thứ đó.
// Ngày của các Bài tính theo GIỜ CHẠY LỆNH (hôm nay ± N ngày). Ghi thẳng bằng service role nên KHÔNG sinh nhật ký hệ thống.
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
const TIEN_TO_LOP = "Demo GD10 - ";
const TIEN_TO_CC = "Demo GD10";
const MIEN = "@gd10-demo.test";
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
  { key: "g1", ho_ten: "GD10 GV1 Dạy nhiều nhất (bác sĩ)", nhom: "gv_bac_si", cc: true },
  { key: "g2", ho_ten: "GD10 GV2 Dạy vừa (bác sĩ)", nhom: "gv_bac_si" },
  { key: "g3", ho_ten: "GD10 GV3 Dạy ít (không bác sĩ)", nhom: "gv_khong_bac_si" },
  { key: "g4", ho_ten: "GD10 GV4 Hay tự đăng ký (không bác sĩ)", nhom: "gv_khong_bac_si" },
  { key: "g5", ho_ten: "GD10 GV5 Chưa dạy, hay từ chối lời mời (bác sĩ)", nhom: "gv_bac_si" },
  { key: "t1", ho_ten: "GD10 TG1 Trợ giảng chăm chỉ (bác sĩ)", nhom: "tg_bac_si", cc: true },
  { key: "t2", ho_ten: "GD10 TG2 Trợ giảng (không bác sĩ)", nhom: "tg_khong_bac_si" },
  { key: "t3", ho_ten: "GD10 TG3 Chưa dạy (không bác sĩ)", nhom: "tg_khong_bac_si" },
];

const p2 = (n) => String(n).padStart(2, "0");
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;

async function tao() {
  const daCo = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
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

  // 2. Danh mục thử: 2 loại chứng chỉ (A chỉ g1 + t1 có; B không ai có) để tạo cảnh báo pool nhỏ
  const [ccA] = await rest("danh_muc_loai_chung_chi", { method: "POST", prefer: "return=representation", body: { ten: `${TIEN_TO_CC} CC-A` } });
  const [ccB] = await rest("danh_muc_loai_chung_chi", { method: "POST", prefer: "return=representation", body: { ten: `${TIEN_TO_CC} CC-B` } });
  await rest("chung_chi", { method: "POST", body: NHAN_SU.filter((n) => n.cc).map((n) => ({ user_id: id[n.key], loai_id: ccA.id })) });

  const nhomLop = await rest("danh_muc_nhom_lop?select=id,ten&order=thu_tu");
  const hom = homNayVN();
  const bayGio = Date.now();
  const ngayLuc = (ngay, gio) => new Date(`${moc(ngay, gio)}`).getTime();

  const taoLop = async (ten, nhomIdx, kinhPhi, trangThai, tu, den, opt = {}) => {
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten}`, nhom_lop_id: nhomLop[nhomIdx % nhomLop.length].id, doi_tuong: opt.congDong ? "cong_dong" : "nhan_vien_y_te", loai_kinh_phi: kinhPhi, ngay_bat_dau: cong(hom, tu), ngay_ket_thuc: cong(hom, den), dia_diem: "Demo GD10", trang_thai: trangThai },
    });
    if (opt.nhom) await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: opt.nhom.map((nh) => ({ lop_id: lop.id, nhom: nh })) });
    if (opt.cc) await rest("lop_hoc_chung_chi_yeu_cau", { method: "POST", body: [{ lop_id: lop.id, loai_id: opt.cc }] });
    return lop;
  };

  // Mỗi slot: created_at lùi 12 ngày trước giờ dạy (hoặc 2 ngày trước lúc chạy lệnh nếu Bài ở tương lai); người được duyệt sau (5..60) giờ kể từ lúc slot tạo.
  const GIO_DUYET = [5, 26, 40, 9, 60, 3, 18, 30, 12, 48];
  let dem = 0;
  // slots: [key|null, vai_tro, cach] — cach: "tu" = tự đăng ký được duyệt, "moi" = lời mời được đồng ý, "ko" = phân công thẳng (không có đăng ký), "trong" = còn trống
  const taoBai = async (lop, thuTu, ten, ngayOff, gioBd, soGio, slots, tuChoi = []) => {
    const ngay = cong(hom, ngayOff);
    const bd = moc(ngay, gioBd);
    const kt = moc(ngay, gioBd + soGio);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten, bat_dau: bd, ket_thuc: kt } });
    const tao = Math.min(ngayLuc(ngay, gioBd) - 12 * 86400000, bayGio - 2 * 86400000);
    const viTri = { giang_vien: 0, tro_giang: 0 };
    const dong = slots.map(([key, vaiTro, cach]) => ({
      bai_id: bai.id,
      vai_tro: vaiTro,
      vi_tri: ++viTri[vaiTro],
      trang_thai: cach === "trong" ? "trong" : "da_phan_cong",
      nguoi_phan_cong: cach === "trong" ? null : id[key],
      created_at: new Date(tao).toISOString(),
    }));
    const sl = await rest("slot_giang_day", { method: "POST", prefer: "return=representation", body: dong });
    const dk = [];
    slots.forEach(([key, vaiTro, cach], i) => {
      if (cach !== "tu" && cach !== "moi") return;
      const xuLy = Math.min(bayGio - 3600000, tao + GIO_DUYET[dem++ % GIO_DUYET.length] * 3600000);
      dk.push({
        bai_id: bai.id, vai_tro: vaiTro, user_id: id[key], slot_id: sl[i].id, trang_thai: "da_duyet", loai: cach === "tu" ? "tu_dang_ky" : "duoc_moi",
        created_at: new Date(tao + 3600000).toISOString(), xu_ly_luc: new Date(xuLy).toISOString(),
      });
    });
    // Lời mời bị từ chối (ảnh hưởng A3)
    for (const [key, vaiTro] of tuChoi) {
      dk.push({
        bai_id: bai.id, vai_tro: vaiTro, user_id: id[key], slot_id: null, trang_thai: "tu_choi", loai: "duoc_moi",
        created_at: new Date(tao + 3600000).toISOString(), xu_ly_luc: new Date(tao + 20 * 3600000).toISOString(),
      });
    }
    if (dk.length) await rest("dang_ky_giang_day", { method: "POST", body: dk });
    return { bai, slots: sl };
  };

  // --- Lớp đã hoàn thành (quá khứ): có kinh phí ---
  const l1 = await taoLop("ACLS đã hoàn thành", 1, "co_kinh_phi", "da_hoan_thanh", -20, -18);
  await taoBai(l1, 1, "Bài 1 - Lý thuyết", -20, 8, 3, [["g1", "giang_vien", "tu"], ["g2", "giang_vien", "moi"], ["t1", "tro_giang", "tu"]]);
  await taoBai(l1, 2, "Bài 2 - Thực hành", -19, 8, 3, [["g1", "giang_vien", "tu"], ["t2", "tro_giang", "moi"]], [["g5", "giang_vien"]]);
  await taoBai(l1, 3, "Bài 3 - Kiểm tra", -18, 13, 2, [["g2", "giang_vien", "tu"], ["g3", "giang_vien", "moi"], ["t1", "tro_giang", "moi"]], [["t3", "tro_giang"]]);

  // --- Lớp đã hoàn thành: không kinh phí, cộng đồng ---
  const l2 = await taoLop("BLS cộng đồng (không kinh phí)", 2, "khong_kinh_phi", "da_hoan_thanh", -13, -12, { congDong: true });
  await taoBai(l2, 1, "Bài 1", -13, 8, 4, [["g1", "giang_vien", "ko"], ["g4", "giang_vien", "tu"], ["t2", "tro_giang", "tu"]], [["g3", "giang_vien"]]);
  await taoBai(l2, 2, "Bài 2", -12, 8, 4, [["g1", "giang_vien", "tu"], ["g4", "giang_vien", "moi"], ["t2", "tro_giang", "tu"]]);

  // --- Lớp đang diễn ra: có Bài đã dạy, Bài sắp tới, slot còn trống + đăng ký/lời mời đang chờ ---
  const l3 = await taoLop("SCC-LX đang diễn ra", 3, "co_kinh_phi", "dang_mo", -3, 3, { nhom: ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"] });
  await taoBai(l3, 1, "Bài 1", -3, 8, 3, [["g3", "giang_vien", "tu"], ["t1", "tro_giang", "moi"]]);
  await taoBai(l3, 2, "Bài 2", -1, 8, 3, [["g1", "giang_vien", "tu"], ["g2", "giang_vien", "tu"], ["t1", "tro_giang", "tu"]], [["g5", "giang_vien"]]);
  await taoBai(l3, 3, "Bài 3 - Sắp tới", 1, 8, 3, [["g1", "giang_vien", "moi"], ["g4", "giang_vien", "tu"], ["t2", "tro_giang", "tu"]]);
  const b34 = await taoBai(l3, 4, "Bài 4 - Còn thiếu người", 3, 13, 2, [["g2", "giang_vien", "moi"], [null, "giang_vien", "trong"], [null, "tro_giang", "trong"]]);
  // Đang chờ: g4 tự đăng ký slot GV trống, t3 được mời slot TG trống
  await rest("dang_ky_giang_day", {
    method: "POST",
    body: [
      { bai_id: b34.bai.id, vai_tro: "giang_vien", user_id: id.g4, trang_thai: "cho_xu_ly", loai: "tu_dang_ky" },
      { bai_id: b34.bai.id, vai_tro: "tro_giang", user_id: id.t3, trang_thai: "cho_xu_ly", loai: "duoc_moi" },
    ],
  });

  // --- Lớp đã đủ đăng ký (tương lai) ---
  const l4 = await taoLop("Đã đủ đăng ký", 0, "co_kinh_phi", "dang_mo", 6, 6, { nhom: ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"] });
  await taoBai(l4, 1, "Bài duy nhất", 6, 8, 3, [["g2", "giang_vien", "tu"], ["t1", "tro_giang", "moi"]]);

  // --- Cảnh báo pool nhỏ: yêu cầu chứng chỉ A (g1 + t1 có) => 1 GV, 1 TG đủ điều kiện ---
  const l5 = await taoLop("Sắp mở - ít người đủ điều kiện", 1, "co_kinh_phi", "dang_mo", 8, 8, { nhom: ["gv_bac_si", "tg_bac_si"], cc: ccA.id });
  await taoBai(l5, 1, "Bài 1", 8, 8, 3, [[null, "giang_vien", "trong"], [null, "tro_giang", "trong"]]);
  // --- Cảnh báo pool 0: yêu cầu chứng chỉ B (không ai có) ---
  const l6 = await taoLop("Sắp mở - không ai đủ điều kiện", 1, "co_kinh_phi", "dang_mo", 9, 9, { nhom: ["gv_bac_si"], cc: ccB.id });
  await taoBai(l6, 1, "Bài 1", 9, 8, 3, [[null, "giang_vien", "trong"]]);
  // --- Không cảnh báo: nhiều người đủ điều kiện ---
  const l7 = await taoLop("Sắp mở - đủ ứng viên", 2, "co_kinh_phi", "dang_mo", 10, 10, { nhom: ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"] });
  await taoBai(l7, 1, "Bài 1", 10, 8, 3, [[null, "giang_vien", "trong"], [null, "tro_giang", "trong"]]);

  // --- Lớp Dự kiến (chỉ Admin thấy) và lớp Đã hủy (không tính vào báo cáo) ---
  const l8 = await taoLop("Dự kiến", 3, "co_kinh_phi", "nhap", 20, 21);
  await taoBai(l8, 1, "Bài 1", 20, 8, 3, [[null, "giang_vien", "trong"]]);
  const l9 = await taoLop("Đã hủy (không tính)", 4, "co_kinh_phi", "da_huy", -6, -5);
  await taoBai(l9, 1, "Bài 1", -6, 8, 3, [["g5", "giang_vien", "tu"], ["t3", "tro_giang", "moi"]]);

  console.log(`
Đã tạo xong 9 lớp demo + 8 tài khoản (mật khẩu chung: ${MAT_KHAU}): ${NHAN_SU.map((n) => n.key + MIEN).join(", ")}
Số liệu "chuẩn" để đối chiếu (giờ tính từ hôm nay ${hom}; xem theo QUÝ hoặc chọn THÁNG chứa các ngày này; hôm nay -20 ngày có thể rơi vào tháng trước):
 #3 Sản lượng (giờ đã dạy xong, không tính lớp hủy): g1 = 3+3+4+4+3(Bài 2 lớp SCC) = 17h; g2 = 3+2+3 = 8h; g3 = 2+3 = 5h; g4 = 4+4 = 8h; t1 = 3+2+3+3 = 11h; t2 = 3+4+4 = 11h; g5 = 0; t3 = 0 (lớp hủy KHÔNG tính).
    Giờ "sắp tới" (đã phân công, chưa diễn ra): g1 +3h, g4 +3h, t2 +3h, g2 +3h (Bài 3, 4 lớp SCC-LX) và g2/t1 +3h (lớp Đã đủ đăng ký).
 #4 A2/A3 (Bài tự đăng ký được duyệt / Bài đã dạy): g1 4/5, g2 2/3, g3 1/2, g4 1/2, t1 2/4, t2 2/3. Lời mời: g3 1 đồng ý + 1 từ chối, g5 0/2 (2 từ chối), t3 0/1, t1 3 đồng ý.
 #5 Vận hành đăng ký: đang chờ = 1 đăng ký (g4) + 1 lời mời (t3). Cảnh báo pool nhỏ: 2 Bài — "Sắp mở - ít người đủ điều kiện" (GV 1 người, TG 1 người), "Sắp mở - không ai đủ điều kiện" (0 người). Bài 4 lớp SCC-LX cũng còn slot trống.
 #8 Vận hành lớp (xem THÁNG hoặc QUÝ hiện tại): 9 lớp — Đang mở đăng ký ×3 (2 sắp mở + …), Đang diễn ra ×1, Đã đủ đăng ký ×1, Đã hoàn thành ×2, Dự kiến ×1 (chỉ Admin), Đã hủy ×1.
Đăng nhập g1@gd10-demo.test để xem báo cáo ở vai GV/TG (không có nhãn nhóm); Admin thật để xem đầy đủ.
Lưu ý: thao tác này có thể sinh thông báo "đăng ký cần duyệt" cho Admin (kể cả push). "xoa" sẽ dọn.`);
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
  const hom = homNayVN();
  const tu = cong(hom, -40);
  const den = cong(hom, 30);
  const rpc = await dangNhap(`g1${MIEN}`);
  const sl = await rpc("bc_san_luong", { p_tu: tu, p_den: den });
  console.log("#3 sản lượng (demo, giờ đã dạy / sắp tới):");
  for (const r of (Array.isArray(sl) ? sl : []).filter((x) => x.ho_ten.startsWith("GD10"))) console.log(`   ${r.ho_ten}: ${r.gio_thuc}h (${r.so_bai} Bài, ${r.so_lop} lớp) + ${r.gio_sap}h sắp tới`);
  const tl = await rpc("bc_ty_le_dang_ky", { p_tu: tu, p_den: den });
  console.log("#4 A2/A3 (demo):");
  for (const r of (Array.isArray(tl) ? tl : []).filter((x) => x.ho_ten.startsWith("GD10"))) console.log(`   ${r.ho_ten}: tự ĐK ${r.so_tu_dang_ky}/${r.so_bai_da_day} Bài; lời mời ${r.so_moi_dong_y} đồng ý, ${r.so_moi_tu_choi} từ chối`);
  const vh = await rpc("bc_van_hanh_dang_ky", { p_tu: tu, p_den: den });
  console.log(`#5 slot ${vh.slot_da_phan_cong}/${vh.slot_tong}, TB lấp ${vh.gio_lap_tb}h (${vh.so_slot_do_duyet} slot), chờ: ${vh.dang_ky_cho} đăng ký + ${vh.loi_moi_cho} lời mời`);
  const pool = await rpc("bc_canh_bao_pool");
  console.log("#5 cảnh báo pool:", Array.isArray(pool) ? pool.map((p) => `${p.lop_ten} › ${p.bai_ten} [${p.vai_tro}] ${p.so_ung_vien} người`) : pool);
}

async function xoa() {
  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  // Thông báo của người khác (Admin thật...) nhắc tới lớp demo
  await rest(`thong_bao?noi_dung=like.${enc("*Demo GD10*")}`, { method: "DELETE" });
  if (ids.length) await rest(`de_xuat_nhan_su?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
  const lop = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);
  for (const u of users) {
    await authAdmin(`users/${u.id}`, { method: "DELETE" });
    console.log("  - đã xóa", u.email);
  }
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
  await rest(`danh_muc_loai_chung_chi?ten=like.${enc(TIEN_TO_CC)}*`, { method: "DELETE" });
  console.log("Đã xóa loại chứng chỉ demo.");
  await rest(`thong_bao?noi_dung=like.${enc("*Demo GD10*")}`, { method: "DELETE" });
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-gd10.mjs tao | xoa | kiemtra");
