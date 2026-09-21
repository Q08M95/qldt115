import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BaiCheckIn,
  BaiDaDay,
  CauHinhDiemDanh,
  DiemDanh,
  DuGio,
  KpiCaNhan,
  KpiCaNhanKy,
  MucDuGio,
  RubricMuc,
  TienDoDoiNhom,
  VaiTroGiangDay,
} from "@/types/database";

const num = (v: unknown) => Number(v);
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const soMap = (o: unknown) =>
  Object.fromEntries(Object.entries((o ?? {}) as Record<string, unknown>).map(([k, v]) => [k, num(v)])) as Record<string, number>;

// Các Bài của tôi đang trong khung giờ check-in (từ N phút trước giờ học đến hết giờ học)
export async function getBaiCanCheckIn(): Promise<BaiCheckIn[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bai_can_check_in");
  if (error) throw new Error(`Không đọc được các Bài cần check-in: ${error.message}`);
  return ((data ?? []) as BaiCheckIn[]).map((b) => ({ ...b, b1_phan_tram: b.b1_phan_tram === null ? null : num(b.b1_phan_tram) }));
}

// Điểm danh của các Bài trong 1 lớp (công khai nội bộ). Khóa: `${bai_id}:${user_id}`
export async function getDiemDanhTheoBai(baiIds: string[]): Promise<Map<string, DiemDanh>> {
  const map = new Map<string, DiemDanh>();
  if (baiIds.length === 0) return map;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diem_danh_bai")
    .select("bai_id, user_id, check_in_luc, b1_phan_tram, chinh_tay, ly_do_chinh")
    .in("bai_id", baiIds);
  if (error) throw new Error(`Không đọc được điểm danh: ${error.message}`);
  for (const r of data ?? []) {
    map.set(`${r.bai_id}:${r.user_id}`, { ...r, b1_phan_tram: num(r.b1_phan_tram) } as DiemDanh);
  }
  return map;
}

export async function getRubric(): Promise<RubricMuc[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rubric_du_gio").select("muc, ten, mo_ta").order("muc", { ascending: false });
  if (error) throw new Error(`Không đọc được rubric dự giờ: ${error.message}`);
  return (data ?? []).map((r) => ({ muc: num(r.muc) as MucDuGio, ten: r.ten, mo_ta: r.mo_ta }));
}

export async function getCauHinhDiemDanh(): Promise<CauHinhDiemDanh> {
  const supabase = await createClient();
  const [ch, rubric] = await Promise.all([
    supabase.from("cau_hinh_he_thong").select("khoa, gia_tri").in("khoa", ["checkin_truoc_phut", "b1_tre_toi_da_phut", "nhac_check_in_truoc_phut"]),
    getRubric(),
  ]);
  if (ch.error) throw new Error(`Không đọc được cấu hình điểm danh: ${ch.error.message}`);
  const kv = Object.fromEntries((ch.data ?? []).map((r) => [r.khoa, num(r.gia_tri)]));
  return {
    checkin_truoc_phut: kv.checkin_truoc_phut ?? 45,
    b1_tre_toi_da_phut: kv.b1_tre_toi_da_phut ?? 30,
    nhac_check_in_truoc_phut: kv.nhac_check_in_truoc_phut ?? 30,
    rubric,
  };
}

// KPI cá nhân nhiều kỳ + A4 + tiến độ đổi nhóm. Hàm SQL tự áp quyền xem kỳ Chờ duyệt và chỉ trả tiến độ đổi nhóm cho chính chủ/quản trị.
export async function getKpiCaNhan(userId: string): Promise<KpiCaNhan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kpi_ca_nhan", { p_user: userId });
  if (error) throw new Error(`Không đọc được KPI cá nhân: ${error.message}`);
  const d = (data ?? {}) as Record<string, unknown>;
  const ky = ((d.ky ?? []) as Record<string, unknown>[]).map(
    (r): KpiCaNhanKy => ({
      ky_id: r.ky_id as string,
      ten: r.ten as string,
      tu: r.tu as string,
      den: r.den as string,
      trang_thai: r.trang_thai as KpiCaNhanKy["trang_thai"],
      kpi: r.kpi === null || r.kpi === undefined ? null : num(r.kpi),
      diem_nhom: soMap(r.diem_nhom),
      gia_tri: soMap(r.gia_tri),
      trong_so_hieu_luc: soMap(r.trong_so_hieu_luc),
      gio_thuc: num(r.gio_thuc ?? 0),
      gio_quy_doi: num(r.gio_quy_doi ?? 0),
      so_bai: num(r.so_bai ?? 0),
      so_lop: num(r.so_lop ?? 0),
      che_do_a1: (r.che_do_a1 as KpiCaNhanKy["che_do_a1"]) ?? null,
      percentile: r.percentile === null || r.percentile === undefined ? null : num(r.percentile),
    }),
  );
  const td = d.tien_do as Record<string, unknown> | null;
  const tienDo: TienDoDoiNhom | null = td
    ? { huong: td.huong as TienDoDoiNhom["huong"], nguong: num(td.nguong), so_ky_can: num(td.so_ky_can), so_ky_dat: num(td.so_ky_dat) }
    : null;
  return { ky, a4_tong: num(d.a4_tong ?? 0), so_ky_fallback: num(d.so_ky_fallback ?? 3), tien_do: tienDo };
}

// Các Bài đã bắt đầu mà 1 người được phân công (mới nhất trước) kèm điểm danh B1 và điểm dự giờ C2.
// Bản ghi dự giờ chỉ người quản trị và chính người được chấm đọc được (RLS) — trang gọi hàm này cho Admin.
export async function getBaiDaDay(userId: string, gioiHan = 12): Promise<BaiDaDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("slot_giang_day")
    .select("vai_tro, bai_hoc!inner(id, ten, bat_dau, ket_thuc, lop_hoc!inner(id, ten, trang_thai))")
    .eq("nguoi_phan_cong", userId)
    .lte("bai_hoc.bat_dau", new Date().toISOString())
    .neq("bai_hoc.lop_hoc.trang_thai", "da_huy")
    .limit(500);
  if (error) throw new Error(`Không đọc được các Bài đã dạy: ${error.message}`);

  type Lop = { id: string; ten: string };
  type Bai = { id: string; ten: string; bat_dau: string; ket_thuc: string; lop_hoc: Lop | Lop[] | null };
  const dong = ((data ?? []) as unknown as { vai_tro: VaiTroGiangDay; bai_hoc: Bai | Bai[] | null }[])
    .map((r) => {
      const b = one(r.bai_hoc);
      const l = one(b?.lop_hoc ?? null);
      return b && l ? { vai_tro: r.vai_tro, b, l } : null;
    })
    .filter((x): x is { vai_tro: VaiTroGiangDay; b: Bai; l: Lop } => x !== null)
    .sort((x, y) => y.b.bat_dau.localeCompare(x.b.bat_dau))
    .slice(0, gioiHan);
  if (dong.length === 0) return [];

  const baiIds = dong.map((x) => x.b.id);
  const [dd, dg] = await Promise.all([
    supabase
      .from("diem_danh_bai")
      .select("bai_id, user_id, check_in_luc, b1_phan_tram, chinh_tay, ly_do_chinh")
      .eq("user_id", userId)
      .in("bai_id", baiIds),
    supabase.from("danh_gia_du_gio").select("bai_id, user_id, muc_diem, ghi_chu").eq("user_id", userId).in("bai_id", baiIds),
  ]);
  if (dd.error) throw new Error(`Không đọc được điểm danh: ${dd.error.message}`);
  if (dg.error) throw new Error(`Không đọc được điểm dự giờ: ${dg.error.message}`);
  const ddMap = new Map((dd.data ?? []).map((r) => [r.bai_id, { ...r, b1_phan_tram: num(r.b1_phan_tram) } as DiemDanh]));
  const dgMap = new Map((dg.data ?? []).map((r) => [r.bai_id, { ...r, muc_diem: num(r.muc_diem) as MucDuGio } as DuGio]));

  return dong.map((x) => ({
    bai_id: x.b.id,
    bai_ten: x.b.ten,
    lop_id: x.l.id,
    lop_ten: x.l.ten,
    bat_dau: x.b.bat_dau,
    ket_thuc: x.b.ket_thuc,
    vai_tro: x.vai_tro,
    diem_danh: ddMap.get(x.b.id) ?? null,
    du_gio: dgMap.get(x.b.id) ?? null,
  }));
}
