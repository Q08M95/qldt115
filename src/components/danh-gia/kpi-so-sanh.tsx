import { LineChart, Scale } from "lucide-react";
import { DuongNhomQuaKy, MAU_NHOM, type DiemNhomKy } from "@/components/danh-gia/kpi-charts";
import { NHOM_TC, TIEU_CHI, tenNganKy } from "@/components/danh-gia/kpi-ca-nhan";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiCaNhan } from "@/types/database";

const so = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Hai thẻ số liệu/biểu đồ bổ sung cho Bảng KPI cá nhân ở trang /danh-gia (cột phải):
//  1) điểm 3 nhóm A/B/C qua các kỳ, 2) từng tiêu chí kỳ này so với kỳ trước + mạnh nhất / cần cải thiện.
// Nhóm A/B/C và tiêu chí là nhóm TIÊU CHÍ (không phải nhóm nhân sự) nên hiển thị cho mọi người (mục 4.7).
export function KpiSoSanhCards({ data }: { data: KpiCaNhan | null }) {
  const coDuLieu = (data?.ky ?? []).filter((k) => k.kpi !== null);
  if (coDuLieu.length === 0) return null;

  const ky = coDuLieu.slice(-8);
  const diemNhom: DiemNhomKy[] = ky.map((k) => ({ nhan: tenNganKy(k), A: k.diem_nhom.A ?? null, B: k.diem_nhom.B ?? null, C: k.diem_nhom.C ?? null }));
  const hienTai = coDuLieu.at(-1)!;
  const truoc = coDuLieu.at(-2);

  const dong = TIEU_CHI.filter((t) => hienTai.gia_tri[t.ma] !== undefined).map((t) => {
    const v = hienTai.gia_tri[t.ma];
    const cu = truoc?.gia_tri[t.ma];
    return { ...t, v, delta: cu === undefined ? null : Math.round((v - cu) * 10) / 10 };
  });
  const manh = dong.length > 0 ? dong.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const yeu = dong.length > 1 ? dong.reduce((a, b) => (b.v < a.v ? b : a)) : null;

  return (
    <>
      <Card className="gap-4 px-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Sản lượng · Chuyên cần · Chất lượng
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {ky.length < 2 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cần ít nhất 2 kỳ có KPI để so sánh xu hướng.</p>
          ) : (
            <DuongNhomQuaKy ky={diemNhom} className="h-auto w-full" />
          )}
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {MAU_NHOM.map((m) => (
              <li key={m.ma} className="flex items-center gap-1.5">
                <span className="h-1 w-5 rounded-full" style={{ backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(${m.bien}) 55%, transparent), var(${m.bien}))` }} aria-hidden />
                <span className="font-medium text-foreground">{m.ma}</span> {NHOM_TC.find((n) => n.ma === m.ma)?.nhan}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-4 px-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Từng tiêu chí{truoc ? " so với kỳ trước" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {manh && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-background p-3 text-center">
                <span className="text-[12.5px] font-medium text-muted-foreground">Mạnh nhất</span>
                <span className="text-grad-green inline-block text-[26px] leading-none font-semibold tabular-nums">{so(manh.v)}</span>
                <span className="text-xs text-muted-foreground">
                  {manh.ma} {manh.nhan}
                </span>
              </div>
              {yeu && (
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-background p-3 text-center">
                  <span className="text-[12.5px] font-medium text-muted-foreground">Cần cải thiện</span>
                  <span className="text-grad-blue inline-block text-[26px] leading-none font-semibold tabular-nums">{so(yeu.v)}</span>
                  <span className="text-xs text-muted-foreground">
                    {yeu.ma} {yeu.nhan}
                  </span>
                </div>
              )}
            </div>
          )}
          <ul className="grid gap-2.5">
            {dong.map((d) => (
              <li key={d.ma} className="grid grid-cols-[6.75rem_minmax(0,1fr)_2.25rem_3.25rem] items-center gap-2.5 text-sm">
                <span className="truncate">
                  <span className="font-semibold">{d.ma}</span> <span className="text-muted-foreground">{d.nhan}</span>
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                  <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(0, Math.min(100, d.v))}%` }} />
                </div>
                <span className="text-right font-medium tabular-nums">{so(d.v)}</span>
                <span className="flex justify-end">
                  {d.delta === null ? null : d.delta > 0 ? (
                    <Badge variant="success">+{so(d.delta)}</Badge>
                  ) : d.delta < 0 ? (
                    <Badge variant="danger">−{so(Math.abs(d.delta))}</Badge>
                  ) : (
                    <Badge variant="neutral">0</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
