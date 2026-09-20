import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DangKyCho, KhaNangBai, LoaiDangKy, UngVien, VaiTroGiangDay } from "@/types/database";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type Nguoi = { ho_ten: string; avatar_url: string | null };

export interface DangKyLop {
  goi_y: UngVien[];
  // Người quản trị: mọi đăng ký/lời mời đang chờ của lớp. GV/TG: chỉ của chính mình (RLS).
  dang_ky_cho: DangKyCho[];
  // Khả năng đăng ký của chính người xem theo từng Bài (rỗng nếu không xem được lớp)
  kha_nang: KhaNangBai[];
  // Cảnh báo pool nhỏ khi số ứng viên dưới ngưỡng này
  nguong_pool: number;
}

// Gợi ý matching-score (công khai), đăng ký chờ xử lý, khả năng đăng ký — 1 lượt song song cho trang chi tiết lớp
export async function getDangKyLop(lopId: string): Promise<DangKyLop> {
  const supabase = await createClient();
  const [goiYRes, choRes, khaNangRes, cfgRes] = await Promise.all([
    supabase.rpc("goi_y_lop", { p_lop: lopId }),
    supabase
      .from("dang_ky_giang_day")
      .select("id, bai_id, vai_tro, user_id, loai, created_at, ngoai_le, ly_do_ngoai_le, vuot_loc, profiles(ho_ten, avatar_url), bai_hoc!inner(lop_id)")
      .eq("bai_hoc.lop_id", lopId)
      .eq("trang_thai", "cho_xu_ly")
      .order("created_at"),
    supabase.rpc("kha_nang_dang_ky_lop", { p_lop: lopId }),
    supabase.from("cau_hinh_he_thong").select("gia_tri").eq("khoa", "canh_bao_pool_nho").maybeSingle(),
  ]);
  for (const r of [goiYRes, choRes, khaNangRes, cfgRes]) {
    if (r.error) throw new Error(`Không đọc được dữ liệu đăng ký: ${r.error.message}`);
  }

  return {
    goi_y: ((goiYRes.data ?? []) as UngVien[]).map((u) => ({ ...u, diem: Number(u.diem), gio_ky: Number(u.gio_ky) })),
    dang_ky_cho: ((choRes.data ?? []) as unknown as {
      id: string;
      bai_id: string;
      vai_tro: VaiTroGiangDay;
      user_id: string;
      loai: LoaiDangKy;
      created_at: string;
      ngoai_le: boolean;
      ly_do_ngoai_le: string | null;
      vuot_loc: string | null;
      profiles: Nguoi | Nguoi[] | null;
    }[]).map((r) => ({
      id: r.id,
      bai_id: r.bai_id,
      vai_tro: r.vai_tro,
      user_id: r.user_id,
      loai: r.loai,
      created_at: r.created_at,
      ngoai_le: r.ngoai_le,
      ly_do_ngoai_le: r.ly_do_ngoai_le,
      vuot_loc: r.vuot_loc,
      ho_ten: one(r.profiles)?.ho_ten ?? "",
      avatar_url: one(r.profiles)?.avatar_url ?? null,
    })),
    kha_nang: (khaNangRes.data ?? []) as KhaNangBai[],
    nguong_pool: Number(cfgRes.data?.gia_tri ?? 3),
  };
}

type BaiLop = {
  id: string;
  ten: string;
  bat_dau: string;
  ket_thuc: string;
  lop_hoc: { id: string; ten: string } | { id: string; ten: string }[] | null;
};

export interface ViecCuaToi {
  // Lời mời đang chờ phản hồi + đăng ký của mình đang chờ duyệt
  dang_cho: {
    id: string;
    loai: LoaiDangKy;
    vai_tro: VaiTroGiangDay;
    bai: { id: string; ten: string; bat_dau: string; ket_thuc: string; lop_id: string; lop_ten: string };
  }[];
  // Slot đã được phân công (sắp tới trước)
  da_phan_cong: {
    slot_id: string;
    vai_tro: VaiTroGiangDay;
    bai: { id: string; ten: string; bat_dau: string; ket_thuc: string; lop_id: string; lop_ten: string };
  }[];
  // Chỉ người quản trị: hàng đợi đăng ký cần duyệt toàn đơn vị
  can_duyet: {
    id: string;
    vai_tro: VaiTroGiangDay;
    user_id: string;
    ho_ten: string;
    avatar_url: string | null;
    created_at: string;
    bai: { id: string; ten: string; bat_dau: string; ket_thuc: string; lop_id: string; lop_ten: string };
  }[];
}

const BAI_SELECT = "bai_hoc(id, ten, bat_dau, ket_thuc, lop_hoc(id, ten))";

function chuanBai(b: BaiLop | BaiLop[] | null) {
  const bai = one(b);
  const lop = one(bai?.lop_hoc ?? null);
  return {
    id: bai?.id ?? "",
    ten: bai?.ten ?? "",
    bat_dau: bai?.bat_dau ?? "",
    ket_thuc: bai?.ket_thuc ?? "",
    lop_id: lop?.id ?? "",
    lop_ten: lop?.ten ?? "",
  };
}

// Trang "Đăng ký giảng dạy": việc của tôi + (người quản trị) hàng đợi cần duyệt
export async function getViecCuaToi(userId: string, isQuanTri: boolean): Promise<ViecCuaToi> {
  const supabase = await createClient();
  const [choRes, slotRes, duyetRes] = await Promise.all([
    supabase
      .from("dang_ky_giang_day")
      .select(`id, loai, vai_tro, ${BAI_SELECT}`)
      .eq("user_id", userId)
      .eq("trang_thai", "cho_xu_ly")
      .order("created_at"),
    supabase
      .from("slot_giang_day")
      .select(`id, vai_tro, ${BAI_SELECT}`)
      .eq("nguoi_phan_cong", userId),
    isQuanTri
      ? supabase
          .from("dang_ky_giang_day")
          .select(`id, vai_tro, user_id, created_at, profiles(ho_ten, avatar_url), ${BAI_SELECT}`)
          .eq("loai", "tu_dang_ky")
          .eq("trang_thai", "cho_xu_ly")
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [choRes, slotRes, duyetRes]) {
    if (r.error) throw new Error(`Không đọc được việc của tôi: ${r.error.message}`);
  }

  return {
    dang_cho: ((choRes.data ?? []) as unknown as { id: string; loai: LoaiDangKy; vai_tro: VaiTroGiangDay; bai_hoc: BaiLop | BaiLop[] | null }[]).map((r) => ({
      id: r.id,
      loai: r.loai,
      vai_tro: r.vai_tro,
      bai: chuanBai(r.bai_hoc),
    })),
    da_phan_cong: ((slotRes.data ?? []) as unknown as { id: string; vai_tro: VaiTroGiangDay; bai_hoc: BaiLop | BaiLop[] | null }[])
      .map((r) => ({ slot_id: r.id, vai_tro: r.vai_tro, bai: chuanBai(r.bai_hoc) }))
      .sort((a, b) => a.bai.bat_dau.localeCompare(b.bai.bat_dau)),
    can_duyet: ((duyetRes.data ?? []) as unknown as {
      id: string;
      vai_tro: VaiTroGiangDay;
      user_id: string;
      created_at: string;
      profiles: Nguoi | Nguoi[] | null;
      bai_hoc: BaiLop | BaiLop[] | null;
    }[]).map((r) => ({
      id: r.id,
      vai_tro: r.vai_tro,
      user_id: r.user_id,
      created_at: r.created_at,
      ho_ten: one(r.profiles)?.ho_ten ?? "",
      avatar_url: one(r.profiles)?.avatar_url ?? null,
      bai: chuanBai(r.bai_hoc),
    })),
  };
}
