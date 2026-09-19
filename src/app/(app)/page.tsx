import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";

// Giữ chỗ cho Tổng quan (4.7b) — nội dung thật làm ở Giai đoạn 10.
export default async function HomePage() {
  const { profile, isAdmin } = await requireSession();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Xin chào, {profile.ho_ten}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="navy">{isAdmin ? "Admin" : "Giảng viên / Trợ giảng"}</Badge>
        {profile.co_quyen_quan_ly_lop && <Badge variant="teal">Quyền Quản lý lớp</Badge>}
        <span>{profile.email}</span>
      </CardContent>
    </Card>
  );
}
