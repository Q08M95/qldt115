import { HeartHandshake, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ThuGonDanhSach } from "@/components/thu-gon-danh-sach";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { A4Row, KyDanhGia } from "@/types/database";

// Báo cáo #6 — A4: đóng góp lớp không kinh phí (mục 4.2/6). Xếp hạng theo LŨY KẾ TOÀN THỜI GIAN (phục vụ vinh danh cuối
// năm, không phụ thuộc kỳ đang xem); cột "trong kỳ" đổi theo kỳ đã chọn để thấy đóng góp gần đây.
// Xuất Excel/PDF gộp chung 1 nút "Xuất báo cáo" ở đầu trang /bao-cao (mục 4.7).
export function BaoCaoA4({ ky, rows }: { ky: KyDanhGia; rows: A4Row[] }) {
  const coDongGop = rows.filter((r) => r.a4_luy_ke > 0);
  const tongLuyKe = rows.reduce((s, r) => s + r.a4_luy_ke, 0);
  const tongKy = rows.reduce((s, r) => s + r.a4_ky, 0);
  const dan = [...rows].sort((a, b) => b.a4_luy_ke - a.a4_luy_ke || b.a4_ky - a.a4_ky || a.ho_ten.localeCompare(b.ho_ten, "vi"));

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={HeartHandshake} label="Tổng lớp không KP" value={tongLuyKe} />
            <StatTile icon={HeartHandshake} label={`Trong ${ky.ten}`} value={tongKy} />
            <StatTile icon={Trophy} label="Người có đóng góp" value={coDongGop.length} />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Bảng xếp hạng các lớp không kinh phí <Badge variant="teal">{rows.length} người</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <EmptyState icon={HeartHandshake} title="Chưa có ai tham gia dạy lớp không kinh phí" />
              ) : (
                <ul className="divide-y">
                  <ThuGonDanhSach soDau={5}>
{dan.map((r, i) => (
                    <li key={r.user_id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <UserAvatar name={r.ho_ten} src={r.avatar_url} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.ho_ten}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.vai_tro && VAI_TRO_LABEL[r.vai_tro]}
                          {!r.dang_tham_gia && " · đã nghỉ"}
                        </p>
                      </div>
                      {i < 3 && r.a4_luy_ke > 0 && <Trophy className="size-4 shrink-0 text-hue-green" aria-hidden />}
                      <div className="flex shrink-0 items-center gap-4 text-right">
                        <span>
                          <span className="block text-base font-semibold tabular-nums">{r.a4_luy_ke}</span>
                          <span className="block text-[11px] text-muted-foreground">lũy kế</span>
                        </span>
                        <span>
                          <span className="block text-base font-semibold tabular-nums text-muted-foreground">{r.a4_ky}</span>
                          <span className="block text-[11px] text-muted-foreground">kỳ này</span>
                        </span>
                      </div>
                    </li>
                  ))}
</ThuGonDanhSach>
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <Card className="gap-2 px-0">
          <CardHeader>
            <CardTitle>Cách đọc số liệu</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <p>Mỗi lớp không kinh phí chỉ tính <span className="font-medium text-foreground">1 lần</span> cho mỗi người, dù người đó dạy bao nhiêu Bài trong lớp (mục 4.2).</p>
            <p>
              <span className="font-medium text-foreground">Lũy kế</span> tính từ trước tới hiện tại, không đổi theo kỳ đang xem — dùng để xét vinh danh cuối năm và tie-break khi xét khen thưởng (KPI bằng nhau).
            </p>
            <p>
              <span className="font-medium text-foreground">Kỳ này</span> chỉ tính các lớp không kinh phí có Bài trong khoảng {ky.ten} — đổi kỳ ở bộ lọc phía trên để xem giai đoạn khác.
            </p>
          </CardContent>
        </Card>
      }
    />
  );
}
