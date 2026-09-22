import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Card } from "@/components/ui/card";
import { BaoCaoA4 } from "@/components/bao-cao/bc-a4";
import { BaoCaoDeXuat } from "@/components/bao-cao/bc-de-xuat";
import { BaoCaoKpiTongHop } from "@/components/bao-cao/bc-kpi-tong-hop";
import { BaoCaoSanLuong } from "@/components/bao-cao/bc-san-luong";
import { BaoCaoTyLe } from "@/components/bao-cao/bc-ty-le-dang-ky";
import { BaoCaoVanHanhDangKy } from "@/components/bao-cao/bc-van-hanh-dang-ky";
import { BaoCaoVanHanhLop } from "@/components/bao-cao/bc-van-hanh-lop";
import { BaoCaoXuHuongKpi } from "@/components/bao-cao/bc-xu-huong-kpi";
import { BoLocKy } from "@/components/bao-cao/chon-ky";
import { MucBaoCao, MucLuc } from "@/components/bao-cao/muc-bao-cao";
import { ChuyenNhomBaoCao, BoLocThoiGian } from "@/components/bao-cao/thanh-dieu-khien";
import { XuatBaoCao } from "@/components/bao-cao/xuat-bao-cao";
import { laKhung, tinhKhoang, type KhungThoiGian } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import type { CanhBaoPool, DongLop, DongSanLuong, DongTyLe, VanHanhDangKy } from "@/lib/bao-cao/types";
import { BAO_CAO_KY, BAO_CAO_THOI_GIAN, laNhomBaoCao, type NhomBaoCao } from "@/lib/bao-cao/url";
import type { A4Row, DeXuatThongKe, KpiKyRow, KpiTheoKyRow, KyDanhGia } from "@/types/database";

// Trang demo Báo cáo với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện với ảnh mẫu. Production trả 404.
// ?bc=<8 khoa báo cáo>&vt=giang_vien|tro_giang&ky=<id>&v=trong|gvtg (gvtg = xem như GV/TG không phải Admin, cho báo cáo #1)
const TEN = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức", "Võ Thu Hà", "Đặng Quốc Huy", "Bùi Lan Khanh", "Hoàng Gia Long", "Ngô Thanh Mai", "Đỗ Anh Nam", "Phan Thị Oanh", "Lý Quang Phúc", "Vũ Hải Quân", "Trương Diệu Linh", "Huỳnh Bảo Sơn", "Dương Mỹ Tâm", "Tạ Văn Uy", "Mai Thị Vân"];
const GIO = [22, 20, 18, 16.5, 14, 13, 12, 10, 9, 8, 6, 5, 4, 3, 2, 0, 0, 0];

const SAN_LUONG: DongSanLuong[] = TEN.map((ten, i) => ({
  user_id: `u${i}`,
  ho_ten: ten,
  avatar_url: null,
  vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
  dang_tham_gia: i !== 17,
  so_bai: Math.round(GIO[i] / 2.5),
  so_lop: Math.max(0, Math.round(GIO[i] / 8)),
  gio_thuc: GIO[i],
  so_bai_sap: i < 6 ? 2 : i < 9 ? 1 : 0,
  gio_sap: i < 6 ? 5 : i < 9 ? 2.5 : 0,
}));
const SAN_LUONG_TRUOC = SAN_LUONG.map((r) => ({ ...r, gio_thuc: Math.round(r.gio_thuc * 0.85 * 10) / 10 }));

const TY_LE: DongTyLe[] = TEN.slice(0, 14).map((ten, i) => ({
  user_id: `u${i}`,
  ho_ten: ten,
  avatar_url: null,
  vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
  so_bai_da_day: i === 11 ? 0 : 3 + (i % 5),
  so_tu_dang_ky: i === 11 ? 0 : (i * 2) % (3 + (i % 5) + 1),
  so_moi_dong_y: i % 4 === 3 ? 0 : 1 + (i % 3),
  so_moi_tu_choi: i % 4 === 0 ? 1 : 0,
}));
const TY_LE_TRUOC = TY_LE.map((r) => ({ ...r, so_tu_dang_ky: Math.max(0, r.so_tu_dang_ky - 1) }));

const SERIE = Array.from({ length: 30 }, (_, i) => ({
  ngay: `2026-09-${String(i + 1).padStart(2, "0")}`,
  dang_ky: [2, 0, 1, 3, 4, 0, 0, 2, 5, 3][i % 10],
  phan_cong: [1, 0, 0, 2, 3, 0, 0, 1, 6, 2, 0, 1, 2, 0, 0, 4, 1, 0, 2, 0, 0, 3, 1, 0, 0, 2, 5, 1, 0, 1][i],
}));
const VAN_HANH: VanHanhDangKy = {
  slot_tong: 64,
  slot_da_phan_cong: 47,
  gio_lap_tb: 31.4,
  so_slot_do_duyet: 41,
  dang_ky_moi: 58,
  loi_moi_gui: 22,
  dang_ky_cho: 6,
  loi_moi_cho: 3,
  serie: SERIE,
};
const VAN_HANH_TRUOC: VanHanhDangKy = { ...VAN_HANH, slot_tong: 52, slot_da_phan_cong: 33 };
const POOL: CanhBaoPool[] = [
  { bai_id: "b1", bai_ten: "Bài 3 · Cấp cứu ngưng tim", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-10-03T01:00:00Z", vai_tro: "giang_vien", slot_trong: 1, so_ung_vien: 0 },
  { bai_id: "b2", bai_ten: "Bài 5 · Thực hành", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-10-04T01:00:00Z", vai_tro: "tro_giang", slot_trong: 3, so_ung_vien: 2 },
  { bai_id: "b3", bai_ten: "Bài 1 · Lý thuyết", lop_id: "l2", lop_ten: "SCC-LX-12", bat_dau: "2026-10-09T01:00:00Z", vai_tro: "giang_vien", slot_trong: 1, so_ung_vien: 1 },
];

const NHOM = ["ABCDE", "ACLS", "BLS", "SCC-LX", "SCC-CĐ"];
const TT = ["dang_mo", "dang_dien_ra", "da_hoan_thanh", "da_du_dang_ky", "da_huy", "nhap"] as const;
const LOP: DongLop[] = Array.from({ length: 11 }, (_, i) => ({
  id: `l${i}`,
  ten: `${NHOM[i % 5]}-${String(i + 1).padStart(2, "0")}`,
  nhom_lop_ten: NHOM[i % 5],
  doi_tuong: i % 4 === 3 ? "cong_dong" : "nhan_vien_y_te",
  loai_kinh_phi: i % 3 === 2 ? "khong_kinh_phi" : "co_kinh_phi",
  ngay_bat_dau: `2026-09-${String(2 + i * 2).padStart(2, "0")}`,
  ngay_ket_thuc: `2026-09-${String(4 + i * 2).padStart(2, "0")}`,
  trang_thai_hien_thi: TT[[0, 1, 2, 2, 1, 0, 3, 2, 4, 5, 2][i]],
  so_bai: 3 + (i % 3),
  slot_tong: 8 + i,
  slot_da_phan_cong: i === 4 ? 0 : 6 + (i % 4) + (i > 5 ? 2 : 0),
}));

// ===== Lượt 2: theo kỳ đánh giá =====
const NHOM_NS = ["gv_bac_si", "gv_khong_bac_si", "tg_bac_si", "tg_khong_bac_si"] as const;
const KY_LIST: KyDanhGia[] = [
  { id: "k1", ten: "Quý 4/2025", tu: "2025-10-01", den: "2025-12-31", trang_thai: "da_dong", dong_luc: "2026-01-02T03:00:00Z" },
  { id: "k2", ten: "Quý 1/2026", tu: "2026-01-01", den: "2026-03-31", trang_thai: "da_dong", dong_luc: "2026-04-02T03:00:00Z" },
  { id: "k3", ten: "Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", trang_thai: "da_dong", dong_luc: "2026-07-02T03:00:00Z" },
  { id: "k4", ten: "Quý 3/2026", tu: "2026-07-01", den: "2026-09-30", trang_thai: "dang_mo", dong_luc: null },
  { id: "k5", ten: "Quý 4/2026", tu: "2026-10-01", den: "2026-12-31", trang_thai: "cho_duyet", dong_luc: null },
];

const KPI_TONG_HOP: KpiKyRow[] = TEN.slice(0, 12).map((ten, i) => {
  const kpi = Math.max(35, 92 - i * 4.3 + (i % 3 === 0 ? 3 : 0));
  return {
    user_id: `u${i}`,
    ho_ten: ten,
    avatar_url: null,
    vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
    nhom: NHOM_NS[i % 4],
    kpi: Math.round(kpi * 10) / 10,
    hang: i + 1,
    diem_nhom: { A: Math.round((kpi - 6) * 10) / 10, B: Math.round((kpi + 8) * 10) / 10, C: Math.round((kpi - 2) * 10) / 10 },
    gia_tri: { A1: kpi - 8, A2: 60, A3: 100, B1: kpi + 8, C1: 80, C2: kpi, C3: 80 },
    trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
    gio_thuc: 20 - i,
    gio_quy_doi: 22 - i,
    so_bai: 8 - (i % 4),
    so_lop: 3,
    a4_ky: i % 5 === 0 ? 1 : 0,
    a4_luy_ke: i % 5 === 0 ? 3 : 0,
    che_do_a1: "percentile",
    percentile: Math.max(5, 95 - i * 8),
  };
});

const KPI_THEO_KY: KpiTheoKyRow[] = [
  { ky_id: "k1", ten: "Quý 4/2025", tu: "2025-10-01", den: "2025-12-31", trang_thai: "da_dong", kpi_tb: 68.4, kpi_tb_gv: 70.1, kpi_tb_tg: 65.2, so_nguoi: 34 },
  { ky_id: "k2", ten: "Quý 1/2026", tu: "2026-01-01", den: "2026-03-31", trang_thai: "da_dong", kpi_tb: 71.9, kpi_tb_gv: 73.5, kpi_tb_tg: 68.8, so_nguoi: 38 },
  { ky_id: "k3", ten: "Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", trang_thai: "da_dong", kpi_tb: 74.2, kpi_tb_gv: 75.0, kpi_tb_tg: 72.6, so_nguoi: 41 },
  { ky_id: "k4", ten: "Quý 3/2026", tu: "2026-07-01", den: "2026-09-30", trang_thai: "dang_mo", kpi_tb: 76.8, kpi_tb_gv: 78.3, kpi_tb_tg: 73.9, so_nguoi: 40 },
];

const A4: A4Row[] = TEN.slice(0, 10).map((ten, i) => ({
  user_id: `u${i}`,
  ho_ten: ten,
  avatar_url: null,
  vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
  dang_tham_gia: i !== 8,
  a4_luy_ke: Math.max(0, 9 - i),
  a4_ky: i < 4 ? 1 : 0,
}));

const DE_XUAT: DeXuatThongKe = {
  theo_loai: [
    { loai: "phan_cong", cho_duyet: 1, da_duyet: 4, bo_qua: 1 },
    { loai: "dao_tao", cho_duyet: 0, da_duyet: 2, bo_qua: 0 },
    { loai: "khen_thuong_nhac_nho", cho_duyet: 2, da_duyet: 5, bo_qua: 1 },
    { loai: "doi_nhom", cho_duyet: 1, da_duyet: 2, bo_qua: 1 },
  ],
  cho_duyet: 4,
  da_duyet: 13,
  bo_qua: 3,
};

export default async function DesignBaoCaoPage(props: { searchParams: Promise<{ nhom?: string; vt?: string; ky?: string; kt?: string; moc?: string; v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { nhom: nhomRaw, vt = "tat-ca", ky, kt: ktRaw, moc, v } = await props.searchParams;
  const nhom: NhomBaoCao = laNhomBaoCao(nhomRaw) ? nhomRaw : "ky";
  const kt: KhungThoiGian = laKhung(ktRaw) ? ktRaw : "thang";
  const khoang = tinhKhoang(kt, moc ?? "2026-09-15");
  const trong = v === "trong";
  const gvtg = v === "gvtg";
  const loc = vt === "giang_vien" || vt === "tro_giang" ? vt : "tat-ca";
  const vtParam = loc === "tat-ca" ? undefined : loc;
  const dieu = chonKy(KY_LIST, ky)!;

  const boLoc = nhom === "ky" ? <BoLocKy list={KY_LIST} hienTai={dieu.hienTai} truoc={dieu.truoc} sau={dieu.sau} kt={kt} /> : <BoLocThoiGian khoang={khoang} ky={dieu.hienTai.id} vt={vtParam} />;
  const mucLuc = <MucLuc items={nhom === "ky" ? BAO_CAO_KY : BAO_CAO_THOI_GIAN} />;
  const noiDung =
    nhom === "ky" ? (
      <div className="grid gap-8">
        <MucBaoCao id="kpi-tong-hop" nhan="KPI tổng hợp">
          <BaoCaoKpiTongHop
            ky={dieu.hienTai}
            rows={trong ? [] : dieu.hienTai.id === "k5" && !gvtg ? [KPI_TONG_HOP[0]] : dieu.hienTai.id === "k5" ? [] : gvtg ? KPI_TONG_HOP.map((r) => ({ ...r, nhom: null })) : KPI_TONG_HOP}
            isQuanTri={!gvtg}
          />
        </MucBaoCao>
        <MucBaoCao id="xu-huong-kpi" nhan="Xu hướng KPI">
          <BaoCaoXuHuongKpi ky={trong ? [] : KPI_THEO_KY} />
        </MucBaoCao>
        <MucBaoCao id="a4" nhan="A4 — Lớp không kinh phí">
          <BaoCaoA4 ky={dieu.hienTai} rows={trong ? [] : A4} />
        </MucBaoCao>
        <MucBaoCao id="de-xuat" nhan="Đề xuất nhân sự">
          <BaoCaoDeXuat ky={dieu.hienTai} data={trong ? { theo_loai: [], cho_duyet: 0, da_duyet: 0, bo_qua: 0 } : DE_XUAT} />
        </MucBaoCao>
      </div>
    ) : (
      <div className="grid gap-8">
        <MucBaoCao id="san-luong" nhan="Sản lượng giảng dạy">
          <BaoCaoSanLuong rows={trong ? [] : SAN_LUONG} rowsTruoc={SAN_LUONG_TRUOC} loc={loc} khoang={khoang} ky={dieu.hienTai.id} />
        </MucBaoCao>
        <MucBaoCao id="ty-le-dang-ky" nhan="Tự đăng ký & nhận lời mời">
          <BaoCaoTyLe rows={trong ? [] : TY_LE} rowsTruoc={TY_LE_TRUOC} loc={loc} khoang={khoang} ky={dieu.hienTai.id} />
        </MucBaoCao>
        <MucBaoCao id="van-hanh-dang-ky" nhan="Vận hành đăng ký">
          <BaoCaoVanHanhDangKy
            hienTai={trong ? { ...VAN_HANH, slot_tong: 0, slot_da_phan_cong: 0, gio_lap_tb: null, so_slot_do_duyet: 0, serie: SERIE.map((s) => ({ ...s, phan_cong: 0 })) } : VAN_HANH}
            truoc={VAN_HANH_TRUOC}
            canhBao={trong ? [] : POOL}
            nguongPool={3}
          />
        </MucBaoCao>
        <MucBaoCao id="van-hanh-lop" nhan="Vận hành lớp học">
          <BaoCaoVanHanhLop rows={trong ? [] : LOP} />
        </MucBaoCao>
      </div>
    );

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={3} activeHref="/bao-cao">
      <div className="grid gap-6">
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <ChuyenNhomBaoCao nhom={nhom} ky={dieu.hienTai.id} kt={kt} vt={vtParam} />
            {!gvtg && <XuatBaoCao ky={dieu.hienTai.id} kt={kt} moc={khoang.tu} />}
          </div>
          <div className="px-4 py-3.5 sm:px-5">{boLoc}</div>
        </Card>
        <div className="sticky top-16 z-10 rounded-2xl border border-border bg-card/95 px-4 py-2.5 shadow-card backdrop-blur-sm sm:px-5 md:top-[88px]">{mucLuc}</div>
        {noiDung}
      </div>
    </AppShell>
  );
}
