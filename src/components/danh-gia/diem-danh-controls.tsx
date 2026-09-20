"use client";

import { Pencil, Star, Trash2 } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { XacNhanDialog } from "@/components/lop-hoc/xac-nhan-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { chinhDiemDanh, luuDuGio, xoaDuGio } from "@/lib/danh-gia/actions";
import { cn } from "@/lib/utils";
import type { DiemDanh, DuGio, RubricMuc } from "@/types/database";

// Admin/Quản lý lớp chỉnh tay điểm danh (B1) của 1 người ở 1 Bài — bắt buộc lý do (mục 4.4)
export function ChinhDiemDanhDrawer({
  baiId,
  userId,
  ten,
  diemDanh,
}: {
  baiId: string;
  userId: string;
  ten: string;
  diemDanh: DiemDanh | null;
}) {
  return (
    <FormDrawer
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Chỉnh điểm danh của ${ten}`}>
          <Pencil />
        </Button>
      }
      title={`Chỉnh điểm danh — ${ten}`}
      description="Dùng khi có lỗi kỹ thuật hoặc khiếu nại. Lý do được lưu lại; điểm sửa tay được đánh dấu."
      action={chinhDiemDanh}
    >
      <input type="hidden" name="bai_id" value={baiId} />
      <input type="hidden" name="user_id" value={userId} />
      <Field label="Điểm B1 (0–100%)" htmlFor="dd-pt" hint="100 = đúng giờ, 0 = vắng hoặc trễ quá ngưỡng.">
        <Input
          id="dd-pt"
          name="phan_tram"
          inputMode="decimal"
          defaultValue={diemDanh ? String(diemDanh.b1_phan_tram).replace(".", ",") : ""}
          className="w-32 tabular-nums"
          required
        />
      </Field>
      <Field label="Lý do chỉnh sửa" htmlFor="dd-ly-do">
        <Textarea id="dd-ly-do" name="ly_do" placeholder="Ví dụ: mất mạng lúc check-in, có xác nhận của quản lý" maxLength={500} required />
      </Field>
    </FormDrawer>
  );
}

// Chấm dự giờ (C2) theo rubric 4 mức cho 1 người ở 1 Bài cụ thể
export function DuGioDrawer({
  baiId,
  userId,
  ten,
  rubric,
  duGio,
}: {
  baiId: string;
  userId: string;
  ten: string;
  rubric: RubricMuc[];
  duGio: DuGio | null;
}) {
  return (
    <FormDrawer
      trigger={
        <Button variant="outline" size="sm">
          <Star /> {duGio ? "Sửa điểm" : "Chấm dự giờ"}
        </Button>
      }
      title={`Dự giờ — ${ten}`}
      description="Chọn 1 mức theo rubric. Điểm được nhân hệ số độ khó của Bài (tối đa 100) khi tính KPI."
      action={luuDuGio}
    >
      <input type="hidden" name="bai_id" value={baiId} />
      <input type="hidden" name="user_id" value={userId} />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Mức đánh giá</legend>
        {rubric.map((r) => (
          <label
            key={r.muc}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-primary/5",
            )}
          >
            <input type="radio" name="muc" value={r.muc} defaultChecked={duGio?.muc_diem === r.muc} required className="mt-1 size-4 accent-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {r.muc}% — {r.ten}
              </span>
              {r.mo_ta && <span className="mt-0.5 block text-sm text-muted-foreground">{r.mo_ta}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <Field label="Ghi chú dự giờ (không bắt buộc)" htmlFor="dg-ghi-chu" hint="Chỉ Admin/Quản lý lớp và chính người được chấm đọc được.">
        <Textarea id="dg-ghi-chu" name="ghi_chu" defaultValue={duGio?.ghi_chu ?? ""} maxLength={1000} />
      </Field>
    </FormDrawer>
  );
}

export function XoaDuGioButton({ baiId, userId, ten }: { baiId: string; userId: string; ten: string }) {
  return (
    <XacNhanDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Xóa điểm dự giờ của ${ten}`} className="hover:text-danger">
          <Trash2 />
        </Button>
      }
      title="Xóa điểm dự giờ?"
      description="Điểm C2 của Bài này không còn được tính vào KPI. Có thể chấm lại sau."
      confirmLabel="Xác nhận xóa"
      pendingLabel="Đang xóa..."
      destructive
      onConfirm={() => xoaDuGio(baiId, userId)}
    />
  );
}
