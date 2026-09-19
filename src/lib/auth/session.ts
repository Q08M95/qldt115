import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface Session {
  profile: Profile;
  isAdmin: boolean;
  // Admin hoặc người giữ Quyền Quản lý lớp (toàn quyền Admin trừ build web)
  isQuanTri: boolean;
}

// Trả null nếu chưa đăng nhập. Đã đăng nhập mà thiếu profile (vd chưa chạy migration)
// thì ném lỗi rõ ràng — không redirect về /login vì sẽ bị proxy đẩy ngược lại gây vòng lặp.
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (error || !profile) {
    throw new Error(
      `Không đọc được hồ sơ (profiles) của tài khoản đã đăng nhập: ${error?.message ?? "không có bản ghi"}`,
    );
  }

  const isAdmin = profile.phan_quyen === "admin";
  return {
    profile,
    isAdmin,
    isQuanTri: isAdmin || profile.co_quyen_quan_ly_lop,
  };
});

// Guard chính thức (proxy.ts chỉ lọc sơ bộ). Gọi ở đầu Server Component / Server Action.
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireQuanTri(): Promise<Session> {
  const session = await requireSession();
  if (!session.isQuanTri) redirect("/");
  return session;
}
