import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { LopCard } from "@/components/lop-hoc/lop-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LopHocTongHop } from "@/types/database";

// Thẻ gợi ý lớp (mục 4.7b) — lớp đang mở đăng ký, rút gọn 3 thẻ đầu (gần ngày bắt đầu nhất). Dùng lại nguyên LopCard
// của module Lớp học (mục 8.8) để đồng bộ giao diện, không phát minh kiểu thẻ mới.
export function GoiYLop({ items }: { items: LopHocTongHop[] }) {
  const goiY = items.slice(0, 3);
  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lớp đang mở đăng ký
        </CardTitle>
        <CardAction>
          <Link href="/lop-hoc" className="text-xs font-medium text-muted-foreground hover:underline">
            Xem tất cả
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {goiY.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="Hiện chưa có lớp nào đang mở đăng ký." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goiY.map((l) => (
              <LopCard key={l.id} lop={l} href={`/lop-hoc/${l.id}`} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
