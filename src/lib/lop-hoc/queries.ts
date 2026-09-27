import "server-only";

import { cache } from "react";
import { DOI_TUONG_LABEL, LOAI_KINH_PHI_LABEL, TRANG_THAI_LOP_OPTIONS } from "@/lib/lop-hoc/labels";
import { sapXepLop } from "@/lib/lop-hoc/sap-xep";
import { boDau } from "@/lib/nhan-su/labels";
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

// Danh sách lớp kèm tiến độ theo vai trò. RLS lo việc ẩn lớp Dự kiến với GV/TG.
// Lấy TOÀN BỘ, không phân trang — chỉ dùng khi thực sự cần cả danh sách để gộp số liệu (vd Tổng quan đếm
// theo trạng thái/nhóm lớp). Trang danh sách lớp cho người dùng duyệt qua phải dùng getLopListTrang() bên dưới.
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

export const SO_DONG_LOP = 24;
// Thứ tự ưu tiên (sapXepLop: đang mở trước, còn hoạt động thì ngày gần nhất trước, đã xong thì mới nhất
// trước) trộn 2 chiều nên không diễn tả được bằng 1 cột ORDER BY đơn ở database — phải sắp lại ở JS sau khi
// tải về. Vì vậy chỉ tải tối đa ngần này lớp (đã qua các bộ lọc khác) rồi mới sắp xếp + cắt trang, tránh phải
// tải toàn bộ lịch sử nhiều năm mỗi lần vào trang; đủ dùng nhiều năm ở quy mô hiện tại (~vài chục lớp/quý).
const TRAN_LOP = 500;

export interface LocLop {
  trang: number;
  q: string;
  nhom_lop: string;
  trang_thai: string;
  doi_tuong: string;
  kinh_phi: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Danh sách lớp có phân trang, cho trang /lop-hoc duyệt qua — khác getLopList() ở trên (lấy hết, dùng để gộp số liệu).
export async function getLopListTrang(loc: LocLop): Promise<{ rows: LopHocTongHop[]; tong: number; capTaiVe: boolean }> {
  const supabase = await createClient();
  let query = supabase.from("lop_hoc_tong_hop").select("*");
  // .eq() trên cột uuid/enum ném lỗi nếu giá trị không hợp lệ (vd URL bị sửa tay) thay vì trả 0 dòng như so
  // sánh chuỗi thường — bỏ qua bộ lọc sai thay vì để trang sập, giống cách lọc-ở-JS trước đây vẫn "vô hại" khi sai.
  if (loc.nhom_lop && UUID.test(loc.nhom_lop)) query = query.eq("nhom_lop_id", loc.nhom_lop);
  if (loc.trang_thai && TRANG_THAI_LOP_OPTIONS.some(([v]) => v === loc.trang_thai)) query = query.eq("trang_thai_hien_thi", loc.trang_thai);
  if (loc.doi_tuong && loc.doi_tuong in DOI_TUONG_LABEL) query = query.eq("doi_tuong", loc.doi_tuong);
  if (loc.kinh_phi && loc.kinh_phi in LOAI_KINH_PHI_LABEL) query = query.eq("loai_kinh_phi", loc.kinh_phi);
  const { data, error } = await query.order("ngay_bat_dau", { ascending: false }).limit(TRAN_LOP);
  if (error) throw new Error(`Không đọc được danh sách lớp: ${error.message}`);

  let rows = (data ?? []).map((r) => chuanHoaLop(r as Record<string, unknown>));
  if (loc.q) {
    const tuKhoa = boDau(loc.q);
    rows = rows.filter((l) => boDau(l.ten).includes(tuKhoa) || boDau(l.dia_diem ?? "").includes(tuKhoa));
  }
  rows = sapXepLop(rows);

  const tu = (Math.max(1, loc.trang) - 1) * SO_DONG_LOP;
  return { rows: rows.slice(tu, tu + SO_DONG_LOP), tong: rows.length, capTaiVe: (data ?? []).length === TRAN_LOP };
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
