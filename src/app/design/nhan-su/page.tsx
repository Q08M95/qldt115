import { notFound } from "next/navigation";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { NhanSuFilters } from "@/components/nhan-su/nhan-su-filters";
import { NhanSuList } from "@/components/nhan-su/nhan-su-list";
import {
  ChungChiCard,
  ChuyenMonCard,
  KpiPlaceholderCard,
  LichSuDoiNhomCard,
  LichSuGiangDayCard,
  ProfileInfoCard,
} from "@/components/nhan-su/profile-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { NhanSuRow } from "@/lib/nhan-su/queries";
import type { ChungChi, DanhMuc, Profile } from "@/types/database";

// Trang demo module Nhân sự với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện. Production trả 404.
const ROWS: NhanSuRow[] = [
  { id: "1", email: "an.nguyen@example.com", ho_ten: "Nguyễn Văn An", avatar_url: null, vai_tro_giang_day: "giang_vien", trang_thai_tham_gia: "dang_tham_gia", co_quyen_quan_ly_lop: true, chuyen_mon: [{ id: "a", ten: "Bác sĩ" }, { id: "b", ten: "Thạc sĩ" }], nhom: "gv_bac_si" },
  { id: "2", email: "binh.tran@example.com", ho_ten: "Trần Thị Bình", avatar_url: null, vai_tro_giang_day: "tro_giang", trang_thai_tham_gia: "dang_tham_gia", co_quyen_quan_ly_lop: false, chuyen_mon: [{ id: "c", ten: "Điều dưỡng" }], nhom: "tg_khong_bac_si" },
  { id: "3", email: "chau.le@example.com", ho_ten: "Lê Minh Châu", avatar_url: null, vai_tro_giang_day: "giang_vien", trang_thai_tham_gia: "tam_ngung", co_quyen_quan_ly_lop: false, chuyen_mon: [{ id: "a", ten: "Bác sĩ" }], nhom: "gv_bac_si" },
  { id: "4", email: "dung.pham@example.com", ho_ten: "Phạm Quốc Dũng", avatar_url: null, vai_tro_giang_day: "giang_vien", trang_thai_tham_gia: "khong_con_tham_gia", co_quyen_quan_ly_lop: false, chuyen_mon: [], nhom: null },
  { id: "5", email: "em.hoang@example.com", ho_ten: "Hoàng Thu Em", avatar_url: null, vai_tro_giang_day: "tro_giang", trang_thai_tham_gia: "dang_tham_gia", co_quyen_quan_ly_lop: false, chuyen_mon: [{ id: "a", ten: "Bác sĩ" }], nhom: "tg_bac_si" },
];

const PROFILE: Profile = {
  id: "1", email: "an.nguyen@example.com", ho_ten: "Nguyễn Văn An", so_dien_thoai: "0912 345 678", avatar_url: null,
  phan_quyen: "giang_day", co_quyen_quan_ly_lop: true, vai_tro_giang_day: "giang_vien", trang_thai_tham_gia: "dang_tham_gia",
  kinh_nghiem: "8 năm giảng dạy cấp cứu ngoại viện.\nTừng phụ trách các khóa ACLS, BLS tại đơn vị.", created_at: "", updated_at: "",
};
const DM: DanhMuc[] = [{ id: "a", ten: "Bác sĩ", thu_tu: 1, dang_dung: true }, { id: "b", ten: "Thạc sĩ", thu_tu: 2, dang_dung: true }];
const CC: ChungChi[] = [
  { id: "c1", user_id: "1", loai_id: "x", loai_ten: "ACLS", so_chung_chi: "ACLS-2024-118", noi_dung: "Chứng chỉ cấp cứu tim mạch nâng cao", ngay_cap: "2024-03-15", noi_cap: "Hội Tim mạch", hinh_anh_path: null, hinh_anh_url: null },
  { id: "c2", user_id: "1", loai_id: "y", loai_ten: "Chứng chỉ giảng viên", so_chung_chi: null, noi_dung: null, ngay_cap: null, noi_cap: null, hinh_anh_path: null, hinh_anh_url: null },
];

export default function DesignNhanSuPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} activeHref="/nhan-su">
      <div className="flex flex-col gap-5">
        <Card className="gap-4 px-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Danh sách nhân sự <Badge variant="teal">{ROWS.length}</Badge>
            </CardTitle>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <Link href="/design/nhan-su">
                  <Lightbulb /> Đề xuất nhân sự <Badge variant="warning">2</Badge>
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <NhanSuFilters values={{ q: "", trang_thai: "", vai_tro: "", chuyen_mon: "", nhom: "" }} chuyenMon={DM.map((d) => ({ id: d.id, ten: d.ten }))} isQuanTri />
          <NhanSuList rows={ROWS} isQuanTri />
        </Card>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <ProfileInfoCard profile={PROFILE} nhom="gv_bac_si" chuyenMon={[{ chuyen_mon_id: "a", chi_tiet: "Nội khoa", ten: "Bác sĩ" }, { chuyen_mon_id: "b", chi_tiet: null, ten: "Thạc sĩ" }]} danhMucChuyenMon={DM} canEdit isQuanTri laAdmin />
            <ChuyenMonCard chuyenMon={[{ chuyen_mon_id: "a", chi_tiet: "Nội khoa", ten: "Bác sĩ" }, { chuyen_mon_id: "b", chi_tiet: null, ten: "Thạc sĩ" }]} />
            <ChungChiCard userId="1" chungChi={CC} loai={DM} canEdit />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <KpiPlaceholderCard />
            <LichSuGiangDayCard />
            <LichSuDoiNhomCard lichSu={[{ id: "l1", nhom_cu: "gv_khong_bac_si", nhom_moi: "gv_bac_si", ngay_hieu_luc: "2026-07-01", created_at: "" }, { id: "l0", nhom_cu: null, nhom_moi: "gv_khong_bac_si", ngay_hieu_luc: "2026-01-10", created_at: "" }]} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
