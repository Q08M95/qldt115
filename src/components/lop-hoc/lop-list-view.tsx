import Link from "next/link";
import { CalendarRange, ClipboardList, GraduationCap, LayoutGrid } from "lucide-react";
import { pill } from "@/components/bao-cao/thanh-dieu-khien";
import { EmptyState } from "@/components/empty-state";
import { LopCard } from "@/components/lop-hoc/lop-card";
import { LopFilters, type LopFilterValues } from "@/components/lop-hoc/lop-filters";
import { PhanTrang } from "@/components/phan-trang";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { LopHocTongHop } from "@/types/database";

// Chế độ xem Danh sách | Lịch | Phân công (trang thật; trang demo không truyền thì chỉ có Danh sách)
export interface CheDoXemLop {
  xem: "danh-sach" | "lich" | "phan-cong";
  hrefDanhSach: string;
  hrefLich: string;
  hrefPhanCong: string;
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
  phanCong,
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
  // Nội dung chế độ Phân công (bảng phân công các lớp đang lọc, thay cho lưới thẻ; vẫn phân trang theo lớp)
  phanCong?: React.ReactNode;
}) {
  const xemLich = cheDo?.xem === "lich";
  const xemPhanCong = cheDo?.xem === "phan-cong";
  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {xemLich ? (
              "Lịch các lớp"
            ) : (
              <>
                {xemPhanCong ? "Phân công giảng dạy" : "Danh sách lớp học"} <Badge variant="teal">{tong ?? rows.length}</Badge>
              </>
            )}
          </CardTitle>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        {cheDo && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5">
            <nav aria-label="Chế độ xem" className="flex gap-1">
              {(
                [
                  ["danh-sach", cheDo.hrefDanhSach, LayoutGrid, "Danh sách"],
                  ["lich", cheDo.hrefLich, CalendarRange, "Lịch"],
                  ["phan-cong", cheDo.hrefPhanCong, ClipboardList, "Phân công"],
                ] as const
              ).map(([xem, href, Icon, nhan]) => (
                <Link key={xem} href={href} className={`${pill(cheDo.xem === xem)} max-sm:px-2.5`} aria-current={cheDo.xem === xem ? "page" : undefined}>
                  <Icon className="mr-1.5 size-4 max-sm:hidden" aria-hidden /> {nhan}
                </Link>
              ))}
            </nav>
            {xemLich && <LopFilters values={values} nhomLop={nhomLop} action={filterAction} giu={cheDo.giu} xoaHref={cheDo.xoaHref} chiNhomLop />}
          </div>
        )}
        {!xemLich && <LopFilters values={values} nhomLop={nhomLop} action={filterAction} giu={cheDo?.giu} xoaHref={cheDo?.xoaHref} />}
      </Card>

      {xemLich ? (
        lich
      ) : xemPhanCong ? (
        phanCong
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
