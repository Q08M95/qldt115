import { AlertTriangle, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { CheckInBanner } from "@/components/danh-gia/check-in-banner";
import { AreaXuHuong, DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Sparkline, ThanhNgang, Donut, ChuThichDonut, type MauBieuDo } from "@/components/bao-cao/bieu-do";
import { MAU_TRANG_THAI } from "@/components/bao-cao/bc-van-hanh-lop";
import { GoiYLop } from "@/components/tong-quan/goi-y-lop";
import { KpiRutGon } from "@/components/tong-quan/kpi-rut-gon";
import { LichSapToi } from "@/components/tong-quan/lich-sap-toi";
import { ThongBaoMoiNhat } from "@/components/tong-quan/thong-bao-moi-nhat";
import { ViecCanDuyet } from "@/components/tong-quan/viec-can-duyet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getBaiCanCheckIn } from "@/lib/danh-gia/queries";
import { getKpiCaNhan } from "@/lib/danh-gia/queries";
import { getViecCuaToi } from "@/lib/dang-ky/queries";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import { getThongBao } from "@/lib/thong-bao/queries";
import { getChungTongQuan, getThongKeAdmin, getVieccanDuyetAdmin } from "@/lib/tong-quan/queries";
import type { KpiTheoKyRow } from "@/types/database";

const MAU_NHOM_LOP: MauBieuDo[] = ["blue", "navy", "teal", "green"];

// Tổng quan (4.7b, trang chủ khi đăng nhập) — liên kết chặt nhưng không gộp với Báo cáo (4.7): số liệu "toàn đơn vị"
// tái dùng thẳng (getChungTongQuan) nhưng rút gọn, không lọc theo khung thời gian — luôn là ảnh chụp HIỆN TẠI.
// Người giữ Quyền Quản lý lớp (isQuanTri + có hồ sơ GV/TG) thấy CẢ 2 bộ widget cùng lúc, không phải chọn 1 trong 2.
export default async function HomePage() {
  const { profile, isQuanTri } = await requireSession();
  const laAdmin = isQuanTri;
  const laGvTg = !!profile.vai_tro_giang_day;

  const [baiCheckIn, chung, thongKeAdmin, vieccanDuyet, viecCuaToi, kpiCaNhan, thongBao] = await Promise.all([
    getBaiCanCheckIn(),
    laAdmin || laGvTg ? getChungTongQuan() : null,
    laAdmin ? getThongKeAdmin() : null,
    laAdmin ? getVieccanDuyetAdmin(profile.id) : null,
    laGvTg ? getViecCuaToi(profile.id, false) : null,
    laGvTg ? getKpiCaNhan(profile.id) : null,
    laGvTg ? getThongBao("tat-ca", 0) : null,
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

      {laAdmin && chung && thongKeAdmin && vieccanDuyet && (
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
                <StatTile icon={ClipboardCheck} label="Slot còn trống" value={thongKeAdmin.slotTrong.tong}>
                  <Sparkline gia_tri={thongKeAdmin.slotTrong.xuHuong} className="mt-3 h-8 w-full" nhan="Slot được phân công theo ngày" />
                </StatTile>
              </StatRow>

              <ViecCanDuyet items={vieccanDuyet} canhBaoPool={thongKeAdmin.canhBaoPool} />

              <Card className="gap-4 px-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Tỷ lệ lấp đầy slot — lớp đang mở
                  </CardTitle>
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
              <Card className="gap-4 px-0">
                <CardHeader>
                  <CardTitle>Xu hướng KPI toàn đơn vị</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpiCoDuLieu.length < 2 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Cần từ 2 kỳ có dữ liệu.</p>
                  ) : (
                    <AreaXuHuong diem={kpiCoDuLieu.map((k) => ({ nhan: k.ten, gia_tri: k.kpi_tb }))} className="h-auto w-full" />
                  )}
                </CardContent>
              </Card>

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
                        <Donut lat={lat} giua={String(chung.tongHop.tong)} phu="lớp" className="mx-auto size-32" />
                        <ChuThichDonut lat={lat} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                <StatTile icon={ClipboardCheck} label="Tỷ lệ lấp đầy TB" value={chung.tyLeDangKyTrungBinh === null ? "–" : `${chung.tyLeDangKyTrungBinh}%`} />
                <StatTile icon={Users} label="Số kỳ có KPI" value={kpiCoDuLieu.length} />
              </StatRow>

              <LichSapToi items={viecCuaToi.da_phan_cong} dangCho={viecCuaToi.dang_cho.length} />

              <GoiYLop items={chung.dsLopDangMo} />
            </>
          }
          aside={
            <>
              <KpiRutGon data={kpiCaNhan} />
              <ThongBaoMoiNhat items={thongBao ?? []} />
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
            </>
          }
        />
      )}
    </div>
  );
}
