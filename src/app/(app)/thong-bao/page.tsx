import { CaiDatThongBao } from "@/components/thong-bao/cai-dat-thong-bao";
import { DanhSachThongBao } from "@/components/thong-bao/danh-sach-thong-bao";
import { requireSession } from "@/lib/auth/session";
import { getThongBao, getTuyChonThongBao } from "@/lib/thong-bao/queries";

// Trung tâm thông báo (mục 4.5): danh sách đầy đủ (trái) + "Cài đặt thông báo" thu gọn (phải): thông báo đẩy của thiết bị này và tùy chọn theo loại.
export default async function ThongBaoPage() {
  const [{ profile, isQuanTri }, banDau, tuyChon] = await Promise.all([requireSession(), getThongBao("tat-ca", 0), getTuyChonThongBao()]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <DanhSachThongBao userId={profile.id} banDau={banDau} />
      <div className="lg:sticky lg:top-24">
        <CaiDatThongBao tuyChon={tuyChon} isQuanTri={isQuanTri} />
      </div>
    </div>
  );
}
