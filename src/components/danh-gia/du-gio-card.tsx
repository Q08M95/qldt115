import Link from "next/link";
import { ClipboardCheck, Star } from "lucide-react";
import { ChinhDiemDanhDrawer, DuGioDrawer, XoaDuGioButton } from "@/components/danh-gia/diem-danh-controls";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { BaiDaDay, RubricMuc } from "@/types/database";

const fmtPt = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")}%`;

// Dự giờ (C2) và điểm danh (B1) theo từng Bài đã dạy của 1 người — chỉ người quản trị thấy (mục 4.1/4.4: C2 nhập ở module Nhân sự).
// Người xem chính là người được chấm thì không tự chấm được (mục 3): chỉ hiện điểm danh để chỉnh nếu cần.
export function DuGioCard({
  userId,
  hoTen,
  bai,
  rubric,
  laChinhMinh,
}: {
  userId: string;
  hoTen: string;
  bai: BaiDaDay[];
  rubric: RubricMuc[];
  laChinhMinh: boolean;
}) {
  return (
    <Card className="gap-0 px-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Dự giờ và điểm danh
        </CardTitle>
        <CardDescription>
          {laChinhMinh
            ? "Không tự chấm dự giờ cho chính mình — điểm C2 của bạn để người còn lại chấm (mục “không có dữ liệu”, trọng số tự chia lại)."
            : "Chấm dự giờ (C2) theo rubric cho từng Bài, hoặc chỉnh tay điểm danh (B1) khi có lỗi kỹ thuật. Chỉ Admin/Quản lý lớp thấy khu vực này."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {bai.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Chưa có Bài nào đã bắt đầu để chấm dự giờ hoặc chỉnh điểm danh." />
        ) : (
          <ul className="divide-y border-t">
            {bai.map((b) => (
              <li key={b.bai_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
                <div className="min-w-44 flex-1">
                  <Link href={`/lop-hoc/${b.lop_id}`} className="font-semibold hover:underline">
                    {b.bai_ten}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {b.lop_ten} · <span className="tabular-nums">{fmtDate(b.bat_dau)} {fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}</span> ·{" "}
                    {VAI_TRO_LABEL[b.vai_tro]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={!b.diem_danh ? "neutral" : b.diem_danh.b1_phan_tram >= 100 ? "success" : b.diem_danh.b1_phan_tram > 0 ? "warning" : "danger"}
                    title={b.diem_danh?.chinh_tay ? `Đã chỉnh tay${b.diem_danh.ly_do_chinh ? `: ${b.diem_danh.ly_do_chinh}` : ""}` : undefined}
                  >
                    {b.diem_danh ? `B1 ${fmtPt(b.diem_danh.b1_phan_tram)}${b.diem_danh.chinh_tay ? " · sửa tay" : ""}` : "Chưa check-in"}
                  </Badge>
                  <ChinhDiemDanhDrawer baiId={b.bai_id} userId={userId} ten={hoTen} diemDanh={b.diem_danh} />
                </div>
                {!laChinhMinh && (
                  <div className="flex items-center gap-2">
                    {b.du_gio ? (
                      <Badge variant="blue" title={b.du_gio.ghi_chu ?? undefined}>
                        <Star /> C2 {b.du_gio.muc_diem}%
                      </Badge>
                    ) : (
                      <Badge variant="outline">Chưa chấm dự giờ</Badge>
                    )}
                    <DuGioDrawer baiId={b.bai_id} userId={userId} ten={hoTen} rubric={rubric} duGio={b.du_gio} />
                    {b.du_gio && <XoaDuGioButton baiId={b.bai_id} userId={userId} ten={hoTen} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
