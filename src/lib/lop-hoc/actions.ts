"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri } from "@/lib/auth/session";
import { localInputToIso } from "@/lib/format";
import type { ActionState } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/server";
import type { DoiTuongLop, LoaiKinhPhi, NhomNhanSu, TrangThaiLop } from "@/types/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NHOM: NhomNhanSu[] = ["ban_giam_doc", "gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];
const DOI_TUONG: DoiTuongLop[] = ["nhan_vien_y_te", "cong_dong"];
const LOAI_KINH_PHI: LoaiKinhPhi[] = ["co_kinh_phi", "khong_kinh_phi"];
const TRANG_THAI: TrangThaiLop[] = ["nhap", "dang_mo", "da_hoan_thanh", "da_huy"];

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function fail(error: { message: string; code?: string }): ActionState {
  if (error.code === "23505") return { error: "Giá trị này đã tồn tại." };
  if (error.code === "42501") return { error: "Bạn không có quyền thực hiện thao tác này." };
  return { error: error.message };
}

function revalidateLop(id?: string) {
  revalidatePath("/lop-hoc");
  if (id) revalidatePath(`/lop-hoc/${id}`);
}

// ---------- Lớp ----------
export async function luuLopHoc(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const id = str(fd, "id");
  const nhomLop = str(fd, "nhom_lop_id");
  const doiTuong = str(fd, "doi_tuong") as DoiTuongLop;
  const loaiKinhPhi = str(fd, "loai_kinh_phi") as LoaiKinhPhi;
  const ngayBatDau = str(fd, "ngay_bat_dau");
  const ngayKetThuc = str(fd, "ngay_ket_thuc");

  if (id && !UUID.test(id)) return { error: "Mã lớp không hợp lệ." };
  if (!str(fd, "ten")) return { error: "Tên lớp không được để trống." };
  if (!UUID.test(nhomLop)) return { error: "Hãy chọn nhóm lớp." };
  if (!DOI_TUONG.includes(doiTuong)) return { error: "Hãy chọn đối tượng." };
  if (!LOAI_KINH_PHI.includes(loaiKinhPhi)) return { error: "Hãy chọn loại kinh phí." };
  if (!DATE.test(ngayBatDau) || !DATE.test(ngayKetThuc)) return { error: "Hãy nhập ngày bắt đầu và ngày kết thúc." };

  const nhom = fd.getAll("nhom_du_dieu_kien").filter((v): v is NhomNhanSu => typeof v === "string" && NHOM.includes(v as NhomNhanSu));
  if (nhom.length === 0) return { error: "Hãy chọn ít nhất 1 nhóm đủ điều kiện đăng ký." };
  const chungChi = fd.getAll("chung_chi").filter((v): v is string => typeof v === "string" && UUID.test(v));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("luu_lop_hoc", {
    p_id: id || null,
    p_ten: str(fd, "ten"),
    p_nhom_lop: nhomLop,
    p_doi_tuong: doiTuong,
    p_loai_kinh_phi: loaiKinhPhi,
    p_ngay_bat_dau: ngayBatDau,
    p_ngay_ket_thuc: ngayKetThuc,
    p_dia_diem: str(fd, "dia_diem") || null,
    p_cong_khai_som: fd.get("cong_khai_som") === "on",
    p_nhom_du_dieu_kien: nhom,
    p_chung_chi: chungChi,
  });
  if (error) return fail(error);

  revalidateLop(id || (data as string));
  return { ok: true };
}

export async function doiTrangThaiLop(id: string, trangThai: TrangThaiLop): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id) || !TRANG_THAI.includes(trangThai)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("doi_trang_thai_lop", { p_lop: id, p_trang_thai: trangThai });
  if (error) return fail(error);

  revalidateLop(id);
  return { ok: true };
}

export async function xoaLopHoc(id: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Mã lớp không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("xoa_lop_hoc", { p_lop: id });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

// ---------- Bài ----------
export async function luuBaiHoc(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const id = str(fd, "id");
  const lopId = str(fd, "lop_id");
  if (!UUID.test(lopId) || (id && !UUID.test(id))) return { error: "Yêu cầu không hợp lệ." };
  if (!str(fd, "ten")) return { error: "Nội dung/tên Bài không được để trống." };

  const batDau = localInputToIso(str(fd, "bat_dau"));
  const ketThuc = localInputToIso(str(fd, "ket_thuc"));
  if (!batDau || !ketThuc) return { error: "Hãy nhập giờ bắt đầu và giờ kết thúc." };
  if (new Date(ketThuc) <= new Date(batDau)) return { error: "Giờ kết thúc phải sau giờ bắt đầu." };

  const soGv = Number(str(fd, "so_gv") || "0");
  const soTg = Number(str(fd, "so_tg") || "0");
  if (![soGv, soTg].every((n) => Number.isInteger(n) && n >= 0 && n <= 20)) {
    return { error: "Số slot mỗi vai trò phải là số nguyên từ 0 đến 20." };
  }
  if (soGv + soTg === 0) return { error: "Mỗi Bài cần ít nhất 1 slot (Giảng viên hoặc Trợ giảng)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("luu_bai_hoc", {
    p_id: id || null,
    p_lop: lopId,
    p_ten: str(fd, "ten"),
    p_bat_dau: batDau,
    p_ket_thuc: ketThuc,
    p_so_gv: soGv,
    p_so_tg: soTg,
  });
  if (error) return fail(error);

  revalidateLop(lopId);
  return { ok: true };
}

export async function xoaBaiHoc(id: string, lopId: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id) || !UUID.test(lopId)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("xoa_bai_hoc", { p_id: id });
  if (error) return fail(error);

  revalidateLop(lopId);
  return { ok: true };
}

// ---------- Kết quả C1 / C3, khảo sát ----------
function phanTram(fd: FormData, k: string): number | null | "loi" {
  const raw = str(fd, k).replace(",", ".");
  if (raw === "") return null; // để trống = xóa giá trị
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : "loi";
}

export async function datC1ThuCong(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const lopId = str(fd, "lop_id");
  const v = phanTram(fd, "c1");
  if (!UUID.test(lopId)) return { error: "Mã lớp không hợp lệ." };
  if (v === "loi") return { error: "C1 phải là số từ 0 đến 100." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("dat_c1_thu_cong", { p_lop: lopId, p_phan_tram: v });
  if (error) return fail(error);

  revalidateLop(lopId);
  return { ok: true };
}

export async function datC3(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const lopId = str(fd, "lop_id");
  const v = phanTram(fd, "c3");
  if (!UUID.test(lopId)) return { error: "Mã lớp không hợp lệ." };
  if (v === "loi") return { error: "C3 phải là số từ 0 đến 100." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("dat_c3", { p_lop: lopId, p_phan_tram: v });
  if (error) return fail(error);

  revalidateLop(lopId);
  return { ok: true };
}

export async function batTatKhaoSat(lopId: string, mo: boolean): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(lopId)) return { error: "Mã lớp không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bat_tat_khao_sat", { p_lop: lopId, p_mo: mo });
  if (error) return fail(error);

  revalidateLop(lopId);
  return { ok: true };
}

// ---------- Danh mục nhóm lớp (kèm hệ số D1) ----------
function parseD1(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 9.99 ? Math.round(n * 100) / 100 : null;
}

export async function themNhomLop(ten: string, d1: string): Promise<ActionState> {
  await requireQuanTri();
  const t = ten.trim();
  const he = parseD1(d1 || "1");
  if (!t) return { error: "Tên nhóm lớp không được để trống." };
  if (he === null) return { error: "Hệ số D1 phải là số lớn hơn 0 và không quá 9,99." };

  const supabase = await createClient();
  const { data: last } = await supabase.from("danh_muc_nhom_lop").select("thu_tu").order("thu_tu", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("danh_muc_nhom_lop").insert({ ten: t, he_so_d1: he, thu_tu: (last?.thu_tu ?? 0) + 1 });
  if (error) return fail(error);

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}

export async function suaNhomLop(id: string, ten: string, d1: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };
  const t = ten.trim();
  const he = parseD1(d1);
  if (!t) return { error: "Tên nhóm lớp không được để trống." };
  if (he === null) return { error: "Hệ số D1 phải là số lớn hơn 0 và không quá 9,99." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("danh_muc_nhom_lop").update({ ten: t, he_so_d1: he }).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length === 0) return { error: "Không tìm thấy nhóm lớp cần sửa." };

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}

// Nhóm lớp đã có lớp dùng thì không xóa, chỉ tắt để ẩn khỏi lựa chọn mới
export async function batTatNhomLop(id: string, dangDung: boolean): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("danh_muc_nhom_lop").update({ dang_dung: dangDung }).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length === 0) return { error: "Không tìm thấy nhóm lớp cần sửa." };

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}
