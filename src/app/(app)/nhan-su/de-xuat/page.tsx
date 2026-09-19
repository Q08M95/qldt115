import Link from "next/link";
import { DeXuatTable } from "@/components/nhan-su/de-xuat-table";
import { TaoDeXuatDrawer } from "@/components/nhan-su/de-xuat-ui";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { requireQuanTri } from "@/lib/auth/session";
import { getDeXuatList, getNhanSuList } from "@/lib/nhan-su/queries";
import { cn } from "@/lib/utils";

// Đề xuất nhân sự: tổng hợp đề xuất cần Admin/Quản lý lớp duyệt (mục 4.1). Chỉ người quản trị truy cập.
export default async function DeXuatNhanSuPage(props: PageProps<"/nhan-su/de-xuat">) {
  await requireQuanTri();
  const sp = await props.searchParams;
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) === "da-xu-ly" ? "da-xu-ly" : "cho-duyet";

  const [rows, nguoi] = await Promise.all([
    getDeXuatList(tab === "cho-duyet" ? "cho_duyet" : "da_xu_ly"),
    getNhanSuList(),
  ]);

  const tabs = [
    { key: "cho-duyet", label: "Chờ duyệt" },
    { key: "da-xu-ly", label: "Đã xử lý" },
  ];

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle>Đề xuất nhân sự</CardTitle>
        <CardAction>
          <TaoDeXuatDrawer nguoi={nguoi.map((n) => ({ id: n.id, ho_ten: n.ho_ten }))} />
        </CardAction>
      </CardHeader>

      {/* Segment control: pill đang chọn nền trắng viền brand, các pill còn lại chữ xám (mục 8.6) */}
      <div className="flex gap-2 px-5" role="tablist" aria-label="Trạng thái đề xuất">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "cho-duyet" ? "/nhan-su/de-xuat" : "/nhan-su/de-xuat?tab=da-xu-ly"}
            role="tab"
            aria-selected={tab === t.key}
            className={cn(
              "flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors max-md:h-11",
              tab === t.key ? "border-primary bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <DeXuatTable rows={rows} choDuyet={tab === "cho-duyet"} />
    </Card>
  );
}
