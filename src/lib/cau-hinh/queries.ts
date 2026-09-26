import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface CauHinhDangKy {
  canh_bao_pool_nho: number; // người
  canh_bao_don_tai_ty_le: number; // 0..1
  matching_ty_trong_cong_bang: number; // 0..1
  matching_phat_cung_lop: number; // 0..1
}

const MAC_DINH: CauHinhDangKy = { canh_bao_pool_nho: 3, canh_bao_don_tai_ty_le: 0.7, matching_ty_trong_cong_bang: 0.8, matching_phat_cung_lop: 0.1 };

// Ngưỡng cảnh báo và tỷ trọng matching-score (mục 4.3/4.8) — cùng bảng cau_hinh_he_thong mà hàm SQL matching/cảnh báo đọc
export async function getCauHinhDangKy(): Promise<CauHinhDangKy> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cau_hinh_he_thong").select("khoa, gia_tri").in("khoa", Object.keys(MAC_DINH));
  if (error) throw new Error(`Không đọc được cấu hình đăng ký: ${error.message}`);
  const kv = Object.fromEntries((data ?? []).map((r) => [r.khoa, Number(r.gia_tri)]));
  return { ...MAC_DINH, ...Object.fromEntries(Object.entries(kv).filter(([, v]) => Number.isFinite(v))) };
}
