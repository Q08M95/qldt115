import { Award, Info, Users } from "lucide-react";
import { StatRow } from "@/components/dashboard-layout";
import { KpiKyTable } from "@/components/kpi/kpi-ky-table";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import type { KpiKyRow, KyDanhGia } from "@/types/database";

const so = (n: number, toiDa = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });

// Báo cáo #1 — KPI tổng hợp toàn đơn vị theo kỳ (mục 4.7): bảng xếp hạng nhiều cột số nên để FULL WIDTH (không tách
// cột phụ như các báo cáo khác) — giống cách trình bày của /nhat-ky, tránh bảng bị bó hẹp rồi tràn ngang.
// Admin xem thêm cột nhóm (đã xử lý trong KpiKyTable, gộp vào dòng tên thay vì thêm cột riêng).
// Xuất Excel/PDF gộp chung 1 nút "Xuất báo cáo" ở đầu trang /bao-cao (mục 4.7), không đặt riêng ở từng báo cáo con.
export function BaoCaoKpiTongHop({ ky, rows, isQuanTri }: { ky: KyDanhGia; rows: KpiKyRow[]; isQuanTri: boolean }) {
  const kpiTb = rows.length ? rows.reduce((s, r) => s + r.kpi, 0) / rows.length : null;
  const caoNhat = rows[0];

  return (
    <div className="grid gap-5">
      <StatRow>
        <StatTile icon={Award} label="KPI trung bình" value={kpiTb === null ? "–" : so(kpiTb)} />
        <StatTile icon={Users} label="Số người có KPI" value={rows.length} />
        <StatTile icon={Award} label="Cao nhất" value={caoNhat ? so(caoNhat.kpi) : "–"}>
          {caoNhat && <p className="mt-3 truncate text-xs text-muted-foreground">{caoNhat.ho_ten}</p>}
        </StatTile>
      </StatRow>

      <Card className="gap-4 px-0">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Bảng xếp hạng KPI <Badge variant="teal">{ky.ten}</Badge>
            <Badge variant={ky.trang_thai === "da_dong" ? "neutral" : ky.trang_thai === "cho_duyet" ? "warning" : "blue"}>{TRANG_THAI_KY_LABEL[ky.trang_thai]}</Badge>
            <span className="text-xs font-normal text-muted-foreground">
              {fmtDate(ky.tu)} – {fmtDate(ky.den)}
            </span>
          </CardTitle>
        </CardHeader>
        {ky.trang_thai !== "da_dong" && (
          <p className="-mt-2 px-5 text-xs text-muted-foreground">
            {ky.trang_thai === "dang_mo" ? "Kỳ đang mở: KPI tính trực tiếp theo dữ liệu và cấu hình hiện tại, có thể còn thay đổi." : "Kỳ chờ duyệt: kết quả đã tạm khóa, chờ Admin xem lại trước khi công bố."}
          </p>
        )}
        <CardContent className="px-0">
          {ky.trang_thai === "cho_duyet" && rows.length === 0 && !isQuanTri ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
              <Info className="size-10 text-muted-foreground/40" aria-hidden />
              Kỳ này đang chờ Admin duyệt trước khi công bố — kết quả sẽ hiển thị ngay khi được công bố.
            </div>
          ) : (
            <KpiKyTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
