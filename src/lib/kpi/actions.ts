"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri } from "@/lib/auth/session";
import type { ActionState } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/server";
import type { TrangThaiKy } from "@/types/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TRANG_THAI: TrangThaiKy[] = ["dang_mo", "cho_duyet", "da_dong"];

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function fail(error: { message: string; code?: string }): ActionState {
  if (error.code === "42501") return { error: "Bạn không có quyền thực hiện thao tác này." };
  return { error: error.message };
}

function revalidateKy(id?: string) {
  revalidatePath("/cau-hinh/ky-danh-gia");
  if (id) revalidatePath(`/cau-hinh/ky-danh-gia/${id}`);
  // Ô "Kỳ đánh giá hiện tại" ở sidebar nằm trong layout
  revalidatePath("/", "layout");
}

// ---------- Kỳ đánh giá ----------
export async function luuKy(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const id = str(fd, "id");
  const ten = str(fd, "ten");
  const tu = str(fd, "tu");
  const den = str(fd, "den");
  if (id && !UUID.test(id)) return { error: "Mã kỳ không hợp lệ." };
  if (!ten) return { error: "Tên kỳ không được để trống." };
  if (!DATE.test(tu) || !DATE.test(den)) return { error: "Hãy nhập ngày bắt đầu và ngày kết thúc." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("luu_ky", { p_id: id || null, p_ten: ten, p_tu: tu, p_den: den });
  if (error) return fail(error);

  revalidateKy(id || undefined);
  return { ok: true };
}

export async function xoaKy(id: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Mã kỳ không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("xoa_ky", { p_id: id });
  if (error) return fail(error);
  revalidateKy();
  return { ok: true };
}

export async function doiTrangThaiKy(id: string, moi: TrangThaiKy): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id) || !TRANG_THAI.includes(moi)) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("doi_trang_thai_ky", { p_id: id, p_moi: moi });
  if (error) return fail(error);
  revalidateKy(id);
  // Đóng kỳ có thể sinh đề xuất đổi nhóm mới
  revalidatePath("/nhan-su/de-xuat");
  return { ok: true };
}

// ---------- Cấu hình KPI ----------
export interface CauHinhKpiPayload {
  nhom: Record<string, number>;
  tieu_chi: Record<string, { trong_so: number; bat: boolean }>;
  he_so: Record<string, number>;
  d1: Record<string, number>;
  tham_so: { min_nhom: number; so_ky_fallback: number; gop_c: number; doi_nhom_x: number; doi_nhom_y: number };
}

export async function luuCauHinhKpi(payload: CauHinhKpiPayload): Promise<ActionState> {
  await requireQuanTri();
  const so = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const hopLe =
    payload &&
    Object.values(payload.nhom ?? {}).every(so) &&
    Object.values(payload.tieu_chi ?? {}).every((t) => so(t.trong_so) && typeof t.bat === "boolean") &&
    Object.values(payload.he_so ?? {}).every(so) &&
    Object.values(payload.d1 ?? {}).every(so) &&
    Object.values(payload.tham_so ?? {}).every(so);
  if (!hopLe) return { error: "Có ô nhập chưa phải là số hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("luu_cau_hinh_kpi", { p: payload });
  if (error) return fail(error);

  revalidatePath("/cau-hinh/kpi");
  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}
