import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { BreadcrumbLabel } from "@/components/app-shell/page-labels";
import { Card, CardContent } from "@/components/ui/card";

// Demo dev: kiểm tra breadcrumb/tiêu đề hiện tên thay vì mã UUID trên trang hồ sơ. Production trả 404.
export default function DesignNhanSuChiTietPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={null}>
      <BreadcrumbLabel label="Nguyễn Hoàng Tú Minh" />
      <Card>
        <CardContent>Nội dung hồ sơ (demo)</CardContent>
      </Card>
    </AppShell>
  );
}
