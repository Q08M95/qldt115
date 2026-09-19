import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { LOP_LIST, NHOM_LOP } from "./demo-data";

// Trang demo danh sách lớp với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện. Production trả 404.
export default function DesignLopHocPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} activeHref="/lop-hoc">
      <LopListView
        rows={LOP_LIST}
        values={{ q: "", nhom_lop: "", trang_thai: "", doi_tuong: "", kinh_phi: "" }}
        nhomLop={NHOM_LOP}
        isQuanTri
        filterAction="/design/lop-hoc"
        hrefFor={(l) => (l.id === "1" ? "/design/lop-hoc/chi-tiet" : "/design/lop-hoc")}
        action={<LopFormDrawer nhomLop={NHOM_LOP} loaiChungChi={[]} />}
      />
    </AppShell>
  );
}
