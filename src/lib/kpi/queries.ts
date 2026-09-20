import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getNhomLop } from "@/lib/lop-hoc/queries";
import type { CauHinhKpi, KpiKyRow, KyDanhGia, ThamSoKpi } from "@/types/database";

const num = (v: unknown) => Number(v);

export const getKyList = cache(async (): Promise<KyDanhGia[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ky_danh_gia")
    .select("id, ten, tu, den, trang_thai, dong_luc")
    .order("tu", { ascending: false });
  if (error) throw new Error(`Không đọc được danh sách kỳ đánh giá: ${error.message}`);
  return (data ?? []) as KyDanhGia[];
});

export async function getKy(id: string): Promise<KyDanhGia | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ky_danh_gia")
    .select("id, ten, tu, den, trang_thai, dong_luc")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được kỳ đánh giá: ${error.message}`);
  return (data as KyDanhGia | null) ?? null;
}

// Kỳ chứa ngày hôm nay (giờ Việt Nam) + số ngày còn lại — cho ô "Kỳ đánh giá hiện tại" ở sidebar
export const getKyHienTai = cache(async (): Promise<{ name: string; daysLeft: number } | null> => {
  const supabase = await createClient();
  const homNay = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const { data } = await supabase
    .from("ky_danh_gia")
    .select("ten, den")
    .lte("tu", homNay)
    .gte("den", homNay)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const ngay = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return { name: data.ten, daysLeft: Math.round((ngay(data.den) - ngay(homNay)) / 86_400_000) };
});

// Gợi ý kỳ tiếp theo khi tạo kỳ mới: quý ngay sau kỳ muộn nhất (hoặc quý hiện tại nếu chưa có kỳ nào)
export function goiYKyTiepTheo(list: KyDanhGia[]): { ten: string; tu: string; den: string } {
  const muonNhat = list.reduce<string | null>((m, k) => (m === null || k.den > m ? k.den : m), null);
  const goc = muonNhat
    ? new Date(Date.UTC(+muonNhat.slice(0, 4), +muonNhat.slice(5, 7) - 1, +muonNhat.slice(8, 10) + 1))
    : new Date();
  const nam = goc.getUTCFullYear();
  const quy = Math.floor(goc.getUTCMonth() / 3);
  const pad = (n: number) => String(n).padStart(2, "0");
  const cuoi = new Date(Date.UTC(nam, quy * 3 + 3, 0));
  return {
    ten: `Quý ${quy + 1}/${nam}`,
    tu: `${nam}-${pad(quy * 3 + 1)}-01`,
    den: `${cuoi.getUTCFullYear()}-${pad(cuoi.getUTCMonth() + 1)}-${pad(cuoi.getUTCDate())}`,
  };
}

// KPI của 1 kỳ. Kỳ chờ duyệt: hàm SQL chỉ trả cho người quản trị (mảng rỗng với người khác).
export async function getKpiKy(kyId: string): Promise<KpiKyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kpi_ky", { p_ky: kyId });
  if (error) throw new Error(`Không tính được KPI của kỳ: ${error.message}`);
  const map = (o: unknown) =>
    Object.fromEntries(Object.entries((o ?? {}) as Record<string, unknown>).map(([k, v]) => [k, num(v)])) as Record<string, number>;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    user_id: r.user_id as string,
    ho_ten: r.ho_ten as string,
    avatar_url: (r.avatar_url as string | null) ?? null,
    vai_tro: (r.vai_tro as KpiKyRow["vai_tro"]) ?? null,
    kpi: num(r.kpi),
    hang: num(r.hang),
    diem_nhom: map(r.diem_nhom),
    gia_tri: map(r.gia_tri),
    trong_so_hieu_luc: map(r.trong_so_hieu_luc),
    gio_thuc: num(r.gio_thuc),
    gio_quy_doi: num(r.gio_quy_doi),
    so_bai: num(r.so_bai),
    so_lop: num(r.so_lop),
    a4_ky: num(r.a4_ky),
    a4_luy_ke: num(r.a4_luy_ke),
    che_do_a1: (r.che_do_a1 as KpiKyRow["che_do_a1"]) ?? null,
    percentile: r.percentile === null ? null : num(r.percentile),
  }));
}

export async function getCauHinhKpi(): Promise<CauHinhKpi> {
  const supabase = await createClient();
  const [nhomRes, tcRes, hsRes, chRes, nhomLop] = await Promise.all([
    supabase.from("nhom_tieu_chi").select("ma, ten, trong_so, thu_tu").order("thu_tu"),
    supabase.from("tieu_chi_con").select("ma, nhom, ten, nguon, don_vi, trong_so, bat, tinh_vao_kpi, thu_tu").order("thu_tu"),
    supabase.from("he_so_do_kho").select("ma, ten, gia_tri").order("ma"),
    supabase.from("cau_hinh_he_thong").select("khoa, gia_tri").like("khoa", "kpi\\_%"),
    getNhomLop(),
  ]);
  for (const r of [nhomRes, tcRes, hsRes, chRes]) {
    if (r.error) throw new Error(`Không đọc được cấu hình KPI: ${r.error.message}`);
  }
  const kv = Object.fromEntries((chRes.data ?? []).map((r) => [r.khoa, num(r.gia_tri)]));
  const thamSo: ThamSoKpi = {
    min_nhom: kv.kpi_min_nhom_percentile ?? 5,
    so_ky_fallback: kv.kpi_so_ky_fallback ?? 3,
    gop_c: kv.kpi_gop_c ?? 0,
    doi_nhom_x: kv.kpi_doi_nhom_x ?? 85,
    doi_nhom_y: kv.kpi_doi_nhom_y ?? 3,
  };
  return {
    nhom: (nhomRes.data ?? []).map((r) => ({ ...r, trong_so: num(r.trong_so) })),
    tieuChi: (tcRes.data ?? []).map((r) => ({ ...r, trong_so: num(r.trong_so) })),
    heSo: (hsRes.data ?? []).map((r) => ({ ...r, gia_tri: num(r.gia_tri) })),
    nhomLop,
    thamSo,
  };
}
