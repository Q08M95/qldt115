import { GraduationCap, Scale, Users, Workflow } from "lucide-react";
import { CheckInBanner } from "@/components/danh-gia/check-in-banner";
import { KpiCaNhanBoard } from "@/components/danh-gia/kpi-ca-nhan";
import { AreaXuHuong, DongHoBanNguyet, RadarNhom } from "@/components/danh-gia/kpi-charts";
import { TieuChiSoSanh } from "@/components/danh-gia/kpi-so-sanh";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Sparkline, ThanhNgang, Donut, ChuThichDonut, type MauBieuDo } from "@/components/bao-cao/bieu-do";
import { MAU_TRANG_THAI } from "@/components/bao-cao/bc-van-hanh-lop";
import { LichSapToi } from "@/components/tong-quan/lich-sap-toi";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getBaiCanCheckIn, getKpiCaNhan } from "@/lib/danh-gia/queries";
import { getViecCuaToi } from "@/lib/dang-ky/queries";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import { getChungTongQuan, getThongKeAdmin } from "@/lib/tong-quan/queries";
import type { KpiTheoKyRow } from "@/types/database";

const MAU_NHOM_LOP: MauBieuDo[] = ["blue", "navy", "teal", "green"];

// Rút gọn tên kỳ cho nhãn trục biểu đồ (vd "Quý 3/2026" -> "Q3/2026") — tên kỳ demo/tùy chỉnh có thể dài hơn nhiều so
// với tên kỳ thật, không rút gọn sẽ tràn/chồng chữ trên trục ngang (đúng cách báo cáo #2 đã xử lý).
function tenNganKy(ten: string) {
  const m = /Quý\s*(\d)\s*\/\s*(\d{4})/i.exec(ten);
  return m ? `Q${m[1]}/${m[2]}` : ten.length > 10 ? `${ten.slice(0, 9)}…` : ten;
}

// Donut "Lớp theo trạng thái" — dùng lại cho cả khối Admin và khối GV/TG (mục 4.7b, sau phản hồi người dùng).
function CardLopTheoTrangThai({ lat, tong }: { lat: { khoa: string; nhan: string; so: number; mau: MauBieuDo }[]; tong: number }) {
  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle>Lớp theo trạng thái</CardTitle>
      </CardHeader>
      <CardContent>
        {lat.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chưa có lớp nào.</p>
        ) : (
          <div className="@container">
            <div className="grid items-center gap-4 @[22rem]:grid-cols-[auto_1fr]">
              <Donut lat={lat} giua={String(tong)} phu="lớp" className="mx-auto size-32" />
              <ChuThichDonut lat={lat} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tổng quan (4.7b, trang chủ khi đăng nhập) — liên kết chặt nhưng không gộp với Báo cáo (4.7): số liệu "toàn đơn vị"
// tái dùng thẳng (getChungTongQuan) nhưng rút gọn, không lọc theo khung thời gian — luôn là ảnh chụp HIỆN TẠI.
// Không lặp lại danh sách bản ghi thô đã có sẵn ở module khác (đăng ký/đề xuất chờ duyệt ở /dang-ky và
// /nhan-su/de-xuat, thông báo ở /thong-bao, lớp đang mở ở /lop-hoc) — phần "toàn đơn vị" chỉ còn lại các biểu đồ
// PHÂN TÍCH (xu hướng, phân bố, độ công bằng), hiện đúng 1 LẦN dù người xem có cả 2 vai trò (không lặp 2 khối).
// Người giữ Quyền Quản lý lớp (isQuanTri + có hồ sơ GV/TG) thấy CẢ 2 khối riêng vai trò cùng lúc.
export default async function HomePage() {
  const { profile, isQuanTri } = await requireSession();
  const laAdmin = isQuanTri;
  const laGvTg = !!profile.vai_tro_giang_day;

  const [baiCheckIn, chung, thongKeAdmin, viecCuaToi, kpiCaNhan] = await Promise.all([
    getBaiCanCheckIn(),
    laAdmin || laGvTg ? getChungTongQuan() : null,
    laAdmin ? getThongKeAdmin() : null,
    laGvTg ? getViecCuaToi(profile.id, false) : null,
    laGvTg ? getKpiCaNhan(profile.id) : null,
  ]);

  const kpiCoDuLieu = (chung?.kpiXuHuong ?? []).filter((k): k is KpiTheoKyRow & { kpi_tb: number } => k.kpi_tb !== null);
  const lat = (chung?.tongHop.theoTrangThai ?? []).map((t) => ({
    khoa: t.khoa,
    nhan: TRANG_THAI_LOP_LABEL[t.khoa as keyof typeof TRANG_THAI_LOP_LABEL] ?? t.khoa,
    so: t.so,
    mau: MAU_TRANG_THAI[t.khoa as keyof typeof MAU_TRANG_THAI] ?? "neutral",
  }));
  const latNhom = (chung?.tongHop.theoNhomLop ?? []).map((t, i) => ({ khoa: t.nhan, nhan: t.nhan, so: t.so, mau: MAU_NHOM_LOP[i % 4] }));

  return (
    <div className="grid gap-6">
      <CheckInBanner items={baiCheckIn} />

      {laAdmin && thongKeAdmin && chung && (
        <DashboardLayout
          main={
            <>
              <StatRow>
                <StatTile icon={Users} label="Nhân sự" value={thongKeAdmin.nhanSu.tong}>
                  <Sparkline gia_tri={thongKeAdmin.nhanSu.xuHuong} className="mt-3 h-8 w-full" nhan="Nhân sự mới theo ngày" />
                </StatTile>
                <StatTile icon={GraduationCap} label="Lớp đang mở" value={thongKeAdmin.lopDangMo.tong}>
                  <Sparkline gia_tri={thongKeAdmin.lopDangMo.xuHuong} className="mt-3 h-8 w-full" nhan="Lớp mới theo ngày" />
                </StatTile>
                <StatTile icon={Workflow} label="Slot còn trống" value={thongKeAdmin.slotTrong.tong}>
                  <Sparkline gia_tri={thongKeAdmin.slotTrong.xuHuong} className="mt-3 h-8 w-full" nhan="Slot được phân công theo ngày" />
                </StatTile>
              </StatRow>

              <Card className="gap-4 px-0">
                <CardHeader>
                  <CardTitle>Tỷ lệ lấp đầy slot — lớp đang mở</CardTitle>
                  {thongKeAdmin.canhBaoPool > 0 && (
                    <CardAction>
                      <Badge variant="warning" title="Số Bài đang mở có pool ứng viên dưới ngưỡng cảnh báo — xem chi tiết ở Báo cáo #5">
                        {thongKeAdmin.canhBaoPool} cảnh báo pool nhỏ
                      </Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent>
                  {chung.lapDaySlot.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Không có lớp nào đang mở đăng ký.</p>
                  ) : (
                    <ThanhNgang
                      dong={chung.lapDaySlot.map((l) => ({ khoa: l.id, nhan: l.ten, gia_tri: l.phanTram, hien_thi: `${l.phanTram}%`, hien_thi_phu: l.hienThi, href: `/lop-hoc/${l.id}` }))}
                      toiDa={100}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          }
          aside={
            <>
              <CardLopTheoTrangThai lat={lat} tong={chung.tongHop.tong} />

              <Card className="gap-4 px-0">
                <CardHeader>
                  <CardTitle>Tỷ lệ đăng ký trung bình</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <DongHoBanNguyet
                    phanTram={chung.tyLeDangKyTrungBinh ?? 0}
                    so={chung.tyLeDangKyTrungBinh === null ? "–" : `${chung.tyLeDangKyTrungBinh}%`}
                    nhan="toàn đơn vị"
                    className="h-auto w-full max-w-52"
                  />
                </CardContent>
              </Card>
            </>
          }
        />
      )}

      {laGvTg && chung && viecCuaToi && (
        <DashboardLayout
          main={
            <>
              <StatRow>
                <StatTile icon={GraduationCap} label="Lớp đang mở" value={chung.dsLopDangMo.length} />
                <StatTile icon={Workflow} label="Tỷ lệ lấp đầy TB" value={chung.tyLeDangKyTrungBinh === null ? "–" : `${chung.tyLeDangKyTrungBinh}%`} />
                <StatTile icon={Users} label="Số kỳ có KPI" value={kpiCoDuLieu.length} />
              </StatRow>

              <LichSapToi items={viecCuaToi.da_phan_cong} dangCho={viecCuaToi.dang_cho.length} />

              <KpiCaNhanBoard data={kpiCaNhan} tieuDe="KPI của tôi" />
            </>
          }
          aside={
            <>
              <TieuChiSoSanh data={kpiCaNhan} />

              <Card className="gap-4 px-0">
                <CardHeader>
                  <CardTitle>Lớp theo nhóm lớp</CardTitle>
                </CardHeader>
                <CardContent>
                  {latNhom.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Chưa có lớp nào.</p>
                  ) : (
                    <div className="@container">
                      <div className="grid items-center gap-4 @[22rem]:grid-cols-[auto_1fr]">
                        <Donut lat={latNhom} giua={String(chung.tongHop.tong)} phu="lớp" className="mx-auto size-32" />
                        <ChuThichDonut lat={latNhom} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <CardLopTheoTrangThai lat={lat} tong={chung.tongHop.tong} />
            </>
          }
        />
      )}

      {/* Phân tích toàn đơn vị — dùng chung cho cả 2 vai trò, chỉ hiện ĐÚNG 1 LẦN dù người xem có cả 2 khối trên */}
      {chung && (chung.radarTrungBinh.length > 0 || kpiCoDuLieu.length > 0 || chung.doDongDeu !== null) && (
        <>
          <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-foreground">
            <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-brand-gradient" />
            Phân tích toàn đơn vị{chung.ky ? ` · ${chung.ky.ten}` : ""}
          </h2>
          <DashboardLayout
            main={
              <>
                <Card className="gap-4 px-0">
                  <CardHeader>
                    <CardTitle>Xu hướng KPI toàn đơn vị</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {kpiCoDuLieu.length < 2 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Cần từ 2 kỳ có dữ liệu.</p>
                    ) : (
                      <AreaXuHuong diem={kpiCoDuLieu.map((k) => ({ nhan: tenNganKy(k.ten), gia_tri: k.kpi_tb }))} className="h-auto w-full" />
                    )}
                  </CardContent>
                </Card>

                <Card className="gap-4 px-0">
                  <CardHeader>
                    <CardTitle>Điểm trung bình theo nhóm tiêu chí</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {chung.radarTrungBinh.every((t) => t.gia_tri === null) ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Chưa có ai có KPI trong kỳ này.</p>
                    ) : (
                      <RadarNhom truc={chung.radarTrungBinh} className="h-auto w-full max-w-sm" />
                    )}
                  </CardContent>
                </Card>
              </>
            }
            aside={
              <Card className="gap-3 px-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Độ đồng đều sản lượng
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {chung.doDongDeu === null ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Cần ít nhất 2 người có giờ dạy trong kỳ.</p>
                  ) : (
                    <>
                      <DongHoBanNguyet phanTram={chung.doDongDeu} so={`${chung.doDongDeu}/100`} nhan="Chỉ số đồng đều" className="mx-auto w-48" />
                      <p className="text-center text-sm text-muted-foreground">
                        {chung.doDongDeu >= 75 ? "Khối lượng giảng dạy phân bổ khá đều." : chung.doDongDeu >= 50 ? "Có chênh lệch giữa những người dạy nhiều và ít." : "Khối lượng đang dồn về một số ít người."}
                        {chung.top20 !== null && (
                          <>
                            {" "}
                            20% người dạy nhiều nhất đảm nhiệm <span className="font-medium text-foreground">{chung.top20}%</span> tổng giờ.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            }
          />
        </>
      )}
    </div>
  );
}
