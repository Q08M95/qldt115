import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { LopChiTietView } from "@/components/lop-hoc/lop-chi-tiet-view";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopHanhDong } from "@/components/lop-hoc/lop-hanh-dong";
import { NHOM_LOP, chiTiet } from "../demo-data";

// Trang demo chi tiết lớp — chỉ chạy khi dev. ?tt=hoan-thanh xem lớp đã hoàn thành (kết quả C1/C3), ?gv=1 xem góc nhìn GV/TG.
export default async function DesignLopChiTietPage(props: { searchParams: Promise<{ tt?: string; gv?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await props.searchParams;
  const hoanThanh = sp.tt === "hoan-thanh";
  const isQuanTri = sp.gv !== "1";

  const data = hoanThanh
    ? {
        ...chiTiet({ trang_thai: "da_hoan_thanh", trang_thai_hien_thi: "da_hoan_thanh", c1_phan_tram: 83.33, c1_nguon: "khao_sat", c3_phan_tram: 88.5 }),
        khao_sat: { token: "11111111-1111-1111-1111-111111111111", mo: true, so_phan_hoi: 3 },
      }
    : chiTiet();

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri={isQuanTri} period={{ name: "Quý 3/2026", daysLeft: 11 }} activeHref="/lop-hoc">
      <LopChiTietView
        data={isQuanTri ? data : { ...data, nhom_du_dieu_kien: [] }}
        isQuanTri={isQuanTri}
        headerActions={
          isQuanTri && !hoanThanh ? (
            <>
              <LopFormDrawer nhomLop={NHOM_LOP} loaiChungChi={[]} lop={data.lop} nhomDuDieuKien={data.nhom_du_dieu_kien} />
              <LopHanhDong lopId={data.lop.id} trangThai={data.lop.trang_thai} />
            </>
          ) : undefined
        }
      />
    </AppShell>
  );
}
