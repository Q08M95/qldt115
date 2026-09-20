"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri, requireSession } from "@/lib/auth/session";
import { chuanHoaThongBao } from "@/lib/lop-hoc/thong-bao";
import type { ActionState } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/server";
import type { NhanSuChoMoi, VaiTroGiangDay } from "@/types/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VAI_TRO: VaiTroGiangDay[] = ["giang_vien", "tro_giang"];

export interface KetQuaDangKy {
  bai_id: string;
  ok: boolean;
  thong_bao: string;
}
export type DangKyState = { ok?: boolean; error?: string; ketQua?: KetQuaDangKy[] } | null;
// Kết quả duyệt: nếu vượt ngưỡng dồn tải thì trả canhBao (mềm, không chặn) để Admin xác nhận rồi gọi lại
export type DuyetState = ActionState & { canhBao?: string };

function fail(error: { message: string; code?: string }): { error: string } {
  if (error.code === "42501") return { error: "Bạn không có quyền thực hiện thao tác này." };
  if (error.code === "23505") return { error: "Thao tác này đã được thực hiện trước đó." };
  return { error: chuanHoaThongBao(error.message) };
}

function revalidateLop() {
  revalidatePath("/lop-hoc", "layout");
  revalidatePath("/dang-ky");
}

// ---------- Luồng A: GV/TG đăng ký ----------
export async function dangKyBai(_prev: DangKyState, fd: FormData): Promise<DangKyState> {
  await requireSession();
  const ids = fd.getAll("bai_id").filter((v): v is string => typeof v === "string" && UUID.test(v));
  if (ids.length === 0) return { error: "Hãy chọn ít nhất 1 Bài để đăng ký." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dang_ky_bai", { p_bai_ids: ids });
  if (error) return fail(error);

  revalidateLop();
  const ketQua = (data ?? []) as KetQuaDangKy[];
  return { ok: ketQua.some((k) => k.ok), ketQua };
}

export async function rutDangKy(id: string): Promise<ActionState> {
  await requireSession();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rut_dang_ky", { p_id: id });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

// ---------- Admin: duyệt / từ chối / mời / thu hồi / hủy phân công ----------
export async function duyetDangKy(id: string, xacNhan: boolean): Promise<DuyetState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duyet_dang_ky", { p_id: id, p_xac_nhan: xacNhan });
  if (error) return fail(error);

  const kq = data as { ok?: boolean; canh_bao?: boolean; thong_bao?: string } | null;
  if (kq?.canh_bao) return { canhBao: kq.thong_bao ?? "Người này đã đảm nhiệm nhiều Bài trong lớp — vẫn duyệt?" };

  revalidateLop();
  return { ok: true };
}

export async function tuChoiDangKy(id: string, lyDo: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("tu_choi_dang_ky", { p_id: id, p_ly_do: lyDo.trim() || null });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

// Mời (Luồng B). ngoaiLe = true: mời người NGOÀI danh sách đủ điều kiện (vượt lọc cứng), bắt buộc có lý do.
// Người được mời vẫn phải đồng ý. Trùng lịch / đã có đăng ký ở cùng Bài vẫn bị chặn cứng (kiểm tra ở hàm SQL).
export async function moiGiangDay(baiId: string, vaiTro: VaiTroGiangDay, userId: string, ngoaiLe = false, lyDo = ""): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(baiId) || !UUID.test(userId) || !VAI_TRO.includes(vaiTro)) return { error: "Yêu cầu không hợp lệ." };
  if (ngoaiLe && !lyDo.trim()) return { error: "Hãy nhập lý do khi mời ngoại lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("moi_giang_day", {
    p_bai: baiId,
    p_vai: vaiTro,
    p_user: userId,
    p_ngoai_le: ngoaiLe,
    p_ly_do: lyDo.trim() || null,
  });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

// Danh sách mọi nhân sự kèm lý do không nằm trong đề xuất, nạp khi mở hộp thoại "Mời người ngoài đề xuất"
export async function nhanSuChoMoi(baiId: string, vaiTro: VaiTroGiangDay): Promise<{ error?: string; ds?: NhanSuChoMoi[] }> {
  await requireQuanTri();
  if (!UUID.test(baiId) || !VAI_TRO.includes(vaiTro)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nhan_su_cho_moi", { p_bai: baiId, p_vai: vaiTro });
  if (error) return fail(error);
  return { ds: (data ?? []) as NhanSuChoMoi[] };
}

export async function thuHoiLoiMoi(id: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("thu_hoi_loi_moi", { p_id: id });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

export async function huyPhanCong(slotId: string, lyDo: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(slotId)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("huy_phan_cong", { p_slot: slotId, p_ly_do: lyDo.trim() || null });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}

// ---------- Người được mời phản hồi ----------
export async function phanHoiLoiMoi(id: string, dongY: boolean): Promise<ActionState> {
  await requireSession();
  if (!UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("phan_hoi_loi_moi", { p_id: id, p_dong_y: dongY });
  if (error) return fail(error);

  revalidateLop();
  return { ok: true };
}
