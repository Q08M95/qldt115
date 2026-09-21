import { notFound } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ThongBao } from "@/types/database";
import { CaiDatThongBao } from "@/components/thong-bao/cai-dat-thong-bao";
import { DemoList } from "./demo-list";

// Trang demo Thông báo với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện với ảnh mẫu. Production trả 404.
// ?v=trong : danh sách rỗng. ?v=mo : mở sẵn "Cài đặt thông báo". ?v=chuong : dùng chuông thật (chưa đăng nhập nên panel hiện rỗng) để kiểm tra Popover.
const phutTruoc = (p: number) => new Date(Date.now() - p * 60_000).toISOString();

const TB = (o: Partial<ThongBao> & Pick<ThongBao, "id" | "loai" | "tieu_de">): ThongBao => ({
  user_id: "u",
  muc_do: "thong_tin",
  noi_dung: null,
  lien_ket: "/lop-hoc",
  da_doc: false,
  created_at: phutTruoc(5),
  ...o,
});

const DU_LIEU: ThongBao[] = [
  TB({
    id: "1",
    loai: "nhac_check_in",
    muc_do: "can_hanh_dong",
    tieu_de: "Sắp đến giờ dạy — nhớ check-in",
    noi_dung: 'Lớp BLS-21 — Bài 2 bắt đầu lúc 08:00 21/09/2026. Bấm "Tôi đã có mặt" để không bị tính 0% chuyên cần.',
    created_at: phutTruoc(2),
  }),
  TB({
    id: "2",
    loai: "duoc_moi",
    muc_do: "can_hanh_dong",
    tieu_de: "Bạn được mời dạy",
    noi_dung: "Lớp ACLS-08 — Bài 3 (Giảng viên), 13:30 24/09/2026. Hãy xác nhận hoặc từ chối.",
    created_at: phutTruoc(38),
  }),
  TB({
    id: "3",
    loai: "dang_ky_ket_qua",
    tieu_de: "Đăng ký được duyệt",
    noi_dung: "Lớp SCC-LX-05 — Bài 1 (Trợ giảng), 08:00 28/09/2026.",
    created_at: phutTruoc(190),
  }),
  TB({
    id: "4",
    loai: "doi_lich",
    tieu_de: "Bài đã đổi lịch",
    noi_dung: "Lớp BLS-15 — Bài 4: từ 08:00 30/09/2026 sang 13:30 01/10/2026.",
    created_at: phutTruoc(60 * 26),
    da_doc: true,
  }),
  TB({
    id: "5",
    loai: "cong_bo_kpi",
    tieu_de: "Đã công bố KPI Quý 2/2026",
    noi_dung: "KPI của bạn trong Quý 2/2026: 81,3 điểm.",
    lien_ket: "/danh-gia",
    created_at: phutTruoc(60 * 24 * 3),
    da_doc: true,
  }),
  TB({
    id: "6",
    loai: "sua_diem_danh",
    tieu_de: "Điểm danh của bạn đã được chỉnh sửa",
    noi_dung: "Lớp ACLS-08 — Bài 2: B1 = 70%. Lý do: Lỗi kỹ thuật khi check-in.",
    created_at: phutTruoc(60 * 24 * 9),
    da_doc: true,
  }),
];

export default async function DesignThongBaoPage(props: { searchParams: Promise<{ v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await props.searchParams;
  const ds = v === "trong" ? [] : DU_LIEU;
  const chuaDoc = ds.filter((t) => !t.da_doc).length;

  return (
    <AppShell user={{ id: v === "chuong" ? "00000000-0000-0000-0000-000000000000" : undefined, name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={chuaDoc} activeHref="/thong-bao">
      <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" className="flex flex-wrap gap-1.5">
                {["Tất cả", "Chưa đọc", "Cần hành động"].map((n, i) => (
                  <span
                    key={n}
                    className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium ${i === 0 ? "border-primary bg-card text-primary" : "border-transparent text-muted-foreground"}`}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <CheckCheck /> Đánh dấu tất cả đã đọc
              </Button>
            </div>
            {ds.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
                <BellOff className="size-12 opacity-40" aria-hidden />
                Chưa có thông báo nào
              </div>
            ) : (
              <DemoList ds={ds} />
            )}
          </CardContent>
        </Card>

        <div className="grid h-fit gap-5">
        {/* Panel thả xuống của chuông (mô phỏng tĩnh — bản thật là Popover) */}
        <div className="h-fit w-full max-w-sm rounded-2xl bg-popover shadow-lg ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <h2 className="text-[17px] font-semibold">Thông báo</h2>
            <Button variant="ghost" size="sm">
              <CheckCheck /> Đánh dấu đã đọc
            </Button>
          </div>
          <div className="px-2 pb-2">
            <DemoList ds={ds.slice(0, 4)} />
          </div>
          <div className="border-t px-4 py-3">
            <Button size="sm" className="w-full">
              Xem tất cả thông báo
            </Button>
          </div>
        </div>
        <CaiDatThongBao tuyChon={{ bai_trong_moi: { trong_app: false, day_push: false } }} isQuanTri moMacDinh={v === "mo"} />
        </div>
      </div>
    </AppShell>
  );
}
