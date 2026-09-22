import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { NutDuyet } from "@/components/dang-ky/dang-ky-controls";
import { DuyetButtons } from "@/components/nhan-su/de-xuat-ui";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tuongDoi } from "@/lib/format";
import type { MucCanDuyet } from "@/lib/tong-quan/queries";

// Bảng việc cần duyệt (mục 4.7b) — gộp đăng ký tự do + đề xuất nhân sự đang chờ, nút hành động nhanh ngay trong bảng.
// canhBaoPool hiển thị kèm tiêu đề thay vì tách thành thẻ stat thứ 4 (StatRow cố định 3 cột theo ảnh mẫu, mục 8.5b).
export function ViecCanDuyet({ items, canhBaoPool }: { items: MucCanDuyet[]; canhBaoPool: number }) {
  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Việc cần duyệt
          <Badge variant="teal">{items.length}</Badge>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          {canhBaoPool > 0 && (
            <Badge variant="warning" title="Số Bài đang mở có pool ứng viên dưới ngưỡng cảnh báo">
              {canhBaoPool} cảnh báo pool nhỏ
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Không có việc nào đang chờ duyệt." />
        ) : (
          <ul className="divide-y">
            {items.map((v) => (
              <li key={`${v.loai}-${v.id}`} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-40 flex-1">
                  <Link href={v.href} className="font-semibold hover:underline">
                    {v.tieuDe}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{v.phu}</p>
                </div>
                <Badge variant={v.loai === "dang_ky" ? "blue" : "teal"}>{v.loai === "dang_ky" ? "Đăng ký" : "Đề xuất"}</Badge>
                <span className="text-xs whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
                  {tuongDoi(v.created_at)}
                </span>
                {v.loai === "dang_ky" ? <NutDuyet id={v.id} /> : <DuyetButtons id={v.id} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link href="/dang-ky" className="hover:underline">
            Xem tất cả đăng ký chờ duyệt
          </Link>
          <Link href="/nhan-su/de-xuat" className="hover:underline">
            Xem tất cả đề xuất nhân sự
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
