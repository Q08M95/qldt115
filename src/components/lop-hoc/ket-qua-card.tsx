import { ClipboardCheck } from "lucide-react";
import { KhaoSatControls, PhanTramForm } from "@/components/lop-hoc/ket-qua-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { datC1ThuCong, datC3 } from "@/lib/lop-hoc/actions";
import type { KhaoSatLop, LopHocTongHop } from "@/types/database";

function ChiSo({ nhan, ma, value, phu }: { nhan: string; ma: string; value: number | null; phu?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-xs text-muted-foreground">
        {nhan} ({ma})
      </p>
      <p className="mt-1 text-[26px] leading-none font-bold tabular-nums">
        {value === null ? <span className="text-base font-medium text-muted-foreground">Chưa có</span> : `${value}%`}
      </p>
      {phu && <div className="mt-2">{phu}</div>}
    </div>
  );
}

// Kết quả sau khi lớp hoàn thành (mục 4.2): C1 khảo sát hài lòng (link tự động hoặc nhập tay — cái sau cùng thắng)
// và C3 tỷ lệ đạt chuẩn đầu ra (nhập tay). Chỉ hiển thị khi lớp "Đã hoàn thành" (hoặc cho người quản trị xem hướng dẫn trước đó).
export function KetQuaCard({
  lop,
  khaoSat,
  isQuanTri,
}: {
  lop: Pick<LopHocTongHop, "id" | "trang_thai" | "c1_phan_tram" | "c1_nguon" | "c3_phan_tram">;
  khaoSat: KhaoSatLop | null;
  isQuanTri: boolean;
}) {
  const hoanThanh = lop.trang_thai === "da_hoan_thanh";
  if (!hoanThanh && !isQuanTri) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Kết quả lớp
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {!hoanThanh ? (
          <p className="text-sm text-muted-foreground">
            Kết quả khảo sát hài lòng học viên (C1) và tỷ lệ học viên đạt chuẩn đầu ra (C3) chỉ nhập được sau khi lớp chuyển sang “Đã hoàn thành”.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChiSo
                ma="C1"
                nhan="Khảo sát hài lòng học viên"
                value={lop.c1_phan_tram}
                phu={
                  lop.c1_nguon && (
                    <Badge variant={lop.c1_nguon === "khao_sat" ? "teal" : "outline"}>
                      {lop.c1_nguon === "khao_sat" ? "Từ khảo sát" : "Nhập tay"}
                    </Badge>
                  )
                }
              />
              <ChiSo ma="C3" nhan="Tỷ lệ học viên đạt chuẩn đầu ra" value={lop.c3_phan_tram} />
            </div>

            {isQuanTri && (
              <div className="grid gap-5 border-t pt-5">
                <KhaoSatControls lopId={lop.id} khaoSat={khaoSat} />
                <PhanTramForm
                  action={datC1ThuCong}
                  lopId={lop.id}
                  name="c1"
                  label="Khảo sát hài lòng học viên (C1) — nhập tay (%)"
                  hint="Dùng khi khảo sát làm ngoài hệ thống. Hình thức nhập sau cùng ghi đè, không cộng dồn."
                  value={lop.c1_nguon === "nhap_tay" ? lop.c1_phan_tram : null}
                />
                <PhanTramForm
                  action={datC3}
                  lopId={lop.id}
                  name="c3"
                  label="Tỷ lệ học viên đạt chuẩn đầu ra (C3) — nhập tay (%)"
                  hint="Nhập % tổng hợp, không cần danh sách học viên."
                  value={lop.c3_phan_tram}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
