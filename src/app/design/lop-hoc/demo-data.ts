import type { DangKyLop } from "@/lib/dang-ky/queries";
import type { LopChiTiet } from "@/lib/lop-hoc/queries";
import type { BaiHoc, LopHocTongHop, NhomLop, SlotGiangDay, UngVien } from "@/types/database";

// Dữ liệu giả cho trang demo Lớp học — chỉ dùng khi dev
export const NHOM_LOP: NhomLop[] = [
  { id: "n1", ten: "ABCDE", he_so_d1: 1.2, thu_tu: 1, dang_dung: true },
  { id: "n2", ten: "ACLS", he_so_d1: 1.3, thu_tu: 2, dang_dung: true },
  { id: "n3", ten: "BLS", he_so_d1: 1, thu_tu: 3, dang_dung: true },
  { id: "n4", ten: "SCC-LX", he_so_d1: 1.1, thu_tu: 4, dang_dung: true },
];

const co = (o: Partial<LopHocTongHop>): LopHocTongHop => ({
  id: "x",
  ten: "",
  nhom_lop_id: "n1",
  nhom_lop_ten: "ABCDE",
  he_so_d1: 1,
  doi_tuong: "nhan_vien_y_te",
  loai_kinh_phi: "co_kinh_phi",
  ngay_bat_dau: "2026-10-05",
  ngay_ket_thuc: "2026-10-07",
  dia_diem: "Phòng đào tạo tầng 3",
  trang_thai: "dang_mo",
  trang_thai_hien_thi: "dang_mo",
  cong_khai_som: false,
  c1_phan_tram: null,
  c1_nguon: null,
  c3_phan_tram: null,
  so_bai: 3,
  gv_tong: 3,
  gv_da_phan_cong: 1,
  gv_nhan_su: 1,
  gv_ten_duy_nhat: null,
  tg_tong: 6,
  tg_da_phan_cong: 2,
  tg_nhan_su: 2,
  tg_ten_duy_nhat: null,
  ...o,
});

export const LOP_LIST: LopHocTongHop[] = [
  co({ id: "1", ten: "Lớp ACLS khóa 08 — Bệnh viện Đa khoa", nhom_lop_id: "n2", nhom_lop_ten: "ACLS" }),
  co({
    id: "2", ten: "Cấp cứu ngoại viện ABCDE cơ bản", trang_thai_hien_thi: "da_du_dang_ky", gv_tong: 4, gv_da_phan_cong: 4, gv_nhan_su: 1,
    gv_ten_duy_nhat: "Nguyễn Văn An", tg_tong: 4, tg_da_phan_cong: 4, tg_nhan_su: 3, so_bai: 4,
  }),
  co({
    id: "3", ten: "BLS cộng đồng — Trường THPT Lê Quý Đôn", nhom_lop_id: "n3", nhom_lop_ten: "BLS", doi_tuong: "cong_dong",
    loai_kinh_phi: "khong_kinh_phi", trang_thai_hien_thi: "dang_dien_ra", ngay_bat_dau: "2026-09-19", ngay_ket_thuc: "2026-09-21",
    gv_tong: 2, gv_da_phan_cong: 2, gv_nhan_su: 2, tg_tong: 2, tg_da_phan_cong: 1, tg_nhan_su: 1, so_bai: 2, dia_diem: "Trường THPT Lê Quý Đôn",
  }),
  co({
    id: "4", ten: "SCC-LX tháng 11 (dự kiến)", nhom_lop_id: "n4", nhom_lop_ten: "SCC-LX", trang_thai: "nhap", trang_thai_hien_thi: "nhap",
    cong_khai_som: true, ngay_bat_dau: "2026-11-10", ngay_ket_thuc: "2026-11-12", gv_da_phan_cong: 0, gv_nhan_su: 0, tg_da_phan_cong: 0, tg_nhan_su: 0,
  }),
  co({
    id: "5", ten: "ACLS khóa 07", nhom_lop_id: "n2", nhom_lop_ten: "ACLS", trang_thai: "da_hoan_thanh", trang_thai_hien_thi: "da_hoan_thanh",
    ngay_bat_dau: "2026-08-10", ngay_ket_thuc: "2026-08-12", gv_da_phan_cong: 3, gv_nhan_su: 2, tg_da_phan_cong: 6, tg_nhan_su: 4,
    c1_phan_tram: 92.5, c1_nguon: "khao_sat", c3_phan_tram: 88,
  }),
  co({
    id: "6", ten: "ABCDE nâng cao — đã hủy", trang_thai: "da_huy", trang_thai_hien_thi: "da_huy", ngay_bat_dau: "2026-07-02", ngay_ket_thuc: "2026-07-03",
    gv_da_phan_cong: 0, gv_nhan_su: 0, tg_da_phan_cong: 0, tg_nhan_su: 0,
  }),
];

const nguoi = (id: string, ho_ten: string) => ({ id, ho_ten, avatar_url: null });
const slot = (id: string, vai_tro: SlotGiangDay["vai_tro"], vi_tri: number, n: ReturnType<typeof nguoi> | null): SlotGiangDay => ({
  id, vai_tro, vi_tri, trang_thai: n ? "da_phan_cong" : "trong", nguoi: n,
});

const AN = nguoi("u1", "Nguyễn Văn An");
const BINH = nguoi("u2", "Trần Thị Bình");
const CHAU = nguoi("u3", "Lê Minh Châu");

const BAI: BaiHoc[] = [
  {
    id: "b1", lop_id: "1", thu_tu: 1, ten: "Lý thuyết hồi sinh tim phổi nâng cao", bat_dau: "2026-10-05T01:00:00Z", ket_thuc: "2026-10-05T04:00:00Z",
    slots: [slot("s1", "giang_vien", 1, AN), slot("s2", "tro_giang", 1, null)],
  },
  {
    id: "b2", lop_id: "1", thu_tu: 2, ten: "Thực hành xử trí loạn nhịp", bat_dau: "2026-10-06T01:00:00Z", ket_thuc: "2026-10-06T09:00:00Z",
    slots: [
      slot("s3", "giang_vien", 1, AN), slot("s4", "tro_giang", 1, BINH), slot("s5", "tro_giang", 2, CHAU), slot("s6", "tro_giang", 3, null),
    ],
  },
  {
    id: "b3", lop_id: "1", thu_tu: 3, ten: "Đánh giá cuối khóa", bat_dau: "2026-10-07T01:00:00Z", ket_thuc: "2026-10-07T04:30:00Z",
    slots: [slot("s7", "giang_vien", 1, null), slot("s8", "tro_giang", 1, BINH)],
  },
];

export function chiTiet(o: Partial<LopHocTongHop> = {}): LopChiTiet {
  return {
    lop: { ...LOP_LIST[0], gv_tong: 3, gv_da_phan_cong: 2, gv_nhan_su: 1, gv_ten_duy_nhat: null, tg_tong: 5, tg_da_phan_cong: 3, tg_nhan_su: 2, ...o },
    bai: BAI,
    nhom_du_dieu_kien: ["gv_bac_si", "tg_bac_si"],
    chung_chi_yeu_cau: [{ id: "c1", ten: "ACLS" }],
    khao_sat: null,
  };
}

// ---------- Đăng ký giảng dạy (Giai đoạn 5) ----------
const uv = (bai_id: string, vai_tro: UngVien["vai_tro"], hang: number, user_id: string, ho_ten: string, diem: number, gio_ky: number, extra: Partial<UngVien> = {}): UngVien => ({
  bai_id, vai_tro, hang, user_id, ho_ten, avatar_url: null, diem, gio_ky, so_lop_khong_kinh_phi: 0, cung_lop: 0, trang_thai_hien_co: null, dang_ky_id: null, ...extra,
});

// b1: TG còn 1 slot, chỉ 2 ứng viên (cảnh báo pool nhỏ); b2: TG vị trí 3 không có ứng viên (cảnh báo mạnh);
// b3: GV còn trống, 7 ứng viên, có người đã đăng ký / đã được mời
export const DANG_KY: DangKyLop = {
  nguong_pool: 3,
  goi_y: [
    uv("b1", "tro_giang", 1, "u2", "Trần Thị Bình", 0.62, 4),
    uv("b1", "tro_giang", 2, "u5", "Hoàng Thu Em", 0.48, 9),
    uv("b3", "giang_vien", 1, "u6", "Phạm Quốc Dũng", 0.6, 0),
    uv("b3", "giang_vien", 2, "u3", "Lê Minh Châu", 0.55, 2, { trang_thai_hien_co: "dang_ky", dang_ky_id: "d1" }),
    uv("b3", "giang_vien", 3, "u7", "Đỗ Khánh Linh", 0.5, 3, { trang_thai_hien_co: "duoc_moi", dang_ky_id: "d2" }),
    uv("b3", "giang_vien", 4, "u1", "Nguyễn Văn An", 0.42, 6, { cung_lop: 2 }),
    uv("b3", "giang_vien", 5, "u8", "Vũ Hải Nam", 0.4, 7),
    uv("b3", "giang_vien", 6, "u9", "Bùi Thanh Tâm", 0.31, 11),
    uv("b3", "giang_vien", 7, "u10", "Ngô Bảo Ngọc", 0.22, 14),
  ],
  dang_ky_cho: [
    { id: "d1", bai_id: "b3", vai_tro: "giang_vien", user_id: "u3", ho_ten: "Lê Minh Châu", avatar_url: null, loai: "tu_dang_ky", created_at: "", ngoai_le: false, ly_do_ngoai_le: null, vuot_loc: null },
    { id: "d2", bai_id: "b3", vai_tro: "giang_vien", user_id: "u7", ho_ten: "Đỗ Khánh Linh", avatar_url: null, loai: "duoc_moi", created_at: "", ngoai_le: true, ly_do_ngoai_le: "Giảng viên thỉnh giảng, Ban giám đốc đã đồng ý", vuot_loc: "Chưa đủ điều kiện đăng ký lớp này" },
  ],
  kha_nang: [
    { bai_id: "b1", ly_do: null, da_dang_ky: false },
    { bai_id: "b2", ly_do: 'Trùng lịch với Bài "Huấn luyện sơ cứu" (lớp BLS khóa 05)', da_dang_ky: false },
    { bai_id: "b3", ly_do: null, da_dang_ky: true },
  ],
};
