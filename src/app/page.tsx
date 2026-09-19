import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";

export default async function HomePage() {
  const { profile, isAdmin, isQuanTri } = await requireSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Quản lý Nhân sự Giảng dạy</h1>
      <div className="text-center text-sm text-muted-foreground">
        <p>
          {profile.ho_ten} ({profile.email})
        </p>
        <p>
          Phân quyền: {isAdmin ? "Admin" : "Giảng viên / Trợ giảng"}
          {profile.co_quyen_quan_ly_lop ? " · Quyền Quản lý lớp" : ""}
        </p>
      </div>
      {isQuanTri && (
        <Button asChild variant="outline">
          <Link href="/quan-tri">Khu vực quản trị</Link>
        </Button>
      )}
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline">Đăng xuất</Button>
      </form>
    </main>
  );
}
