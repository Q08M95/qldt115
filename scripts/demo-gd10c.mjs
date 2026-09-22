// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 10 lượt 3 (Trang Tổng quan, mục 4.7b).
// Chạy: node scripts/demo-gd10c.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Nhận biết dữ liệu demo: email @gd10c-demo.test, lớp bắt đầu bằng "Demo GD10c - ", kỳ bắt đầu bằng "Demo GD10c - ",
// loại chứng chỉ "Demo GD10c ...". Lệnh "xoa" chỉ xóa đúng các thứ đó.
// Khác gd10/gd10b: lớp/Bài đặt theo NGÀY TƯƠNG ĐỐI VỚI HÔM NAY (không phải năm cố định) vì Tổng quan là ảnh chụp
// HIỆN TẠI (Lịch dạy sắp tới, việc cần duyệt, cảnh báo pool đều realtime) — kỳ đánh giá demo vẫn đặt ở 2024 (như
// gd10b) để không đụng kỳ thật "Quý 3/2026". Ghi thẳng bằng service role nên KHÔNG sinh nhật ký hệ thống.
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
const TIEN_TO_LOP = "Demo GD10c - ";
const TIEN_TO_KY = "Demo GD10c - ";
const TIEN_TO_CC = "Demo GD10c";
const MIEN = "@gd10c-demo.test";
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
  { key: "g1", ho_ten: "GD10c GV1 Lịch dày (bác sĩ)", nhom: "gv_bac_si" },
  { key: "g2", ho_ten: "GD10c GV2 (bác sĩ)", nhom: "gv_bac_si" },
  { key: "g3", ho_ten: "GD10c GV3 (không bác sĩ)", nhom: "gv_khong_bac_si" },
  { key: "t1", ho_ten: "GD10c TG1 Có chứng chỉ hiếm (bác sĩ)", nhom: "tg_bac_si", cc: true },
  { key: "t2", ho_ten: "GD10c TG2 (không bác sĩ)", nhom: "tg_khong_bac_si" },
  { key: "t3", ho_ten: "GD10c TG3 Chưa có lịch (không bác sĩ)", nhom: "tg_khong_bac_si" },
];

const p2 = (n) => String(n).padStart(2, "0");
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;
const gioTuGio = (soGio) => new Date(Date.now() + soGio * 3600000).toISOString();

function ketQuaGiaLap(kyId, userId, kpi, extra = {}) {
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

// 2 kỳ demo đã đóng (2024, không đụng kỳ thật) — chỉ để "Xu hướng KPI toàn đơn vị" có ≥2 điểm cộng với kỳ thật đang mở.
const KY = [
  { ten: "Demo GD10c - Quý 1/2024", tu: "2024-01-01", den: "2024-03-31", trang_thai: "da_dong" },
  { ten: "Demo GD10c - Quý 2/2024", tu: "2024-04-01", den: "2024-06-30", trang_thai: "da_dong" },
];

async function tao() {
  const daCo = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
  if (daCo.length > 0) {
    console.log("Đã có dữ liệu demo — chạy 'xoa' rồi 'tao' nếu muốn làm mới.");
    return;
  }

  // 1. Tài khoản + nhóm — created_at trải trong 12 ngày gần nhất để sparkline "Nhân sự" trên Tổng quan không dồn 1 cột
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const id = {};
  for (const [i, n] of NHAN_SU.entries()) {
    const email = `${n.key}${MIEN}`;
    let uid = co.get(email);
    if (!uid) {
      const u = await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } } });
      uid = u.id;
      console.log("  + tài khoản", email);
    }
    id[n.key] = uid;
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    // Rải created_at: 12, 10, 7, 5, 2, 0 ngày trước (mới nhất = t3, khớp với "chưa có lịch")
    const ngayTruoc = [12, 10, 7, 5, 2, 0][i];
    await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { created_at: gioTuGio(-ngayTruoc * 24) } });
  }

  // 2. Chứng chỉ hiếm (chỉ t1 có) — dùng để tạo cảnh báo pool nhỏ
  const [cc] = await rest("danh_muc_loai_chung_chi", { method: "POST", prefer: "return=representation", body: { ten: `${TIEN_TO_CC} CC-Hiếm` } });
  await rest("chung_chi", { method: "POST", body: [{ user_id: id.t1, loai_id: cc.id }] });

  // 3. 2 kỳ demo đã đóng (2024) — snapshot KPI để có điểm cho Xu hướng KPI toàn đơn vị
  const kyId = {};
  for (const ky of KY) {
    const [row] = await rest("ky_danh_gia", { method: "POST", prefer: "return=representation", body: { ten: ky.ten, tu: ky.tu, den: ky.den, trang_thai: ky.trang_thai } });
    kyId[ky.ten] = row.id;
  }
  const k1 = kyId["Demo GD10c - Quý 1/2024"];
  const k2 = kyId["Demo GD10c - Quý 2/2024"];
  await rest("ket_qua_kpi", {
    method: "POST",
    body: [
      ketQuaGiaLap(k1, id.g1, 74),
      ketQuaGiaLap(k1, id.t1, 68),
      ketQuaGiaLap(k2, id.g1, 79),
      ketQuaGiaLap(k2, id.g2, 71),
      ketQuaGiaLap(k2, id.t1, 73),
    ],
  });

  // 4. Lớp/Bài quanh HÔM NAY (kỳ thật "Quý 3/2026" đang mở tự tính KPI live từ các Bài đã dạy xong dưới đây)
  const nhomLop = await rest("danh_muc_nhom_lop?select=id&order=thu_tu");
  const hom = homNayVN();
  const taoLop = async (ten, nhomIdx, trangThai, tu, den, opt = {}) => {
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten}`, nhom_lop_id: nhomLop[nhomIdx % nhomLop.length].id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: "co_kinh_phi", ngay_bat_dau: cong(hom, tu), ngay_ket_thuc: cong(hom, den), dia_diem: "Demo GD10c", trang_thai: trangThai },
    });
    if (opt.nhom) await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: opt.nhom.map((nh) => ({ lop_id: lop.id, nhom: nh })) });
    if (opt.cc) await rest("lop_hoc_chung_chi_yeu_cau", { method: "POST", body: [{ lop_id: lop.id, loai_id: opt.cc }] });
    return lop;
  };
  const TAT_CA_NHOM = ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];

  // Bài đã dạy xong (giờ tuyệt đối, không phụ thuộc offset ngày) + điểm danh 100% — đóng góp A1/KPI live cho kỳ thật
  const taoBaiDayXong = async (lop, thuTu, batDauIso, soGio, giao) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const viTri = { giang_vien: 0, tro_giang: 0 };
    await rest("slot_giang_day", { method: "POST", body: giao.map(([key, vaiTro]) => ({ bai_id: bai.id, vai_tro: vaiTro, vi_tri: ++viTri[vaiTro], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] })) });
    await rest("diem_danh_bai", { method: "POST", body: giao.map(([key]) => ({ bai_id: bai.id, user_id: id[key], check_in_luc: bd.toISOString(), b1_phan_tram: 100 })) });
    return bai;
  };

  // Bài sắp tới: slot da_phan_cong (giao) + slot trống (soTrong), có thể kèm đăng ký/lời mời đang chờ ở slot trống
  const taoBaiSapToi = async (lop, thuTu, batDauIso, soGio, giao, trong = [], cho = []) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const viTri = { giang_vien: 0, tro_giang: 0 };
    const dongGiao = giao.map(([key, vaiTro]) => ({ bai_id: bai.id, vai_tro: vaiTro, vi_tri: ++viTri[vaiTro], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] }));
    const dongTrong = trong.map((vaiTro) => ({ bai_id: bai.id, vai_tro: vaiTro, vi_tri: ++viTri[vaiTro], trang_thai: "trong", nguoi_phan_cong: null }));
    if (dongGiao.length || dongTrong.length) await rest("slot_giang_day", { method: "POST", body: [...dongGiao, ...dongTrong] });
    // Đăng ký/lời mời đang CHỜ DUYỆT gắn vào slot trống (không có slot_id — chờ Admin duyệt mới gán)
    if (cho.length) await rest("dang_ky_giang_day", { method: "POST", body: cho.map(([key, vaiTro, loai]) => ({ bai_id: bai.id, vai_tro: vaiTro, user_id: id[key], trang_thai: "cho_xu_ly", loai })) });
    return bai;
  };

  // --- Lớp đã hoàn thành gần đây: g1 + t1 dạy xong, có điểm danh -> đóng góp KPI live cho kỳ thật ---
  const lXong = await taoLop("Đã hoàn thành gần đây", 1, "da_hoan_thanh", -10, -9);
  await taoBaiDayXong(lXong, 1, moc(cong(hom, -10), 8), 3, [["g1", "giang_vien"], ["t1", "tro_giang"]]);
  await taoBaiDayXong(lXong, 2, moc(cong(hom, -9), 8), 3, [["g2", "giang_vien"], ["t2", "tro_giang"]]);

  // --- Lớp đang diễn ra: 1 Bài đã dạy xong (hôm qua) + 1 Bài hôm nay (vài giờ nữa) cho g1 — nhóm "Hôm nay" ở timeline ---
  const lDienRa = await taoLop("Đang diễn ra", 2, "dang_mo", -2, 5, { nhom: TAT_CA_NHOM });
  await taoBaiDayXong(lDienRa, 1, moc(cong(hom, -1), 8), 3, [["g2", "giang_vien"], ["t2", "tro_giang"]]);
  await taoBaiSapToi(lDienRa, 2, gioTuGio(3), 2, [["g1", "giang_vien"], ["t1", "tro_giang"]]);

  // --- Lớp đang mở, còn thiếu người (ngày mai): g1 dạy (GV), 2 slot TG trống — 1 đăng ký tự do, 1 lời mời đang chờ ---
  const lNgayMai = await taoLop("Đang mở - còn thiếu TG", 3, "dang_mo", 1, 2, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lNgayMai, 1, moc(cong(hom, 1), 8), 3, [["g1", "giang_vien"]], ["tro_giang", "tro_giang"], [["t3", "tro_giang", "tu_dang_ky"], ["t2", "tro_giang", "duoc_moi"]]);

  // --- Lớp đang mở, nửa chừng (trong tuần): g2 GV đã phân công, TG còn trống ---
  const lNuaChung = await taoLop("Đang mở - nửa chừng", 0, "dang_mo", 4, 5, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lNuaChung, 1, moc(cong(hom, 4), 8), 3, [["g2", "giang_vien"]], ["tro_giang"]);

  // --- Lớp mời g1 (đang chờ g1 phản hồi) — để "đang chờ" trên Lịch dạy sắp tới của g1 > 0 ---
  const lMoiG1 = await taoLop("Đang mở - mời GV1", 1, "dang_mo", 6, 6, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lMoiG1, 1, moc(cong(hom, 6), 8), 2, [], ["giang_vien"], [["g1", "giang_vien", "duoc_moi"]]);

  // --- Lớp đã đủ đăng ký (tuần này, trạng thái hiển thị suy ra "Đã đủ đăng ký") — thêm 1 Bài cho g1 để timeline có mốc "Tuần này" ---
  const lDuDk = await taoLop("Đã đủ đăng ký", 2, "dang_mo", 5, 5, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lDuDk, 1, moc(cong(hom, 5), 13), 2, [["g1", "giang_vien"], ["t2", "tro_giang"]]);

  // --- Cảnh báo pool nhỏ: yêu cầu chứng chỉ hiếm (chỉ t1 có) + nhóm tg_bac_si, slot TG còn trống ---
  const lPool = await taoLop("Sắp mở - ít người đủ điều kiện", 1, "dang_mo", 9, 9, { nhom: ["tg_bac_si"], cc: cc.id });
  await taoBaiSapToi(lPool, 1, moc(cong(hom, 9), 8), 3, [], ["tro_giang"]);

  // 5. Đề xuất nhân sự đang chờ duyệt (cho "Việc cần duyệt" của Admin)
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: [
      { loai: "khen_thuong_nhac_nho", user_id: id.g1, noi_dung: "Demo: khen thưởng dạy đều trong tuần.", trang_thai: "cho_duyet" },
      { loai: "dao_tao", user_id: id.g3, noi_dung: "Demo: cử đào tạo bồi dưỡng chuyên môn.", trang_thai: "cho_duyet" },
    ],
  });

  // 6. Thông báo mẫu cho g1 (widget "Thông báo mới nhất")
  await rest("thong_bao", {
    method: "POST",
    body: [
      { user_id: id.g1, loai: "duoc_moi", muc_do: "can_hanh_dong", tieu_de: "Bạn được mời dạy Bài 1 · Đang mở - mời GV1", noi_dung: "Vai trò Giảng viên", lien_ket: "/dang-ky", da_doc: false },
      { user_id: id.g1, loai: "bai_trong_moi", muc_do: "thong_tin", tieu_de: "Có Bài trống mới phù hợp bạn", noi_dung: "Đang mở - nửa chừng · Bài 1", lien_ket: `/lop-hoc/${lNuaChung.id}`, da_doc: true },
    ],
  });

  console.log(`
Đã tạo xong 7 lớp + 2 kỳ demo (2024) + 6 tài khoản (mật khẩu chung: ${MAT_KHAU}): ${NHAN_SU.map((n) => n.key + MIEN).join(", ")}
Đăng nhập g1@gd10c-demo.test để xem Tổng quan ở vai GV/TG (có lịch dạy hôm nay/ngày mai/tuần này, 1 lời mời đang chờ,
2 thông báo mới, KPI live kỳ thật Quý 3/2026); Admin thật để xem đầy đủ bộ widget Admin (việc cần duyệt, cảnh báo
pool nhỏ, sparkline nhân sự/lớp mới, tỷ lệ lấp đầy...).
Dọn: node scripts/demo-gd10c.mjs xoa`);
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
  const lop = await rest(`lop_hoc_tong_hop?select=ten,trang_thai_hien_thi,gv_tong,gv_da_phan_cong,tg_tong,tg_da_phan_cong&ten=like.${enc(TIEN_TO_LOP)}*`);
  console.log("Lớp demo:");
  for (const l of lop) console.log(`   ${l.ten} [${l.trang_thai_hien_thi}] GV ${l.gv_da_phan_cong}/${l.gv_tong} · TG ${l.tg_da_phan_cong}/${l.tg_tong}`);

  const rpc = await dangNhap(`g1${MIEN}`);
  const pool = await rpc("bc_canh_bao_pool");
  console.log("Cảnh báo pool:", Array.isArray(pool) ? pool.filter((p) => p.lop_ten?.startsWith("Demo")).map((p) => `${p.lop_ten} [${p.vai_tro}] ${p.so_ung_vien} người`) : pool);
  const xh = await rpc("bc_kpi_theo_ky", { p_gioi_han: 6 });
  console.log("Xu hướng KPI (6 kỳ gần nhất, gồm cả kỳ thật):", Array.isArray(xh) ? xh.map((r) => `${r.ten}: TB=${r.kpi_tb ?? "–"} (${r.so_nguoi} người)`) : xh);
}

async function xoa() {
  const ky = await rest(`ky_danh_gia?select=id&ten=like.${enc(TIEN_TO_KY)}*`);
  for (const k of ky) await rest(`ky_danh_gia?id=eq.${k.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${ky.length} kỳ demo (kéo theo kết quả KPI snapshot).`);

  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await rest(`de_xuat_nhan_su?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
    await rest(`thong_bao?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
  }
  const lop = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);
  for (const u of users) {
    await authAdmin(`users/${u.id}`, { method: "DELETE" });
    console.log("  - đã xóa", u.email);
  }
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
  await rest(`danh_muc_loai_chung_chi?ten=like.${enc(TIEN_TO_CC)}*`, { method: "DELETE" });
  console.log("Đã xóa chứng chỉ demo.");
  await rest(`thong_bao?noi_dung=like.${enc("*Demo GD10c*")}`, { method: "DELETE" });
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-gd10c.mjs tao | xoa | kiemtra");
