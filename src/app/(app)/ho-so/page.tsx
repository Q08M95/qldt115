import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

// "Hồ sơ của tôi" — đưa thẳng tới trang hồ sơ nhân sự của chính người đăng nhập
export default async function HoSoCuaToiPage() {
  const { profile } = await requireSession();
  redirect(`/nhan-su/${profile.id}`);
}
