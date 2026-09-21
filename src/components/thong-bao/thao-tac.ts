"use client";

import { createClient } from "@/lib/supabase/client";
import { COT_THONG_BAO, SU_KIEN_THONG_BAO_DOI } from "@/lib/thong-bao/hien-thi";
import type { ThongBao } from "@/types/database";

export type LocThongBao = "tat-ca" | "chua-doc" | "can-hanh-dong";

// Thao tác đọc/ghi thông báo từ trình duyệt (RLS chỉ cho đọc thông báo của mình và đánh dấu đã đọc)
export function baoDoiThongBao() {
  window.dispatchEvent(new Event(SU_KIEN_THONG_BAO_DOI));
}

export async function demChuaDoc(): Promise<number> {
  const { count } = await createClient().from("thong_bao").select("id", { count: "exact", head: true }).eq("da_doc", false);
  return count ?? 0;
}

export async function taiThongBao(gioiHan: number, tu = 0, loc: LocThongBao = "tat-ca"): Promise<ThongBao[]> {
  let q = createClient()
    .from("thong_bao")
    .select(COT_THONG_BAO)
    .order("created_at", { ascending: false })
    .range(tu, tu + gioiHan - 1);
  if (loc === "chua-doc") q = q.eq("da_doc", false);
  if (loc === "can-hanh-dong") q = q.eq("muc_do", "can_hanh_dong").eq("da_doc", false);
  const { data } = await q;
  return (data ?? []) as ThongBao[];
}

export async function danhDauDaDoc(id: string) {
  await createClient().from("thong_bao").update({ da_doc: true }).eq("id", id);
  baoDoiThongBao();
}

// Chỉ đánh dấu các thông báo "thông tin". Thông báo "cần hành động" (mời dạy, đăng ký/đề xuất cần duyệt, nhắc check-in) TỰ chuyển đã đọc khi việc
// đó được xử lý xong — bấm vào xem hoặc "đánh dấu tất cả" không làm chúng biến mất khi việc còn dang dở.
export async function danhDauTatCaDaDoc() {
  await createClient().from("thong_bao").update({ da_doc: true }).eq("da_doc", false).eq("muc_do", "thong_tin");
  baoDoiThongBao();
}
