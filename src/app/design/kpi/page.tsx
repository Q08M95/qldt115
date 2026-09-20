import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { CauHinhKpiForm } from "@/components/kpi/cau-hinh-kpi-form";
import { KyChuyenTrangThai, KyFormDrawer, MoLaiKyButton, XoaKyButton } from "@/components/kpi/ky-danh-gia-ui";
import { demCanhBao, KyKiemTraCard, KyNhatKy } from "@/components/kpi/ky-kiem-tra-card";
import { KpiKyTable } from "@/components/kpi/kpi-ky-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { CauHinhKpi, KiemTraDongKy, KpiKyRow, KyDanhGia, NhatKyKy } from "@/types/database";

// Trang demo màn hình KPI với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện. Production trả 404.
const CAU_HINH: CauHinhKpi = {
  nhom: [
    { ma: "A", ten: "Sản lượng giảng dạy", trong_so: 25, thu_tu: 3 },
    { ma: "B", ten: "Chuyên cần", trong_so: 30, thu_tu: 1 },
    { ma: "C", ten: "Chất lượng chuyên môn", trong_so: 45, thu_tu: 2 },
  ],
  tieuChi: [
    { ma: "B1", nhom: "B", ten: "Điểm danh có mặt đúng giờ", nguon: "Check-in tại Bài (Giai đoạn 7)", don_vi: "%", trong_so: 100, bat: true, tinh_vao_kpi: true, thu_tu: 1 },
    { ma: "C2", nhom: "C", ten: "Dự giờ/đánh giá của Quản lý đào tạo", nguon: "Quản lý đào tạo chấm theo rubric", don_vi: "%", trong_so: 40, bat: true, tinh_vao_kpi: true, thu_tu: 2 },
    { ma: "C3", nhom: "C", ten: "Tỷ lệ học viên đạt chuẩn đầu ra", nguon: "Nhập tay ở hồ sơ lớp", don_vi: "%", trong_so: 35, bat: true, tinh_vao_kpi: true, thu_tu: 3 },
    { ma: "C1", nhom: "C", ten: "Khảo sát hài lòng học viên", nguon: "Link khảo sát hoặc nhập tay ở hồ sơ lớp", don_vi: "%", trong_so: 25, bat: true, tinh_vao_kpi: true, thu_tu: 4 },
    { ma: "A1", nhom: "A", ten: "Số giờ đã dạy trong kỳ", nguon: "Slot đã phân công của các Bài đã kết thúc", don_vi: "giờ → percentile", trong_so: 50, bat: true, tinh_vao_kpi: true, thu_tu: 5 },
    { ma: "A2", nhom: "A", ten: "Tỷ lệ tự đăng ký slot trống", nguon: "Đăng ký chủ động được duyệt ÷ tổng Bài đã dạy", don_vi: "%", trong_so: 25, bat: true, tinh_vao_kpi: true, thu_tu: 6 },
    { ma: "A3", nhom: "A", ten: "Tỷ lệ nhận khi được mời", nguon: "Lời mời được đồng ý ÷ lời mời đã phản hồi", don_vi: "%", trong_so: 25, bat: true, tinh_vao_kpi: true, thu_tu: 7 },
    { ma: "A4", nhom: "A", ten: "Số lớp không kinh phí đã nhận", nguon: "Đếm lớp không kinh phí (tính 1 lần/lớp)", don_vi: "lớp", trong_so: 0, bat: true, tinh_vao_kpi: false, thu_tu: 8 },
  ],
  heSo: [
    { ma: "D2", ten: "Hệ số bảo vệ lớp không kinh phí (lấy max với D1)", gia_tri: 1.1 },
    { ma: "D3_GV", ten: "Hệ số vai trò — Giảng viên", gia_tri: 1.1 },
    { ma: "D3_TG", ten: "Hệ số vai trò — Trợ giảng", gia_tri: 1 },
  ],
  nhomLop: [
    { id: "1", ten: "ABCDE", he_so_d1: 1, thu_tu: 1, dang_dung: true },
    { id: "2", ten: "ACLS", he_so_d1: 1.2, thu_tu: 2, dang_dung: true },
    { id: "3", ten: "BLS", he_so_d1: 1, thu_tu: 3, dang_dung: true },
  ],
  thamSo: { min_nhom: 5, so_ky_fallback: 3, gop_c: 0, doi_nhom_x: 85, doi_nhom_y: 3, giang_nhom_x: 50, giang_nhom_y: 3 },
};

const KY: KyDanhGia = { id: "k1", ten: "Quý 3/2026", tu: "2026-07-01", den: "2026-09-30", trang_thai: "cho_duyet", dong_luc: null };

const KIEM_TRA: KiemTraDongKy = {
  chua_ket_thuc: false,
  con_ngay: 0,
  lop_chua_hoan_thanh: [{ id: "l1", ten: "ACLS-08" }],
  lop_thieu_c1: [{ id: "l2", ten: "BLS-15" }, { id: "l3", ten: "ABCDE-03" }],
  lop_thieu_c3: [],
  luot_thieu_diem_danh: 6,
  tong_luot: 10,
};

const NHAT_KY: NhatKyKy[] = [
  { id: "n2", hanh_dong: "mo_lai", ly_do: "Bổ sung điểm khảo sát của lớp BLS-15 nhập muộn", luc: "2026-10-03T03:00:00Z", nguoi_ten: "Nguyễn Hoàng Tú Minh" },
  { id: "n1", hanh_dong: "dong", ly_do: null, luc: "2026-10-01T02:00:00Z", nguoi_ten: "Nguyễn Hoàng Tú Minh" },
];

const HANG: KpiKyRow[] = [
  {
    user_id: "u1", ho_ten: "Nguyễn Thị Lan", avatar_url: null, vai_tro: "giang_vien", kpi: 86.26, hang: 1,
    diem_nhom: { A: 76.67, B: 90, C: 89.1 }, gia_tri: { A1: 90, A2: 50, B1: 90, C1: 80, C2: 94, C3: 90 },
    trong_so_hieu_luc: {}, gio_thuc: 5, gio_quy_doi: 5.5, so_bai: 2, so_lop: 1, a4_ky: 0, a4_luy_ke: 0, che_do_a1: "percentile", percentile: 90,
  },
  {
    user_id: "u2", ho_ten: "Trần Văn Hùng", avatar_url: null, vai_tro: "tro_giang", kpi: 75.08, hang: 2,
    diem_nhom: { A: 33.3, B: 100, C: 81.7 }, gia_tri: { A2: 33.33, B1: 100, C1: 70, C3: 90 },
    trong_so_hieu_luc: {}, gio_thuc: 7, gio_quy_doi: 7.2, so_bai: 3, so_lop: 2, a4_ky: 1, a4_luy_ke: 1, che_do_a1: "lich_su", percentile: null,
  },
  {
    user_id: "u3", ho_ten: "Lê Minh Châu", avatar_url: null, vai_tro: "giang_vien", kpi: 72.13, hang: 3,
    diem_nhom: { A: 80, C: 67.8 }, gia_tri: { A1: 70, A2: 100, C1: 60, C2: 72.6 },
    trong_so_hieu_luc: {}, gio_thuc: 4, gio_quy_doi: 4.84, so_bai: 2, so_lop: 1, a4_ky: 1, a4_luy_ke: 1, che_do_a1: "percentile", percentile: 70,
  },
];

export default async function DesignKpiPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await props.searchParams;
  const v = Array.isArray(sp.v) ? sp.v[0] : sp.v;

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 10 }} activeHref="/cau-hinh">
      {v === "ky" ? (
        <Card className="max-w-6xl gap-4 px-0">
          <CardHeader className="gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {KY.ten} <Badge variant="warning">Chờ duyệt</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground tabular-nums">01/07/2026 – 30/09/2026</p>
            <p className="text-sm text-muted-foreground">Chờ duyệt — chỉ Admin/Quản lý lớp xem được. Kiểm tra KPI rồi đóng kỳ để công bố.</p>
            <CardAction className="flex flex-wrap items-center gap-2">
              <KyFormDrawer ky={{ ...KY, trang_thai: "dang_mo" }} />
              <XoaKyButton ky={{ ...KY, trang_thai: "dang_mo" }} />
              <KyChuyenTrangThai ky={KY} soCanhBao={demCanhBao(KIEM_TRA)} />
              <MoLaiKyButton ky={{ ...KY, trang_thai: "da_dong" }} />
            </CardAction>
          </CardHeader>
          <KyKiemTraCard kiemTra={KIEM_TRA} />
          <KpiKyTable rows={HANG} />
          <KyNhatKy items={NHAT_KY} />
        </Card>
      ) : (
        <CauHinhKpiForm cauHinh={CAU_HINH} />
      )}
    </AppShell>
  );
}
