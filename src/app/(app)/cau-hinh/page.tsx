import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireQuanTri } from "@/lib/auth/session";

// Trang Cấu hình hệ thống — hiện mới có Danh mục; các mục còn lại (KPI, hệ số, ngưỡng...) bổ sung ở Giai đoạn 6 và 11.
export default async function CauHinhPage() {
  await requireQuanTri();

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Link href="/cau-hinh/danh-muc" className="group">
        <Card className="transition-shadow group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grad-blue text-hue-blue-on">
              <ListChecks className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Danh mục</span>
              <span className="block text-sm text-muted-foreground">Chuyên môn, loại chứng chỉ, nhóm lớp (hệ số D1)</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
