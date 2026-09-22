import { Download, FileCheck2, Hourglass, ThumbsUp } from "lucide-react";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chuanHoaDeXuat } from "@/lib/bao-cao/tinh-toan";
import { hrefBaoCao } from "@/lib/bao-cao/url";
import { LOAI_DE_XUAT_LABEL } from "@/lib/nhan-su/labels";
import type { DeXuatThongKe, KyDanhGia } from "@/types/database";
import { ChuThichDonut, Donut } from "./bieu-do";

const pt = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}%`);

// Báo cáo #7 — Đề xuất nhân sự (mục 3/4.1/4.7): số liệu tổng hợp theo loại/kỳ + donut tỷ lệ duyệt/bỏ qua. KHÔNG hiển thị
// ai được đề xuất gì (mức đó thuộc Nhật ký hệ thống, chỉ Admin/Quản lý lớp) — công khai cho mọi người ở dạng số liệu.
export function BaoCaoDeXuat({ ky, data, isQuanTri }: { ky: KyDanhGia; data: DeXuatThongKe; isQuanTri: boolean }) {
  const t = chuanHoaDeXuat(data);
  const lat = [
    { khoa: "da_duyet", nhan: "Đã duyệt", so: t.da_duyet, mau: "green" as const },
    { khoa: "bo_qua", nhan: "Đã bỏ qua", so: t.bo_qua, mau: "neutral" as const },
  ];

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={Hourglass} label="Chờ duyệt" value={t.cho_duyet} />
            <StatTile icon={ThumbsUp} label="Đã duyệt" value={t.da_duyet} />
            <StatTile icon={FileCheck2} label="Tỷ lệ duyệt" value={pt(t.tyLeDuyet)} />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Theo loại đề xuất — {ky.ten}</CardTitle>
              {isQuanTri && t.tong > 0 && (
                <CardAction>
                  <Button asChild variant="outline" size="sm">
                    <a href={hrefBaoCao({ bc: "de-xuat", ky: ky.id }).replace("/bao-cao?", "/bao-cao/xuat?")} download>
                      <Download /> Xuất Excel
                    </a>
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="@container">
                <div className="hidden @[30rem]:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[13px] font-medium text-muted-foreground">
                        <th className="pb-2 font-medium">Loại đề xuất</th>
                        <th className="pb-2 text-right font-medium">Chờ duyệt</th>
                        <th className="pb-2 text-right font-medium">Đã duyệt</th>
                        <th className="pb-2 text-right font-medium">Đã bỏ qua</th>
                        <th className="pb-2 text-right font-medium">Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.theo_loai.map((l) => (
                        <tr key={l.loai} className="border-b last:border-0 hover:bg-background">
                          <td className="py-2.5 pr-3 font-medium">{LOAI_DE_XUAT_LABEL[l.loai]}</td>
                          <td className="py-2.5 text-right tabular-nums">{l.cho_duyet || "–"}</td>
                          <td className="py-2.5 text-right tabular-nums">{l.da_duyet || "–"}</td>
                          <td className="py-2.5 text-right tabular-nums">{l.bo_qua || "–"}</td>
                          <td className="py-2.5 text-right font-medium tabular-nums">{l.cho_duyet + l.da_duyet + l.bo_qua || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="grid gap-2 @[30rem]:hidden">
                  {t.theo_loai.map((l) => (
                    <li key={l.loai} className="grid gap-2 rounded-xl border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{LOAI_DE_XUAT_LABEL[l.loai]}</span>
                        <span className="text-base font-semibold tabular-nums">{l.cho_duyet + l.da_duyet + l.bo_qua || "–"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                        <div>
                          <span className="block text-sm font-medium text-foreground">{l.cho_duyet || "–"}</span>Chờ duyệt
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-foreground">{l.da_duyet || "–"}</span>Đã duyệt
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-foreground">{l.bo_qua || "–"}</span>Đã bỏ qua
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {t.tong === 0 && t.cho_duyet === 0 && <p className="pt-6 pb-2 text-center text-sm text-muted-foreground">Chưa có đề xuất nhân sự nào trong kỳ này.</p>}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Tỷ lệ duyệt / bỏ qua</CardTitle>
            </CardHeader>
            <CardContent>
              {t.da_duyet + t.bo_qua === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Chưa có đề xuất nào được xử lý xong.</p>
              ) : (
                <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
                  <Donut lat={lat} giua={pt(t.tyLeDuyet)} phu="đã duyệt" className="mx-auto size-32" />
                  <ChuThichDonut lat={lat} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="gap-2 px-0">
            <CardHeader>
              <CardTitle>Về báo cáo này</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              <p>Chỉ hiển thị số liệu thống kê theo loại và trạng thái — không nêu ai được đề xuất gì.</p>
              <p>Muốn xem chi tiết từng đề xuất, vào Nhật ký hệ thống (chỉ Admin/Quản lý lớp) hoặc mục Đề xuất nhân sự trong hồ sơ Nhân sự.</p>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
