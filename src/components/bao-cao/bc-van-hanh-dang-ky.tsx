import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Hourglass, Inbox, ShieldCheck, Timer } from "lucide-react";
import { DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { gopSerie, phanTram, xuHuong } from "@/lib/bao-cao/tinh-toan";
import type { CanhBaoPool, VanHanhDangKy } from "@/lib/bao-cao/types";
import { ChuThichDonut, CotTheoThoiGian, Donut, Sparkline } from "./bieu-do";

const pt = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);

function thoiGianLap(gio: number | null): string {
  if (gio === null) return "–";
  if (gio < 1) return `${Math.max(1, Math.round(gio * 60))} phút`;
  if (gio < 48) return `${gio.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;
  return `${(gio / 24).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ngày`;
}

const nhanNgay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

// Báo cáo #5 — Vận hành đăng ký & phân công (mục 4.7): tỷ lệ lấp đầy, thời gian TB lấp slot (kèm sparkline),
// số Bài đang cảnh báo pool ứng viên nhỏ và việc đang chờ xử lý — hai mục sau phản ánh trạng thái NGAY LÚC NÀY (không theo khoảng).
export function BaoCaoVanHanhDangKy({
  hienTai,
  truoc,
  canhBao,
  nguongPool,
}: {
  hienTai: VanHanhDangKy;
  truoc: VanHanhDangKy;
  canhBao: CanhBaoPool[];
  nguongPool: number;
}) {
  const layDay = phanTram(hienTai.slot_da_phan_cong, hienTai.slot_tong);
  const layDayTruoc = phanTram(truoc.slot_da_phan_cong, truoc.slot_tong);
  const serie = gopSerie(hienTai.serie);
  const cho = hienTai.dang_ky_cho + hienTai.loi_moi_cho;
  const thieu = Math.max(0, hienTai.slot_tong - hienTai.slot_da_phan_cong);
  const khongAi = canhBao.filter((c) => c.so_ung_vien === 0).length;

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={ShieldCheck} label="Tỷ lệ lấp đầy" value={pt(layDay)} trend={xuHuong(layDay, layDayTruoc)}>
              <Sparkline gia_tri={serie.map((s) => s.phan_cong)} nhan="Slot được phân công theo ngày" className="mt-3 h-8 w-full" />
            </StatTile>
            <StatTile icon={Timer} label="TB lấp slot" value={thoiGianLap(hienTai.gio_lap_tb)}>
              <p className="mt-3 text-xs text-muted-foreground">{hienTai.so_slot_do_duyet > 0 ? `Trên ${hienTai.so_slot_do_duyet} slot đã có người` : "Chưa có slot nào được duyệt"}</p>
            </StatTile>
            <StatTile icon={Hourglass} label="Đang chờ" value={cho}>
              <p className="mt-3 text-xs text-muted-foreground">
                {hienTai.dang_ky_cho} đăng ký · {hienTai.loi_moi_cho} lời mời
              </p>
            </StatTile>
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Slot được phân công theo ngày</CardTitle>
              <p className="text-xs text-muted-foreground">
                {hienTai.dang_ky_moi} lượt tự đăng ký · {hienTai.loi_moi_gui} lời mời gửi đi trong khoảng này
              </p>
            </CardHeader>
            <CardContent>
              {serie.every((s) => s.phan_cong === 0) ? (
                <EmptyState icon={ClipboardCheck} title="Chưa có slot nào được phân công trong khoảng thời gian này" />
              ) : (
                <CotTheoThoiGian cot={serie.map((s) => ({ nhan: nhanNgay(s.ngay), gia_tri: s.phan_cong }))} donVi="slot" className="h-auto w-full" />
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Bài cảnh báo ít người đủ điều kiện
                <Badge variant={canhBao.length > 0 ? "warning" : "success"}>{canhBao.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Tình trạng hiện tại (không theo khoảng) · Bài còn slot trống có dưới {nguongPool} người đủ điều kiện</p>
            </CardHeader>
            <CardContent>
              {canhBao.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Mọi Bài còn slot trống đều có đủ ứng viên" />
              ) : (
                <ul className="divide-y">
                  {canhBao.slice(0, 20).map((c) => (
                    <li key={`${c.bai_id}-${c.vai_tro}`}>
                      <Link href={`/lop-hoc/${c.lop_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-background">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {c.lop_ten} <span className="text-muted-foreground">›</span> {c.bai_ten}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {VAI_TRO_LABEL[c.vai_tro]} · {c.slot_trong} slot trống · {fmtDateTime(c.bat_dau)}
                          </p>
                        </div>
                        <Badge variant={c.so_ung_vien === 0 ? "danger" : "warning"}>{c.so_ung_vien === 0 ? "Không có ai" : `${c.so_ung_vien} người`}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {canhBao.length > 20 && <p className="pt-2 text-center text-xs text-muted-foreground">Còn {canhBao.length - 20} Bài khác — xử lý bớt để xem tiếp.</p>}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle>Lấp đầy slot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {layDay === null ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Chưa có slot nào của Bài trong khoảng này.</p>
              ) : (
                <>
                  <DongHoBanNguyet phanTram={layDay} so={pt(layDay)} nhan={`${hienTai.slot_da_phan_cong}/${hienTai.slot_tong} slot`} className="mx-auto w-48" />
                  <div className="grid grid-cols-[auto_1fr] items-center gap-4 border-t pt-3">
                    <Donut
                      lat={[
                        { khoa: "pc", nhan: "Đã phân công", so: hienTai.slot_da_phan_cong, mau: "green" },
                        { khoa: "thieu", nhan: "Còn thiếu", so: thieu, mau: "neutral" },
                      ]}
                      giua={String(hienTai.slot_tong)}
                      phu="slot"
                      className="size-24"
                    />
                    <ChuThichDonut
                      lat={[
                        { khoa: "pc", nhan: "Đã phân công", so: hienTai.slot_da_phan_cong, mau: "green" },
                        { khoa: "thieu", nhan: "Còn thiếu", so: thieu, mau: "neutral" },
                      ]}
                    />
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">Tính trên slot của các Bài bắt đầu trong khoảng đã chọn (lớp Đang mở hoặc Đã hoàn thành; không tính Dự kiến và Đã hủy).</p>
            </CardContent>
          </Card>

          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle>Việc đang chờ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/dang-ky" className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-background">
                <Inbox className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 text-sm">Đăng ký chờ duyệt</span>
                <span className="text-lg font-medium tabular-nums">{hienTai.dang_ky_cho}</span>
              </Link>
              <Link href="/dang-ky" className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-background">
                <Hourglass className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 text-sm">Lời mời chờ phản hồi</span>
                <span className="text-lg font-medium tabular-nums">{hienTai.loi_moi_cho}</span>
              </Link>
              <Link href="/lop-hoc" className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-background">
                <AlertTriangle className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 text-sm">Bài ít người đủ điều kiện{khongAi > 0 ? ` (${khongAi} không có ai)` : ""}</span>
                <span className="text-lg font-medium tabular-nums">{canhBao.length}</span>
              </Link>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
