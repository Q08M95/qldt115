import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { AreaXuHuong, DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { StatTile } from "@/components/stat-tile";
import { Sparkline, ThanhNgang, Donut, ChuThichDonut, type MauBieuDo } from "@/components/bao-cao/bieu-do";
import { MAU_TRANG_THAI } from "@/components/bao-cao/bc-van-hanh-lop";
import { GoiYLop } from "@/components/tong-quan/goi-y-lop";
import { KpiRutGon } from "@/components/tong-quan/kpi-rut-gon";
import { LichSapToi } from "@/components/tong-quan/lich-sap-toi";
import { ThongBaoMoiNhat } from "@/components/tong-quan/thong-bao-moi-nhat";
import { ViecCanDuyet } from "@/components/tong-quan/viec-can-duyet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tongHopLop } from "@/lib/bao-cao/tinh-toan";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import { sangDongLop, type ChungTongQuan, type MucCanDuyet, type ThongKeAdmin } from "@/lib/tong-quan/queries";
import type { ViecCuaToi } from "@/lib/dang-ky/queries";
import type { KpiCaNhan, LopHocTongHop, ThongBao } from "@/types/database";

// Trang demo Tổng quan (4.7b) với dữ liệu giả — đối chiếu giao diện với ảnh mẫu trước khi nối dữ liệu thật.
// ?v=admin|gvtg|ql|trong (ql = Quyền Quản lý lớp, thấy cả 2 bộ widget; trong = mọi danh sách rỗng)
const NHOM_LOP = ["ABCDE", "ACLS", "BLS", "SCC-LX", "SCC-CĐ"];

function lop(i: number, trangThai: LopHocTongHop["trang_thai_hien_thi"], gvTong: number, gvXong: number, tgTong: number, tgXong: number): LopHocTongHop {
  return {
    id: `l${i}`,
    ten: `${NHOM_LOP[i % NHOM_LOP.length]}-${String(i + 1).padStart(2, "0")}`,
    nhom_lop_id: `nl${i % NHOM_LOP.length}`,
    nhom_lop_ten: NHOM_LOP[i % NHOM_LOP.length],
    he_so_d1: 1,
    doi_tuong: i % 3 === 0 ? "cong_dong" : "nhan_vien_y_te",
    loai_kinh_phi: i % 4 === 0 ? "khong_kinh_phi" : "co_kinh_phi",
    ngay_bat_dau: `2026-10-${String(2 + i * 2).padStart(2, "0")}`,
    ngay_ket_thuc: `2026-10-${String(4 + i * 2).padStart(2, "0")}`,
    dia_diem: "Hội trường A",
    trang_thai: trangThai === "da_huy" ? "da_huy" : trangThai === "da_hoan_thanh" ? "da_hoan_thanh" : "dang_mo",
    trang_thai_hien_thi: trangThai,
    cong_khai_som: true,
    c1_phan_tram: null,
    c1_nguon: null,
    c3_phan_tram: null,
    so_bai: 4,
    gv_tong: gvTong,
    gv_da_phan_cong: gvXong,
    gv_nhan_su: gvXong,
    gv_ten_duy_nhat: null,
    tg_tong: tgTong,
    tg_da_phan_cong: tgXong,
    tg_nhan_su: tgXong,
    tg_ten_duy_nhat: null,
  };
}

const DS_LOP: LopHocTongHop[] = [
  lop(0, "dang_mo", 1, 1, 3, 1),
  lop(1, "dang_mo", 1, 0, 2, 1),
  lop(2, "dang_mo", 1, 1, 3, 3),
  lop(3, "dang_dien_ra", 1, 1, 2, 2),
  lop(4, "da_hoan_thanh", 1, 1, 2, 2),
  lop(5, "da_huy", 1, 0, 2, 0),
];

const CHUNG: ChungTongQuan = (() => {
  const dongLop = DS_LOP.map(sangDongLop);
  const tongHop = tongHopLop(dongLop.filter((l) => l.trang_thai_hien_thi !== "da_huy" && l.trang_thai_hien_thi !== "nhap"));
  const dangMo = DS_LOP.filter((l) => l.trang_thai_hien_thi === "dang_mo");
  return {
    kpiXuHuong: [
      { ky_id: "k1", ten: "Quý 4/2025", tu: "2025-10-01", den: "2025-12-31", trang_thai: "da_dong", kpi_tb: 68.4, kpi_tb_gv: 70.1, kpi_tb_tg: 65.2, so_nguoi: 34 },
      { ky_id: "k2", ten: "Quý 1/2026", tu: "2026-01-01", den: "2026-03-31", trang_thai: "da_dong", kpi_tb: 71.9, kpi_tb_gv: 73.5, kpi_tb_tg: 68.8, so_nguoi: 38 },
      { ky_id: "k3", ten: "Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", trang_thai: "da_dong", kpi_tb: 74.2, kpi_tb_gv: 75.0, kpi_tb_tg: 72.6, so_nguoi: 41 },
      { ky_id: "k4", ten: "Quý 3/2026", tu: "2026-07-01", den: "2026-09-30", trang_thai: "dang_mo", kpi_tb: 76.8, kpi_tb_gv: 78.3, kpi_tb_tg: 73.9, so_nguoi: 40 },
    ],
    lapDaySlot: dangMo.map((l) => {
      const tong = l.gv_tong + l.tg_tong;
      const xong = l.gv_da_phan_cong + l.tg_da_phan_cong;
      return { id: l.id, ten: l.ten, phanTram: Math.round((xong / tong) * 100), hienThi: `${xong}/${tong}` };
    }),
    tongHop,
    tyLeDangKyTrungBinh: Math.round((tongHop.slotDaPhanCong / tongHop.slotTong) * 100),
    dsLopDangMo: dangMo,
  };
})();

const THONG_KE_ADMIN: ThongKeAdmin = {
  nhanSu: { tong: 62, xuHuong: [0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0, 0, 1] },
  lopDangMo: { tong: 14, xuHuong: [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1] },
  slotTrong: { tong: 37, xuHuong: [2, 0, 3, 1, 4, 0, 2, 5, 1, 0, 3, 2, 1, 4] },
  canhBaoPool: 2,
};

const VIEC_CAN_DUYET: MucCanDuyet[] = [
  { id: "d1", loai: "dang_ky", tieuDe: "Nguyễn Văn An", phu: "Giảng viên · Bài 3 · Cấp cứu ngưng tim · ACLS-08", href: "/lop-hoc/l0", created_at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "d2", loai: "de_xuat", tieuDe: "Trần Thị Bình", phu: "Khen thưởng / nhắc nhở", href: "/nhan-su/de-xuat", created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: "d3", loai: "dang_ky", tieuDe: "Lê Hoàng Cường", phu: "Trợ giảng · Bài 5 · Thực hành · BLS-12", href: "/lop-hoc/l1", created_at: new Date(Date.now() - 26 * 3600000).toISOString() },
];

const VIEC_CUA_TOI: ViecCuaToi = {
  dang_cho: [{ id: "c1", loai: "duoc_moi", vai_tro: "giang_vien", bai: { id: "b1", ten: "Bài 2 · Lý thuyết", bat_dau: "", ket_thuc: "", lop_id: "l2", lop_ten: "SCC-LX-03", lop_trang_thai: "dang_mo" } }],
  da_phan_cong: Array.from({ length: 5 }, (_, i) => ({
    slot_id: `s${i}`,
    vai_tro: i % 2 === 0 ? "giang_vien" : "tro_giang",
    bai: {
      id: `b${i}`,
      ten: `Bài ${i + 1} · ${i % 2 === 0 ? "Lý thuyết" : "Thực hành"}`,
      bat_dau: new Date(Date.now() + (i === 0 ? 3 : i * 26) * 3600000).toISOString(),
      ket_thuc: new Date(Date.now() + (i === 0 ? 5 : i * 26 + 2) * 3600000).toISOString(),
      lop_id: `l${i % 3}`,
      lop_ten: `${NHOM_LOP[i % NHOM_LOP.length]}-0${i + 1}`,
      lop_trang_thai: "dang_mo",
    },
  })),
  can_duyet: [],
};

const KPI_CA_NHAN: KpiCaNhan = {
  ky: [
    { ky_id: "k3", ten: "Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", trang_thai: "da_dong", kpi: 78.4, diem_nhom: { A: 74, B: 88, C: 76 }, gia_tri: {}, trong_so_hieu_luc: {}, gio_thuc: 18, gio_quy_doi: 20, so_bai: 7, so_lop: 3, che_do_a1: "percentile", percentile: 72 },
    { ky_id: "k4", ten: "Quý 3/2026", tu: "2026-07-01", den: "2026-09-30", trang_thai: "dang_mo", kpi: 82.1, diem_nhom: { A: 78, B: 90, C: 80 }, gia_tri: {}, trong_so_hieu_luc: {}, gio_thuc: 20, gio_quy_doi: 22, so_bai: 8, so_lop: 3, che_do_a1: "percentile", percentile: 78 },
  ],
  a4_tong: 3,
  so_ky_fallback: 3,
  tien_do: null,
};

const THONG_BAO: ThongBao[] = [
  { id: "t1", user_id: "u1", loai: "duoc_moi", muc_do: "can_hanh_dong", tieu_de: "Bạn được mời dạy Bài 2 · SCC-LX-03", noi_dung: "Vai trò Giảng viên", lien_ket: "/dang-ky", da_doc: false, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "t2", user_id: "u1", loai: "cong_bo_kpi", muc_do: "thong_tin", tieu_de: "KPI kỳ Quý 2/2026 đã công bố", noi_dung: "Điểm KPI: 78,4", lien_ket: "/danh-gia", da_doc: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const MAU_NHOM_LOP: MauBieuDo[] = ["blue", "navy", "teal", "green"];

export default async function DesignTongQuanPage(props: { searchParams: Promise<{ v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await props.searchParams;
  const trong = v === "trong";
  const gvtg = v === "gvtg";
  const ql = v === "ql";
  const laAdmin = !gvtg;
  const laGvTg = gvtg || ql;

  const chung = trong
    ? { ...CHUNG, kpiXuHuong: [], lapDaySlot: [], dsLopDangMo: [], tyLeDangKyTrungBinh: null, tongHop: { ...CHUNG.tongHop, tong: 0, theoTrangThai: [], theoNhomLop: [] } }
    : CHUNG;
  const kpiCoDuLieu = chung.kpiXuHuong.filter((k): k is typeof k & { kpi_tb: number } => k.kpi_tb !== null);
  const lat = chung.tongHop.theoTrangThai.map((t) => ({
    khoa: t.khoa,
    nhan: TRANG_THAI_LOP_LABEL[t.khoa as keyof typeof TRANG_THAI_LOP_LABEL] ?? t.khoa,
    so: t.so,
    mau: MAU_TRANG_THAI[t.khoa as keyof typeof MAU_TRANG_THAI] ?? "neutral",
  }));
  const latNhom = chung.tongHop.theoNhomLop.map((t, i) => ({ khoa: t.nhan, nhan: t.nhan, so: t.so, mau: MAU_NHOM_LOP[i % 4] }));

  return (
    <AppShell
      user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }}
      isQuanTri={laAdmin}
      period={{ name: "Quý 3/2026", daysLeft: 11 }}
      unreadCount={3}
      activeHref="/"
    >
      <div className="grid gap-6">
        {laAdmin && (
          <DashboardLayout
            main={
              <>
                <StatRow>
                  <StatTile icon={Users} label="Nhân sự" value={trong ? 0 : THONG_KE_ADMIN.nhanSu.tong}>
                    <Sparkline gia_tri={THONG_KE_ADMIN.nhanSu.xuHuong} className="mt-3 h-8 w-full" nhan="Nhân sự mới theo ngày" />
                  </StatTile>
                  <StatTile icon={GraduationCap} label="Lớp đang mở" value={trong ? 0 : THONG_KE_ADMIN.lopDangMo.tong}>
                    <Sparkline gia_tri={THONG_KE_ADMIN.lopDangMo.xuHuong} className="mt-3 h-8 w-full" nhan="Lớp mới theo ngày" />
                  </StatTile>
                  <StatTile icon={ClipboardCheck} label="Slot còn trống" value={trong ? 0 : THONG_KE_ADMIN.slotTrong.tong}>
                    <Sparkline gia_tri={THONG_KE_ADMIN.slotTrong.xuHuong} className="mt-3 h-8 w-full" nhan="Slot được phân công theo ngày" />
                  </StatTile>
                </StatRow>

                <ViecCanDuyet items={trong ? [] : VIEC_CAN_DUYET} canhBaoPool={trong ? 0 : THONG_KE_ADMIN.canhBaoPool} />

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
                    <DongHoBanNguyet phanTram={chung.tyLeDangKyTrungBinh ?? 0} so={chung.tyLeDangKyTrungBinh === null ? "–" : `${chung.tyLeDangKyTrungBinh}%`} nhan="toàn đơn vị" className="h-auto w-full max-w-52" />
                  </CardContent>
                </Card>
              </>
            }
          />
        )}

        {laGvTg && (
          <DashboardLayout
            main={
              <>
                <StatRow>
                  <StatTile icon={GraduationCap} label="Lớp đang mở" value={trong ? 0 : chung.dsLopDangMo.length} />
                  <StatTile icon={ClipboardCheck} label="Tỷ lệ lấp đầy TB" value={chung.tyLeDangKyTrungBinh === null ? "–" : `${chung.tyLeDangKyTrungBinh}%`} />
                  <StatTile icon={Users} label="Số kỳ có KPI" value={kpiCoDuLieu.length} />
                </StatRow>

                <LichSapToi items={trong ? [] : VIEC_CUA_TOI.da_phan_cong} dangCho={trong ? 0 : VIEC_CUA_TOI.dang_cho.length} />

                <GoiYLop items={trong ? [] : chung.dsLopDangMo} />
              </>
            }
            aside={
              <>
                <KpiRutGon data={trong ? null : KPI_CA_NHAN} />
                <ThongBaoMoiNhat items={trong ? [] : THONG_BAO} />
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
    </AppShell>
  );
}
