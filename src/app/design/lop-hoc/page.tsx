import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { LichLop } from "@/components/lop-hoc/lich-lop";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { ngayVN, thangCua } from "@/lib/lich";
import { lichDemo, LOP_LIST, NHOM_LOP } from "./demo-data";

// Trang demo danh sách lớp với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện. Production trả 404.
// ?xem=lich: chế độ Lịch với dữ liệu giả của tháng hiện tại.
export default async function DesignLopHocPage(props: PageProps<"/design/lop-hoc">) {
  if (process.env.NODE_ENV === "production") notFound();
  const xemLich = (await props.searchParams).xem === "lich";
  const thang = thangCua(ngayVN(new Date()));

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} activeHref="/lop-hoc">
      <LopListView
        rows={LOP_LIST}
        values={{ q: "", nhom_lop: "", trang_thai: "", doi_tuong: "", kinh_phi: "" }}
        nhomLop={NHOM_LOP}
        filterAction="/design/lop-hoc"
        hrefFor={(l) => (l.id === "1" ? "/design/lop-hoc/chi-tiet" : "/design/lop-hoc")}
        action={<LopFormDrawer nhomLop={NHOM_LOP} loaiChungChi={[]} />}
        cheDo={{
          xem: xemLich ? "lich" : "danh-sach",
          hrefDanhSach: "/design/lop-hoc",
          hrefLich: "/design/lop-hoc?xem=lich",
          giu: xemLich ? { xem: "lich" } : {},
          xoaHref: xemLich ? "/design/lop-hoc?xem=lich" : "/design/lop-hoc",
          phuHop: { bat: false, href: "/design/lop-hoc?xem=lich" },
        }}
        lich={
          xemLich ? (
            <LichLop items={lichDemo(thang.nam, thang.thang)} thang={thang} hrefTruoc="#" hrefSau="#" hrefHomNay="#" laGvTg />
          ) : undefined
        }
      />
    </AppShell>
  );
}
