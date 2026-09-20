import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KyFormDrawer, XoaKyButton } from "@/components/kpi/ky-danh-gia-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireQuanTri } from "@/lib/auth/session";
import { fmtDate } from "@/lib/format";
import { TRANG_THAI_KY_LABEL, TRANG_THAI_KY_VARIANT } from "@/lib/kpi/labels";
import { getKyList, goiYKyTiepTheo } from "@/lib/kpi/queries";

// Quản lý kỳ đánh giá (mục 7): mỗi kỳ là 1 quý, 3 trạng thái Đang mở → Chờ duyệt → Đã đóng.
export default async function KyDanhGiaPage() {
  const [, list] = await Promise.all([requireQuanTri(), getKyList()]);

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Kỳ đánh giá <Badge variant="teal">{list.length}</Badge>
        </CardTitle>
        <CardAction>
          <KyFormDrawer macDinh={goiYKyTiepTheo(list)} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Chưa có kỳ đánh giá nào. Tạo kỳ đầu tiên để bắt đầu tính KPI." />
        ) : (
          <ul className="divide-y rounded-xl border">
            {list.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <Link href={`/cau-hinh/ky-danh-gia/${k.id}`} className="min-w-40 flex-1 hover:underline">
                  <span className="block font-semibold">{k.ten}</span>
                  <span className="block text-sm text-muted-foreground tabular-nums">
                    {fmtDate(k.tu)} – {fmtDate(k.den)}
                  </span>
                </Link>
                <Badge variant={TRANG_THAI_KY_VARIANT[k.trang_thai]}>{TRANG_THAI_KY_LABEL[k.trang_thai]}</Badge>
                <span className="flex items-center gap-1">
                  {k.trang_thai === "dang_mo" && (
                    <>
                      <KyFormDrawer ky={k} />
                      <XoaKyButton ky={k} />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
