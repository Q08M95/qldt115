import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";

// Giữ chỗ cho Tổng quan (4.7b) — nội dung thật làm ở Giai đoạn 10.
export default async function HomePage() {
  const { profile, isAdmin } = await requireSession();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Xin chào, {profile.ho_ten}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {isAdmin && <Badge variant="navy">Admin</Badge>}
        {/* Chỉ đúng vai trò của người dùng (Giảng viên hoặc Trợ giảng); chưa có vai trò thì nói trung lập, không nhắc "nhóm" */}
        {profile.vai_tro_giang_day ? (
          <Badge variant="blue">{VAI_TRO_LABEL[profile.vai_tro_giang_day]}</Badge>
        ) : (
          !isAdmin && <Badge variant="neutral">Chưa được xếp vai trò</Badge>
        )}
        {profile.co_quyen_quan_ly_lop && <Badge variant="teal">Quyền Quản lý lớp</Badge>}
        <span>{profile.email}</span>
      </CardContent>
    </Card>
  );
}
