import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NhatKy } from "@/types/database";

export const SO_DONG_NHAT_KY = 30;
// Trần số dòng khi xuất Excel (đủ cho họp xét duyệt; muốn nhiều hơn thì thu hẹp khoảng ngày)
export const TOI_DA_XUAT_NHAT_KY = 5000;

export interface LocNhatKy {
  loai: string;
  tu: string; // yyyy-mm-dd (giờ Việt Nam)
  den: string;
  q: string;
  trang: number;
}

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const COT = "id, created_at, nguoi_thuc_hien, nguoi_thuc_hien_ten, loai, doi_tuong, mo_ta, lien_ket, tu_duyet, ly_do, truoc, sau";

function ngayKeTiep(d: string) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

// Áp bộ lọc (loại, khoảng ngày theo giờ Việt Nam, từ khóa) lên truy vấn; dùng chung cho danh sách và xuất Excel
function apDungLoc<T extends { eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lt: (c: string, v: string) => T; or: (f: string) => T }>(q: T, loc: LocNhatKy): T {
  if (loc.loai) q = q.eq("loai", loc.loai);
  if (NGAY.test(loc.tu)) q = q.gte("created_at", `${loc.tu}T00:00:00+07:00`);
  if (NGAY.test(loc.den)) q = q.lt("created_at", `${ngayKeTiep(loc.den)}T00:00:00+07:00`);
  // Bỏ các ký tự có nghĩa trong cú pháp bộ lọc của PostgREST trước khi ghép vào or()
  const tuKhoa = loc.q.replace(/[,()%_*\\]/g, " ").trim();
  if (tuKhoa) q = q.or(`mo_ta.ilike.%${tuKhoa}%,doi_tuong.ilike.%${tuKhoa}%,nguoi_thuc_hien_ten.ilike.%${tuKhoa}%`);
  return q;
}

// RLS tự lọc: người quản trị thấy tất cả, GV/TG chỉ thấy dòng có tên mình
export async function getNhatKy(loc: LocNhatKy): Promise<{ rows: NhatKy[]; tong: number }> {
  const supabase = await createClient();
  const tu = (Math.max(1, loc.trang) - 1) * SO_DONG_NHAT_KY;
  const q = apDungLoc(
    supabase.from("audit_log").select(COT, { count: "exact" }).order("created_at", { ascending: false }).range(tu, tu + SO_DONG_NHAT_KY - 1),
    loc,
  );
  const { data, error, count } = await q;
  if (error) throw new Error(`Không đọc được nhật ký: ${error.message}`);
  return { rows: (data ?? []) as NhatKy[], tong: count ?? 0 };
}

// Toàn bộ dòng khớp bộ lọc (tối đa TOI_DA_XUAT_NHAT_KY) để xuất Excel; cũng theo RLS
export async function getNhatKyXuat(loc: LocNhatKy): Promise<{ rows: NhatKy[]; tong: number }> {
  const supabase = await createClient();
  const q = apDungLoc(
    supabase.from("audit_log").select(COT, { count: "exact" }).order("created_at", { ascending: false }).range(0, TOI_DA_XUAT_NHAT_KY - 1),
    loc,
  );
  const { data, error, count } = await q;
  if (error) throw new Error(`Không đọc được nhật ký: ${error.message}`);
  return { rows: (data ?? []) as NhatKy[], tong: count ?? 0 };
}
