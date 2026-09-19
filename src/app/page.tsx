import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Quản lý Nhân sự Giảng dạy</h1>
      <p className="text-sm text-muted-foreground">Đã đăng nhập: {user?.email}</p>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline">Đăng xuất</Button>
      </form>
    </main>
  );
}
