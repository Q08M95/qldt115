"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseNhanSuCsv } from "@/lib/nhan-su/csv";
import { randomPassword } from "@/lib/password";
import { resolveNhom } from "@/lib/nhan-su/labels";
import type { ActionState } from "@/lib/nhan-su/actions";
import type { NhomNhanSu } from "@/types/database";

// Tài khoản: thêm nhân sự (1 người / nhiều người từ CSV), đổi mật khẩu, đặt lại mật khẩu.
// Việc tạo tài khoản và đặt lại mật khẩu cần service_role nên CHỈ Admin gốc làm được (không gồm người giữ Quyền Quản lý lớp).
// TODO Giai đoạn 9: ghi Nhật ký hệ thống cho tạo tài khoản / đặt lại mật khẩu (không bao giờ ghi mật khẩu).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD = 8;
const MAX_CSV_ROWS = 200;
const CONCURRENCY = 5;

function raw(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
}

function authErrorMessage(e: { code?: string; message: string }) {
  if (e.code === "email_exists" || /already (been )?registered|already exists/i.test(e.message)) return "Email này đã có tài khoản.";
  if (e.code === "weak_password") return "Mật khẩu quá yếu theo quy định của hệ thống.";
  if (e.code === "over_request_rate_limit" || e.code === "over_email_send_rate_limit") return "Thao tác quá nhanh, hãy thử lại sau ít phút.";
  return e.message;
}

async function requireAdminGoc() {
  const session = await requireSession();
  return session.isAdmin ? session : null;
}

// ---------- Thêm 1 nhân sự ----------
export async function themNhanSu(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await requireAdminGoc())) return { error: "Chỉ Admin được thêm nhân sự." };

  const email = raw(fd, "email").trim().toLowerCase();
  const hoTen = raw(fd, "ho_ten").trim();
  const matKhau = raw(fd, "mat_khau");
  const nhom = resolveNhom(raw(fd, "nhom"));

  if (!EMAIL.test(email)) return { error: "Email không hợp lệ." };
  if (!hoTen) return { error: "Họ tên không được để trống." };
  if (matKhau.length < MIN_PASSWORD) return { error: `Mật khẩu tạm tối thiểu ${MIN_PASSWORD} ký tự.` };
  if (nhom === null) return { error: "Nhóm không hợp lệ." };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  // email_confirm: tài khoản dùng được ngay (không cần thư xác nhận); ho_ten vào metadata để trigger tạo profile đúng tên
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: matKhau,
    email_confirm: true,
    user_metadata: { ho_ten: hoTen },
  });
  if (error || !data.user) return { error: authErrorMessage(error ?? { message: "Không tạo được tài khoản." }) };

  revalidatePath("/nhan-su");

  if (nhom) {
    // Đặt nhóm bằng phiên của chính Admin (hàm dat_nhom kiểm tra quyền + ghi lịch sử theo auth.uid())
    const supabase = await createClient();
    const { error: nhomErr } = await supabase.rpc("dat_nhom", { p_user: data.user.id, p_nhom: nhom });
    if (nhomErr) return { error: `Đã tạo tài khoản nhưng chưa xếp được nhóm (${nhomErr.message}). Hãy xếp nhóm trong hồ sơ.` };
  }
  return { ok: true };
}

// ---------- Thêm nhiều nhân sự từ CSV ----------
export interface KetQuaDong {
  dong: number;
  email: string;
  ho_ten: string;
  ok: boolean;
  thong_bao: string;
  // Chỉ có khi hệ thống tự sinh mật khẩu — hiển thị 1 lần để Admin gửi cho nhân sự
  mat_khau?: string;
}
export type NhapNhieuState = { error?: string; ketQua?: KetQuaDong[] } | null;

export async function nhapNhieuNhanSu(_prev: NhapNhieuState, fd: FormData): Promise<NhapNhieuState> {
  if (!(await requireAdminGoc())) return { error: "Chỉ Admin được thêm nhân sự." };

  const rows = parseNhanSuCsv(raw(fd, "csv"));
  if (rows.length === 0) return { error: "Chưa có dòng dữ liệu nào." };
  if (rows.length > MAX_CSV_ROWS) return { error: `Tối đa ${MAX_CSV_ROWS} dòng mỗi lần (hiện ${rows.length}). Hãy chia nhỏ danh sách.` };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();

  // Kiểm tra trước, trùng email trong chính file cũng báo lỗi
  const seen = new Set<string>();
  const ketQua: KetQuaDong[] = new Array(rows.length);

  async function xuLy(idx: number) {
    const r = rows[idx];
    const email = r.email.trim().toLowerCase();
    const base = { dong: r.dong, email: r.email, ho_ten: r.ho_ten };
    const nhom = resolveNhom(r.nhom_tho);

    if (!EMAIL.test(email)) return (ketQua[idx] = { ...base, ok: false, thong_bao: "Email không hợp lệ." });
    if (!r.ho_ten.trim()) return (ketQua[idx] = { ...base, ok: false, thong_bao: "Thiếu họ tên." });
    if (nhom === null) return (ketQua[idx] = { ...base, ok: false, thong_bao: `Nhóm không nhận ra: “${r.nhom_tho}”.` });
    if (r.mat_khau && r.mat_khau.length < MIN_PASSWORD)
      return (ketQua[idx] = { ...base, ok: false, thong_bao: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự.` });

    const tuSinh = !r.mat_khau;
    const matKhau = r.mat_khau || randomPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: matKhau,
      email_confirm: true,
      user_metadata: { ho_ten: r.ho_ten.trim() },
    });
    if (error || !data.user) return (ketQua[idx] = { ...base, ok: false, thong_bao: authErrorMessage(error ?? { message: "Không tạo được." }) });

    let thongBao = "Đã tạo";
    if (nhom) {
      const { error: nhomErr } = await supabase.rpc("dat_nhom", { p_user: data.user.id, p_nhom: nhom as NhomNhanSu });
      thongBao = nhomErr ? `Đã tạo, nhưng chưa xếp nhóm (${nhomErr.message})` : "Đã tạo và xếp nhóm";
    }
    return (ketQua[idx] = { ...base, ok: true, thong_bao: thongBao, mat_khau: tuSinh ? matKhau : undefined });
  }

  // Dòng trùng email trong file: chặn trước khi gọi API
  const queue: number[] = [];
  rows.forEach((r, i) => {
    const e = r.email.trim().toLowerCase();
    if (e && seen.has(e)) ketQua[i] = { dong: r.dong, email: r.email, ho_ten: r.ho_ten, ok: false, thong_bao: "Trùng email với dòng phía trên trong danh sách." };
    else {
      if (e) seen.add(e);
      queue.push(i);
    }
  });

  // Chạy song song có giới hạn để nhanh mà không dồn dập vào Auth
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (next < queue.length) {
        const idx = queue[next++];
        try {
          await xuLy(idx);
        } catch (e) {
          ketQua[idx] = { dong: rows[idx].dong, email: rows[idx].email, ho_ten: rows[idx].ho_ten, ok: false, thong_bao: (e as Error).message };
        }
      }
    }),
  );

  revalidatePath("/nhan-su");
  return { ketQua };
}

// ---------- Đổi mật khẩu của chính mình ----------
export async function doiMatKhau(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireSession();
  const hienTai = raw(fd, "mat_khau_hien_tai");
  const moi = raw(fd, "mat_khau_moi");
  const xacNhan = raw(fd, "xac_nhan");

  if (!hienTai) return { error: "Hãy nhập mật khẩu hiện tại." };
  if (moi.length < MIN_PASSWORD) return { error: `Mật khẩu mới tối thiểu ${MIN_PASSWORD} ký tự.` };
  if (moi !== xacNhan) return { error: "Mật khẩu xác nhận không khớp." };
  if (moi === hienTai) return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };

  // Xác minh mật khẩu hiện tại bằng client riêng (không lưu phiên, không đụng cookie của phiên đang dùng)
  const verifier = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({ email: session.profile.email, password: hienTai });
  if (verifyErr) return { error: "Mật khẩu hiện tại không đúng." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: moi });
  if (error) return { error: authErrorMessage(error) };
  return { ok: true };
}

// ---------- Admin đặt lại mật khẩu cho người khác (thay cho "quên mật khẩu" khi chưa có email) ----------
export async function datLaiMatKhau(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await requireAdminGoc())) return { error: "Chỉ Admin được đặt lại mật khẩu." };

  const userId = raw(fd, "user_id").trim();
  const matKhau = raw(fd, "mat_khau");
  if (!UUID.test(userId)) return { error: "Mã người dùng không hợp lệ." };
  if (matKhau.length < MIN_PASSWORD) return { error: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự.` };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { error } = await admin.auth.admin.updateUserById(userId, { password: matKhau });
  if (error) return { error: authErrorMessage(error) };
  return { ok: true };
}
