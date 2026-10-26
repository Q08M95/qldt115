import Link from "next/link";
import { CalendarRange, GraduationCap, LayoutGrid } from "lucide-react";
import { pill } from "@/components/bao-cao/thanh-dieu-khien";
import { EmptyState } from "@/components/empty-state";
import { LopCard } from "@/components/lop-hoc/lop-card";
import { LopFilters, type LopFilterValues } from "@/components/lop-hoc/lop-filters";
import { PhanTrang } from "@/components/phan-trang";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { LopHocTongHop } from "@/types/database";

// Chế độ xem Danh sách | Lịch (trang thật; trang demo không truyền thì chỉ có Danh sách)
export interface CheDoXemLop {
  xem: "danh-sach" | "lich";
  hrefDanhSach: string;
  hrefLich: string;
  // Tham số URL bộ lọc phải giữ lại khi lọc (vd xem=lich, thang=...) + đích nút "Xóa lọc"
  giu: Record<string, string>;
  xoaHref: string;
}

// Khung danh sách lớp dùng chung cho trang thật và trang demo: thanh tiêu đề + bộ lọc, rồi lưới thẻ lớp (hoặc lịch)
export function LopListView({
  rows,
  tong,
  values,
  nhomLop,
  action,
  hrefFor,
  filterAction,
  trang,
  tongTrang,
  hrefTrang,
  capTaiVe,
  cheDo,
  lich,
}: {
  rows: LopHocTongHop[];
  // Tổng số lớp khớp bộ lọc (có thể khác rows.length vì đã phân trang); mặc định = rows.length cho trang demo
  tong?: number;
  values: LopFilterValues;
  nhomLop: { id: string; ten: string }[];
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
  cheDo?: CheDoXemLop;
  // Nội dung chế độ Lịch (thay cho lưới thẻ + phân trang)
  lich?: React.ReactNode;
}) {
  const xemLich = cheDo?.xem === "lich";
  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {xemLich ? (
              "Lịch các lớp"
            ) : (
              <>
                Danh sách lớp học <Badge variant="teal">{tong ?? rows.length}</Badge>
              </>
            )}
          </CardTitle>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        {cheDo && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5">
            <nav aria-label="Chế độ xem" className="flex gap-1">
              <Link href={cheDo.hrefDanhSach} className={pill(!xemLich)} aria-current={!xemLich ? "page" : undefined}>
                <LayoutGrid className="mr-1.5 size-4" aria-hidden /> Danh sách
              </Link>
              <Link href={cheDo.hrefLich} className={pill(xemLich)} aria-current={xemLich ? "page" : undefined}>
                <CalendarRange className="mr-1.5 size-4" aria-hidden /> Lịch
              </Link>
            </nav>
            {xemLich && <LopFilters values={values} nhomLop={nhomLop} action={filterAction} giu={cheDo.giu} xoaHref={cheDo.xoaHref} chiNhomLop />}
          </div>
        )}
        {!xemLich && <LopFilters values={values} nhomLop={nhomLop} action={filterAction} giu={cheDo?.giu} xoaHref={cheDo?.xoaHref} />}
      </Card>

      {xemLich ? (
        lich
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title="Không có lớp nào phù hợp với bộ lọc." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <LopCard key={l.id} lop={l} href={hrefFor(l)} />
          ))}
        </div>
      )}

      {!xemLich && trang !== undefined && tongTrang !== undefined && hrefTrang && (
        // Đặt thẳng trên nền trang (không bọc card): chỉ là vài nút số, khung trắng riêng làm rối mắt
        <div className="py-1">
          <PhanTrang trang={trang} tongTrang={tongTrang} hrefTrang={hrefTrang} trenNenTrang />
          {capTaiVe && (
            <p className="px-5 pt-2 text-center text-xs text-muted-foreground">
              Chỉ tìm/sắp xếp trong các lớp gần đây nhất — lớp rất cũ có thể chưa hiện ở đây.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
