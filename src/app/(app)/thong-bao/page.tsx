import { BatPushCard } from "@/components/thong-bao/bat-push-card";
import { TuyChonThongBao } from "@/components/thong-bao/tuy-chon-thong-bao";
import { DanhSachThongBao } from "@/components/thong-bao/danh-sach-thong-bao";
import { requireSession } from "@/lib/auth/session";
import { getThongBao, getTuyChonThongBao } from "@/lib/thong-bao/queries";

// Trung tâm thông báo (mục 4.5): danh sách đầy đủ + bật thông báo đẩy cho thiết bị này.
export default async function ThongBaoPage() {
  const [{ profile, isQuanTri }, banDau, tuyChon] = await Promise.all([requireSession(), getThongBao("tat-ca", 0), getTuyChonThongBao()]);

  return (
    <div className="grid max-w-3xl gap-5">
      <DanhSachThongBao userId={profile.id} banDau={banDau} />
      <BatPushCard />
      <TuyChonThongBao banDau={tuyChon} isQuanTri={isQuanTri} />
    </div>
  );
}
