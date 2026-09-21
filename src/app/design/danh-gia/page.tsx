import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { CauHinhDiemDanhForm } from "@/components/kpi/cau-hinh-diem-danh-form";
import { CheckInBanner } from "@/components/danh-gia/check-in-banner";
import { DuGioCard } from "@/components/danh-gia/du-gio-card";
import { KpiSoSanhCards } from "@/components/danh-gia/kpi-so-sanh";
import { KpiCaNhanBoard } from "@/components/danh-gia/kpi-ca-nhan";
import type { BaiCheckIn, BaiDaDay, KpiCaNhan, KpiCaNhanKy, RubricMuc } from "@/types/database";

// Trang demo Bảng KPI cá nhân + check-in + chấm dự giờ với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện. Production trả 404.
// ?v=banner : banner check-in ở Trang chủ (chỉ đặt ở Trang chủ). ?v=fallback : nhóm nhỏ (so với lịch sử bản thân), ?v=giang : tiến độ giáng, ?v=trong : chưa có dữ liệu.
const KY = (o: Partial<KpiCaNhanKy> & Pick<KpiCaNhanKy, "ky_id" | "ten" | "kpi">): KpiCaNhanKy => ({
  tu: "2026-01-01",
  den: "2026-03-31",
  trang_thai: "da_dong",
  diem_nhom: { A: 70, B: 88, C: 82 },
  gia_tri: { A1: 72, A2: 60, A3: 100, B1: 88, C1: 80, C2: 90, C3: 78 },
  trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
  gio_thuc: 18,
  gio_quy_doi: 20.4,
  so_bai: 7,
  so_lop: 3,
  che_do_a1: "percentile",
  percentile: 78,
  ...o,
});

const DU_LIEU: KpiCaNhan = {
  ky: [
    KY({ ky_id: "1", ten: "Quý 4/2025", tu: "2025-10-01", den: "2025-12-31", kpi: 68.4, percentile: 55 }),
    KY({ ky_id: "2", ten: "Quý 1/2026", kpi: 74.9, percentile: 66 }),
    KY({ ky_id: "3", ten: "Quý 2/2026", tu: "2026-04-01", den: "2026-06-30", kpi: 81.3, percentile: 72 }),
    KY({
      ky_id: "4",
      ten: "Quý 3/2026",
      tu: "2026-07-01",
      den: "2026-09-30",
      trang_thai: "dang_mo",
      kpi: 86.3,
      diem_nhom: { A: 76.7, B: 90, C: 89.1 },
      gia_tri: { A1: 90, A2: 50, A3: 100, B1: 90, C1: 80, C2: 94, C3: 90 },
      trong_so_hieu_luc: { A1: 12.5, A2: 6.25, A3: 6.25, B1: 30, C1: 11.25, C2: 18, C3: 15.75 },
      gio_thuc: 24,
      gio_quy_doi: 26.4,
      so_bai: 9,
      so_lop: 4,
      percentile: 88,
    }),
  ],
  a4_tong: 3,
  so_ky_fallback: 3,
  tien_do: { huong: "thang", nguong: 85, so_ky_can: 3, so_ky_dat: 2 },
};

const CHECK_IN: BaiCheckIn[] = [
  { bai_id: "b1", bai_ten: "Bài 2 — Thực hành ép tim", lop_id: "l1", lop_ten: "BLS-21", bat_dau: "2026-09-21T01:00:00Z", ket_thuc: "2026-09-21T04:00:00Z", da_check_in: false, check_in_luc: null, b1_phan_tram: null },
  { bai_id: "b2", bai_ten: "Bài 1 — Lý thuyết", lop_id: "l2", lop_ten: "ACLS-08", bat_dau: "2026-09-21T02:00:00Z", ket_thuc: "2026-09-21T05:00:00Z", da_check_in: true, check_in_luc: "2026-09-21T01:55:00Z", b1_phan_tram: 100 },
];

const RUBRIC: RubricMuc[] = [
  { muc: 100, ten: "Xuất sắc", mo_ta: "Vượt yêu cầu: nội dung chính xác, truyền đạt cuốn hút, xử lý tình huống linh hoạt." },
  { muc: 80, ten: "Tốt", mo_ta: "Đạt đầy đủ yêu cầu, truyền đạt rõ ràng, còn vài điểm nhỏ có thể cải thiện." },
  { muc: 60, ten: "Đạt", mo_ta: "Đạt yêu cầu tối thiểu, có một số hạn chế cần cải thiện." },
  { muc: 0, ten: "Chưa đạt", mo_ta: "Không đạt yêu cầu: sai sót đáng kể hoặc thiếu chuẩn bị." },
];

const BAI: BaiDaDay[] = [
  {
    bai_id: "x1", bai_ten: "Bài 3 — Thực hành", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-09-12T01:00:00Z", ket_thuc: "2026-09-12T04:00:00Z", vai_tro: "giang_vien",
    diem_danh: { bai_id: "x1", user_id: "u", check_in_luc: "2026-09-12T00:58:00Z", b1_phan_tram: 100, chinh_tay: false, ly_do_chinh: null },
    du_gio: { bai_id: "x1", user_id: "u", muc_diem: 80, ghi_chu: "Truyền đạt rõ, còn chậm phần thực hành" },
  },
  {
    bai_id: "x2", bai_ten: "Bài 2 — Lý thuyết", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-09-10T01:00:00Z", ket_thuc: "2026-09-10T04:00:00Z", vai_tro: "giang_vien",
    diem_danh: { bai_id: "x2", user_id: "u", check_in_luc: null, b1_phan_tram: 70, chinh_tay: true, ly_do_chinh: "Lỗi kỹ thuật khi check-in" },
    du_gio: null,
  },
  {
    bai_id: "x3", bai_ten: "Bài 1", lop_id: "l3", lop_ten: "BLS-15", bat_dau: "2026-09-05T01:00:00Z", ket_thuc: "2026-09-05T03:00:00Z", vai_tro: "tro_giang",
    diem_danh: null, du_gio: null,
  },
];

export default async function DesignDanhGiaPage(props: { searchParams: Promise<{ v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await props.searchParams;

  let data: KpiCaNhan | null = DU_LIEU;
  if (v === "fallback") {
    data = {
      ...DU_LIEU,
      ky: DU_LIEU.ky.map((k, i) => (i === 3 ? { ...k, che_do_a1: "lich_su", percentile: null } : k)),
      tien_do: null,
    };
  } else if (v === "giang") {
    data = {
      ...DU_LIEU,
      ky: DU_LIEU.ky.map((k) => ({ ...k, kpi: Math.round((k.kpi ?? 0) * 0.55 * 10) / 10 })),
      tien_do: { huong: "giang", nguong: 50, so_ky_can: 3, so_ky_dat: 2 },
    };
  } else if (v === "trong") {
    data = { ky: [], a4_tong: 0, so_ky_fallback: 3, tien_do: null };
  }

  if (v === "banner") {
    return (
      <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={3} activeHref="/">
        <CheckInBanner items={CHECK_IN} />
        <CheckInBanner items={CHECK_IN.slice(0, 1)} />
      </AppShell>
    );
  }

  if (v === "cauhinh") {
    return (
      <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={3} activeHref="/cau-hinh">
        <div className="max-w-4xl">
          <CauHinhDiemDanhForm cauHinh={{ checkin_truoc_phut: 45, b1_tre_toi_da_phut: 30, nhac_check_in_truoc_phut: 30, rubric: RUBRIC }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }}
      isQuanTri
      period={{ name: "Quý 3/2026", daysLeft: 11 }}
      unreadCount={3}
      activeHref="/danh-gia"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <KpiCaNhanBoard data={data} tieuDe="KPI của tôi" />
          <DuGioCard userId="u" hoTen="Nguyễn Văn An" bai={BAI} rubric={RUBRIC} laChinhMinh={false} />
        </div>
        <div className="flex flex-col gap-5">
          <KpiSoSanhCards data={data} />
        </div>
      </div>
    </AppShell>
  );
}
