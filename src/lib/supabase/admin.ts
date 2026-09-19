import "server-only";

import { createClient } from "@supabase/supabase-js";

// Client dùng service_role: BỎ QUA RLS, chỉ dùng trong Server Action đã kiểm tra quyền Admin (createUser, đặt lại mật khẩu).
// `server-only` đảm bảo file này không bao giờ lọt vào bundle của trình duyệt. Không log/trả key ra ngoài.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên máy chủ (Vercel > Settings > Environment Variables).");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
