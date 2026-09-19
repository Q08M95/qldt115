import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ChungChi,
  ChuyenMonCuaNguoi,
  DanhMuc,
  DeXuatNhanSu,
  LichSuDoiNhom,
  NhomNhanSu,
  Profile,
  TrangThaiDeXuat,
} from "@/types/database";

// Supabase trả quan hệ 1-1 dạng object hoặc null, quan hệ 1-nhiều dạng mảng — chuẩn hóa về 1 dạng
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export interface NhanSuRow {
  id: string;
  email: string;
  ho_ten: string;
  avatar_url: string | null;
  vai_tro_giang_day: Profile["vai_tro_giang_day"];
  trang_thai_tham_gia: Profile["trang_thai_tham_gia"];
  co_quyen_quan_ly_lop: boolean;
  chuyen_mon: { id: string; ten: string }[];
  // Chỉ có giá trị khi người xem là Admin/Quản lý lớp (RLS trả rỗng với GV/TG — ẩn ở tầng database)
  nhom: NhomNhanSu | null;
}

export const getDanhMuc = cache(
  async (bang: "danh_muc_chuyen_mon" | "danh_muc_loai_chung_chi"): Promise<DanhMuc[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(bang)
      .select("id, ten, thu_tu, dang_dung")
      .order("thu_tu")
      .order("ten");
    if (error) throw new Error(`Không đọc được danh mục: ${error.message}`);
    return (data ?? []) as DanhMuc[];
  },
);

export async function getNhanSuList(): Promise<NhanSuRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, ho_ten, avatar_url, vai_tro_giang_day, trang_thai_tham_gia, co_quyen_quan_ly_lop, profile_chuyen_mon(chuyen_mon_id, danh_muc_chuyen_mon(ten)), nhan_su_nhom(nhom)",
    )
    .order("ho_ten");
  if (error) throw new Error(`Không đọc được danh sách nhân sự: ${error.message}`);

  return (data ?? []).map((r) => {
    const pcm = (r.profile_chuyen_mon ?? []) as unknown as {
      chuyen_mon_id: string;
      danh_muc_chuyen_mon: { ten: string } | { ten: string }[] | null;
    }[];
    return {
      id: r.id,
      email: r.email,
      ho_ten: r.ho_ten,
      avatar_url: r.avatar_url,
      vai_tro_giang_day: r.vai_tro_giang_day,
      trang_thai_tham_gia: r.trang_thai_tham_gia,
      co_quyen_quan_ly_lop: r.co_quyen_quan_ly_lop,
      chuyen_mon: pcm.map((x) => ({ id: x.chuyen_mon_id, ten: one(x.danh_muc_chuyen_mon)?.ten ?? "" })),
      nhom: one(r.nhan_su_nhom as unknown as { nhom: NhomNhanSu } | { nhom: NhomNhanSu }[] | null)?.nhom ?? null,
    };
  });
}

export interface NhanSuChiTiet {
  profile: Profile;
  chuyen_mon: ChuyenMonCuaNguoi[];
  chung_chi: ChungChi[];
  // Chỉ có khi người xem là Admin/Quản lý lớp
  nhom: NhomNhanSu | null;
  lich_su_doi_nhom: LichSuDoiNhom[];
}

export async function getNhanSuChiTiet(id: string): Promise<NhanSuChiTiet | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Không đọc được hồ sơ: ${error.message}`);
  if (!profile) return null;

  const [pcmRes, ccRes, nhomRes, lsRes] = await Promise.all([
    supabase
      .from("profile_chuyen_mon")
      .select("chuyen_mon_id, chi_tiet, danh_muc_chuyen_mon(ten)")
      .eq("user_id", id),
    supabase
      .from("chung_chi")
      .select("id, user_id, loai_id, so_chung_chi, noi_dung, ngay_cap, noi_cap, hinh_anh_path, danh_muc_loai_chung_chi(ten)")
      .eq("user_id", id)
      .order("ngay_cap", { ascending: false, nullsFirst: false }),
    supabase.from("nhan_su_nhom").select("nhom").eq("user_id", id).maybeSingle(),
    supabase
      .from("lich_su_doi_nhom")
      .select("id, nhom_cu, nhom_moi, ngay_hieu_luc, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);
  for (const r of [pcmRes, ccRes, nhomRes, lsRes]) {
    if (r.error) throw new Error(`Không đọc được dữ liệu hồ sơ: ${r.error.message}`);
  }

  const chuyen_mon = ((pcmRes.data ?? []) as unknown as {
    chuyen_mon_id: string;
    chi_tiet: string | null;
    danh_muc_chuyen_mon: { ten: string } | { ten: string }[] | null;
  }[]).map((x) => ({
    chuyen_mon_id: x.chuyen_mon_id,
    chi_tiet: x.chi_tiet,
    ten: one(x.danh_muc_chuyen_mon)?.ten ?? "",
  }));

  const ccRows = (ccRes.data ?? []) as unknown as (Omit<ChungChi, "loai_ten" | "hinh_anh_url"> & {
    danh_muc_loai_chung_chi: { ten: string } | { ten: string }[] | null;
  })[];

  // Bucket riêng tư: ký URL tạm 1 giờ cho từng ảnh
  const paths = ccRows.map((c) => c.hinh_anh_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("chung-chi").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const chung_chi: ChungChi[] = ccRows.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    loai_id: c.loai_id,
    loai_ten: one(c.danh_muc_loai_chung_chi)?.ten ?? "",
    so_chung_chi: c.so_chung_chi,
    noi_dung: c.noi_dung,
    ngay_cap: c.ngay_cap,
    noi_cap: c.noi_cap,
    hinh_anh_path: c.hinh_anh_path,
    hinh_anh_url: c.hinh_anh_path ? (urlByPath.get(c.hinh_anh_path) ?? null) : null,
  }));

  return {
    profile: profile as Profile,
    chuyen_mon,
    chung_chi,
    nhom: (nhomRes.data?.nhom as NhomNhanSu | undefined) ?? null,
    lich_su_doi_nhom: (lsRes.data ?? []) as LichSuDoiNhom[],
  };
}

export async function getDeXuatList(trangThai: TrangThaiDeXuat | "da_xu_ly"): Promise<DeXuatNhanSu[]> {
  const supabase = await createClient();
  let q = supabase
    .from("de_xuat_nhan_su")
    .select("id, loai, user_id, noi_dung, trang_thai, xu_ly_luc, created_at, profiles!de_xuat_nhan_su_user_id_fkey(ho_ten)")
    .order("created_at", { ascending: false });
  q = trangThai === "da_xu_ly" ? q.neq("trang_thai", "cho_duyet") : q.eq("trang_thai", trangThai);
  const { data, error } = await q;
  if (error) throw new Error(`Không đọc được đề xuất nhân sự: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    loai: r.loai,
    user_id: r.user_id,
    ho_ten: one(r.profiles as unknown as { ho_ten: string } | { ho_ten: string }[] | null)?.ho_ten ?? "",
    noi_dung: r.noi_dung,
    trang_thai: r.trang_thai,
    xu_ly_luc: r.xu_ly_luc,
    created_at: r.created_at,
  }));
}

export async function countDeXuatChoDuyet(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("de_xuat_nhan_su")
    .select("id", { count: "exact", head: true })
    .eq("trang_thai", "cho_duyet");
  return count ?? 0;
}
