import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { NhatKyFilters } from "@/components/nhat-ky/nhat-ky-filters";
import { NhatKyList } from "@/components/nhat-ky/nhat-ky-list";
import { PhanTrang } from "@/components/nhat-ky/phan-trang";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { NhatKy } from "@/types/database";

// Trang demo Nhật ký hệ thống với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện với ảnh mẫu. Production trả 404.
// ?v=gv : góc nhìn GV/TG (chỉ dòng liên quan mình), ?v=trong : danh sách rỗng.
const phutTruoc = (p: number) => new Date(Date.now() - p * 60_000).toISOString();

const NK = (o: Partial<NhatKy> & Pick<NhatKy, "id" | "loai" | "mo_ta">): NhatKy => ({
  created_at: phutTruoc(5),
  nguoi_thuc_hien: "u",
  nguoi_thuc_hien_ten: "Nguyễn Hoàng Tú Minh",
  doi_tuong: null,
  lien_ket: null,
  tu_duyet: false,
  ly_do: null,
  truoc: null,
  sau: null,
  ...o,
});

const DU_LIEU: NhatKy[] = [
  NK({
    id: "1",
    loai: "duyet_dang_ky",
    mo_ta: "Duyệt đăng ký của Trần Thị Lan (Giảng viên)",
    doi_tuong: "Lớp ACLS-08 — Bài 3",
    lien_ket: "/lop-hoc",
    truoc: { trang_thai: "cho_xu_ly" },
    sau: { trang_thai: "da_duyet" },
    created_at: phutTruoc(4),
  }),
  NK({
    id: "2",
    loai: "duyet_dang_ky",
    mo_ta: "Duyệt đăng ký của Nguyễn Hoàng Tú Minh (Giảng viên) — tự duyệt",
    doi_tuong: "Lớp BLS-21 — Bài 1",
    tu_duyet: true,
    truoc: { trang_thai: "cho_xu_ly" },
    sau: { trang_thai: "da_duyet" },
    created_at: phutTruoc(52),
  }),
  NK({
    id: "3",
    loai: "doi_cau_hinh",
    mo_ta: "Sửa cấu hình: Ngưỡng tối đa chấm B1: trễ từ mức này trở lên = 0%, giảm tuyến tính trước đó",
    doi_tuong: "Cấu hình hệ thống: b1_tre_toi_da_phut",
    truoc: { gia_tri: 30 },
    sau: { gia_tri: 20 },
    created_at: phutTruoc(60 * 3),
  }),
  NK({
    id: "4",
    loai: "sua_diem_danh",
    nguoi_thuc_hien_ten: "Lê Văn Quản",
    mo_ta: "Chỉnh điểm danh (B1) của Phạm Văn An",
    doi_tuong: "Lớp ACLS-08 — Bài 2",
    ly_do: "Lỗi kỹ thuật khi check-in",
    truoc: { b1_phan_tram: null, chinh_tay: false, check_in_luc: null },
    sau: { b1_phan_tram: 70, chinh_tay: true, check_in_luc: null },
    lien_ket: "/lop-hoc",
    created_at: phutTruoc(60 * 26),
  }),
  NK({
    id: "5",
    loai: "gan_quyen_quan_ly_lop",
    mo_ta: "Gán Quyền Quản lý lớp cho Lê Văn Quản",
    truoc: { co_quyen_quan_ly_lop: false },
    sau: { co_quyen_quan_ly_lop: true },
    created_at: phutTruoc(60 * 24 * 4),
  }),
  NK({
    id: "6",
    loai: "huy_lop",
    mo_ta: "Hủy lớp SCC-CĐ-02",
    doi_tuong: "Lớp SCC-CĐ-02",
    truoc: { trang_thai: "dang_mo" },
    sau: { trang_thai: "da_huy" },
    created_at: phutTruoc(60 * 24 * 9),
  }),
  NK({
    id: "7",
    loai: "tai_khoan",
    mo_ta: "Đặt lại mật khẩu cho Trần Thị Lan",
    created_at: phutTruoc(60 * 24 * 12),
  }),
];

export default async function DesignNhatKyPage(props: { searchParams: Promise<{ v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await props.searchParams;
  const gv = v === "gv";
  const ds = v === "trong" ? [] : gv ? DU_LIEU.filter((r) => ["1", "4", "7"].includes(r.id)) : DU_LIEU;

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri={!gv} period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={3} activeHref="/nhat-ky">
      <Card className="gap-4 px-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Nhật ký hệ thống <Badge variant="teal">{ds.length === 0 ? 0 : 128}</Badge>
          </CardTitle>
          {gv && <p className="text-sm text-muted-foreground">Bạn chỉ xem được các dòng liên quan trực tiếp đến mình (ai duyệt, sửa gì, khi nào).</p>}
        </CardHeader>
        <NhatKyFilters values={{ q: "", loai: "", tu: "", den: "" }} />
        <NhatKyList rows={ds} />
        <PhanTrang trang={2} tongTrang={5} hrefTrang={(t) => `/design/nhat-ky?trang=${t}`} />
      </Card>
    </AppShell>
  );
}
