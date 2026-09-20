"use client";

import { Ban, CheckCheck, PlayCircle, Trash2, Undo2 } from "lucide-react";
import { XacNhanDialog } from "@/components/lop-hoc/xac-nhan-dialog";
import { Button } from "@/components/ui/button";
import { doiTrangThaiLop, xoaLopHoc } from "@/lib/lop-hoc/actions";
import type { TrangThaiLop } from "@/types/database";

// Nút chuyển trạng thái lớp theo vòng đời: Dự kiến → Đang mở đăng ký → Đã hoàn thành, hoặc Hủy (mục 4.2).
// Chỉ render cho Admin/Quản lý lớp; hàm SQL doi_trang_thai_lop kiểm tra lại quyền và điều kiện chuyển.
export function LopHanhDong({ lopId, trangThai }: { lopId: string; trangThai: TrangThaiLop }) {
  if (trangThai === "da_hoan_thanh" || trangThai === "da_huy") return null;

  const huy = (
    <XacNhanDialog
      trigger={
        <Button variant="outline" size="sm" className="hover:text-danger">
          <Ban /> Hủy lớp
        </Button>
      }
      title="Hủy lớp này?"
      description="Lớp chuyển sang “Đã hủy” và không thể mở lại. Lịch sử phân công vẫn được giữ."
      confirmLabel="Xác nhận hủy lớp"
      destructive
      onConfirm={() => doiTrangThaiLop(lopId, "da_huy")}
    />
  );

  if (trangThai === "nhap") {
    return (
      <>
        <XacNhanDialog
          trigger={
            <Button size="sm">
              <PlayCircle /> Mở đăng ký
            </Button>
          }
          title="Mở đăng ký cho lớp?"
          description="Lớp chuyển sang “Đang mở đăng ký” và hiển thị công khai cho toàn bộ giảng viên/trợ giảng."
          confirmLabel="Mở đăng ký"
          onConfirm={() => doiTrangThaiLop(lopId, "dang_mo")}
        />
        {huy}
        <XacNhanDialog
          trigger={
            <Button variant="outline" size="sm" className="hover:text-danger">
              <Trash2 /> Xóa lớp
            </Button>
          }
          title="Xóa lớp này?"
          description="Lớp Dự kiến cùng các Bài và slot của lớp sẽ bị xóa vĩnh viễn."
          confirmLabel="Xác nhận xóa"
          pendingLabel="Đang xóa..."
          destructive
          onConfirm={() => xoaLopHoc(lopId)}
          redirectTo="/lop-hoc"
        />
      </>
    );
  }

  // dang_mo
  return (
    <>
      <XacNhanDialog
        trigger={
          <Button size="sm">
            <CheckCheck /> Hoàn thành lớp
          </Button>
        }
        title="Đánh dấu lớp đã hoàn thành?"
        description="Sau khi hoàn thành, không sửa được lớp và các Bài nữa; bạn có thể nhập kết quả khảo sát hài lòng học viên (C1) và tỷ lệ học viên đạt chuẩn đầu ra (C3)."
        confirmLabel="Hoàn thành lớp"
        onConfirm={() => doiTrangThaiLop(lopId, "da_hoan_thanh")}
      />
      <XacNhanDialog
        trigger={
          <Button variant="outline" size="sm">
            <Undo2 /> Đưa về Dự kiến
          </Button>
        }
        title="Đưa lớp về Dự kiến?"
        description="Lớp ngừng nhận đăng ký và ẩn khỏi giảng viên/trợ giảng (trừ khi bật công khai sớm). Chỉ làm được khi chưa có ai đăng ký hoặc được phân công."
        confirmLabel="Đưa về Dự kiến"
        onConfirm={() => doiTrangThaiLop(lopId, "nhap")}
      />
      {huy}
    </>
  );
}
