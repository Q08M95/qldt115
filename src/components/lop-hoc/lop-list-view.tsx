import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LopCard } from "@/components/lop-hoc/lop-card";
import { LopFilters, type LopFilterValues } from "@/components/lop-hoc/lop-filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { LopHocTongHop } from "@/types/database";

// Khung danh sách lớp dùng chung cho trang thật và trang demo: thanh tiêu đề + bộ lọc, rồi lưới thẻ lớp
export function LopListView({
  rows,
  values,
  nhomLop,
  isQuanTri,
  action,
  hrefFor,
  filterAction,
}: {
  rows: LopHocTongHop[];
  values: LopFilterValues;
  nhomLop: { id: string; ten: string }[];
  isQuanTri: boolean;
  // Nút hành động góc phải tiêu đề (vd "Tạo lớp")
  action?: React.ReactNode;
  hrefFor: (lop: LopHocTongHop) => string;
  filterAction?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Danh sách lớp học <Badge variant="teal">{rows.length}</Badge>
          </CardTitle>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        <LopFilters values={values} nhomLop={nhomLop} isQuanTri={isQuanTri} action={filterAction} />
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title="Không có lớp nào phù hợp với bộ lọc." />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <LopCard key={l.id} lop={l} href={hrefFor(l)} />
          ))}
        </div>
      )}
    </div>
  );
}
