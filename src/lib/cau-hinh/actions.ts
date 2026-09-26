"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri } from "@/lib/auth/session";
import type { CauHinhDangKy } from "@/lib/cau-hinh/queries";
import type { ActionState } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/server";

const trong = (v: unknown, tu: number, den: number) => typeof v === "number" && Number.isFinite(v) && v >= tu && v <= den;

// Lưu ngưỡng cảnh báo + tỷ trọng matching-score. RLS chỉ cho người quản trị sửa; trigger Nhật ký ghi giá trị trước/sau.
export async function luuCauHinhDangKy(p: CauHinhDangKy): Promise<ActionState> {
  await requireQuanTri();
  const hopLe =
    p &&
    Number.isInteger(p.canh_bao_pool_nho) &&
    trong(p.canh_bao_pool_nho, 1, 50) &&
    trong(p.canh_bao_don_tai_ty_le, 0.01, 1) &&
    trong(p.matching_ty_trong_cong_bang, 0, 1) &&
    trong(p.matching_phat_cung_lop, 0, 1);
  if (!hopLe) return { error: "Có ô nhập chưa hợp lệ." };

  const supabase = await createClient();
  for (const [khoa, gia_tri] of Object.entries(p)) {
    const { error } = await supabase.from("cau_hinh_he_thong").update({ gia_tri, updated_at: new Date().toISOString() }).eq("khoa", khoa);
    if (error) return { error: error.code === "42501" ? "Bạn không có quyền thực hiện thao tác này." : error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
