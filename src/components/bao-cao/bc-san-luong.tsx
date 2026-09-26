import { Clock, Scale, UserX, Users } from "lucide-react";
import { DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { KhoangBaoCao } from "@/lib/bao-cao/khoang";
import { tongHopSanLuong, xuHuong, type LocVaiTro } from "@/lib/bao-cao/tinh-toan";
import type { DongSanLuong } from "@/lib/bao-cao/types";
import { LocVaiTroLinks } from "./thanh-dieu-khien";
import { ThanhNgang, type DongThanh } from "./bieu-do";

const gio = (n: number) => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ`;

// Báo cáo #3 — Sản lượng giảng dạy (mục 4.7): so sánh giờ dạy giữa mọi người để Admin tự kiểm tra nguyên tắc công bằng phân bổ (mục 4.3).
// Không gắn nhãn nhóm; chỉ tách theo vai trò Giảng viên / Trợ giảng. Xuất Excel/PDF gộp chung 1 nút ở đầu trang /bao-cao.
export function BaoCaoSanLuong({
  rows,
  rowsTruoc,
  loc,
  khoang,
  ky,
}: {
  rows: DongSanLuong[];
  rowsTruoc: DongSanLuong[];
  loc: LocVaiTro;
  khoang: KhoangBaoCao;
  ky?: string;
}) {
  const t = tongHopSanLuong(rows, loc);
  const truoc = tongHopSanLuong(rowsTruoc, loc);

  const dong: DongThanh[] = [...t.nguoi]
    .sort((a, b) => b.gio_thuc - a.gio_thuc || b.gio_sap - a.gio_sap || a.ho_ten.localeCompare(b.ho_ten, "vi"))
    .map((r) => ({
      khoa: r.user_id,
      nhan: r.ho_ten,
      phu: `${VAI_TRO_LABEL[r.vai_tro]}${r.dang_tham_gia ? "" : " · đã nghỉ"} · ${r.so_bai} Bài${r.so_lop > 0 ? ` / ${r.so_lop} lớp` : ""}`,
      avatar: { ten: r.ho_ten, src: r.avatar_url },
      href: `/nhan-su/${r.user_id}`,
      gia_tri: r.gio_thuc,
      gia_tri_them: r.gio_sap,
      hien_thi: gio(r.gio_thuc).replace(" giờ", "h"),
      hien_thi_phu: r.gio_sap > 0 ? `+${gio(r.gio_sap).replace(" giờ", "h")}` : undefined,
    }));
  const coHapSap = t.nguoi.some((r) => r.gio_sap > 0);

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={Clock} label="Giờ đã dạy" value={gio(t.tongGio)} trend={xuHuong(t.tongGio, truoc.tongGio)} />
            <StatTile icon={Users} label="Giờ TB/người" value={gio(t.gioTB)} trend={xuHuong(t.gioTB, truoc.gioTB)} />
            <StatTile icon={UserX} label="Chưa dạy giờ" value={`${t.soNguoiKhongDay}/${t.soNguoi}`} />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Giờ dạy theo người
                <span className="text-sm font-normal text-muted-foreground">· {t.nguoi.length} người</span>
              </CardTitle>
              <CardAction className="flex items-center gap-2 max-md:col-start-1 max-md:row-span-1 max-md:row-start-2 max-md:mt-1 max-md:justify-self-start">
                <LocVaiTroLinks anchor="san-luong" khoang={khoang} ky={ky} vt={loc} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {dong.length === 0 ? (
                <EmptyState icon={Users} title="Chưa có nhân sự nào để thống kê trong khoảng thời gian này" />
              ) : (
                <div className="md:max-h-[560px] md:overflow-y-auto md:pr-1">
                  <ThanhNgang dong={dong} chuThichThem={coHapSap ? "Đã phân công, chưa diễn ra" : undefined} thuGonMobile={5} />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Độ đồng đều
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {t.chiSoDongDeu === null ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Cần ít nhất 2 người và có giờ dạy để tính độ đồng đều.</p>
              ) : (
                <>
                  <DongHoBanNguyet phanTram={t.chiSoDongDeu} so={`${t.chiSoDongDeu}/100`} nhan="Chỉ số đồng đều" className="mx-auto w-48" />
                  <p className="text-center text-sm text-muted-foreground">
                    {t.chiSoDongDeu >= 75 ? "Khối lượng giảng dạy phân bổ khá đều." : t.chiSoDongDeu >= 50 ? "Có chênh lệch giữa những người dạy nhiều và ít." : "Khối lượng đang dồn về một số ít người."}
                    {t.top20 !== null && (
                      <>
                        {" "}
                        20% người dạy nhiều nhất đảm nhiệm <span className="font-medium text-foreground">{t.top20}%</span> tổng giờ.
                      </>
                    )}
                  </p>
                </>
              )}
              <p className="border-t pt-3 text-xs text-muted-foreground">100 = mọi người dạy bằng nhau. Chỉ tính người đang tham gia giảng dạy, theo giờ đã dạy xong trong khoảng đã chọn.</p>
            </CardContent>
          </Card>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Số người theo mức giờ dạy</CardTitle>
            </CardHeader>
            <CardContent>
              <ThanhNgang
                dong={t.muc.map((m) => ({ khoa: m.nhan, nhan: m.nhan, gia_tri: m.so, hien_thi: `${m.so} người` }))}
                toiDa={Math.max(...t.muc.map((m) => m.so), 1)}
              />
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
