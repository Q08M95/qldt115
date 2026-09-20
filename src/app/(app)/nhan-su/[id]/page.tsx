import { notFound } from "next/navigation";
import { BreadcrumbLabel } from "@/components/app-shell/page-labels";
import { DuGioCard } from "@/components/danh-gia/du-gio-card";
import { KpiCaNhanBoard } from "@/components/danh-gia/kpi-ca-nhan";
import {
  ChuyenMonCard,
  ChungChiCard,
  LichSuDoiNhomCard,
  LichSuGiangDayCard,
  ProfileInfoCard,
} from "@/components/nhan-su/profile-sections";
import { requireSession } from "@/lib/auth/session";
import { getBaiDaDay, getKpiCaNhan, getRubric } from "@/lib/danh-gia/queries";
import { getDanhMuc, getLichSuGiangDay, getNhanSuChiTiet } from "@/lib/nhan-su/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hồ sơ nhân sự: 2 cột — trái = thông tin cá nhân/chuyên môn/chứng chỉ, phải = KPI + lịch sử (mục 8.8)
export default async function NhanSuChiTietPage(props: PageProps<"/nhan-su/[id]">) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const session = await requireSession();
  const [chiTiet, dmChuyenMon, dmLoaiChungChi, lichSu, kpi, baiDaDay, rubric] = await Promise.all([
    getNhanSuChiTiet(id),
    getDanhMuc("danh_muc_chuyen_mon"),
    getDanhMuc("danh_muc_loai_chung_chi"),
    getLichSuGiangDay(id),
    getKpiCaNhan(id),
    // Dự giờ C2 và điểm danh B1 theo từng Bài: chỉ người quản trị thấy/nhập (C2 chi tiết kèm ghi chú không công khai)
    session.isQuanTri ? getBaiDaDay(id) : Promise.resolve([]),
    session.isQuanTri ? getRubric() : Promise.resolve([]),
  ]);
  if (!chiTiet) notFound();

  const laChuHoSo = session.profile.id === id;
  // Chủ hồ sơ tự sửa hồ sơ/chứng chỉ của mình; Admin/Quản lý lớp sửa của mọi người
  const canEdit = laChuHoSo || session.isQuanTri;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <BreadcrumbLabel label={chiTiet.profile.ho_ten} />
      <div className="flex min-w-0 flex-col gap-5">
        <ProfileInfoCard
          profile={chiTiet.profile}
          nhom={session.isQuanTri ? chiTiet.nhom : null}
          chuyenMon={chiTiet.chuyen_mon}
          danhMucChuyenMon={dmChuyenMon}
          canEdit={canEdit}
          isQuanTri={session.isQuanTri}
          laAdmin={session.isAdmin}
          laChuHoSo={laChuHoSo}
        />
        <ChuyenMonCard chuyenMon={chiTiet.chuyen_mon} />
        <ChungChiCard userId={id} chungChi={chiTiet.chung_chi} loai={dmLoaiChungChi} canEdit={canEdit} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <KpiCaNhanBoard data={kpi} />
        {session.isQuanTri && (
          <DuGioCard userId={id} hoTen={chiTiet.profile.ho_ten} bai={baiDaDay} rubric={rubric} laChinhMinh={laChuHoSo} />
        )}
        <LichSuGiangDayCard items={lichSu} />
        {session.isQuanTri && <LichSuDoiNhomCard lichSu={chiTiet.lich_su_doi_nhom} />}
      </div>
    </div>
  );
}
