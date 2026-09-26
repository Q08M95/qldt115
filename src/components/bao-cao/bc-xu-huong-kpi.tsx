import { LineChart, TrendingUp, Users } from "lucide-react";
import { AreaXuHuong, DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { ThuGonDanhSach } from "@/components/thu-gon-danh-sach";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { xuHuong } from "@/lib/bao-cao/tinh-toan";
import type { KpiTheoKyRow } from "@/types/database";

const so = (n: number | null, toiDa = 1) => (n === null ? "–" : n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa }));

function tenNgan(ten: string) {
  const m = /Quý\s*(\d)\s*\/\s*(\d{4})/i.exec(ten);
  return m ? `Q${m[1]}/${m[2]}` : ten.length > 10 ? `${ten.slice(0, 9)}…` : ten;
}

// Báo cáo #2 — Xu hướng KPI theo thời gian (mục 4.7): KPI trung bình toàn đơn vị qua nhiều kỳ gần nhất, realtime cho kỳ
// đang mở, dùng snapshot đã khóa cho kỳ đã đóng (bc_kpi_theo_ky gọi lại kpi_ky nên tự tuân theo nguyên tắc này).
// Không lọc theo kỳ (luôn hiện nhiều kỳ) nên không có thanh điều khiển ngoài hàng tab báo cáo.
export function BaoCaoXuHuongKpi({ ky }: { ky: KpiTheoKyRow[] }) {
  const coDuLieu = ky.filter((k) => k.kpi_tb !== null);
  const hienTai = coDuLieu.at(-1) ?? null;
  const truoc = coDuLieu.at(-2) ?? null;

  if (coDuLieu.length === 0) {
    return <EmptyState icon={LineChart} title="Chưa có kỳ nào có kết quả KPI để vẽ xu hướng" />;
  }

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={TrendingUp} label={`KPI TB ${hienTai ? tenNgan(hienTai.ten) : ""}`} value={so(hienTai?.kpi_tb ?? null)} trend={hienTai && truoc ? xuHuong(hienTai.kpi_tb, truoc.kpi_tb) : undefined} />
            <StatTile icon={Users} label="Số người có KPI" value={hienTai?.so_nguoi ?? 0} />
            <StatTile icon={LineChart} label="Số kỳ hiển thị" value={coDuLieu.length} />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Xu hướng KPI trung bình toàn đơn vị</CardTitle>
            </CardHeader>
            <CardContent>
              {coDuLieu.length < 2 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Cần ít nhất 2 kỳ có kết quả để vẽ xu hướng.</p>
              ) : (
                <AreaXuHuong diem={coDuLieu.map((k) => ({ nhan: tenNgan(k.ten), gia_tri: k.kpi_tb ?? 0 }))} className="h-auto w-full" />
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Chi tiết theo kỳ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="@container">
                <div className="hidden @[30rem]:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[13px] font-medium text-muted-foreground">
                        <th className="pb-2 font-medium">Kỳ</th>
                        <th className="pb-2 text-right font-medium">KPI TB</th>
                        <th className="pb-2 text-right font-medium">Giảng viên</th>
                        <th className="pb-2 text-right font-medium">Trợ giảng</th>
                        <th className="pb-2 text-right font-medium">Số người</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...ky].reverse().map((k) => (
                        <tr key={k.ky_id} className="border-b last:border-0 hover:bg-background">
                          <td className="py-2 pr-3 font-medium whitespace-nowrap">{k.ten}</td>
                          <td className="py-2 text-right tabular-nums">{so(k.kpi_tb)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{so(k.kpi_tb_gv)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{so(k.kpi_tb_tg)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{k.so_nguoi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="grid gap-2 @[30rem]:hidden">
                  <ThuGonDanhSach soDau={5}>
{[...ky].reverse().map((k) => (
                    <li key={k.ky_id} className="grid gap-2 rounded-xl border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{k.ten}</span>
                        <span className="text-base font-semibold tabular-nums">{so(k.kpi_tb)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                        <div>
                          <span className="block text-sm font-medium text-foreground">{so(k.kpi_tb_gv)}</span>Giảng viên
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-foreground">{so(k.kpi_tb_tg)}</span>Trợ giảng
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-foreground">{k.so_nguoi}</span>Số người
                        </div>
                      </div>
                    </li>
                  ))}
</ThuGonDanhSach>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      }
      aside={
        <Card className="gap-3 px-0">
          <CardHeader>
            <CardTitle>So sánh vai trò · {hienTai ? tenNgan(hienTai.ten) : ""}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <div className="grid gap-1 text-center">
              {hienTai?.kpi_tb_gv != null ? <DongHoBanNguyet phanTram={hienTai.kpi_tb_gv} so={so(hienTai.kpi_tb_gv)} nhan="Giảng viên" className="w-full" /> : <Trong />}
            </div>
            <div className="grid gap-1 text-center">
              {hienTai?.kpi_tb_tg != null ? <DongHoBanNguyet phanTram={hienTai.kpi_tb_tg} so={so(hienTai.kpi_tb_tg)} nhan="Trợ giảng" className="w-full" /> : <Trong />}
            </div>
            <p className="col-span-2 border-t pt-3 text-xs text-muted-foreground">KPI trung bình theo vai trò của kỳ gần nhất có dữ liệu — không tách theo nhóm (mục 4.7).</p>
          </CardContent>
        </Card>
      }
    />
  );
}

function Trong() {
  return <p className="grid h-24 place-items-center text-xs text-muted-foreground">Chưa có dữ liệu</p>;
}
