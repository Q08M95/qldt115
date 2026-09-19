"use server";

import { revalidatePath } from "next/cache";
import { requireQuanTri, requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { DanhMucBang, LoaiDeXuat, NhomNhanSu, TrangThaiThamGia } from "@/types/database";

export type ActionState = { ok?: boolean; error?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DANH_MUC_BANG: DanhMucBang[] = ["danh_muc_chuyen_mon", "danh_muc_loai_chung_chi"];
const TRANG_THAI: TrangThaiThamGia[] = ["dang_tham_gia", "tam_ngung", "khong_con_tham_gia"];
const NHOM: NhomNhanSu[] = ["ban_giam_doc", "gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"];
const LOAI_DE_XUAT: LoaiDeXuat[] = ["phan_cong", "dao_tao", "khen_thuong_nhac_nho", "doi_nhom"];

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function strOrNull(fd: FormData, k: string) {
  return str(fd, k) || null;
}

function fail(error: { message: string; code?: string }): ActionState {
  if (error.code === "23505") return { error: "Giá trị này đã tồn tại." };
  if (error.code === "42501") return { error: "Bạn không có quyền thực hiện thao tác này." };
  return { error: error.message };
}

function revalidateNhanSu(userId?: string) {
  revalidatePath("/nhan-su");
  if (userId) revalidatePath(`/nhan-su/${userId}`);
}

// ---------- Hồ sơ cá nhân + chuyên môn (chủ hồ sơ hoặc người quản trị) ----------
export async function capNhatHoSo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const userId = str(fd, "user_id");
  if (!UUID.test(userId)) return { error: "Mã người dùng không hợp lệ." };
  if (session.profile.id !== userId && !session.isQuanTri) return { error: "Bạn không có quyền sửa hồ sơ này." };

  const ho_ten = str(fd, "ho_ten");
  if (!ho_ten) return { error: "Họ tên không được để trống." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      ho_ten,
      so_dien_thoai: strOrNull(fd, "so_dien_thoai"),
      kinh_nghiem: strOrNull(fd, "kinh_nghiem"),
    })
    .eq("id", userId)
    .select("id");
  if (error) return fail(error);
  if (!updated || updated.length === 0) return { error: "Không tìm thấy hồ sơ hoặc không có quyền sửa." };

  // Chuyên môn: upsert các mục được chọn trước, rồi mới xóa các mục bỏ chọn (tránh mất dữ liệu nếu lỗi giữa chừng)
  const selected = fd.getAll("chuyen_mon").filter((v): v is string => typeof v === "string" && UUID.test(v));
  if (selected.length > 0) {
    const { error: upErr } = await supabase.from("profile_chuyen_mon").upsert(
      selected.map((id) => ({ user_id: userId, chuyen_mon_id: id, chi_tiet: strOrNull(fd, `chi_tiet_${id}`) })),
      { onConflict: "user_id,chuyen_mon_id" },
    );
    if (upErr) return fail(upErr);
  }
  const del = supabase.from("profile_chuyen_mon").delete().eq("user_id", userId);
  const { error: delErr } = selected.length > 0 ? await del.not("chuyen_mon_id", "in", `(${selected.join(",")})`) : await del;
  if (delErr) return fail(delErr);

  // TODO Giai đoạn 9: ghi Nhật ký hệ thống khi người quản trị sửa hồ sơ của người khác
  revalidateNhanSu(userId);
  return { ok: true };
}

// ---------- Trạng thái tham gia / nhóm / Quyền Quản lý lớp (chỉ người quản trị) ----------
export async function capNhatQuanTri(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireQuanTri();
  const userId = str(fd, "user_id");
  if (!UUID.test(userId)) return { error: "Mã người dùng không hợp lệ." };

  const trangThai = str(fd, "trang_thai") as TrangThaiThamGia;
  const nhom = str(fd, "nhom") as NhomNhanSu | "";
  if (!TRANG_THAI.includes(trangThai)) return { error: "Trạng thái tham gia không hợp lệ." };
  if (nhom && !NHOM.includes(nhom)) return { error: "Nhóm không hợp lệ." };

  const supabase = await createClient();
  const [{ data: cur }, { data: curNhom }] = await Promise.all([
    supabase.from("profiles").select("trang_thai_tham_gia, co_quyen_quan_ly_lop").eq("id", userId).maybeSingle(),
    supabase.from("nhan_su_nhom").select("nhom").eq("user_id", userId).maybeSingle(),
  ]);
  if (!cur) return { error: "Không tìm thấy hồ sơ." };

  if (cur.trang_thai_tham_gia !== trangThai) {
    const { error } = await supabase.rpc("dat_trang_thai_tham_gia", { p_user: userId, p_trang_thai: trangThai });
    if (error) return fail(error);
  }
  if (nhom && curNhom?.nhom !== nhom) {
    const { error } = await supabase.rpc("dat_nhom", { p_user: userId, p_nhom: nhom });
    if (error) return fail(error);
  }
  // Chỉ Admin gốc gán/thu hồi Quyền Quản lý lớp (hàm SQL cũng kiểm tra lại)
  if (session.isAdmin) {
    const qll = fd.get("co_quyen_quan_ly_lop") === "on";
    if (cur.co_quyen_quan_ly_lop !== qll) {
      const { error } = await supabase.rpc("gan_quyen_quan_ly_lop", { p_user: userId, p_co: qll });
      if (error) return fail(error);
    }
  }

  revalidateNhanSu(userId);
  return { ok: true };
}

// ---------- Chứng chỉ ----------
export async function luuChungChi(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const userId = str(fd, "user_id");
  const id = str(fd, "id");
  const loaiId = str(fd, "loai_id");
  if (!UUID.test(userId) || !UUID.test(loaiId)) return { error: "Thiếu thông tin bắt buộc (loại chứng chỉ)." };
  if (id && !UUID.test(id)) return { error: "Mã chứng chỉ không hợp lệ." };
  if (session.profile.id !== userId && !session.isQuanTri) return { error: "Bạn không có quyền sửa chứng chỉ này." };

  const path = strOrNull(fd, "hinh_anh_path");
  // Ảnh phải nằm trong thư mục của chính chủ hồ sơ (tránh tham chiếu ảnh của người khác)
  if (path && !path.startsWith(`${userId}/`)) return { error: "Đường dẫn ảnh không hợp lệ." };
  const pathCu = strOrNull(fd, "hinh_anh_path_cu");

  const row = {
    user_id: userId,
    loai_id: loaiId,
    so_chung_chi: strOrNull(fd, "so_chung_chi"),
    noi_dung: strOrNull(fd, "noi_dung"),
    ngay_cap: strOrNull(fd, "ngay_cap"),
    noi_cap: strOrNull(fd, "noi_cap"),
    hinh_anh_path: path,
  };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("chung_chi").update(row).eq("id", id).eq("user_id", userId).select("id");
    if (error) return fail(error);
    if (!data || data.length === 0) return { error: "Không tìm thấy chứng chỉ hoặc không có quyền sửa." };
  } else {
    const { error } = await supabase.from("chung_chi").insert(row);
    if (error) return fail(error);
  }

  // Xóa ảnh cũ nếu đã thay/gỡ ảnh (không chặn kết quả nếu xóa lỗi)
  if (pathCu && pathCu !== path && pathCu.startsWith(`${userId}/`)) {
    await supabase.storage.from("chung-chi").remove([pathCu]);
  }

  revalidateNhanSu(userId);
  return { ok: true };
}

export async function xoaChungChi(id: string): Promise<ActionState> {
  const session = await requireSession();
  if (!UUID.test(id)) return { error: "Mã chứng chỉ không hợp lệ." };

  const supabase = await createClient();
  const { data: cc } = await supabase.from("chung_chi").select("user_id, hinh_anh_path").eq("id", id).maybeSingle();
  if (!cc) return { error: "Không tìm thấy chứng chỉ." };
  if (cc.user_id !== session.profile.id && !session.isQuanTri) return { error: "Bạn không có quyền xóa chứng chỉ này." };

  const { data, error } = await supabase.from("chung_chi").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length === 0) return { error: "Không xóa được chứng chỉ." };
  if (cc.hinh_anh_path) await supabase.storage.from("chung-chi").remove([cc.hinh_anh_path]);

  revalidateNhanSu(cc.user_id);
  return { ok: true };
}

// ---------- Đề xuất nhân sự (chỉ người quản trị) ----------
export async function taoDeXuat(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireQuanTri();
  const userId = str(fd, "user_id");
  const loai = str(fd, "loai") as LoaiDeXuat;
  const noiDung = str(fd, "noi_dung");
  if (!UUID.test(userId)) return { error: "Hãy chọn người được đề xuất." };
  if (!LOAI_DE_XUAT.includes(loai)) return { error: "Loại đề xuất không hợp lệ." };
  if (!noiDung) return { error: "Nội dung đề xuất không được để trống." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("tao_de_xuat", { p_loai: loai, p_user: userId, p_noi_dung: noiDung });
  if (error) return fail(error);

  revalidatePath("/nhan-su/de-xuat");
  revalidatePath("/nhan-su");
  return { ok: true };
}

export async function xuLyDeXuat(id: string, duyet: boolean): Promise<ActionState> {
  await requireQuanTri();
  if (!UUID.test(id)) return { error: "Mã đề xuất không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("xu_ly_de_xuat", { p_id: id, p_duyet: duyet });
  if (error) return fail(error);

  revalidatePath("/nhan-su/de-xuat");
  revalidatePath("/nhan-su");
  return { ok: true };
}

// ---------- Danh mục cấu hình (chỉ người quản trị) ----------
export async function themDanhMuc(bang: DanhMucBang, ten: string): Promise<ActionState> {
  await requireQuanTri();
  if (!DANH_MUC_BANG.includes(bang)) return { error: "Danh mục không hợp lệ." };
  const t = ten.trim();
  if (!t) return { error: "Tên không được để trống." };

  const supabase = await createClient();
  const { data: last } = await supabase.from(bang).select("thu_tu").order("thu_tu", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from(bang).insert({ ten: t, thu_tu: (last?.thu_tu ?? 0) + 1 });
  if (error) return fail(error);

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}

export async function suaDanhMuc(bang: DanhMucBang, id: string, ten: string): Promise<ActionState> {
  await requireQuanTri();
  if (!DANH_MUC_BANG.includes(bang) || !UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };
  const t = ten.trim();
  if (!t) return { error: "Tên không được để trống." };

  const supabase = await createClient();
  const { data, error } = await supabase.from(bang).update({ ten: t }).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length === 0) return { error: "Không tìm thấy mục cần sửa." };

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}

// Danh mục đang được dùng ở hồ sơ thì không xóa, chỉ tắt để ẩn khỏi lựa chọn mới
export async function batTatDanhMuc(bang: DanhMucBang, id: string, dangDung: boolean): Promise<ActionState> {
  await requireQuanTri();
  if (!DANH_MUC_BANG.includes(bang) || !UUID.test(id)) return { error: "Yêu cầu không hợp lệ." };

  const supabase = await createClient();
  const { data, error } = await supabase.from(bang).update({ dang_dung: dangDung }).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length === 0) return { error: "Không tìm thấy mục cần sửa." };

  revalidatePath("/cau-hinh/danh-muc");
  return { ok: true };
}
