import Link from "next/link";
import { CalendarRange, ChevronRight, ListChecks, SlidersHorizontal, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireQuanTri } from "@/lib/auth/session";

// Trang Cấu hình hệ thống — Danh mục, Cấu hình KPI, Đăng ký & matching, Kỳ đánh giá.
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
      <Link href="/cau-hinh/kpi" className="group">
        <Card className="transition-shadow group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grad-navy text-hue-navy-on">
              <SlidersHorizontal className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Cấu hình KPI</span>
              <span className="block text-sm text-muted-foreground">Trọng số tiêu chí, hệ số độ khó D, ngưỡng đổi nhóm</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>
      <Link href="/cau-hinh/dang-ky" className="group">
        <Card className="transition-shadow group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grad-green text-hue-green-on">
              <UserCheck className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Đăng ký &amp; matching</span>
              <span className="block text-sm text-muted-foreground">Cảnh báo pool nhỏ, dồn tải, tỷ trọng matching-score</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>
      <Link href="/cau-hinh/ky-danh-gia" className="group">
        <Card className="transition-shadow group-hover:shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grad-teal text-hue-teal-on">
              <CalendarRange className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Kỳ đánh giá</span>
              <span className="block text-sm text-muted-foreground">Tạo kỳ quý, chuyển Đang mở / Chờ duyệt / Đã đóng</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
