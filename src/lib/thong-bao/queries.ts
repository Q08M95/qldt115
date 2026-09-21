import "server-only";

import { createClient } from "@/lib/supabase/server";
import { COT_THONG_BAO } from "@/lib/thong-bao/hien-thi";
import type { ThongBao } from "@/types/database";

// Số thông báo chưa đọc cho huy hiệu ở chuông. Lỗi (vd bảng chưa có) không được làm sập cả khung ứng dụng -> trả 0.
export async function getSoChuaDoc(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("thong_bao").select("id", { count: "exact", head: true }).eq("da_doc", false);
  return error ? 0 : (count ?? 0);
}

export type LocThongBao = "tat-ca" | "chua-doc" | "can-hanh-dong";

export const SO_TREN_TRANG = 30;

export async function getThongBao(loc: LocThongBao = "tat-ca", tu = 0): Promise<ThongBao[]> {
  const supabase = await createClient();
  let q = supabase.from("thong_bao").select(COT_THONG_BAO).order("created_at", { ascending: false }).range(tu, tu + SO_TREN_TRANG - 1);
  if (loc === "chua-doc") q = q.eq("da_doc", false);
  if (loc === "can-hanh-dong") q = q.eq("muc_do", "can_hanh_dong").eq("da_doc", false);
  const { data, error } = await q;
  if (error) throw new Error(`Không đọc được thông báo: ${error.message}`);
  return (data ?? []) as ThongBao[];
}
