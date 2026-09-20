import { notFound } from "next/navigation";
import { BreadcrumbLabel } from "@/components/app-shell/page-labels";
import { KyChuyenTrangThai, KyFormDrawer, MoLaiKyButton, XoaKyButton } from "@/components/kpi/ky-danh-gia-ui";
import { demCanhBao, KyKiemTraCard, KyNhatKy } from "@/components/kpi/ky-kiem-tra-card";
import { KpiKyTable } from "@/components/kpi/kpi-ky-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { requireQuanTri } from "@/lib/auth/session";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { TRANG_THAI_KY_LABEL, TRANG_THAI_KY_VARIANT } from "@/lib/kpi/labels";
import { getKiemTraDongKy, getKpiKy, getKy, getKyList, getNhatKyKy } from "@/lib/kpi/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Chi tiết 1 kỳ: chuyển trạng thái (Đang mở ⇄ Chờ duyệt → Đã đóng → mở lại kỳ đóng gần nhất) + danh sách kiểm tra trước khi đóng
// + bảng KPI để Admin kiểm tra trước khi công bố. Kỳ Đã đóng đọc bản đã khóa; kỳ còn lại tính trực tiếp theo cấu hình hiện tại.
export default async function KyDanhGiaChiTietPage(props: PageProps<"/cau-hinh/ky-danh-gia/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const [, ky, rows, nhatKy, danhSach] = await Promise.all([
    requireQuanTri(),
    getKy(id),
    getKpiKy(id),
    getNhatKyKy(id),
    getKyList(),
  ]);
  if (!ky) notFound();

  const chuaDong = ky.trang_thai !== "da_dong";
  const kiemTra = chuaDong ? await getKiemTraDongKy(id) : null;
  // Chỉ mở lại được kỳ đã đóng gần nhất (các kỳ sau dựa vào kết quả kỳ này để so sánh lịch sử)
  const laKyDongGanNhat =
    ky.trang_thai === "da_dong" && !danhSach.some((k) => k.trang_thai === "da_dong" && k.tu > ky.tu);

  const ghiChu =
    ky.trang_thai === "da_dong"
      ? `Đã đóng ${ky.dong_luc ? fmtDateTime(ky.dong_luc) : ""} — kết quả và cấu hình đã khóa, không thay đổi khi đổi cấu hình sau này.`
      : ky.trang_thai === "cho_duyet"
        ? "Chờ duyệt — chỉ Admin/Quản lý lớp xem được. Kiểm tra KPI rồi đóng kỳ để công bố."
        : "Đang mở — KPI tính theo thời gian thực từ các Bài đã kết thúc, giảng viên/trợ giảng cùng xem được.";

  return (
    <>
      <BreadcrumbLabel label={ky.ten} />
      <Card className="max-w-6xl gap-4 px-0">
        <CardHeader className="gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {ky.ten}
            <Badge variant={TRANG_THAI_KY_VARIANT[ky.trang_thai]}>{TRANG_THAI_KY_LABEL[ky.trang_thai]}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground tabular-nums">
            {fmtDate(ky.tu)} – {fmtDate(ky.den)}
          </p>
          <p className="text-sm text-muted-foreground">{ghiChu}</p>
          <CardAction className="flex flex-wrap items-center gap-2">
            {ky.trang_thai === "dang_mo" && (
              <>
                <KyFormDrawer ky={ky} />
                <XoaKyButton ky={ky} />
              </>
            )}
            <KyChuyenTrangThai ky={ky} soCanhBao={kiemTra ? demCanhBao(kiemTra) : 0} />
            {laKyDongGanNhat && <MoLaiKyButton ky={ky} />}
          </CardAction>
        </CardHeader>
        {kiemTra && <KyKiemTraCard kiemTra={kiemTra} />}
        <KpiKyTable rows={rows} />
        <KyNhatKy items={nhatKy} />
      </Card>
    </>
  );
}
