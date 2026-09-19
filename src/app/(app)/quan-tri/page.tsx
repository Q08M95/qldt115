import { requireQuanTri } from "@/lib/auth/session";

// Trang giữ chỗ để kiểm chứng guard phân quyền (Giảng viên/Trợ giảng bị đẩy về "/").
// Sẽ thay bằng khu vực quản trị thật ở các giai đoạn sau.
export default async function QuanTriPage() {
  await requireQuanTri();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-muted-foreground">Khu vực quản trị — chỉ Admin / Quản lý lớp truy cập được.</p>
    </main>
  );
}
