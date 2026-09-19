"use client";

import { Pencil, Plus } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { luuBaiHoc } from "@/lib/lop-hoc/actions";
import { isoToLocalInput } from "@/lib/format";
import type { BaiHoc } from "@/types/database";

// Thêm / sửa Bài — chỉ render cho Admin/Quản lý lớp. Mỗi Bài có số slot RIÊNG theo vai trò (mục 4.2).
export function BaiFormDrawer({
  lopId,
  ngayMacDinh,
  bai,
}: {
  lopId: string;
  // 'YYYY-MM-DD' — ngày bắt đầu lớp, gợi ý sẵn cho Bài mới
  ngayMacDinh: string;
  bai?: BaiHoc;
}) {
  const sua = !!bai;
  const dem = (vai: "giang_vien" | "tro_giang") => bai?.slots.filter((s) => s.vai_tro === vai).length ?? 0;

  return (
    <FormDrawer
      trigger={
        sua ? (
          <Button variant="outline" size="sm">
            <Pencil /> Sửa Bài
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Thêm Bài
          </Button>
        )
      }
      title={sua ? "Sửa Bài" : "Thêm Bài"}
      description="Bài là 1 buổi học cụ thể, dùng để kiểm tra trùng lịch, tính giờ dạy (A1) và điểm danh."
      action={luuBaiHoc}
      submitLabel={sua ? "Lưu thay đổi" : "Thêm Bài"}
    >
      <input type="hidden" name="lop_id" value={lopId} />
      {bai && <input type="hidden" name="id" value={bai.id} />}

      <Field label="Nội dung / tên Bài" htmlFor="ten">
        <Input id="ten" name="ten" defaultValue={bai?.ten} placeholder="Vd: Lý thuyết hồi sinh tim phổi" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Bắt đầu" htmlFor="bat_dau">
          <Input
            id="bat_dau"
            name="bat_dau"
            type="datetime-local"
            defaultValue={bai ? isoToLocalInput(bai.bat_dau) : `${ngayMacDinh}T08:00`}
            required
          />
        </Field>
        <Field label="Kết thúc" htmlFor="ket_thuc">
          <Input
            id="ket_thuc"
            name="ket_thuc"
            type="datetime-local"
            defaultValue={bai ? isoToLocalInput(bai.ket_thuc) : `${ngayMacDinh}T11:00`}
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Số slot Giảng viên" htmlFor="so_gv">
          <Input id="so_gv" name="so_gv" type="number" min={0} max={20} step={1} defaultValue={sua ? dem("giang_vien") : 1} required />
        </Field>
        <Field label="Số slot Trợ giảng" htmlFor="so_tg">
          <Input id="so_tg" name="so_tg" type="number" min={0} max={20} step={1} defaultValue={sua ? dem("tro_giang") : 0} required />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Mỗi slot là 1 vị trí cần lấp. Vd Bài thực hành cần 1 Giảng viên + 3 Trợ giảng = 4 slot.
        {sua && " Giảm số slot chỉ được khi các slot bị bỏ đi còn trống."}
      </p>
    </FormDrawer>
  );
}
