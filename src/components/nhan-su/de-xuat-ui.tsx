"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { taoDeXuat, xuLyDeXuat } from "@/lib/nhan-su/actions";
import { LOAI_DE_XUAT_OPTIONS } from "@/lib/nhan-su/labels";

// Nút Duyệt / Bỏ qua ngay trong bảng (mục 4.7b: nút hành động nhanh)
export function DuyetButtons({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(duyet: boolean) {
    setError(null);
    start(async () => {
      const res = await xuLyDeXuat(id, duyet);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(false)}>
          <X /> Bỏ qua
        </Button>
        <Button size="sm" disabled={pending} onClick={() => run(true)}>
          <Check /> Duyệt
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TaoDeXuatDrawer({ nguoi }: { nguoi: { id: string; ho_ten: string }[] }) {
  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <Plus /> Tạo đề xuất
        </Button>
      }
      title="Tạo đề xuất nhân sự"
      description="Ghi nhận đề xuất thủ công. Đề xuất đổi nhóm theo KPI sẽ do hệ thống tự sinh khi có dữ liệu."
      action={taoDeXuat}
      submitLabel="Tạo đề xuất"
    >
      <Field label="Người được đề xuất" htmlFor="user_id">
        <NativeSelect id="user_id" name="user_id" defaultValue="" required>
          <option value="" disabled>
            — Chọn người —
          </option>
          {nguoi.map((n) => (
            <option key={n.id} value={n.id}>
              {n.ho_ten}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Loại đề xuất" htmlFor="loai">
        <NativeSelect id="loai" name="loai" defaultValue="dao_tao">
          {LOAI_DE_XUAT_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Nội dung" htmlFor="noi_dung">
        <Textarea id="noi_dung" name="noi_dung" rows={4} required />
      </Field>
    </FormDrawer>
  );
}
