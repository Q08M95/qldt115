import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LopCard } from "@/components/lop-hoc/lop-card";
import { LopFilters, type LopFilterValues } from "@/components/lop-hoc/lop-filters";
import { PhanTrang } from "@/components/phan-trang";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { LopHocTongHop } from "@/types/database";

// Khung danh sách lớp dùng chung cho trang thật và trang demo: thanh tiêu đề + bộ lọc, rồi lưới thẻ lớp
export function LopListView({
  rows,
  tong,
  values,
  nhomLop,
  isQuanTri,
  action,
  hrefFor,
  filterAction,
  trang,
  tongTrang,
  hrefTrang,
  capTaiVe,
}: {
  rows: LopHocTongHop[];
  // Tổng số lớp khớp bộ lọc (có thể khác rows.length vì đã phân trang); mặc định = rows.length cho trang demo
  tong?: number;
  values: LopFilterValues;
  nhomLop: { id: string; ten: string }[];
  isQuanTri: boolean;
  // Nút hành động góc phải tiêu đề (vd "Tạo lớp")
  action?: React.ReactNode;
  hrefFor: (lop: LopHocTongHop) => string;
  filterAction?: string;
  // Phân trang (mục 8.5) — bỏ qua ở trang demo (không phân trang)
  trang?: number;
  tongTrang?: number;
  hrefTrang?: (t: number) => string;
  // true nếu đã chạm ngưỡng tải tối đa cho tìm kiếm/sắp xếp — tổng số có thể chưa gồm hết lớp cũ hơn
  capTaiVe?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Danh sách lớp học <Badge variant="teal">{tong ?? rows.length}</Badge>
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

      {trang !== undefined && tongTrang !== undefined && hrefTrang && (
        <Card className="gap-0 py-4">
          <PhanTrang trang={trang} tongTrang={tongTrang} hrefTrang={hrefTrang} />
          {capTaiVe && (
            <p className="px-5 pt-2 text-center text-xs text-muted-foreground">
              Chỉ tìm/sắp xếp trong các lớp gần đây nhất — lớp rất cũ có thể chưa hiện ở đây.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
