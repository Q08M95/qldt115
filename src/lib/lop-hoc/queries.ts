import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  BaiHoc,
  KhaoSatLop,
  LopHocTongHop,
  NhomLop,
  NhomNhanSu,
  SlotGiangDay,
  VaiTroGiangDay,
  TrangThaiSlot,
} from "@/types/database";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export const getNhomLop = cache(async (): Promise<NhomLop[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("danh_muc_nhom_lop")
    .select("id, ten, he_so_d1, thu_tu, dang_dung")
    .order("thu_tu")
    .order("ten");
  if (error) throw new Error(`Không đọc được danh mục nhóm lớp: ${error.message}`);
  // numeric trả về dạng số hoặc chuỗi tùy driver — chuẩn hóa về number
  return (data ?? []).map((r) => ({ ...r, he_so_d1: Number(r.he_so_d1) })) as NhomLop[];
});

function chuanHoaLop(r: Record<string, unknown>): LopHocTongHop {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(r as unknown as LopHocTongHop),
    he_so_d1: Number(r.he_so_d1),
    c1_phan_tram: num(r.c1_phan_tram),
    c3_phan_tram: num(r.c3_phan_tram),
  };
}

// Danh sách lớp kèm tiến độ theo vai trò. RLS lo việc ẩn lớp Nháp với GV/TG.
export async function getLopList(): Promise<LopHocTongHop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lop_hoc_tong_hop")
    .select("*")
    .order("ngay_bat_dau", { ascending: false })
    .order("ten");
  if (error) throw new Error(`Không đọc được danh sách lớp: ${error.message}`);
  return (data ?? []).map((r) => chuanHoaLop(r as Record<string, unknown>));
}

export interface LopChiTiet {
  lop: LopHocTongHop;
  bai: BaiHoc[];
  // Chỉ có khi người xem là Admin/Quản lý lớp (RLS trả rỗng với GV/TG — ẩn nhãn nhóm)
  nhom_du_dieu_kien: NhomNhanSu[];
  chung_chi_yeu_cau: { id: string; ten: string }[];
  // Chỉ người quản trị đọc được
  khao_sat: KhaoSatLop | null;
}

export async function getLopChiTiet(id: string): Promise<LopChiTiet | null> {
  const supabase = await createClient();

  const [lopRes, baiRes, nhomRes, ccRes, ksRes, phRes] = await Promise.all([
    supabase.from("lop_hoc_tong_hop").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("bai_hoc")
      .select(
        "id, lop_id, thu_tu, ten, bat_dau, ket_thuc, slot_giang_day(id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong, profiles(id, ho_ten, avatar_url))",
      )
      .eq("lop_id", id)
      .order("bat_dau")
      .order("thu_tu"),
    supabase.from("lop_hoc_nhom_du_dieu_kien").select("nhom").eq("lop_id", id),
    supabase.from("lop_hoc_chung_chi_yeu_cau").select("loai_id, danh_muc_loai_chung_chi(ten)").eq("lop_id", id),
    supabase.from("lop_hoc_khao_sat").select("token, mo").eq("lop_id", id).maybeSingle(),
    supabase.from("khao_sat_phan_hoi").select("id", { count: "exact", head: true }).eq("lop_id", id),
  ]);
  for (const r of [lopRes, baiRes, nhomRes, ccRes, ksRes, phRes]) {
    if (r.error) throw new Error(`Không đọc được dữ liệu lớp: ${r.error.message}`);
  }
  if (!lopRes.data) return null;

  type SlotRow = {
    id: string;
    vai_tro: VaiTroGiangDay;
    vi_tri: number;
    trang_thai: TrangThaiSlot;
    profiles: { id: string; ho_ten: string; avatar_url: string | null } | { id: string; ho_ten: string; avatar_url: string | null }[] | null;
  };
  const bai: BaiHoc[] = (baiRes.data ?? []).map((b) => {
    const slots = ((b.slot_giang_day ?? []) as unknown as SlotRow[])
      .map<SlotGiangDay>((s) => ({
        id: s.id,
        vai_tro: s.vai_tro,
        vi_tri: s.vi_tri,
        trang_thai: s.trang_thai,
        nguoi: one(s.profiles),
      }))
      // Giảng viên trước Trợ giảng, rồi theo vị trí
      .sort((x, y) => (x.vai_tro === y.vai_tro ? x.vi_tri - y.vi_tri : x.vai_tro === "giang_vien" ? -1 : 1));
    return { id: b.id, lop_id: b.lop_id, thu_tu: b.thu_tu, ten: b.ten, bat_dau: b.bat_dau, ket_thuc: b.ket_thuc, slots };
  });

  return {
    lop: chuanHoaLop(lopRes.data as Record<string, unknown>),
    bai,
    nhom_du_dieu_kien: (nhomRes.data ?? []).map((r) => r.nhom as NhomNhanSu),
    chung_chi_yeu_cau: (ccRes.data ?? []).map((r) => ({
      id: r.loai_id,
      ten: one(r.danh_muc_loai_chung_chi as unknown as { ten: string } | { ten: string }[] | null)?.ten ?? "",
    })),
    khao_sat: ksRes.data ? { token: ksRes.data.token, mo: ksRes.data.mo, so_phan_hoi: phRes.count ?? 0 } : null,
  };
}
