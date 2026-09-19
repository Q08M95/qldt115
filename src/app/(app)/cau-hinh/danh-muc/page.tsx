import { DanhMucEditor } from "@/components/cau-hinh/danh-muc-editor";
import { NhomLopEditor } from "@/components/cau-hinh/nhom-lop-editor";
import { requireQuanTri } from "@/lib/auth/session";
import { getNhomLop } from "@/lib/lop-hoc/queries";
import { getDanhMuc } from "@/lib/nhan-su/queries";

// Danh mục cấu hình phục vụ module Nhân sự và Lớp học (mục 4.8). Giai đoạn 11 sẽ gom chung vào màn hình Cấu hình hệ thống.
export default async function DanhMucPage() {
  const [, chuyenMon, loaiChungChi, nhomLop] = await Promise.all([
    requireQuanTri(),
    getDanhMuc("danh_muc_chuyen_mon"),
    getDanhMuc("danh_muc_loai_chung_chi"),
    getNhomLop(),
  ]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DanhMucEditor
        bang="danh_muc_chuyen_mon"
        tieuDe="Chuyên môn"
        moTa="Trình độ, bằng cấp để gán vào hồ sơ nhân sự (bác sĩ, điều dưỡng, thạc sĩ...)."
        items={chuyenMon}
      />
      <DanhMucEditor
        bang="danh_muc_loai_chung_chi"
        tieuDe="Loại chứng chỉ"
        moTa="Dùng khi nhân sự khai báo chứng chỉ và làm điều kiện đăng ký lớp có yêu cầu chứng chỉ."
        items={loaiChungChi}
      />
      <NhomLopEditor items={nhomLop} />
    </div>
  );
}
