"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri, requireSession } from "@/lib/auth/session";
import type { ActionState } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MUC = [100, 80, 60, 0];

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function fail(error: { message: string; code?: string }): { error: string } {
  if (error.code === "42501") return { error: "Bạn không có quyền thực hiện thao tác này." };
  return { error: error.message };
}

// Điểm danh/KPI hiển thị ở nhiều nơi (chi tiết lớp, Trang chủ, hồ sơ nhân sự, /danh-gia) -> làm mới cả khung ứng dụng
function lamMoi() {
  revalidatePath("/", "layout");
}

// Nút "Tôi đã có mặt" (mục 4.4): hàm SQL kiểm tra đúng người được phân công, đúng khung giờ, chưa check-in
export async function checkIn(baiId: string): Promise<ActionState & { b1?: number }> {
  await requireSession();
  if (!UUID.test(baiId)) return { error: "Mã Bài không hợp lệ." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_bai", { p_bai: baiId });
  if (error) return fail(error);
  lamMoi();
  return { ok: true, b1: Number(data) };
}

// Admin/Quản lý lớp chỉnh tay điểm danh (bắt buộc lý do; sẽ ghi Nhật ký hệ thống ở Giai đoạn 9)
export async function chinhDiemDanh(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const baiId = str(fd, "bai_id");
  const userId = str(fd, "user_id");
  const lyDo = str(fd, "ly_do");
  const raw = str(fd, "phan_tram").replace(",", ".");
  const phanTram = raw === "" ? NaN : Number(raw);
  if (!UUID.test(baiId) || !UUID.test(userId)) return { error: "Yêu cầu không hợp lệ." };
  if (!(phanTram >= 0 && phanTram <= 100)) return { error: "Điểm B1 phải từ 0 đến 100." };
  if (lyDo.length < 5) return { error: "Hãy nhập lý do chỉnh sửa (tối thiểu 5 ký tự)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("chinh_diem_danh", { p_bai: baiId, p_user: userId, p_phan_tram: phanTram, p_ly_do: lyDo });
  if (error) return fail(error);
  lamMoi();
  return { ok: true };
}

// Nhập/sửa điểm dự giờ C2 theo rubric 4 mức, gắn theo Bài cụ thể
export async function luuDuGio(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const baiId = str(fd, "bai_id");
  const userId = str(fd, "user_id");
  const muc = Number(str(fd, "muc"));
  if (!UUID.test(baiId) || !UUID.test(userId)) return { error: "Yêu cầu không hợp lệ." };
  if (!MUC.includes(muc) || str(fd, "muc") === "") return { error: "Hãy chọn một mức trong rubric." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("luu_danh_gia_du_gio", {
    p_bai: baiId,
    p_user: userId,
    p_muc: muc,
    p_ghi_chu: str(fd, "ghi_chu") || null,
  });
  if (error) return fail(error);
  lamMoi();
  return { ok: true };
}

export async function xoaDuGio(baiId: string, userId: string): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(baiId) || !UUID.test(userId)) return { error: "Yêu cầu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("xoa_danh_gia_du_gio", { p_bai: baiId, p_user: userId });
  if (error) return fail(error);
  lamMoi();
  return { ok: true };
}

export interface CauHinhDiemDanhPayload {
  checkin_truoc_phut: number;
  b1_tre_toi_da_phut: number;
  rubric: Record<string, { ten: string; mo_ta: string }>;
}

export async function luuCauHinhDiemDanh(payload: CauHinhDiemDanhPayload): Promise<ActionState> {
  await requireQuanTri();
  const hopLe =
    payload &&
    Number.isFinite(payload.checkin_truoc_phut) &&
    Number.isFinite(payload.b1_tre_toi_da_phut) &&
    Object.values(payload.rubric ?? {}).every((r) => typeof r.ten === "string" && typeof r.mo_ta === "string");
  if (!hopLe) return { error: "Có ô nhập chưa hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("luu_cau_hinh_diem_danh", { p: payload });
  if (error) return fail(error);
  revalidatePath("/cau-hinh/kpi");
  lamMoi();
  return { ok: true };
}
