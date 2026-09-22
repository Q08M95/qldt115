import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CanhBaoPool, DongLop, DongSanLuong, DongTyLe, VanHanhDangKy } from "./types";
import type { A4Row, DeXuatThongKe, KpiKyRow, KpiTheoKyRow } from "@/types/database";

const num = (v: unknown) => Number(v ?? 0);

// Báo cáo #3: sản lượng theo người trong khoảng ngày (giờ Việt Nam). Công khai nội bộ, không kèm nhãn nhóm.
export async function getSanLuong(tu: string, den: string): Promise<DongSanLuong[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_san_luong", { p_tu: tu, p_den: den });
  if (error) throw new Error(`Không đọc được báo cáo sản lượng: ${error.message}`);
  return ((data ?? []) as DongSanLuong[]).map((r) => ({
    ...r,
    so_bai: num(r.so_bai),
    so_lop: num(r.so_lop),
    gio_thuc: num(r.gio_thuc),
    so_bai_sap: num(r.so_bai_sap),
    gio_sap: num(r.gio_sap),
  }));
}

// Báo cáo #4: A2/A3 theo người
export async function getTyLeDangKy(tu: string, den: string): Promise<DongTyLe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_ty_le_dang_ky", { p_tu: tu, p_den: den });
  if (error) throw new Error(`Không đọc được báo cáo tỷ lệ đăng ký: ${error.message}`);
  return ((data ?? []) as DongTyLe[]).map((r) => ({
    ...r,
    so_bai_da_day: num(r.so_bai_da_day),
    so_tu_dang_ky: num(r.so_tu_dang_ky),
    so_moi_dong_y: num(r.so_moi_dong_y),
    so_moi_tu_choi: num(r.so_moi_tu_choi),
  }));
}

// Báo cáo #5: vận hành đăng ký & phân công
export async function getVanHanhDangKy(tu: string, den: string): Promise<VanHanhDangKy> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_van_hanh_dang_ky", { p_tu: tu, p_den: den });
  if (error) throw new Error(`Không đọc được báo cáo vận hành đăng ký: ${error.message}`);
  const j = (data ?? {}) as Record<string, unknown>;
  return {
    slot_tong: num(j.slot_tong),
    slot_da_phan_cong: num(j.slot_da_phan_cong),
    gio_lap_tb: j.gio_lap_tb === null || j.gio_lap_tb === undefined ? null : num(j.gio_lap_tb),
    so_slot_do_duyet: num(j.so_slot_do_duyet),
    dang_ky_moi: num(j.dang_ky_moi),
    loi_moi_gui: num(j.loi_moi_gui),
    dang_ky_cho: num(j.dang_ky_cho),
    loi_moi_cho: num(j.loi_moi_cho),
    serie: ((j.serie ?? []) as { ngay: string; dang_ky: unknown; phan_cong: unknown }[]).map((s) => ({
      ngay: s.ngay,
      dang_ky: num(s.dang_ky),
      phan_cong: num(s.phan_cong),
    })),
  };
}

// Cảnh báo pool ứng viên nhỏ đang có (realtime, không theo khoảng)
export async function getCanhBaoPool(): Promise<CanhBaoPool[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_canh_bao_pool");
  if (error) throw new Error(`Không đọc được cảnh báo pool ứng viên: ${error.message}`);
  return ((data ?? []) as CanhBaoPool[]).map((r) => ({ ...r, slot_trong: num(r.slot_trong), so_ung_vien: num(r.so_ung_vien) }));
}

// Báo cáo #8: lớp có thời gian giao với khoảng báo cáo. Đọc từ view (RLS: lớp Dự kiến chưa công khai chỉ người quản trị thấy).
export async function getLopTrongKhoang(tu: string, den: string): Promise<DongLop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lop_hoc_tong_hop")
    .select("id, ten, nhom_lop_ten, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai_hien_thi, so_bai, gv_tong, gv_da_phan_cong, tg_tong, tg_da_phan_cong")
    .lte("ngay_bat_dau", den)
    .gte("ngay_ket_thuc", tu)
    .order("ngay_bat_dau", { ascending: true })
    .order("ten", { ascending: true });
  if (error) throw new Error(`Không đọc được báo cáo vận hành lớp học: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    ten: r.ten,
    nhom_lop_ten: r.nhom_lop_ten,
    doi_tuong: r.doi_tuong,
    loai_kinh_phi: r.loai_kinh_phi,
    ngay_bat_dau: r.ngay_bat_dau,
    ngay_ket_thuc: r.ngay_ket_thuc,
    trang_thai_hien_thi: r.trang_thai_hien_thi,
    so_bai: num(r.so_bai),
    slot_tong: num(r.gv_tong) + num(r.tg_tong),
    slot_da_phan_cong: num(r.gv_da_phan_cong) + num(r.tg_da_phan_cong),
  })) as DongLop[];
}

// Ngưỡng cảnh báo pool ứng viên nhỏ (Cấu hình hệ thống, khởi điểm 3)
export async function getNguongPool(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("cau_hinh_he_thong").select("gia_tri").eq("khoa", "canh_bao_pool_nho").maybeSingle();
  return Number(data?.gia_tri ?? 3);
}

// ===== Lượt 2: báo cáo theo kỳ đánh giá (mục 4.7) =====
const num2 = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const obj2 = (o: unknown) => (o ?? {}) as Record<string, number>;

// Báo cáo #1: KPI tổng hợp toàn đơn vị của 1 kỳ — cột nhóm chỉ có giá trị với Admin/Quản lý lớp (hàm SQL tự ẩn)
export async function getKpiTongHop(kyId: string): Promise<KpiKyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_kpi_tong_hop", { p_ky: kyId });
  if (error) throw new Error(`Không đọc được báo cáo KPI tổng hợp: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    user_id: r.user_id as string,
    ho_ten: r.ho_ten as string,
    avatar_url: (r.avatar_url as string | null) ?? null,
    vai_tro: (r.vai_tro as KpiKyRow["vai_tro"]) ?? null,
    nhom: (r.nhom as KpiKyRow["nhom"]) ?? null,
    kpi: Number(r.kpi),
    hang: Number(r.hang),
    diem_nhom: obj2(r.diem_nhom),
    gia_tri: obj2(r.gia_tri),
    trong_so_hieu_luc: obj2(r.trong_so_hieu_luc),
    gio_thuc: Number(r.gio_thuc),
    gio_quy_doi: Number(r.gio_quy_doi),
    so_bai: Number(r.so_bai),
    so_lop: Number(r.so_lop),
    a4_ky: Number(r.a4_ky),
    a4_luy_ke: Number(r.a4_luy_ke),
    che_do_a1: (r.che_do_a1 as KpiKyRow["che_do_a1"]) ?? null,
    percentile: num2(r.percentile),
  }));
}

// Báo cáo #2: xu hướng KPI trung bình toàn đơn vị qua nhiều kỳ gần nhất (cũ -> mới)
export async function getKpiTheoKy(gioiHan = 8): Promise<KpiTheoKyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_kpi_theo_ky", { p_gioi_han: gioiHan });
  if (error) throw new Error(`Không đọc được xu hướng KPI: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ky_id: r.ky_id as string,
    ten: r.ten as string,
    tu: r.tu as string,
    den: r.den as string,
    trang_thai: r.trang_thai as KpiTheoKyRow["trang_thai"],
    kpi_tb: num2(r.kpi_tb),
    kpi_tb_gv: num2(r.kpi_tb_gv),
    kpi_tb_tg: num2(r.kpi_tb_tg),
    so_nguoi: Number(r.so_nguoi),
  }));
}

// Báo cáo #6: A4 — đóng góp lớp không kinh phí (a4_ky theo kỳ đang xem, a4_luy_ke luôn tính đến hiện tại)
export async function getA4(kyId: string): Promise<A4Row[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_a4", { p_ky: kyId });
  if (error) throw new Error(`Không đọc được báo cáo A4: ${error.message}`);
  return ((data ?? []) as A4Row[]).map((r) => ({ ...r, a4_ky: Number(r.a4_ky), a4_luy_ke: Number(r.a4_luy_ke) }));
}

// Báo cáo #7: đề xuất nhân sự — số liệu tổng hợp theo loại/kỳ, không lộ ai được đề xuất gì
export async function getDeXuatThongKe(kyId: string): Promise<DeXuatThongKe> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bc_de_xuat", { p_ky: kyId });
  if (error) throw new Error(`Không đọc được báo cáo đề xuất nhân sự: ${error.message}`);
  const j = (data ?? { theo_loai: [], cho_duyet: 0, da_duyet: 0, bo_qua: 0 }) as DeXuatThongKe;
  return j;
}
