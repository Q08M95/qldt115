// Bộ dữ liệu demo ĐẦY ĐỦ để test trực quan toàn bộ Giai đoạn 10 (8 báo cáo mục 4.7 + Tổng quan mục 4.7b) cùng lúc.
// Chạy: node scripts/demo-gd10-full.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Khác các script demo-gd10*.mjs trước: 28 "nhân sự" dùng TÊN THẬT KIỂU VIỆT NAM bình thường (không có nhãn "Demo/GV1..."
// trong họ tên) để nhìn báo cáo/Tổng quan trực quan như dữ liệu thật, quy mô gần giống 31 nhân sự đang có. Nhận biết
// để dọn: email @gd10-full-demo.test, lớp có dia_diem = "Demo GD10-full" (TÊN LỚP thật kiểu "ACLS-101", không có
// nhãn demo), kỳ bắt đầu bằng "Demo GD10-full - ". Lệnh "xoa" chỉ xóa đúng các thứ đó — không đụng 31 nhân sự thật.
// Lớp/Bài lịch sử đặt theo NGÀY TƯƠNG ĐỐI VỚI HÔM NAY (trải ~5 tháng gần nhất) để test được cả 4 khung tuần/tháng/
// quý/năm của báo cáo #3,4,5,8; kỳ demo đặt ở 2024 để không đụng kỳ thật "Quý 3/2026" (vẫn tự nhận dữ liệu live).
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
const MIEN = "@gd10-full-demo.test";
const DIA_DIEM = "Demo GD10-full";
const TIEN_TO_KY = "Demo GD10-full - ";
const TIEN_TO_CC = "Demo GD10-full";
const enc = (s) => encodeURIComponent(s);

async function rest(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
async function authAdmin(path, { method = "GET", body } = {}) {
  const r = await fetch(`${URL_}/auth/v1/admin/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`auth ${method} ${path} -> ${r.status} ${text.slice(0, 400)}`);
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
const gioTuGio = (soGio) => new Date(Date.now() + soGio * 3600000).toISOString();

// ---------- 28 "nhân sự" demo — tên kiểu Việt Nam bình thường, khác hoàn toàn 31 nhân sự thật đang có ----------
// trongSo: trọng số chọn ngẫu nhiên khi phân công Bài (càng cao càng hay được chọn) — 0 = cố tình để "chưa dạy gì"
// (test trường hợp biên báo cáo #3: người 0 giờ đang tham gia vẫn phải xuất hiện trong bảng/percentile).
const NHAN_SU = [
  // gv_bac_si
  { key: "u01", ho_ten: "Bùi Anh Khoa", nhom: "gv_bac_si", trongSo: 5 },
  { key: "u02", ho_ten: "Châu Minh Tuấn", nhom: "gv_bac_si", trongSo: 5 },
  { key: "u03", ho_ten: "Hoàng Đức Anh", nhom: "gv_bac_si", trongSo: 3 },
  { key: "u04", ho_ten: "Lê Minh Nhật", nhom: "gv_bac_si", trongSo: 3 },
  { key: "u05", ho_ten: "Nguyễn Anh Tài", nhom: "gv_bac_si", trongSo: 3 },
  { key: "u06", ho_ten: "Phạm Đình Khôi", nhom: "gv_bac_si", trongSo: 1 },
  { key: "u07", ho_ten: "Trần Quang Huy", nhom: "gv_bac_si", trongSo: 0 },
  // gv_khong_bac_si
  { key: "u08", ho_ten: "Cao Thị Bích Vân", nhom: "gv_khong_bac_si", trongSo: 5 },
  { key: "u09", ho_ten: "Đoàn Văn Thắng", nhom: "gv_khong_bac_si", trongSo: 5 },
  { key: "u10", ho_ten: "Lý Hoàng Nam", nhom: "gv_khong_bac_si", trongSo: 3 },
  { key: "u11", ho_ten: "Mai Xuân Trường", nhom: "gv_khong_bac_si", trongSo: 3 },
  { key: "u12", ho_ten: "Nguyễn Hải Đăng", nhom: "gv_khong_bac_si", trongSo: 3 },
  { key: "u13", ho_ten: "Phan Thanh Tùng", nhom: "gv_khong_bac_si", trongSo: 1 },
  { key: "u14", ho_ten: "Trương Công Danh", nhom: "gv_khong_bac_si", trongSo: 0 },
  // tg_bac_si
  { key: "u15", ho_ten: "Đinh Thị Hải Yến", nhom: "tg_bac_si", trongSo: 5, cc: true },
  { key: "u16", ho_ten: "Hà Thị Diễm My", nhom: "tg_bac_si", trongSo: 5 },
  { key: "u17", ho_ten: "Huỳnh Gia Bảo", nhom: "tg_bac_si", trongSo: 3 },
  { key: "u18", ho_ten: "Ngô Thị Kim Oanh", nhom: "tg_bac_si", trongSo: 3 },
  { key: "u19", ho_ten: "Phạm Thị Ngọc Ánh", nhom: "tg_bac_si", trongSo: 3 },
  { key: "u20", ho_ten: "Tô Thị Thu Hiền", nhom: "tg_bac_si", trongSo: 1 },
  { key: "u21", ho_ten: "Vũ Đình Phúc", nhom: "tg_bac_si", trongSo: 0 },
  // tg_khong_bac_si
  { key: "u22", ho_ten: "Dương Thị Cẩm Tú", nhom: "tg_khong_bac_si", trongSo: 5 },
  { key: "u23", ho_ten: "Lâm Thị Mỹ Duyên", nhom: "tg_khong_bac_si", trongSo: 5 },
  { key: "u24", ho_ten: "Lê Thị Bích Ngọc", nhom: "tg_khong_bac_si", trongSo: 3 },
  { key: "u25", ho_ten: "Nguyễn Thị Bảo Trân", nhom: "tg_khong_bac_si", trongSo: 3 },
  { key: "u26", ho_ten: "Trần Bảo Ngọc", nhom: "tg_khong_bac_si", trongSo: 3 },
  { key: "u27", ho_ten: "Trịnh Thị Như Quỳnh", nhom: "tg_khong_bac_si", trongSo: 1 },
  { key: "u28", ho_ten: "Võ Thị Hồng Nhung", nhom: "tg_khong_bac_si", trongSo: 0 },
];
// "Hero" — đăng nhập vai GV/TG để xem Tổng quan (lịch dày, có lời mời đang chờ, thông báo mới)
const HERO = "u01";

function ketQuaGiaLap(kyId, userId, kpi) {
  const kep = (x) => Math.max(0, Math.min(100, Math.round(x * 100) / 100));
  return {
    ky_id: kyId,
    user_id: userId,
    kpi: kep(kpi),
    diem_nhom: { A: kep(kpi - 6), B: kep(kpi + 6), C: kep(kpi) },
    gia_tri: { A1: kep(kpi - 8), A2: 55, A3: 90, B1: kep(kpi + 6), C1: 80, C2: kep(kpi), C3: 80 },
    trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
    gio_thuc: 10 + Math.round(kpi / 10),
    gio_quy_doi: 11 + Math.round(kpi / 10),
    so_bai: 3 + Math.round(kpi / 25),
    so_lop: 1 + Math.round(kpi / 50),
    a4_ky: 0,
    a4_luy_ke: 0,
    che_do_a1: "percentile",
    percentile: kep(kpi - 4),
  };
}

const KY = [
  { ten: `${TIEN_TO_KY}Quý 1/2024`, tu: "2024-01-01", den: "2024-03-31", trang_thai: "da_dong" },
  { ten: `${TIEN_TO_KY}Quý 2/2024`, tu: "2024-04-01", den: "2024-06-30", trang_thai: "da_dong" },
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
// RNG có seed cố định (không dùng Math.random) để chạy lại "tao" nhiều lần ra cùng 1 bộ số liệu, dễ đối chiếu
function taoRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

async function tao() {
  const daCo = await rest(`lop_hoc?select=id&dia_diem=eq.${enc(DIA_DIEM)}`);
  if (daCo.length > 0) {
    console.log("Đã có dữ liệu demo — chạy 'xoa' rồi 'tao' nếu muốn làm mới.");
    return;
  }
  const rng = taoRng(20260923);

  // 1. Tài khoản + nhóm — created_at rải trong 24 ngày gần nhất để sparkline "Nhân sự mới" (Tổng quan) có hình dạng thật
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const id = {};
  const GV = NHAN_SU.filter((n) => n.nhom.startsWith("gv_"));
  const TG = NHAN_SU.filter((n) => n.nhom.startsWith("tg_"));
  for (const [i, n] of NHAN_SU.entries()) {
    const email = `${n.key}${MIEN}`;
    let uid = co.get(email);
    if (!uid) {
      const u = await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } } });
      uid = u.id;
    }
    id[n.key] = uid;
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    const ngayTruoc = Math.round((i / (NHAN_SU.length - 1)) * 24);
    await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { created_at: gioTuGio(-ngayTruoc * 24) } });
  }
  console.log(`Đã tạo/cập nhật ${NHAN_SU.length} tài khoản demo.`);

  // 2. Chứng chỉ hiếm (chỉ u15 có) — dùng để tạo cảnh báo pool nhỏ
  const [cc] = await rest("danh_muc_loai_chung_chi", { method: "POST", prefer: "return=representation", body: { ten: `${TIEN_TO_CC} CC-Hiếm` } });
  await rest("chung_chi", { method: "POST", body: [{ user_id: id.u15, loai_id: cc.id }] });

  // 3. 2 kỳ demo đã đóng (2024) + KPI snapshot cho phần lớn nhân sự (trừ nhóm trọng số 0 = "chưa dạy kỳ nào")
  const kyId = {};
  for (const ky of KY) {
    const [row] = await rest("ky_danh_gia", { method: "POST", prefer: "return=representation", body: { ten: ky.ten, tu: ky.tu, den: ky.den, trang_thai: ky.trang_thai } });
    kyId[ky.ten] = row.id;
  }
  const k1 = kyId[KY[0].ten];
  const k2 = kyId[KY[1].ten];
  const coDuLieuKy = NHAN_SU.filter((n) => n.trongSo > 0);
  const kqK1 = coDuLieuKy.map((n) => ketQuaGiaLap(k1, id[n.key], 35 + n.trongSo * 11 + Math.round(rng() * 8)));
  const kqK2 = coDuLieuKy.map((n) => ketQuaGiaLap(k2, id[n.key], 40 + n.trongSo * 11 + Math.round(rng() * 8)));
  await rest("ket_qua_kpi", { method: "POST", body: [...kqK1, ...kqK2] });
  console.log(`Đã tạo 2 kỳ demo (2024) + ${kqK1.length + kqK2.length} kết quả KPI snapshot.`);

  // 4. Lớp/Bài — nhóm lớp cycling qua danh mục thật, tên lớp KHÔNG có nhãn demo (chỉ dia_diem đánh dấu để dọn)
  const nhomLop = await rest("danh_muc_nhom_lop?select=id,ten&order=thu_tu");
  const hom = homNayVN();
  let soThuTuLop = 101;
  const taoLop = async (nhomIdx, kinhPhi, congDong, trangThai, tu, den, opt = {}) => {
    const nl = nhomLop[nhomIdx % nhomLop.length];
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: {
        ten: `${nl.ten}-${soThuTuLop++}`,
        nhom_lop_id: nl.id,
        doi_tuong: congDong ? "cong_dong" : "nhan_vien_y_te",
        loai_kinh_phi: kinhPhi,
        ngay_bat_dau: cong(hom, tu),
        ngay_ket_thuc: cong(hom, den),
        dia_diem: DIA_DIEM,
        trang_thai: trangThai,
        cong_khai_som: opt.congKhaiSom ?? true,
      },
    });
    if (opt.nhom) await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: opt.nhom.map((nh) => ({ lop_id: lop.id, nhom: nh })) });
    if (opt.cc) await rest("lop_hoc_chung_chi_yeu_cau", { method: "POST", body: [{ lop_id: lop.id, loai_id: opt.cc }] });
    return lop;
  };
  const TAT_CA_NHOM = ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];

  // Bài đã dạy xong: chọn người theo trọng số, điểm danh có chút biến thiên (đa số đúng giờ, vài người trễ/vắng) cho B1 đa dạng
  const taoBaiDayXong = async (lop, thuTu, batDauIso, soGio, soGv, soTg) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const daChon = new Set();
    const giao = [];
    for (let i = 0; i < soGv; i++) {
      const u = chonCoTrongSo(rng, GV, daChon);
      if (u) { daChon.add(u.key); giao.push([u.key, "giang_vien"]); }
    }
    for (let i = 0; i < soTg; i++) {
      const u = chonCoTrongSo(rng, TG, daChon);
      if (u) { daChon.add(u.key); giao.push([u.key, "tro_giang"]); }
    }
    if (giao.length === 0) return bai;
    const viTri = { giang_vien: 0, tro_giang: 0 };
    await rest("slot_giang_day", { method: "POST", body: giao.map(([key, vt]) => ({ bai_id: bai.id, vai_tro: vt, vi_tri: ++viTri[vt], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] })) });
    const diemDanh = giao.map(([key]) => {
      const r = rng();
      const tre = r > 0.85 ? Math.round(rng() * 40) : 0; // ~15% có trễ 0-40 phút
      const vang = r > 0.96; // ~4% vắng hẳn
      return { bai_id: bai.id, user_id: id[key], check_in_luc: vang ? null : new Date(bd.getTime() + tre * 60000).toISOString(), b1_phan_tram: vang ? 0 : Math.max(0, 100 - tre * (100 / 30)) };
    });
    await rest("diem_danh_bai", { method: "POST", body: diemDanh.filter((d) => d.check_in_luc) });
    // Đăng ký đã duyệt (đa số tự đăng ký, ~30% lời mời) để #4 A2/A3 và sparkline "phân công theo ngày" của Tổng quan có dữ liệu
    const dk = giao.map(([key, vt]) => {
      const moi = rng() < 0.3;
      const tao = bd.getTime() - (3 + Math.round(rng() * 10)) * 86400000;
      return { bai_id: bai.id, vai_tro: vt, user_id: id[key], trang_thai: "da_duyet", loai: moi ? "duoc_moi" : "tu_dang_ky", created_at: new Date(tao).toISOString(), xu_ly_luc: new Date(tao + (6 + rng() * 40) * 3600000).toISOString() };
    });
    await rest("dang_ky_giang_day", { method: "POST", body: dk });
    return bai;
  };

  // 13 lớp đã hoàn thành, trải ~150 ngày gần nhất (đủ để test khung tuần/tháng/quý/năm của báo cáo #3,4,5,8)
  const LOP_DA_XONG = [
    { off: -150, kp: "khong_kinh_phi", cd: true },
    { off: -132, kp: "co_kinh_phi" },
    { off: -114, kp: "co_kinh_phi" },
    { off: -98, kp: "khong_kinh_phi" },
    { off: -83, kp: "co_kinh_phi" },
    { off: -67, kp: "co_kinh_phi", cd: true },
    { off: -52, kp: "khong_kinh_phi" },
    { off: -38, kp: "co_kinh_phi" },
    { off: -27, kp: "co_kinh_phi" },
    { off: -19, kp: "khong_kinh_phi" },
    { off: -12, kp: "co_kinh_phi" },
    { off: -6, kp: "co_kinh_phi" },
    { off: -3, kp: "co_kinh_phi", cd: true },
  ];
  for (const [i, l] of LOP_DA_XONG.entries()) {
    const lop = await taoLop(i, l.kp, l.cd, "da_hoan_thanh", l.off, l.off + 2);
    await taoBaiDayXong(lop, 1, moc(cong(hom, l.off), 8), 3, 1, 2);
    await taoBaiDayXong(lop, 2, moc(cong(hom, l.off + 2), 8), 3, 1, 2);
  }
  console.log(`Đã tạo ${LOP_DA_XONG.length} lớp đã hoàn thành (2 Bài/lớp).`);

  // Bài sắp tới: 1 phần slot đã phân công (theo trọng số), phần còn lại để trống — có thể kèm đăng ký/lời mời đang chờ
  const taoBaiSapToi = async (lop, thuTu, batDauIso, soGio, ganGv, ganTg, trongGv, trongTg, cho = []) => {
    const bd = new Date(batDauIso);
    const kt = new Date(bd.getTime() + soGio * 3600000);
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten: `Bài ${thuTu}`, bat_dau: bd.toISOString(), ket_thuc: kt.toISOString() } });
    const daChon = new Set();
    const giao = [];
    for (let i = 0; i < ganGv; i++) { const u = chonCoTrongSo(rng, GV, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "giang_vien"]); } }
    for (let i = 0; i < ganTg; i++) { const u = chonCoTrongSo(rng, TG, daChon); if (u) { daChon.add(u.key); giao.push([u.key, "tro_giang"]); } }
    const viTri = { giang_vien: 0, tro_giang: 0 };
    const dong = giao.map(([key, vt]) => ({ bai_id: bai.id, vai_tro: vt, vi_tri: ++viTri[vt], trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] }));
    for (let i = 0; i < trongGv; i++) dong.push({ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: ++viTri.giang_vien, trang_thai: "trong", nguoi_phan_cong: null });
    for (let i = 0; i < trongTg; i++) dong.push({ bai_id: bai.id, vai_tro: "tro_giang", vi_tri: ++viTri.tro_giang, trang_thai: "trong", nguoi_phan_cong: null });
    if (dong.length) await rest("slot_giang_day", { method: "POST", body: dong });
    if (cho.length) await rest("dang_ky_giang_day", { method: "POST", body: cho.map(([key, vt, loai]) => ({ bai_id: bai.id, vai_tro: vt, user_id: id[key], trang_thai: "cho_xu_ly", loai })) });
    return bai;
  };

  // --- Đang diễn ra: 1 Bài đã dạy hôm qua + 1 Bài hôm nay (vài giờ nữa, gán HERO) — nhóm "Hôm nay" ở Lịch dạy sắp tới ---
  const lDienRa = await taoLop(3, "co_kinh_phi", false, "dang_mo", -2, 5, { nhom: TAT_CA_NHOM });
  await taoBaiDayXong(lDienRa, 1, moc(cong(hom, -1), 8), 3, 1, 2);
  await taoBaiSapToi(lDienRa, 2, gioTuGio(3), 2, 0, 0, 1, 1, [[HERO, "giang_vien", "tu_dang_ky"]]);
  // g/TG khác được duyệt sẵn cho vai TG của Bài hôm nay, còn HERO đăng ký GV đang chờ Admin duyệt — test "Việc cần duyệt"
  await taoBaiSapToi(lDienRa, 3, moc(cong(hom, 1), 8), 3, 1, 1, 0, 1);

  // --- Đang mở, còn thiếu người (ngày mai) — 1 đăng ký tự do + 1 lời mời đang chờ (2 người KHÁC nhau) ---
  const lNgayMai = await taoLop(4, "co_kinh_phi", false, "dang_mo", 1, 2, { nhom: TAT_CA_NHOM });
  const daChonNgayMai = new Set();
  const ungTu = chonCoTrongSo(rng, TG, daChonNgayMai);
  daChonNgayMai.add(ungTu.key);
  const ungMoi = chonCoTrongSo(rng, TG, daChonNgayMai);
  await taoBaiSapToi(lNgayMai, 1, moc(cong(hom, 1), 8), 3, 1, 0, 0, 2, [
    [ungTu.key, "tro_giang", "tu_dang_ky"],
    [ungMoi.key, "tro_giang", "duoc_moi"],
  ]);

  // --- Đang mở, nửa chừng (trong tuần) ---
  const lNuaChung = await taoLop(0, "co_kinh_phi", false, "dang_mo", 4, 5, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lNuaChung, 1, moc(cong(hom, 4), 8), 3, 1, 1, 0, 1);

  // --- Mời HERO (đang chờ HERO phản hồi) — để badge "đang chờ" trên Lịch dạy sắp tới > 0 ---
  const lMoiHero = await taoLop(1, "co_kinh_phi", false, "dang_mo", 6, 6, { nhom: TAT_CA_NHOM });
  await taoBaiSapToi(lMoiHero, 1, moc(cong(hom, 6), 8), 2, 0, 0, 1, 0, [[HERO, "giang_vien", "duoc_moi"]]);

  // --- Đã đủ đăng ký (tuần này) — thêm 1 mốc cho HERO ở "Tuần này" ---
  const lDuDk = await taoLop(2, "co_kinh_phi", false, "dang_mo", 5, 5, {}, );
  await taoBaiSapToi(lDuDk, 1, moc(cong(hom, 5), 13), 2, 1, 1, 0, 0);
  await rest("slot_giang_day?bai_id=eq." + (await rest(`bai_hoc?select=id&lop_id=eq.${lDuDk.id}`))[0].id + "&vai_tro=eq.giang_vien", { method: "PATCH", body: { nguoi_phan_cong: id[HERO] } });

  // --- Cảnh báo pool nhỏ: yêu cầu chứng chỉ hiếm (chỉ u15 có) + nhóm tg_bac_si, slot TG còn trống ---
  const lPool = await taoLop(1, "co_kinh_phi", false, "dang_mo", 9, 9, { nhom: ["tg_bac_si"], cc: cc.id });
  await taoBaiSapToi(lPool, 1, moc(cong(hom, 9), 8), 3, 0, 0, 0, 1);

  // --- Dự kiến (chỉ Admin xem) ---
  const lDuKien = await taoLop(3, "co_kinh_phi", false, "nhap", 25, 26, { congKhaiSom: false });
  await taoBaiSapToi(lDuKien, 1, moc(cong(hom, 25), 8), 3, 0, 0, 1, 1);

  // --- Đã hủy (không tính vào báo cáo) ---
  const lHuy = await taoLop(4, "co_kinh_phi", false, "da_huy", -8, -7);
  await taoBaiDayXong(lHuy, 1, moc(cong(hom, -8), 8), 3, 1, 1);

  console.log("Đã tạo xong các lớp tình huống hiện tại (đang diễn ra, đang mở, mời HERO, đã đủ đăng ký, cảnh báo pool, dự kiến, đã hủy).");

  // 5. Đề xuất nhân sự — đủ loại × trạng thái, vài cái vừa tạo (created_at = hôm nay) cho "Việc cần duyệt" của Tổng quan
  const NGUOI_DX = NHAN_SU.filter((n) => n.trongSo > 0);
  const pick = (i) => id[NGUOI_DX[i % NGUOI_DX.length].key];
  // PostgREST insert nhiều dòng cùng lúc yêu cầu MỌI object cùng bộ khóa — tách riêng dòng "doi_nhom" (có thêm
  // nhom_cu/nhom_moi/ky_id) khỏi các loại đề xuất thường (không có 3 cột đó).
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: [
      { loai: "khen_thuong_nhac_nho", user_id: pick(0), noi_dung: "Demo: khen thưởng dạy đều trong kỳ.", trang_thai: "da_duyet", created_at: "2024-04-15T03:00:00+07:00" },
      { loai: "khen_thuong_nhac_nho", user_id: pick(1), noi_dung: "Demo: nhắc nhở KPI thấp.", trang_thai: "bo_qua", created_at: "2024-04-20T03:00:00+07:00" },
      { loai: "dao_tao", user_id: pick(2), noi_dung: "Demo: cử đào tạo bồi dưỡng chuyên môn.", trang_thai: "da_duyet", created_at: "2024-05-02T03:00:00+07:00" },
      { loai: "phan_cong", user_id: pick(3), noi_dung: "Demo: tăng phân công lớp.", trang_thai: "da_duyet", created_at: "2024-05-10T03:00:00+07:00" },
      { loai: "khen_thuong_nhac_nho", user_id: pick(4), noi_dung: "Demo: khen thưởng dạy đều tuần này.", trang_thai: "cho_duyet", created_at: new Date().toISOString() },
      { loai: "dao_tao", user_id: pick(5), noi_dung: "Demo: cử đào tạo bồi dưỡng.", trang_thai: "cho_duyet", created_at: new Date().toISOString() },
    ],
  });
  await rest("de_xuat_nhan_su", {
    method: "POST",
    body: [{ loai: "doi_nhom", user_id: id.u15, noi_dung: "Demo: đạt KPI cao liên tục — đề xuất thăng lên Giảng viên.", nhom_cu: "tg_bac_si", nhom_moi: "gv_bac_si", ky_id: k1, trang_thai: "da_duyet" }],
  });
  console.log("Đã tạo 7 đề xuất nhân sự (đủ loại/trạng thái).");

  // 6. Thông báo mẫu cho HERO (widget "Thông báo mới nhất" của Tổng quan)
  await rest("thong_bao", {
    method: "POST",
    body: [
      { user_id: id[HERO], loai: "duoc_moi", muc_do: "can_hanh_dong", tieu_de: "Bạn được mời dạy Bài 1", noi_dung: "Vai trò Giảng viên", lien_ket: "/dang-ky", da_doc: false },
      { user_id: id[HERO], loai: "cong_bo_kpi", muc_do: "thong_tin", tieu_de: "KPI kỳ Quý 3/2026 đang cập nhật", noi_dung: "Xem điểm KPI tạm tính của bạn", lien_ket: "/danh-gia", da_doc: true },
    ],
  });

  console.log(`
Xong. ${NHAN_SU.length} tài khoản demo (mật khẩu chung: ${MAT_KHAU}), tên hiển thị như nhân sự thật, email @gd10-full-demo.test.
Đăng nhập ${HERO}${MIEN} (${NHAN_SU.find((n) => n.key === HERO).ho_ten}) để xem Tổng quan/Báo cáo ở vai GV/TG.
Đăng nhập Admin thật để xem đầy đủ: 8 báo cáo (tuần/tháng/quý/năm cho #3,4,5,8; theo kỳ demo 2024 hoặc Quý 3/2026 cho
#1,2,6,7) và Tổng quan (cả 2 bộ widget nếu tài khoản có Quyền Quản lý lớp).
Dọn: node scripts/demo-gd10-full.mjs xoa`);
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
  const lop = await rest(`lop_hoc_tong_hop?select=ten,trang_thai_hien_thi,gv_tong,gv_da_phan_cong,tg_tong,tg_da_phan_cong&dia_diem=eq.${enc(DIA_DIEM)}&order=ten`);
  console.log(`${lop.length} lớp demo:`);
  for (const l of lop) console.log(`   ${l.ten} [${l.trang_thai_hien_thi}] GV ${l.gv_da_phan_cong}/${l.gv_tong} · TG ${l.tg_da_phan_cong}/${l.tg_tong}`);

  const rpc = await dangNhap(`${HERO}${MIEN}`);
  const pool = await rpc("bc_canh_bao_pool");
  console.log("Cảnh báo pool:", Array.isArray(pool) ? pool.filter((p) => (p.lop_ten ?? "").match(/-\d{3}$/)).map((p) => `${p.lop_ten} [${p.vai_tro}] ${p.so_ung_vien} người`) : pool);
  const hom = homNayVN();
  const nam = await rpc("bc_san_luong", { p_tu: cong(hom, -365), p_den: cong(hom, 30) });
  console.log(`Sản lượng (năm gần nhất): ${Array.isArray(nam) ? nam.filter((r) => r.gio_thuc > 0).length : "?"} người có giờ dạy / ${Array.isArray(nam) ? nam.length : "?"} tổng.`);
  const xh = await rpc("bc_kpi_theo_ky", { p_gioi_han: 6 });
  console.log("Xu hướng KPI (6 kỳ gần nhất):", Array.isArray(xh) ? xh.map((r) => `${r.ten}: TB=${r.kpi_tb ?? "–"} (${r.so_nguoi} người)`) : xh);
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
  const lop = await rest(`lop_hoc?select=id&dia_diem=eq.${enc(DIA_DIEM)}`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);
  for (const u of users) await authAdmin(`users/${u.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
  await rest(`danh_muc_loai_chung_chi?ten=like.${enc(TIEN_TO_CC)}*`, { method: "DELETE" });
  console.log("Đã xóa chứng chỉ demo.");
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-gd10-full.mjs tao | xoa | kiemtra");
