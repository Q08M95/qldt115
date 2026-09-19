import { notFound } from "next/navigation";
import {
  ChuyenMonCard,
  ChungChiCard,
  KpiPlaceholderCard,
  LichSuDoiNhomCard,
  LichSuGiangDayCard,
  ProfileInfoCard,
} from "@/components/nhan-su/profile-sections";
import { requireSession } from "@/lib/auth/session";
import { getDanhMuc, getNhanSuChiTiet } from "@/lib/nhan-su/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hồ sơ nhân sự: 2 cột — trái = thông tin cá nhân/chuyên môn/chứng chỉ, phải = KPI + lịch sử (mục 8.8)
export default async function NhanSuChiTietPage(props: PageProps<"/nhan-su/[id]">) {
  const session = await requireSession();
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const [chiTiet, dmChuyenMon, dmLoaiChungChi] = await Promise.all([
    getNhanSuChiTiet(id),
    getDanhMuc("danh_muc_chuyen_mon"),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);
  if (!chiTiet) notFound();

  const laChuHoSo = session.profile.id === id;
  // Chủ hồ sơ tự sửa hồ sơ/chứng chỉ của mình; Admin/Quản lý lớp sửa của mọi người
  const canEdit = laChuHoSo || session.isQuanTri;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <ProfileInfoCard
          profile={chiTiet.profile}
          nhom={session.isQuanTri ? chiTiet.nhom : null}
          chuyenMon={chiTiet.chuyen_mon}
          danhMucChuyenMon={dmChuyenMon}
          canEdit={canEdit}
          isQuanTri={session.isQuanTri}
          laAdmin={session.isAdmin}
        />
        <ChuyenMonCard chuyenMon={chiTiet.chuyen_mon} />
        <ChungChiCard userId={id} chungChi={chiTiet.chung_chi} loai={dmLoaiChungChi} canEdit={canEdit} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <KpiPlaceholderCard />
        <LichSuGiangDayCard />
        {session.isQuanTri && <LichSuDoiNhomCard lichSu={chiTiet.lich_su_doi_nhom} />}
      </div>
    </div>
  );
}
