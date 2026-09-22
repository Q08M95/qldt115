import Link from "next/link";
import { Gauge } from "lucide-react";
import { tenNganKy } from "@/components/danh-gia/kpi-ca-nhan";
import { EmptyState } from "@/components/empty-state";
import { TrendPill } from "@/components/trend-pill";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiCaNhan } from "@/types/database";

const so = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Progress bar/gauge KPI cá nhân rút gọn kỳ hiện tại (mục 4.4/4.7b) — link tới Bảng KPI đầy đủ tại /danh-gia, không
// lặp lại radar/breakdown A/B/C đã có ở đó.
export function KpiRutGon({ data }: { data: KpiCaNhan | null }) {
  const coDuLieu = (data?.ky ?? []).filter((k) => k.kpi !== null);
  const hienTai = coDuLieu.at(-1);

  if (!data || !hienTai) {
    return (
      <Card className="gap-3 px-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Điểm KPI kỳ này
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Gauge} title="Chưa có KPI. KPI được tính từ các Bài đã dạy xong trong kỳ đánh giá." />
        </CardContent>
      </Card>
    );
  }

  const kpi = hienTai.kpi ?? 0;
  const truoc = coDuLieu.at(-2);
  const xuHuong = truoc && (truoc.kpi ?? 0) > 0 ? Math.round(((kpi - (truoc.kpi ?? 0)) / (truoc.kpi ?? 1)) * 100) : undefined;

  return (
    <Card className="gap-3 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Điểm KPI kỳ này
        </CardTitle>
        <CardAction>
          <Link href="/danh-gia" className="text-xs font-medium text-muted-foreground hover:underline">
            Xem đầy đủ
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold tabular-nums">{so(kpi)}</span>
          {xuHuong !== undefined && <TrendPill value={xuHuong} />}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`KPI ${so(kpi)} trên 100`}>
          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(0, Math.min(100, kpi))}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {tenNganKy(hienTai)}
          {truoc ? " · so với kỳ trước" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
