"use client";

import { CheckCheck, ClipboardCheck, History, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { FormDrawer } from "@/components/form-drawer";
import { Field } from "@/components/field";
import { XacNhanDialog } from "@/components/lop-hoc/xac-nhan-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { doiTrangThaiKy, luuKy, moLaiKy, xoaKy } from "@/lib/kpi/actions";
import type { KyDanhGia } from "@/types/database";

// Tạo kỳ mới (kèm gợi ý quý tiếp theo) hoặc sửa kỳ đang mở
export function KyFormDrawer({
  ky,
  macDinh,
}: {
  ky?: KyDanhGia;
  macDinh?: { ten: string; tu: string; den: string };
}) {
  return (
    <FormDrawer
      trigger={
        ky ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${ky.ten}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Tạo kỳ
          </Button>
        )
      }
      title={ky ? "Sửa kỳ đánh giá" : "Tạo kỳ đánh giá"}
      description="Kỳ là 1 quý; các kỳ không được chồng ngày nhau. Bài học thuộc kỳ theo ngày bắt đầu của từng Bài."
      action={luuKy}
    >
      {ky && <input type="hidden" name="id" value={ky.id} />}
      <Field label="Tên kỳ" htmlFor="ky-ten">
        <Input id="ky-ten" name="ten" defaultValue={ky?.ten ?? macDinh?.ten ?? ""} placeholder="Quý 4/2026" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Từ ngày" htmlFor="ky-tu">
          <Input id="ky-tu" name="tu" type="date" defaultValue={ky?.tu ?? macDinh?.tu ?? ""} required />
        </Field>
        <Field label="Đến ngày" htmlFor="ky-den">
          <Input id="ky-den" name="den" type="date" defaultValue={ky?.den ?? macDinh?.den ?? ""} required />
        </Field>
      </div>
    </FormDrawer>
  );
}

export function XoaKyButton({ ky }: { ky: KyDanhGia }) {
  return (
    <XacNhanDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Xóa ${ky.ten}`} className="hover:text-danger">
          <Trash2 />
        </Button>
      }
      title={`Xóa ${ky.ten}?`}
      description="Chỉ xóa được kỳ đang mở. Kỳ bị xóa không còn trong danh sách; dữ liệu giảng dạy không bị ảnh hưởng."
      confirmLabel="Xác nhận xóa"
      pendingLabel="Đang xóa..."
      destructive
      onConfirm={() => xoaKy(ky.id)}
      redirectTo="/cau-hinh/ky-danh-gia"
    />
  );
}

// Vòng đời kỳ: Đang mở ⇄ Chờ duyệt → Đã đóng (khóa cứng)
export function KyChuyenTrangThai({ ky, soCanhBao = 0 }: { ky: KyDanhGia; soCanhBao?: number }) {
  if (ky.trang_thai === "da_dong") return null;

  if (ky.trang_thai === "dang_mo") {
    return (
      <XacNhanDialog
        trigger={
          <Button size="sm">
            <ClipboardCheck /> Chuyển sang chờ duyệt
          </Button>
        }
        title="Chuyển kỳ sang “Chờ duyệt”?"
        description="Admin xem và kiểm tra KPI trước khi công bố. Trong lúc chờ duyệt, giảng viên/trợ giảng chưa xem được KPI của kỳ này. Có thể quay lại “Đang mở” nếu cần."
        confirmLabel="Chuyển sang chờ duyệt"
        onConfirm={() => doiTrangThaiKy(ky.id, "cho_duyet")}
      />
    );
  }

  return (
    <>
      <XacNhanDialog
        trigger={
          <Button size="sm">
            <CheckCheck /> Đóng kỳ và công bố KPI
          </Button>
        }
        title={`Đóng ${ky.ten}?`}
        description={`${soCanhBao > 0 ? `Còn ${soCanhBao} mục chưa hoàn tất trong danh sách kiểm tra bên dưới — nên xử lý trước khi đóng. ` : ""}KPI của kỳ được chụp lại cùng cấu hình đang dùng và khóa cứng: đổi cấu hình sau này không làm thay đổi kết quả kỳ này. Hệ thống cũng rà soát và tạo đề xuất đổi nhóm (thăng/giáng) nếu có người đủ điều kiện. Nếu cần sửa sau khi đóng, chỉ mở lại được kỳ đóng gần nhất, kèm lý do.`}
        confirmLabel="Đóng kỳ"
        onConfirm={() => doiTrangThaiKy(ky.id, "da_dong")}
      />
      <XacNhanDialog
        trigger={
          <Button variant="outline" size="sm">
            <Undo2 /> Quay lại đang mở
          </Button>
        }
        title="Đưa kỳ về “Đang mở”?"
        description="Kỳ tiếp tục thu thập dữ liệu và KPI hiển thị công khai theo thời gian thực."
        confirmLabel="Quay lại đang mở"
        onConfirm={() => doiTrangThaiKy(ky.id, "dang_mo")}
      />
    </>
  );
}

// Mở lại kỳ đã đóng GẦN NHẤT (bắt buộc lý do). Kết quả đã khóa bị xóa, kỳ về Chờ duyệt để bổ sung dữ liệu rồi đóng lại.
export function MoLaiKyButton({ ky }: { ky: KyDanhGia }) {
  return (
    <XacNhanDialog
      trigger={
        <Button variant="outline" size="sm">
          <History /> Mở lại kỳ
        </Button>
      }
      title={`Mở lại ${ky.ten}?`}
      description="Kỳ về trạng thái Chờ duyệt: kết quả KPI và bản chụp cấu hình đã khóa bị xóa, đề xuất đổi nhóm đang chờ duyệt do lần đóng này sinh ra bị thu hồi; đóng lại sẽ tính lại từ dữ liệu hiện tại. Không mở lại được nếu đã có đề xuất đổi nhóm của kỳ này được duyệt. Lý do được lưu lại."
      confirmLabel="Mở lại kỳ"
      onConfirm={(lyDo) => moLaiKy(ky.id, lyDo)}
      nhapLyDo={{ nhan: "Lý do mở lại kỳ", placeholder: "Ví dụ: bổ sung điểm khảo sát của lớp ACLS-08 nhập muộn" }}
    />
  );
}
