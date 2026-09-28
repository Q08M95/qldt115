import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DOI_TUONG_LABEL, LOAI_KINH_PHI_LABEL, TRANG_THAI_LOP_LABEL, TRANG_THAI_SLOT_LABEL } from "@/lib/lop-hoc/labels";
import { LOAI_DE_XUAT_LABEL, NHOM_LABEL, TRANG_THAI_DE_XUAT_LABEL, TRANG_THAI_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type {
  DoiTuongLop,
  LoaiDeXuat,
  LoaiKinhPhi,
  MucDuGio,
  NhomNhanSu,
  TrangThaiDeXuat,
  TrangThaiSlot,
  TrangThaiThamGia,
  VaiTroGiangDay,
} from "@/types/database";

// "Xuất dữ liệu chi tiết" (mục 4.7, Giai đoạn 11c) — khác "Xuất báo cáo": đây là bản ghi THÔ (không tính toán/
// tổng hợp), nhiều sheet, phục vụ tra cứu/lưu trữ trước khi dọn dữ liệu cũ (đã bàn ở phần scaling). Dùng chung
// bộ lọc (kỳ đánh giá + khung thời gian) với "Xuất báo cáo" — xem route /bao-cao/xuat-du-lieu.
// Ngày giờ Việt Nam luôn UTC+7 quanh năm (không có giờ mùa hè) nên cộng thẳng "+07:00" là chính xác, không cần hàm SQL riêng.
const gioVN = (ngay: string, cuoiNgay: boolean) => `${ngay}T${cuoiNgay ? "23:59:59.999" : "00:00:00"}+07:00`;

const LOAI_DANG_KY_LABEL: Record<string, string> = { tu_dang_ky: "Tự đăng ký", duoc_moi: "Được mời" };
const TRANG_THAI_DANG_KY_LABEL: Record<string, string> = {
  cho_xu_ly: "Chờ xử lý",
  da_duyet: "Đã duyệt",
  tu_choi: "Từ chối",
  da_huy: "Đã hủy/thu hồi",
};
const RUBRIC_LABEL: Record<number, string> = { 100: "Tốt (100%)", 80: "Khá (80%)", 60: "Đạt (60%)", 0: "Không đạt (0%)" };

const vaiTro = (v: VaiTroGiangDay | null) => (v ? VAI_TRO_LABEL[v] : "");
const nhom = (v: NhomNhanSu | null) => (v ? NHOM_LABEL[v] : "");

// ===== Sheet không lọc thời gian — luôn toàn bộ hiện tại =====

export interface NhanSuXuatRow {
  ho_ten: string;
  email: string;
  so_dien_thoai: string | null;
  vai_tro: string;
  trang_thai_tham_gia: string;
  nhom: string;
  quyen_quan_ly_lop: string;
  kinh_nghiem: string | null;
  created_at: string;
}

export async function getNhanSuXuat(): Promise<NhanSuXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("ho_ten, email, so_dien_thoai, vai_tro_giang_day, trang_thai_tham_gia, co_quyen_quan_ly_lop, kinh_nghiem, created_at, nhan_su_nhom(nhom)")
    .order("ho_ten");
  if (error) throw new Error(`Không đọc được nhân sự: ${error.message}`);
  return (data ?? []).map((r) => {
    const n = Array.isArray(r.nhan_su_nhom) ? r.nhan_su_nhom[0] : r.nhan_su_nhom;
    return {
      ho_ten: r.ho_ten,
      email: r.email,
      so_dien_thoai: r.so_dien_thoai,
      vai_tro: vaiTro(r.vai_tro_giang_day as VaiTroGiangDay | null),
      trang_thai_tham_gia: TRANG_THAI_LABEL[r.trang_thai_tham_gia as TrangThaiThamGia],
      nhom: nhom((n?.nhom as NhomNhanSu | undefined) ?? null),
      quyen_quan_ly_lop: r.co_quyen_quan_ly_lop ? "Có" : "",
      kinh_nghiem: r.kinh_nghiem,
      created_at: r.created_at,
    };
  });
}

export interface ChuyenMonXuatRow {
  ho_ten: string;
  chuyen_mon: string;
  chi_tiet: string | null;
}

export async function getChuyenMonXuat(): Promise<ChuyenMonXuatRow[]> {
  const supabase = await createClient();
  // !inner để order theo profiles.ho_ten thực sự sắp lại hàng (embed thường chỉ ảnh hưởng mảng lồng, không sắp bảng cha)
  const { data, error } = await supabase
    .from("profile_chuyen_mon")
    .select("chi_tiet, profiles!inner(ho_ten), danh_muc_chuyen_mon(ten)")
    .order("ho_ten", { referencedTable: "profiles" });
  if (error) throw new Error(`Không đọc được chuyên môn nhân sự: ${error.message}`);
  return (data ?? []).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const d = Array.isArray(r.danh_muc_chuyen_mon) ? r.danh_muc_chuyen_mon[0] : r.danh_muc_chuyen_mon;
    return { ho_ten: p?.ho_ten ?? "", chuyen_mon: d?.ten ?? "", chi_tiet: r.chi_tiet };
  });
}

export interface ChungChiXuatRow {
  ho_ten: string;
  loai: string;
  so_chung_chi: string | null;
  noi_dung: string | null;
  ngay_cap: string | null;
  noi_cap: string | null;
  co_anh: string;
}

export async function getChungChiXuat(): Promise<ChungChiXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chung_chi")
    .select("so_chung_chi, noi_dung, ngay_cap, noi_cap, hinh_anh_path, profiles(ho_ten), danh_muc_loai_chung_chi(ten)")
    .order("ngay_cap", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Không đọc được chứng chỉ: ${error.message}`);
  return (data ?? []).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const d = Array.isArray(r.danh_muc_loai_chung_chi) ? r.danh_muc_loai_chung_chi[0] : r.danh_muc_loai_chung_chi;
    return {
      ho_ten: p?.ho_ten ?? "",
      loai: d?.ten ?? "",
      so_chung_chi: r.so_chung_chi,
      noi_dung: r.noi_dung,
      ngay_cap: r.ngay_cap,
      noi_cap: r.noi_cap,
      co_anh: r.hinh_anh_path ? "Có" : "",
    };
  });
}

export interface DanhMucXuatRow {
  loai: string;
  ten: string;
  he_so_d1: number | null;
  dang_dung: string;
}

// Gộp 3 danh mục cấu hình (mục 4.8) vào 1 sheet tham khảo, phân biệt bằng cột "Loại danh mục"
export async function getDanhMucXuat(): Promise<DanhMucXuatRow[]> {
  const supabase = await createClient();
  const [cm, cc, nl] = await Promise.all([
    supabase.from("danh_muc_chuyen_mon").select("ten, dang_dung").order("thu_tu"),
    supabase.from("danh_muc_loai_chung_chi").select("ten, dang_dung").order("thu_tu"),
    supabase.from("danh_muc_nhom_lop").select("ten, he_so_d1, dang_dung").order("thu_tu"),
  ]);
  for (const r of [cm, cc, nl]) if (r.error) throw new Error(`Không đọc được danh mục: ${r.error.message}`);
  return [
    ...(cm.data ?? []).map((r) => ({ loai: "Chuyên môn", ten: r.ten, he_so_d1: null, dang_dung: r.dang_dung ? "Có" : "" })),
    ...(cc.data ?? []).map((r) => ({ loai: "Loại chứng chỉ", ten: r.ten, he_so_d1: null, dang_dung: r.dang_dung ? "Có" : "" })),
    ...(nl.data ?? []).map((r) => ({ loai: "Nhóm lớp", ten: r.ten, he_so_d1: Number(r.he_so_d1), dang_dung: r.dang_dung ? "Có" : "" })),
  ];
}

export interface KyXuatRow {
  ten: string;
  tu: string;
  den: string;
  trang_thai: string;
}

export async function getKyDanhGiaXuat(): Promise<KyXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ky_danh_gia").select("ten, tu, den, trang_thai").order("tu", { ascending: false });
  if (error) throw new Error(`Không đọc được kỳ đánh giá: ${error.message}`);
  const nhan: Record<string, string> = { dang_mo: "Đang mở", cho_duyet: "Chờ duyệt", da_dong: "Đã đóng" };
  return (data ?? []).map((r) => ({ ten: r.ten, tu: r.tu, den: r.den, trang_thai: nhan[r.trang_thai] ?? r.trang_thai }));
}

// ===== Sheet lọc theo khung thời gian (tuần/tháng/quý/năm) đang chọn ở /bao-cao =====

export interface LopHocXuatRow {
  ten: string;
  nhom_lop: string;
  he_so_d1: number;
  doi_tuong: string;
  loai_kinh_phi: string;
  trang_thai: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  dia_diem: string | null;
  cong_khai_som: string;
  nhom_du_dieu_kien: string;
  chung_chi_yeu_cau: string;
  c1_phan_tram: number | null;
  c3_phan_tram: number | null;
  so_bai: number;
}

export async function getLopHocXuat(tu: string, den: string): Promise<LopHocXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lop_hoc_tong_hop")
    .select(
      "id, ten, nhom_lop_ten, he_so_d1, doi_tuong, loai_kinh_phi, trang_thai_hien_thi, ngay_bat_dau, ngay_ket_thuc, dia_diem, cong_khai_som, c1_phan_tram, c3_phan_tram, so_bai",
    )
    .lte("ngay_bat_dau", den)
    .gte("ngay_ket_thuc", tu)
    .order("ngay_bat_dau");
  if (error) throw new Error(`Không đọc được lớp học: ${error.message}`);
  const lop = data ?? [];
  const ids = lop.map((l) => l.id);
  if (ids.length === 0) return [];

  const [nhomRes, ccRes] = await Promise.all([
    supabase.from("lop_hoc_nhom_du_dieu_kien").select("lop_id, nhom").in("lop_id", ids),
    supabase.from("lop_hoc_chung_chi_yeu_cau").select("lop_id, danh_muc_loai_chung_chi(ten)").in("lop_id", ids),
  ]);
  if (nhomRes.error) throw new Error(`Không đọc được nhóm đủ điều kiện: ${nhomRes.error.message}`);
  if (ccRes.error) throw new Error(`Không đọc được chứng chỉ yêu cầu: ${ccRes.error.message}`);

  const nhomTheoLop = new Map<string, string[]>();
  for (const r of nhomRes.data ?? []) {
    const arr = nhomTheoLop.get(r.lop_id) ?? [];
    arr.push(nhom(r.nhom as NhomNhanSu));
    nhomTheoLop.set(r.lop_id, arr);
  }
  const ccTheoLop = new Map<string, string[]>();
  for (const r of ccRes.data ?? []) {
    const d = Array.isArray(r.danh_muc_loai_chung_chi) ? r.danh_muc_loai_chung_chi[0] : r.danh_muc_loai_chung_chi;
    if (!d?.ten) continue;
    const arr = ccTheoLop.get(r.lop_id) ?? [];
    arr.push(d.ten);
    ccTheoLop.set(r.lop_id, arr);
  }

  return lop.map((l) => ({
    ten: l.ten,
    nhom_lop: l.nhom_lop_ten,
    he_so_d1: Number(l.he_so_d1),
    doi_tuong: DOI_TUONG_LABEL[l.doi_tuong as DoiTuongLop],
    loai_kinh_phi: LOAI_KINH_PHI_LABEL[l.loai_kinh_phi as LoaiKinhPhi],
    trang_thai: TRANG_THAI_LOP_LABEL[l.trang_thai_hien_thi as keyof typeof TRANG_THAI_LOP_LABEL] ?? l.trang_thai_hien_thi,
    ngay_bat_dau: l.ngay_bat_dau,
    ngay_ket_thuc: l.ngay_ket_thuc,
    dia_diem: l.dia_diem,
    cong_khai_som: l.cong_khai_som ? "Có" : "",
    nhom_du_dieu_kien: (nhomTheoLop.get(l.id) ?? []).join(", "),
    chung_chi_yeu_cau: (ccTheoLop.get(l.id) ?? []).join(", "),
    c1_phan_tram: l.c1_phan_tram === null ? null : Number(l.c1_phan_tram),
    c3_phan_tram: l.c3_phan_tram === null ? null : Number(l.c3_phan_tram),
    so_bai: Number(l.so_bai),
  }));
}

export interface BaiHocXuatRow {
  lop_ten: string;
  thu_tu: number;
  ten: string;
  bat_dau: string;
  ket_thuc: string;
}

export async function getBaiHocXuat(tu: string, den: string): Promise<BaiHocXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bai_hoc")
    .select("thu_tu, ten, bat_dau, ket_thuc, lop_hoc(ten)")
    .gte("bat_dau", gioVN(tu, false))
    .lte("bat_dau", gioVN(den, true))
    .order("bat_dau");
  if (error) throw new Error(`Không đọc được Bài học: ${error.message}`);
  return (data ?? []).map((r) => {
    const l = Array.isArray(r.lop_hoc) ? r.lop_hoc[0] : r.lop_hoc;
    return { lop_ten: l?.ten ?? "", thu_tu: r.thu_tu, ten: r.ten, bat_dau: r.bat_dau, ket_thuc: r.ket_thuc };
  });
}

export interface SlotXuatRow {
  lop_ten: string;
  bai_ten: string;
  bai_bat_dau: string;
  vai_tro: string;
  vi_tri: number;
  trang_thai: string;
  nguoi_dam_nhiem: string;
}

export async function getSlotXuat(tu: string, den: string): Promise<SlotXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("slot_giang_day")
    .select("vai_tro, vi_tri, trang_thai, bai_hoc!inner(ten, bat_dau, lop_hoc(ten)), profiles(ho_ten)")
    .gte("bai_hoc.bat_dau", gioVN(tu, false))
    .lte("bai_hoc.bat_dau", gioVN(den, true))
    .order("vi_tri");
  if (error) throw new Error(`Không đọc được slot & phân công: ${error.message}`);
  return (data ?? []).map((r) => {
    const b = Array.isArray(r.bai_hoc) ? r.bai_hoc[0] : r.bai_hoc;
    const l = b ? (Array.isArray(b.lop_hoc) ? b.lop_hoc[0] : b.lop_hoc) : null;
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      lop_ten: l?.ten ?? "",
      bai_ten: b?.ten ?? "",
      bai_bat_dau: b?.bat_dau ?? "",
      vai_tro: vaiTro(r.vai_tro as VaiTroGiangDay),
      vi_tri: r.vi_tri,
      trang_thai: TRANG_THAI_SLOT_LABEL[r.trang_thai as TrangThaiSlot],
      nguoi_dam_nhiem: p?.ho_ten ?? "",
    };
  }).sort((a, b) => a.bai_bat_dau.localeCompare(b.bai_bat_dau));
}

export interface DangKyXuatRow {
  lop_ten: string;
  bai_ten: string;
  bai_bat_dau: string;
  vai_tro: string;
  nguoi: string;
  loai: string;
  trang_thai: string;
  tu_duyet: string;
  created_at: string;
  xu_ly_luc: string | null;
}

export async function getDangKyXuat(tu: string, den: string): Promise<DangKyXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dang_ky_giang_day")
    .select(
      "vai_tro, loai, trang_thai, tu_duyet, created_at, xu_ly_luc, bai_hoc!inner(ten, bat_dau, lop_hoc(ten)), profiles(ho_ten)",
    )
    .gte("bai_hoc.bat_dau", gioVN(tu, false))
    .lte("bai_hoc.bat_dau", gioVN(den, true))
    .order("created_at");
  if (error) throw new Error(`Không đọc được đăng ký/lời mời: ${error.message}`);
  return (data ?? []).map((r) => {
    const b = Array.isArray(r.bai_hoc) ? r.bai_hoc[0] : r.bai_hoc;
    const l = b ? (Array.isArray(b.lop_hoc) ? b.lop_hoc[0] : b.lop_hoc) : null;
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      lop_ten: l?.ten ?? "",
      bai_ten: b?.ten ?? "",
      bai_bat_dau: b?.bat_dau ?? "",
      vai_tro: vaiTro(r.vai_tro as VaiTroGiangDay),
      nguoi: p?.ho_ten ?? "",
      loai: LOAI_DANG_KY_LABEL[r.loai] ?? r.loai,
      trang_thai: TRANG_THAI_DANG_KY_LABEL[r.trang_thai] ?? r.trang_thai,
      tu_duyet: r.tu_duyet ? "Có" : "",
      created_at: r.created_at,
      xu_ly_luc: r.xu_ly_luc,
    };
  });
}

export interface DiemDanhXuatRow {
  lop_ten: string;
  bai_ten: string;
  bai_bat_dau: string;
  nguoi: string;
  check_in_luc: string | null;
  b1_phan_tram: number;
  chinh_tay: string;
}

export async function getDiemDanhXuat(tu: string, den: string): Promise<DiemDanhXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diem_danh_bai")
    .select("check_in_luc, b1_phan_tram, chinh_tay, bai_hoc!inner(ten, bat_dau, lop_hoc(ten)), profiles(ho_ten)")
    .gte("bai_hoc.bat_dau", gioVN(tu, false))
    .lte("bai_hoc.bat_dau", gioVN(den, true))
    .order("check_in_luc");
  if (error) throw new Error(`Không đọc được điểm danh: ${error.message}`);
  return (data ?? []).map((r) => {
    const b = Array.isArray(r.bai_hoc) ? r.bai_hoc[0] : r.bai_hoc;
    const l = b ? (Array.isArray(b.lop_hoc) ? b.lop_hoc[0] : b.lop_hoc) : null;
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      lop_ten: l?.ten ?? "",
      bai_ten: b?.ten ?? "",
      bai_bat_dau: b?.bat_dau ?? "",
      nguoi: p?.ho_ten ?? "",
      check_in_luc: r.check_in_luc,
      b1_phan_tram: Number(r.b1_phan_tram),
      chinh_tay: r.chinh_tay ? "Có" : "",
    };
  });
}

export interface DuGioXuatRow {
  lop_ten: string;
  bai_ten: string;
  bai_bat_dau: string;
  nguoi: string;
  muc: string;
  ghi_chu: string | null;
}

export async function getDuGioXuat(tu: string, den: string): Promise<DuGioXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("danh_gia_du_gio")
    .select("muc_diem, ghi_chu, bai_hoc!inner(ten, bat_dau, lop_hoc(ten)), profiles(ho_ten)")
    .gte("bai_hoc.bat_dau", gioVN(tu, false))
    .lte("bai_hoc.bat_dau", gioVN(den, true))
    .order("bat_dau", { referencedTable: "bai_hoc" });
  if (error) throw new Error(`Không đọc được dự giờ: ${error.message}`);
  return (data ?? []).map((r) => {
    const b = Array.isArray(r.bai_hoc) ? r.bai_hoc[0] : r.bai_hoc;
    const l = b ? (Array.isArray(b.lop_hoc) ? b.lop_hoc[0] : b.lop_hoc) : null;
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      lop_ten: l?.ten ?? "",
      bai_ten: b?.ten ?? "",
      bai_bat_dau: b?.bat_dau ?? "",
      nguoi: p?.ho_ten ?? "",
      muc: RUBRIC_LABEL[r.muc_diem as MucDuGio] ?? String(r.muc_diem),
      ghi_chu: r.ghi_chu,
    };
  });
}

export interface KhaoSatXuatRow {
  lop_ten: string;
  diem_tong_the: number;
  diem_giang_day: number;
  nhan_xet: string | null;
  created_at: string;
}

export async function getKhaoSatXuat(tu: string, den: string): Promise<KhaoSatXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("khao_sat_phan_hoi")
    .select("diem_tong_the, diem_giang_day, nhan_xet, created_at, lop_hoc!inner(ten, ngay_bat_dau, ngay_ket_thuc)")
    .lte("lop_hoc.ngay_bat_dau", den)
    .gte("lop_hoc.ngay_ket_thuc", tu)
    .order("created_at");
  if (error) throw new Error(`Không đọc được khảo sát hài lòng: ${error.message}`);
  return (data ?? []).map((r) => {
    const l = Array.isArray(r.lop_hoc) ? r.lop_hoc[0] : r.lop_hoc;
    return {
      lop_ten: l?.ten ?? "",
      diem_tong_the: r.diem_tong_the,
      diem_giang_day: r.diem_giang_day,
      nhan_xet: r.nhan_xet,
      created_at: r.created_at,
    };
  });
}

// ===== Sheet lọc theo kỳ đánh giá đang chọn =====

export interface DeXuatXuatRow {
  loai: string;
  nguoi: string;
  noi_dung: string;
  trang_thai: string;
  created_at: string;
  xu_ly_luc: string | null;
}

// Chi tiết từng đề xuất (khác báo cáo #7 chỉ có số liệu tổng): "Đổi nhóm" quy theo ky_id sẵn có, loại khác quy
// theo ngày tạo nằm trong khoảng kỳ — đúng quy ước đã áp dụng cho báo cáo #7 (mục 4.7/Giai đoạn 10 lượt 2).
export async function getDeXuatXuat(kyId: string, tu: string, den: string): Promise<DeXuatXuatRow[]> {
  const supabase = await createClient();
  const [doiNhom, khac] = await Promise.all([
    supabase
      .from("de_xuat_nhan_su")
      .select("loai, noi_dung, trang_thai, created_at, xu_ly_luc, profiles!de_xuat_nhan_su_user_id_fkey(ho_ten)")
      .eq("loai", "doi_nhom")
      .eq("ky_id", kyId),
    supabase
      .from("de_xuat_nhan_su")
      .select("loai, noi_dung, trang_thai, created_at, xu_ly_luc, profiles!de_xuat_nhan_su_user_id_fkey(ho_ten)")
      .neq("loai", "doi_nhom")
      .gte("created_at", gioVN(tu, false))
      .lte("created_at", gioVN(den, true)),
  ]);
  if (doiNhom.error) throw new Error(`Không đọc được đề xuất đổi nhóm: ${doiNhom.error.message}`);
  if (khac.error) throw new Error(`Không đọc được đề xuất nhân sự: ${khac.error.message}`);

  const chuan = (r: { loai: string; noi_dung: string; trang_thai: string; created_at: string; xu_ly_luc: string | null; profiles: { ho_ten: string } | { ho_ten: string }[] | null }) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      loai: LOAI_DE_XUAT_LABEL[r.loai as LoaiDeXuat] ?? r.loai,
      nguoi: p?.ho_ten ?? "",
      noi_dung: r.noi_dung,
      trang_thai: TRANG_THAI_DE_XUAT_LABEL[r.trang_thai as TrangThaiDeXuat] ?? r.trang_thai,
      created_at: r.created_at,
      xu_ly_luc: r.xu_ly_luc,
    };
  };
  return [...(doiNhom.data ?? []), ...(khac.data ?? [])].map(chuan).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export interface LichSuDoiNhomXuatRow {
  nguoi: string;
  nhom_cu: string;
  nhom_moi: string;
  ngay_hieu_luc: string;
  ly_do: string | null;
}

export async function getLichSuDoiNhomXuat(tu: string, den: string): Promise<LichSuDoiNhomXuatRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lich_su_doi_nhom")
    .select("nhom_cu, nhom_moi, ngay_hieu_luc, ly_do, profiles!lich_su_doi_nhom_user_id_fkey(ho_ten)")
    .gte("ngay_hieu_luc", tu)
    .lte("ngay_hieu_luc", den)
    .order("ngay_hieu_luc");
  if (error) throw new Error(`Không đọc được lịch sử đổi nhóm: ${error.message}`);
  return (data ?? []).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      nguoi: p?.ho_ten ?? "",
      nhom_cu: r.nhom_cu ? nhom(r.nhom_cu as NhomNhanSu) : "",
      nhom_moi: nhom(r.nhom_moi as NhomNhanSu),
      ngay_hieu_luc: r.ngay_hieu_luc,
      ly_do: r.ly_do,
    };
  });
}
