"use client";

import { Pencil, Plus } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { luuLopHoc } from "@/lib/lop-hoc/actions";
import { DOI_TUONG_LABEL, LOAI_KINH_PHI_LABEL } from "@/lib/lop-hoc/labels";
import { NHOM_OPTIONS } from "@/lib/nhan-su/labels";
import type { DanhMuc, LopHocTongHop, NhomLop, NhomNhanSu } from "@/types/database";

// Tạo / sửa lớp — chỉ render cho Admin/Quản lý lớp (trang cha kiểm tra; hàm SQL luu_lop_hoc kiểm tra lại)
export function LopFormDrawer({
  nhomLop,
  loaiChungChi,
  lop,
  nhomDuDieuKien = [],
  chungChiIds = [],
}: {
  nhomLop: NhomLop[];
  loaiChungChi: DanhMuc[];
  // Có lớp = chế độ sửa
  lop?: LopHocTongHop;
  nhomDuDieuKien?: NhomNhanSu[];
  chungChiIds?: string[];
}) {
  const sua = !!lop;
  // Giữ lại nhóm lớp/loại chứng chỉ đang dùng dù đã bị tắt, để form sửa không làm mất giá trị hiện tại
  const nhomLopChon = nhomLop.filter((n) => n.dang_dung || n.id === lop?.nhom_lop_id);
  const ccChon = loaiChungChi.filter((c) => c.dang_dung || chungChiIds.includes(c.id));

  return (
    <FormDrawer
      trigger={
        sua ? (
          <Button variant="outline" size="sm">
            <Pencil /> Sửa lớp
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Tạo lớp
          </Button>
        )
      }
      title={sua ? "Sửa lớp học" : "Tạo lớp học"}
      description={
        sua
          ? "Đổi thông tin chung của lớp. Các Bài và slot chỉnh riêng ở trang chi tiết lớp."
          : "Lớp mới ở trạng thái Dự kiến. Thêm các Bài ở trang chi tiết lớp rồi mới mở đăng ký."
      }
      action={luuLopHoc}
      submitLabel={sua ? "Lưu thay đổi" : "Tạo lớp"}
    >
      {lop && <input type="hidden" name="id" value={lop.id} />}

      <Field label="Tên lớp" htmlFor="ten">
        <Input id="ten" name="ten" defaultValue={lop?.ten} required />
      </Field>

      <Field label="Nhóm lớp" htmlFor="nhom_lop_id" hint="Loại khóa học; mỗi nhóm lớp gắn sẵn hệ số độ khó D1 (cấu hình ở Danh mục).">
        <NativeSelect id="nhom_lop_id" name="nhom_lop_id" defaultValue={lop?.nhom_lop_id ?? ""} required>
          {!lop && <option value="">— Chọn nhóm lớp —</option>}
          {nhomLopChon.map((n) => (
            <option key={n.id} value={n.id}>
              {n.ten}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Đối tượng" htmlFor="doi_tuong">
          <NativeSelect id="doi_tuong" name="doi_tuong" defaultValue={lop?.doi_tuong ?? "nhan_vien_y_te"}>
            {Object.entries(DOI_TUONG_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Loại kinh phí" htmlFor="loai_kinh_phi">
          <NativeSelect id="loai_kinh_phi" name="loai_kinh_phi" defaultValue={lop?.loai_kinh_phi ?? "co_kinh_phi"}>
            {Object.entries(LOAI_KINH_PHI_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Đối tượng và loại kinh phí độc lập nhau. Lớp không kinh phí được tính vào A4 (đóng góp cộng đồng).
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ngày bắt đầu" htmlFor="ngay_bat_dau">
          <Input id="ngay_bat_dau" name="ngay_bat_dau" type="date" defaultValue={lop?.ngay_bat_dau} required />
        </Field>
        <Field label="Ngày kết thúc" htmlFor="ngay_ket_thuc">
          <Input id="ngay_ket_thuc" name="ngay_ket_thuc" type="date" defaultValue={lop?.ngay_ket_thuc} required />
        </Field>
      </div>

      <Field label="Địa điểm" htmlFor="dia_diem">
        <Input id="dia_diem" name="dia_diem" defaultValue={lop?.dia_diem ?? ""} />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Nhóm đủ điều kiện đăng ký</legend>
        {NHOM_OPTIONS.map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm">
            <input type="checkbox" name="nhom_du_dieu_kien" value={v} defaultChecked={nhomDuDieuKien.includes(v)} className="size-4 accent-primary" />
            {l}
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Chỉ nhân sự thuộc các nhóm được chọn mới xét đăng ký/gợi ý cho lớp. Nhãn nhóm chỉ Admin / Quản lý lớp nhìn thấy.
        </p>
      </fieldset>

      {ccChon.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Chứng chỉ yêu cầu thêm (nếu cần)</legend>
          {ccChon.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-sm">
              <input type="checkbox" name="chung_chi" value={c.id} defaultChecked={chungChiIds.includes(c.id)} className="size-4 accent-primary" />
              {c.ten}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Điều kiện lọc thêm bên trong nhóm đã đủ điều kiện.</p>
        </fieldset>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
        <input type="checkbox" name="cong_khai_som" defaultChecked={lop?.cong_khai_som} className="mt-0.5 size-4 accent-primary" />
        <span>
          <span className="block font-medium">Công khai sớm khi còn Dự kiến</span>
          <span className="block text-xs text-muted-foreground">
            Cho GV/TG thấy lớp và các Bài dự kiến trước khi mở đăng ký chính thức, để sắp xếp lịch cá nhân.
          </span>
        </span>
      </label>
    </FormDrawer>
  );
}
