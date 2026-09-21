// Tạo / xóa dữ liệu DEMO để test tay Giai đoạn 8 (Thông báo) và Giai đoạn 9 (Nhật ký hệ thống).
// Chạy: node scripts/demo-gd89.mjs tao | xoa | kiemtra
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Khác demo Giai đoạn 7: các thao tác mẫu (mời dạy, đăng ký, duyệt, từ chối, tự duyệt, gán quyền, tạo đề xuất) được thực hiện THẬT bằng cách
// đăng nhập từng tài khoản demo và gọi đúng các hàm của hệ thống — nên sinh ra thông báo và nhật ký y như dùng thật.
// Nhận biết dữ liệu demo: email @gd89-demo.test, họ tên bắt đầu "GD89 ", lớp bắt đầu "Demo GD89 - ".
// LƯU Ý khi xóa: bảng nhật ký chỉ-thêm nên KHÔNG xóa được qua script — sau "xoa" hãy chạy supabase/tests/xoa_demo_gd89.sql trong SQL Editor để dọn nhật ký.
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
if (!URL_ || !KEY || !ANON) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SUPABASE_SERVICE_ROLE_KEY trong .env.local");

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const MAT_KHAU = "Demo@2026!";
const TIEN_TO_LOP = "Demo GD89 - ";
const MIEN = "@gd89-demo.test";
const enc = (s) => encodeURIComponent(s);

async function rest(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
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

// Đăng nhập tài khoản demo -> trả về công cụ gọi hàm (rpc) và đọc bảng (chon) dưới quyền của chính người đó
async function dangNhap(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: MAT_KHAU }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Đăng nhập demo lỗi: " + email);
  const Hu = { apikey: ANON, Authorization: `Bearer ${j.access_token}`, "Content-Type": "application/json" };
  return {
    rpc: async (fn, args) => {
      const x = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: Hu, body: JSON.stringify(args ?? {}) });
      const t = await x.text();
      const d = t ? JSON.parse(t) : null;
      if (!x.ok) throw new Error(`rpc ${fn} (${email}) -> ${x.status} ${t.slice(0, 200)}`);
      return d;
    },
    chon: async (path) => {
      const x = await fetch(`${URL_}/rest/v1/${path}`, { headers: Hu });
      return x.json();
    },
  };
}

const NHAN_SU = [
  { key: "ad", ho_ten: "GD89 Admin (có hồ sơ giảng viên)", nhom: "gv_bac_si", admin: true, ghi: "Admin: thực hiện các thao tác mẫu; thử tự duyệt đăng ký của chính mình" },
  { key: "qt", ho_ten: "GD89 Quản lý lớp", nhom: null, ghi: "Người giữ Quyền Quản lý lớp (được gán qua hàm thật => có thông báo + nhật ký); thấy toàn bộ nhật ký" },
  { key: "g1", ho_ten: "GD89 GV1 (bác sĩ)", nhom: "gv_bac_si", ghi: "Có lời mời dạy chờ trả lời + Bài sắp bắt đầu sau ~75 phút (thử bật push rồi chờ nhắc check-in)" },
  { key: "g2", ho_ten: "GD89 GV2 (bác sĩ)", nhom: "gv_bac_si", ghi: "Có Bài sắp bắt đầu sau ~20 phút (nhắc check-in tới ngay, banner check-in) + 1 đăng ký đang chờ duyệt" },
  { key: "t1", ho_ten: "GD89 TG1 (bác sĩ)", nhom: "tg_bac_si", ghi: "Đăng ký đã được Admin duyệt (có thông báo được duyệt)" },
  { key: "t2", ho_ten: "GD89 TG2 (bác sĩ)", nhom: "tg_bac_si", ghi: "Đăng ký đã bị Admin từ chối kèm lý do (có thông báo bị từ chối)" },
];

const iso = (phut) => new Date(Date.now() + phut * 60000).toISOString();
const homNayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const p2 = (n) => String(n).padStart(2, "0");
function cong(ngayIso, soNgay) {
  const d = new Date(`${ngayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
const moc = (ngayIso, gio) => `${ngayIso}T${p2(gio)}:00:00+07:00`;

async function tao() {
  if ((await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`)).length > 0) {
    console.log("Đã có dữ liệu demo — chạy 'xoa' rồi 'tao' nếu muốn làm mới.");
    return;
  }

  // 1. Tài khoản + nhóm (chèn trực tiếp: chưa có người đăng nhập nên không ghi nhật ký)
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const id = {};
  for (const n of NHAN_SU) {
    const email = `${n.key}${MIEN}`;
    let uid = co.get(email);
    if (!uid) {
      uid = (await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } } })).id;
      console.log("  + tài khoản", email);
    }
    id[n.key] = uid;
    if (n.nhom) await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    if (n.admin) await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { phan_quyen: "admin" } });
  }

  // 2. Lớp + Bài (chèn trực tiếp)
  const [nhomLop] = await rest("danh_muc_nhom_lop?select=id&limit=1");
  const hom = homNayVN();
  const taoLop = async (ten, trangThai, tu, den) => {
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten}`, nhom_lop_id: nhomLop.id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: "co_kinh_phi", ngay_bat_dau: tu, ngay_ket_thuc: den, dia_diem: "Demo GD89", trang_thai: trangThai },
    });
    await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: [{ lop_id: lop.id, nhom: "gv_bac_si" }, { lop_id: lop.id, nhom: "tg_bac_si" }] });
    return lop;
  };
  const taoBai = async (lop, thuTu, ten, batDau, ketThuc, { gv = 0, tg = 0, giao = [] }) => {
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten, bat_dau: batDau, ket_thuc: ketThuc } });
    const slots = [];
    for (let i = 1; i <= gv; i++) slots.push({ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: i });
    for (let i = 1; i <= tg; i++) slots.push({ bai_id: bai.id, vai_tro: "tro_giang", vi_tri: i });
    const dong = await rest("slot_giang_day", { method: "POST", prefer: "return=representation", body: slots });
    // Giao thẳng người vào slot (giữ trạng thái "Đã phân công" hợp lệ)
    for (const [key, vaiTro] of giao) {
      const s = dong.find((x) => x.vai_tro === vaiTro && !x.nguoi_phan_cong);
      await rest(`slot_giang_day?id=eq.${s.id}`, { method: "PATCH", body: { trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] } });
      s.nguoi_phan_cong = id[key];
    }
    return bai;
  };

  const lopA = await taoLop("Lớp thử thông báo", "dang_mo", cong(hom, -1), cong(hom, 6));
  // Nhắc check-in: g2 còn ~20 phút (nhắc tới trong ~1 phút), g1 còn ~75 phút (nhắc lúc còn 30 phút — kịp bật push trước)
  const bA1b = await taoBai(lopA, 1, "Bài 1 - Sắp bắt đầu (~20 phút)", iso(20), iso(140), { gv: 1, giao: [["g2", "giang_vien"]] });
  const bA1 = await taoBai(lopA, 2, "Bài 2 - Bắt đầu sau ~75 phút", iso(75), iso(195), { gv: 1, giao: [["g1", "giang_vien"]] });
  const bA2 = await taoBai(lopA, 3, "Bài 3 - Còn trống (đăng ký)", iso(60 * 24 * 2), iso(60 * 24 * 2 + 120), { gv: 1, tg: 1 });
  const bA3 = await taoBai(lopA, 4, "Bài 4 - Còn trống (mời dạy)", iso(60 * 24 * 3), iso(60 * 24 * 3 + 120), { gv: 1 });
  const bA4 = await taoBai(lopA, 5, "Bài 5 - Đã phân công g2 (thử đổi lịch / hủy phân công)", iso(60 * 24 * 4), iso(60 * 24 * 4 + 120), { gv: 1, giao: [["g2", "giang_vien"]] });
  const bA5 = await taoBai(lopA, 6, "Bài 6 - Còn trống (duyệt/từ chối/tự duyệt)", iso(60 * 24 * 5), iso(60 * 24 * 5 + 120), { gv: 1, tg: 1 });

  const lopB = await taoLop("Lớp Nháp (thử mở đăng ký)", "nhap", cong(hom, 3), cong(hom, 10));
  await taoBai(lopB, 1, "Bài 1", iso(60 * 24 * 6), iso(60 * 24 * 6 + 120), { gv: 1, tg: 1 });
  await taoBai(lopB, 2, "Bài 2", iso(60 * 24 * 7), iso(60 * 24 * 7 + 120), { gv: 1 });

  const lopC = await taoLop("Lớp đã diễn ra (thử chỉnh điểm danh)", "dang_mo", cong(hom, -3), cong(hom, 1));
  await taoBai(lopC, 1, "Bài 1 - Hôm qua (chưa check-in)", moc(cong(hom, -1), 8), moc(cong(hom, -1), 11), { gv: 1, giao: [["g1", "giang_vien"]] });

  // 3. Các thao tác mẫu THẬT dưới quyền từng người => có thông báo + nhật ký
  const ad = await dangNhap(`ad${MIEN}`);
  const g2 = await dangNhap(`g2${MIEN}`);
  const t1 = await dangNhap(`t1${MIEN}`);
  const t2 = await dangNhap(`t2${MIEN}`);
  const idDangKy = async (key, bai) => (await rest(`dang_ky_giang_day?select=id&user_id=eq.${id[key]}&bai_id=eq.${bai.id}&trang_thai=eq.cho_xu_ly`))[0]?.id;

  await ad.rpc("gan_quyen_quan_ly_lop", { p_user: id.qt, p_co: true });
  console.log("  • Admin gán Quyền Quản lý lớp cho qt  → qt có thông báo; nhật ký 'Quyền Quản lý lớp'");
  await ad.rpc("moi_giang_day", { p_bai: bA3.id, p_vai: "giang_vien", p_user: id.g1 });
  console.log("  • Admin mời g1 dạy Bài 4  → g1 có thông báo 'cần hành động'; nhật ký 'Mời dạy'");
  await g2.rpc("dang_ky_bai", { p_bai_ids: [bA2.id] });
  console.log("  • g2 đăng ký Bài 3 (chờ duyệt)  → Admin/qt có thông báo 'đăng ký cần duyệt'");
  await t1.rpc("dang_ky_bai", { p_bai_ids: [bA2.id] });
  await ad.rpc("duyet_dang_ky", { p_id: await idDangKy("t1", bA2), p_xac_nhan: true });
  console.log("  • t1 đăng ký Bài 3 rồi Admin duyệt  → t1 có thông báo 'được duyệt'; nhật ký 'Duyệt đăng ký'");
  await t2.rpc("dang_ky_bai", { p_bai_ids: [bA5.id] });
  await ad.rpc("tu_choi_dang_ky", { p_id: await idDangKy("t2", bA5), p_ly_do: "Demo: trùng lịch dạy khác" });
  console.log("  • t2 đăng ký Bài 6 rồi Admin từ chối  → t2 có thông báo 'bị từ chối' kèm lý do; nhật ký 'Từ chối đăng ký'");
  await ad.rpc("dang_ky_bai", { p_bai_ids: [bA5.id] });
  await ad.rpc("duyet_dang_ky", { p_id: await idDangKy("ad", bA5), p_xac_nhan: true });
  console.log("  • Admin tự đăng ký Bài 6 rồi tự duyệt  → nhật ký có nhãn 'Tự duyệt' (Admin không nhận thông báo về việc của chính mình)");
  await ad.rpc("tao_de_xuat", { p_loai: "khen_thuong_nhac_nho", p_user: id.g1, p_noi_dung: "Demo GD89: đề xuất khen thưởng thử" });
  console.log("  • Admin tạo đề xuất khen thưởng  → qt có thông báo 'đề xuất cần duyệt'; nhật ký 'Tạo đề xuất'");
  void bA1; void bA1b; void bA4;

  console.log("\nĐã tạo xong. Tài khoản demo (mật khẩu chung: " + MAT_KHAU + "):");
  for (const n of NHAN_SU) console.log(`  ${(n.key + MIEN).padEnd(26)} ${n.ho_ten}\n      → ${n.ghi}`);
  console.log(`
Gợi ý kịch bản test (đăng nhập bằng trình duyệt; dùng cửa sổ ẩn danh cho tài khoản thứ hai):
 THÔNG BÁO (Giai đoạn 8)
  1. g1@… → chuông có "Bạn được mời dạy" (viền thanh gradient, nhãn "Cần hành động"). Bấm → vào lớp → Đồng ý/Từ chối → thông báo tự chuyển đã đọc; nếu Từ chối, Admin nhận "Lời mời bị từ chối".
  2. g2@… → chuông có "Sắp đến giờ dạy — nhớ check-in" (job chạy mỗi phút, chờ tối đa ~1-2 phút sau khi tạo) + banner check-in ở Trang chủ. Bấm "Tôi đã có mặt" → thông báo nhắc tự đã đọc.
  3. t1@… → "Đăng ký được duyệt"; t2@… → "Đăng ký bị từ chối" có lý do.
  4. Admin thật (hoặc ad@…/qt@…) → "Đăng ký cần duyệt" (g2 đăng ký Bài 3) và "Đề xuất nhân sự cần duyệt". Duyệt/từ chối g2 → thông báo cần duyệt tự đã đọc, g2 nhận kết quả.
  5. Đổi lịch / hủy phân công: Admin sửa giờ "Bài 5" (g2 được phân công) → g2 nhận "Bài đã đổi lịch"; hủy phân công → g2 nhận "Phân công đã bị hủy". Chỉ đổi tên Bài thì KHÔNG có thông báo.
  6. Lớp Nháp → "Mở đăng ký": g1, g2, t1, t2 (đủ điều kiện) nhận "Lớp mới mở đăng ký"; thêm Bài vào lớp đang mở → "Lớp có Bài mới" (gộp, không dồn dập).
  7. /thong-bao → "Tùy chọn thông báo": tắt "Lớp / Bài mới phù hợp" cho g1 rồi mở đăng ký lớp Nháp → g1 không nhận, người khác vẫn nhận. Loại bắt buộc (nhắc check-in...) không có công tắc.
  8. Web Push: g1@… mở /thong-bao trên điện thoại/máy tính → "Bật thông báo đẩy". Bài 2 của g1 bắt đầu sau ~75 phút => đúng lúc còn 30 phút sẽ có push "Sắp đến giờ dạy". Thử thêm: Admin hủy phân công/mời g1 khi g1 đã bật push.
  9. Lớp "Lớp đã diễn ra" → Bài 1 hôm qua (g1 chưa check-in): Admin chỉnh điểm danh (bắt buộc lý do) → g1 nhận "Điểm danh của bạn đã được chỉnh sửa".
 NHẬT KÝ (Giai đoạn 9)
  10. Admin/qt → /nhat-ky: đã có sẵn các dòng: Quyền Quản lý lớp, Mời dạy, Duyệt/Từ chối đăng ký, Duyệt (nhãn "Tự duyệt"), Tạo đề xuất. Bấm "Xem thay đổi" để xem trước → sau. Thử lọc theo loại/ngày/từ khóa, nút "Xuất Excel".
  11. Làm thêm rồi xem log: đổi giờ Bài, hủy phân công, chỉnh điểm danh, đổi cấu hình (Cấu hình KPI), tạo/xóa lớp Nháp, thêm/sửa/xóa Bài, thêm chứng chỉ cho g1 từ hồ sơ.
  12. g1@… → /nhat-ky: chỉ thấy dòng liên quan mình (mời dạy, chỉnh điểm danh, đề xuất khen thưởng không hiện vì admin-only...). Không có nút "Xuất Excel". Không thấy dòng đổi cấu hình/đổi nhóm.
  13. Thử đổi nhóm của g1 trong hồ sơ (Admin) → chỉ Admin/qt thấy dòng "Đổi nhóm"; g1 không thấy.
Dọn dẹp: node scripts/demo-gd89.mjs xoa  rồi chạy supabase/tests/xoa_demo_gd89.sql trong SQL Editor (xóa nhật ký demo).`);
}

// Kịch bản riêng để test 2 tính năng gộp thông báo (8c): "đăng ký cần duyệt" gộp theo lớp và nhắc check-in gộp các Bài liền nhau.
// Dùng lại (hoặc tạo nếu thiếu) 6 tài khoản demo; có thể chạy lại nhiều lần — mỗi lần tạo thêm 2 lớp mới với giờ tính theo lúc chạy lệnh.
async function gop() {
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const id = {};
  for (const n of NHAN_SU) {
    const email = `${n.key}${MIEN}`;
    let uid = co.get(email);
    if (!uid) {
      uid = (await authAdmin("users", { method: "POST", body: { email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } } })).id;
      console.log("  + tài khoản", email);
      if (n.nhom) await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: uid, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
      if (n.admin) await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { phan_quyen: "admin" } });
      if (n.key === "qt") await rest(`profiles?id=eq.${uid}`, { method: "PATCH", body: { co_quyen_quan_ly_lop: true } });
    }
    id[n.key] = uid;
  }

  const [nhomLop] = await rest("danh_muc_nhom_lop?select=id&limit=1");
  const hom = homNayVN();
  const gio = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).replace(":", "");
  const taoLop = async (ten, trangThai) => {
    const [lop] = await rest("lop_hoc", {
      method: "POST",
      prefer: "return=representation",
      body: { ten: `${TIEN_TO_LOP}${ten} ${gio}`, nhom_lop_id: nhomLop.id, doi_tuong: "nhan_vien_y_te", loai_kinh_phi: "co_kinh_phi", ngay_bat_dau: cong(hom, -1), ngay_ket_thuc: cong(hom, 8), dia_diem: "Demo GD89", trang_thai: trangThai },
    });
    await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: [{ lop_id: lop.id, nhom: "gv_bac_si" }, { lop_id: lop.id, nhom: "tg_bac_si" }] });
    return lop;
  };
  const taoBai = async (lop, thuTu, ten, batDau, ketThuc, { gv = 0, tg = 0, giao = [] }) => {
    const [bai] = await rest("bai_hoc", { method: "POST", prefer: "return=representation", body: { lop_id: lop.id, thu_tu: thuTu, ten, bat_dau: batDau, ket_thuc: ketThuc } });
    const slots = [];
    for (let i = 1; i <= gv; i++) slots.push({ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: i });
    for (let i = 1; i <= tg; i++) slots.push({ bai_id: bai.id, vai_tro: "tro_giang", vi_tri: i });
    const dong = await rest("slot_giang_day", { method: "POST", prefer: "return=representation", body: slots });
    for (const [key, vaiTro] of giao) {
      const s = dong.find((x) => x.vai_tro === vaiTro && !x.nguoi_phan_cong);
      await rest(`slot_giang_day?id=eq.${s.id}`, { method: "PATCH", body: { trang_thai: "da_phan_cong", nguoi_phan_cong: id[key] } });
      s.nguoi_phan_cong = id[key];
    }
    return bai;
  };

  // --- B: đăng ký gộp theo lớp ---
  const lopD = await taoLop("Lớp thử gộp đăng ký", "dang_mo");
  const d = [];
  for (let i = 1; i <= 4; i++) d.push(await taoBai(lopD, i, `Bài ${i}`, iso(60 * 24 * (i + 9)), iso(60 * 24 * (i + 9) + 120), { gv: 1, tg: 1 }));
  const g1 = await dangNhap(`g1${MIEN}`);
  const g2 = await dangNhap(`g2${MIEN}`);
  const t1 = await dangNhap(`t1${MIEN}`);
  const t2 = await dangNhap(`t2${MIEN}`);
  await g1.rpc("dang_ky_bai", { p_bai_ids: [d[0].id, d[1].id] });
  await g2.rpc("dang_ky_bai", { p_bai_ids: [d[2].id] });
  await t1.rpc("dang_ky_bai", { p_bai_ids: [d[0].id, d[3].id] });
  await t2.rpc("dang_ky_bai", { p_bai_ids: [d[1].id] });
  console.log(`  • Lớp "${lopD.ten}": g1 đăng ký 2 Bài, g2 1 Bài, t1 2 Bài, t2 1 Bài (tổng 4 người / 6 lượt) — Admin/qt chỉ có 1 thông báo gộp cho lớp`);

  // --- D: nhắc check-in gộp ---
  const lopN = await taoLop("Lớp thử nhắc check-in gộp", "dang_mo");
  // g1: K1 (+35 phút, 30 phút) và K2 (+80 phút, nghỉ 15 phút) liền nhau => 1 nhắc chung; K3 sau 9 giờ => nhắc riêng lúc còn 30 phút
  await taoBai(lopN, 1, "K1 - Bài đầu (g1)", iso(35), iso(65), { gv: 1, giao: [["g1", "giang_vien"]] });
  await taoBai(lopN, 2, "K2 - Bài liền sau K1 (g1)", iso(80), iso(110), { gv: 1, giao: [["g1", "giang_vien"]] });
  await taoBai(lopN, 3, "K3 - Bài xa 9 giờ sau (g1)", iso(9 * 60), iso(9 * 60 + 60), { gv: 1, giao: [["g1", "giang_vien"]] });
  // g2: L1 (+45 phút) một mình; L2 sau 8 giờ
  await taoBai(lopN, 4, "L1 - Bài đơn (g2)", iso(45), iso(90), { gv: 1, giao: [["g2", "giang_vien"]] });
  await taoBai(lopN, 5, "L2 - Bài xa 8 giờ sau (g2)", iso(8 * 60), iso(8 * 60 + 60), { gv: 1, giao: [["g2", "giang_vien"]] });
  console.log(`  • Lớp "${lopN.ten}": g1 có K1+K2 liền nhau và K3 xa; g2 có L1 đơn và L2 xa`);
  console.log(`
KỊCH BẢN TEST GỘP THÔNG BÁO (giờ tính từ lúc chạy lệnh; job nhắc chạy mỗi phút):
 B — Đăng ký gộp theo lớp
  1. Đăng nhập Admin thật (hoặc ad@ / qt@) → chuông có ĐÚNG 1 thông báo "Đăng ký cần duyệt" cho lớp "Lớp thử gộp đăng ký": "4 người đăng ký (6 lượt Bài) đang chờ duyệt — lớp …: GD89 GV1…, GD89 GV2…, GD89 TG1…, và 1 người khác".
  2. Mở lớp → duyệt hoặc từ chối một vài đăng ký → quay lại chuông: số trong thông báo GIẢM tương ứng, vẫn chưa đọc.
  3. Xử lý hết → thông báo tự chuyển ĐÃ ĐỌC. Sau đó đăng nhập g2@ (cửa sổ ẩn danh) đăng ký thêm 1 Bài còn trống của lớp → Admin có thêm 1 thông báo MỚI (chưa đọc).
 D — Nhắc check-in gộp
  4. Sau khoảng 5-6 phút, g1@ nhận 1 thông báo "Sắp đến giờ dạy — 2 Bài liên tiếp, nhớ check-in" liệt kê K1 và K2 (KHÔNG có K3). g2@ nhận nhắc riêng cho L1 (tiêu đề "Sắp đến giờ dạy — nhớ check-in"), khoảng 15 phút sau khi tạo.
  5. g1 vào Trang chủ → banner check-in: check-in K1 → thông báo gộp VẪN CHƯA ĐỌC (còn K2). Đợi tới khi K2 vào khung check-in (~35 phút sau khi tạo) rồi check-in K2 → thông báo tự ĐÃ ĐỌC.
  6. K3 (g1) và L2 (g2) đến hạn sau ~8,5 giờ nên không có nhắc lúc này (đúng: Bài xa không bị nhắc gộp nhầm).
Dọn: node scripts/demo-gd89.mjs xoa  (rồi chạy supabase/tests/xoa_demo_gd89.sql để dọn nhật ký).`);
}

async function kiemTra() {
  const users = await tatCaUsers();
  for (const n of NHAN_SU) {
    const u = users.find((x) => x.email === `${n.key}${MIEN}`);
    if (!u) {
      console.log(`${n.key}: chưa có tài khoản`);
      continue;
    }
    const s = await dangNhap(`${n.key}${MIEN}`);
    const tb = await s.chon("thong_bao?select=tieu_de,muc_do,da_doc&order=created_at.desc");
    const nk = await s.chon("audit_log?select=loai&order=created_at.desc&limit=1000");
    const chua = tb.filter((t) => !t.da_doc).length;
    const canHd = tb.filter((t) => !t.da_doc && t.muc_do === "can_hanh_dong").length;
    console.log(`${n.key}: thông báo ${tb.length} (chưa đọc ${chua}, cần hành động ${canHd}) | nhật ký xem được: ${Array.isArray(nk) ? nk.length : "lỗi"}`);
    for (const t of tb.slice(0, 5)) console.log(`     - [${t.da_doc ? "đã đọc" : "chưa đọc"}] ${t.tieu_de}`);
  }
}

async function xoa() {
  const users = (await tatCaUsers()).filter((u) => (u.email ?? "").endsWith(MIEN));
  const ids = users.map((u) => u.id);
  // Thông báo của người khác (Admin thật...) nhắc tới lớp demo
  await rest(`thong_bao?noi_dung=like.${enc("*Demo GD89*")}`, { method: "DELETE" });
  if (ids.length) await rest(`de_xuat_nhan_su?user_id=in.(${ids.join(",")})`, { method: "DELETE" });
  const lop = await rest(`lop_hoc?select=id&ten=like.${enc(TIEN_TO_LOP)}*`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);
  for (const u of users) {
    await authAdmin(`users/${u.id}`, { method: "DELETE" });
    console.log("  - đã xóa", u.email);
  }
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
  console.log("Nhớ chạy supabase/tests/xoa_demo_gd89.sql trong SQL Editor để dọn nhật ký demo (bảng nhật ký chỉ-thêm nên script không xóa được).");
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else if (lenh === "gop") await gop();
else if (lenh === "kiemtra") await kiemTra();
else console.log("Dùng: node scripts/demo-gd89.mjs tao | gop | xoa | kiemtra");
