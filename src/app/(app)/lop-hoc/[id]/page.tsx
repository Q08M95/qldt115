import { notFound } from "next/navigation";
import { BreadcrumbLabel } from "@/components/app-shell/page-labels";
import { LopChiTietView } from "@/components/lop-hoc/lop-chi-tiet-view";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopHanhDong } from "@/components/lop-hoc/lop-hanh-dong";
import { requireSession } from "@/lib/auth/session";
import { getLopChiTiet, getNhomLop } from "@/lib/lop-hoc/queries";
import { getDanhMuc } from "@/lib/nhan-su/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LopHocChiTietPage(props: PageProps<"/lop-hoc/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const [{ isQuanTri }, data, nhomLop, loaiChungChi] = await Promise.all([
    requireSession(),
    getLopChiTiet(id),
    getNhomLop(),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);
  // RLS: GV/TG không thấy lớp Nháp (chưa công khai sớm) -> trả null -> 404
  if (!data) notFound();

  const { lop } = data;
  const conSua = lop.trang_thai === "nhap" || lop.trang_thai === "dang_mo";

  return (
    <>
      <BreadcrumbLabel label={lop.ten} />
      <LopChiTietView
        data={data}
        isQuanTri={isQuanTri}
        headerActions={
          // Lớp đã hoàn thành/hủy không còn thao tác sửa hay chuyển trạng thái -> không dựng khung nút
          isQuanTri && conSua ? (
            <>
              <LopFormDrawer
                nhomLop={nhomLop}
                loaiChungChi={loaiChungChi}
                lop={lop}
                nhomDuDieuKien={data.nhom_du_dieu_kien}
                chungChiIds={data.chung_chi_yeu_cau.map((c) => c.id)}
              />
              <LopHanhDong lopId={lop.id} trangThai={lop.trang_thai} />
            </>
          ) : undefined
        }
      />
    </>
  );
}
