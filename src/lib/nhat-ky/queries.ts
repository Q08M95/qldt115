import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NhatKy } from "@/types/database";

export const SO_DONG_NHAT_KY = 30;

export interface LocNhatKy {
  loai: string;
  tu: string; // yyyy-mm-dd (giờ Việt Nam)
  den: string;
  q: string;
  trang: number;
}

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

function ngayKeTiep(d: string) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

// RLS tự lọc: người quản trị thấy tất cả, GV/TG chỉ thấy dòng có tên mình
export async function getNhatKy(loc: LocNhatKy): Promise<{ rows: NhatKy[]; tong: number }> {
  const supabase = await createClient();
  const tu = (Math.max(1, loc.trang) - 1) * SO_DONG_NHAT_KY;
  let q = supabase
    .from("audit_log")
    .select("id, created_at, nguoi_thuc_hien, nguoi_thuc_hien_ten, loai, doi_tuong, mo_ta, lien_ket, tu_duyet, ly_do, truoc, sau", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(tu, tu + SO_DONG_NHAT_KY - 1);
  if (loc.loai) q = q.eq("loai", loc.loai);
  if (NGAY.test(loc.tu)) q = q.gte("created_at", `${loc.tu}T00:00:00+07:00`);
  if (NGAY.test(loc.den)) q = q.lt("created_at", `${ngayKeTiep(loc.den)}T00:00:00+07:00`);
  // Bỏ các ký tự có nghĩa trong cú pháp bộ lọc của PostgREST trước khi ghép vào or()
  const tuKhoa = loc.q.replace(/[,()%_*\\]/g, " ").trim();
  if (tuKhoa) q = q.or(`mo_ta.ilike.%${tuKhoa}%,doi_tuong.ilike.%${tuKhoa}%,nguoi_thuc_hien_ten.ilike.%${tuKhoa}%`);

  const { data, error, count } = await q;
  if (error) throw new Error(`Không đọc được nhật ký: ${error.message}`);
  return { rows: (data ?? []) as NhatKy[], tong: count ?? 0 };
}
