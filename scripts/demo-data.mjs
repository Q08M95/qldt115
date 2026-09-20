// Tạo / xóa dữ liệu DEMO để test tay (nhân sự thử, lớp thử). Chạy: node scripts/demo-data.mjs tao | xoa
// Dùng SUPABASE_SERVICE_ROLE_KEY trong .env.local (chỉ chạy trên máy bạn, không bao giờ đưa lên trình duyệt/commit).
// Dữ liệu demo nhận biết bằng: email @qldt.test và tên lớp bắt đầu bằng "Demo - ". Lệnh "xoa" chỉ xóa đúng các thứ đó.
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
const TIEN_TO_LOP = "Demo - ";

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

async function tatCaUsers() {
  const res = await authAdmin("users?per_page=1000");
  return res.users ?? [];
}

// ---------- Nhân sự demo ----------
const NHAN_SU = [
  { email: "gv1@qldt.test", ho_ten: "Demo GV Một (bác sĩ)", nhom: "gv_bac_si", cc: true },
  { email: "gv2@qldt.test", ho_ten: "Demo GV Hai (bác sĩ)", nhom: "gv_bac_si", cc: true },
  { email: "gv3@qldt.test", ho_ten: "Demo GV Ba (không bác sĩ)", nhom: "gv_khong_bac_si", cc: true },
  { email: "tg1@qldt.test", ho_ten: "Demo TG Một (bác sĩ)", nhom: "tg_bac_si", cc: true },
  { email: "tg2@qldt.test", ho_ten: "Demo TG Hai (bác sĩ)", nhom: "tg_bac_si", cc: true },
  { email: "tg3@qldt.test", ho_ten: "Demo TG Ba (thiếu chứng chỉ)", nhom: "tg_bac_si", cc: false },
];

// Mốc thời gian theo giờ Việt Nam: today + ngày, giờ:phút
function moc(ngay, gio, phut = 0) {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + ngay * 86400000); // "giờ VN" biểu diễn trong UTC
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(gio)}:${p(phut)}:00+07:00`;
}
const ngayVN = (ngay) => moc(ngay, 0).slice(0, 10);

async function tao() {
  // 1. Tài khoản
  const co = new Map((await tatCaUsers()).map((u) => [u.email, u.id]));
  const idBy = {};
  for (const n of NHAN_SU) {
    let id = co.get(n.email);
    if (!id) {
      const u = await authAdmin("users", {
        method: "POST",
        body: { email: n.email, password: MAT_KHAU, email_confirm: true, user_metadata: { ho_ten: n.ho_ten } },
      });
      id = u.id;
      console.log("  + tài khoản", n.email);
    } else console.log("  = đã có", n.email);
    idBy[n.email] = id;
  }

  // 2. Nhóm + chứng chỉ
  const dmCc = await rest("danh_muc_loai_chung_chi?select=id,ten&order=thu_tu");
  const acls = dmCc.find((x) => /acls/i.test(x.ten)) ?? dmCc[0];
  for (const n of NHAN_SU) {
    const id = idBy[n.email];
    await rest("nhan_su_nhom?on_conflict=user_id", { method: "POST", body: { user_id: id, nhom: n.nhom }, prefer: "resolution=merge-duplicates" });
    const daCo = await rest(`chung_chi?select=id&user_id=eq.${id}&loai_id=eq.${acls.id}`);
    if (n.cc && daCo.length === 0) {
      await rest("chung_chi", { method: "POST", body: { user_id: id, loai_id: acls.id, so_chung_chi: "DEMO-001", noi_dung: "Chứng chỉ demo" } });
    }
  }

  // 3. Lớp demo
  const dmNhomLop = await rest("danh_muc_nhom_lop?select=id,ten&order=thu_tu");
  const nhomLop = (ten) => (dmNhomLop.find((x) => x.ten.toUpperCase() === ten) ?? dmNhomLop[0]).id;
  const daCoLop = await rest(`lop_hoc?select=id,ten&ten=like.${encodeURIComponent(TIEN_TO_LOP)}*`);
  if (daCoLop.length > 0) {
    console.log("Đã có lớp demo, bỏ qua bước tạo lớp (chạy 'xoa' rồi 'tao' nếu muốn làm mới).");
    return inThongTin();
  }

  async function taoLop(lop, nhom, ccIds, baiList) {
    const [row] = await rest("lop_hoc", { method: "POST", body: lop, prefer: "return=representation" });
    await rest("lop_hoc_nhom_du_dieu_kien", { method: "POST", body: nhom.map((g) => ({ lop_id: row.id, nhom: g })) });
    if (ccIds.length) await rest("lop_hoc_chung_chi_yeu_cau", { method: "POST", body: ccIds.map((c) => ({ lop_id: row.id, loai_id: c })) });
    const baiRows = [];
    for (const [i, b] of baiList.entries()) {
      const [bai] = await rest("bai_hoc", {
        method: "POST",
        body: { lop_id: row.id, thu_tu: i + 1, ten: b.ten, bat_dau: b.bat_dau, ket_thuc: b.ket_thuc },
        prefer: "return=representation",
      });
      const slots = [];
      for (let k = 1; k <= b.gv; k++) slots.push({ bai_id: bai.id, vai_tro: "giang_vien", vi_tri: k });
      for (let k = 1; k <= b.tg; k++) slots.push({ bai_id: bai.id, vai_tro: "tro_giang", vi_tri: k });
      const sl = await rest("slot_giang_day", { method: "POST", body: slots, prefer: "return=representation" });
      baiRows.push({ bai, slots: sl });
    }
    return { lop: row, baiRows };
  }

  // Lớp A: ACLS đang mở đăng ký, yêu cầu chứng chỉ ACLS. Bài 3 cố ý TRÙNG GIỜ Bài 1 để test trùng lịch; 4 Bài GV để test cảnh báo dồn tải.
  await taoLop(
    {
      ten: `${TIEN_TO_LOP}ACLS khóa thử (đang mở đăng ký)`,
      nhom_lop_id: nhomLop("ACLS"),
      doi_tuong: "nhan_vien_y_te",
      loai_kinh_phi: "co_kinh_phi",
      ngay_bat_dau: ngayVN(14),
      ngay_ket_thuc: ngayVN(16),
      dia_diem: "Phòng đào tạo tầng 3",
      trang_thai: "dang_mo",
    },
    ["gv_bac_si", "tg_bac_si"],
    [acls.id],
    [
      { ten: "Bài 1 - Lý thuyết hồi sinh tim phổi", bat_dau: moc(14, 8), ket_thuc: moc(14, 11), gv: 1, tg: 2 },
      { ten: "Bài 2 - Thực hành xử trí loạn nhịp", bat_dau: moc(15, 8), ket_thuc: moc(15, 12), gv: 1, tg: 1 },
      { ten: "Bài 3 - Ca lâm sàng (trùng giờ Bài 1)", bat_dau: moc(14, 9), ket_thuc: moc(14, 10), gv: 1, tg: 0 },
      { ten: "Bài 4 - Đánh giá cuối khóa", bat_dau: moc(16, 8), ket_thuc: moc(16, 11), gv: 1, tg: 0 },
    ],
  );

  // Lớp B: BLS cộng đồng KHÔNG kinh phí, mở cho mọi nhóm; sắp sẵn 2 người để xem thanh tiến độ.
  const B = await taoLop(
    {
      ten: `${TIEN_TO_LOP}BLS cộng đồng (không kinh phí)`,
      nhom_lop_id: nhomLop("BLS"),
      doi_tuong: "cong_dong",
      loai_kinh_phi: "khong_kinh_phi",
      ngay_bat_dau: ngayVN(7),
      ngay_ket_thuc: ngayVN(8),
      dia_diem: "Trường THPT Lê Quý Đôn",
      trang_thai: "dang_mo",
    },
    ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"],
    [],
    [
      { ten: "Bài 1 - Sơ cứu cơ bản", bat_dau: moc(7, 8), ket_thuc: moc(7, 11), gv: 2, tg: 2 },
      { ten: "Bài 2 - Thực hành CPR", bat_dau: moc(8, 8), ket_thuc: moc(8, 11), gv: 1, tg: 1 },
    ],
  );
  const gan = async (slot, email) =>
    rest(`slot_giang_day?id=eq.${slot.id}`, { method: "PATCH", body: { trang_thai: "da_phan_cong", nguoi_phan_cong: idBy[email] } });
  await gan(B.baiRows[0].slots.find((s) => s.vai_tro === "giang_vien" && s.vi_tri === 1), "gv2@qldt.test");
  await gan(B.baiRows[0].slots.find((s) => s.vai_tro === "tro_giang" && s.vi_tri === 1), "tg1@qldt.test");

  // Lớp C: còn Nháp nhưng công khai sớm (GV/TG thấy được, chưa đăng ký được)
  await taoLop(
    {
      ten: `${TIEN_TO_LOP}SCC-LX tháng sau (nháp, công khai sớm)`,
      nhom_lop_id: nhomLop("SCC-LX"),
      doi_tuong: "nhan_vien_y_te",
      loai_kinh_phi: "co_kinh_phi",
      ngay_bat_dau: ngayVN(30),
      ngay_ket_thuc: ngayVN(31),
      dia_diem: "Bệnh viện Đa khoa",
      trang_thai: "nhap",
      cong_khai_som: true,
    },
    ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"],
    [],
    [
      { ten: "Bài 1", bat_dau: moc(30, 8), ket_thuc: moc(30, 11), gv: 1, tg: 1 },
      { ten: "Bài 2", bat_dau: moc(31, 8), ket_thuc: moc(31, 11), gv: 1, tg: 1 },
    ],
  );

  await inThongTin();
}

async function inThongTin() {
  const lop = await rest(`lop_hoc_tong_hop?select=ten,trang_thai_hien_thi,so_bai,gv_tong,gv_da_phan_cong,tg_tong,tg_da_phan_cong&ten=like.${encodeURIComponent(TIEN_TO_LOP)}*&order=ten`);
  console.log("\nLớp demo:");
  for (const l of lop) console.log(`  - ${l.ten} [${l.trang_thai_hien_thi}] ${l.so_bai} Bài, GV ${l.gv_da_phan_cong}/${l.gv_tong}, TG ${l.tg_da_phan_cong}/${l.tg_tong}`);
  console.log(`\nTài khoản demo (mật khẩu chung: ${MAT_KHAU}):`);
  for (const n of NHAN_SU) console.log(`  - ${n.email}  ${n.ho_ten}`);
}

async function xoa() {
  // Xóa lớp trước (kéo theo Bài, slot, đăng ký, khảo sát), rồi tài khoản @qldt.test
  const lop = await rest(`lop_hoc?select=id&ten=like.${encodeURIComponent(TIEN_TO_LOP)}*`);
  for (const l of lop) await rest(`lop_hoc?id=eq.${l.id}`, { method: "DELETE" });
  console.log(`Đã xóa ${lop.length} lớp demo.`);
  const users = (await tatCaUsers()).filter((u) => /@qldt\.test$/.test(u.email ?? ""));
  for (const u of users) {
    await authAdmin(`users/${u.id}`, { method: "DELETE" });
    console.log("  - đã xóa", u.email);
  }
  console.log(`Đã xóa ${users.length} tài khoản demo.`);
}

const lenh = process.argv[2];
if (lenh === "tao") await tao();
else if (lenh === "xoa") await xoa();
else console.log("Dùng: node scripts/demo-data.mjs tao | xoa");
