import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CanhBaoPool, DongLop, DongSanLuong, DongTyLe, VanHanhDangKy } from "./types";

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
