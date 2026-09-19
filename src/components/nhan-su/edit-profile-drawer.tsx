"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { capNhatHoSo } from "@/lib/nhan-su/actions";
import type { ChuyenMonCuaNguoi, DanhMuc, Profile } from "@/types/database";

function ChuyenMonPicker({ danhMuc, current }: { danhMuc: DanhMuc[]; current: ChuyenMonCuaNguoi[] }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(current.map((c) => c.chuyen_mon_id)));
  const chiTiet = new Map(current.map((c) => [c.chuyen_mon_id, c.chi_tiet ?? ""]));

  // Mục đã gán nhưng danh mục đã bị tắt vẫn hiển thị để không mất dữ liệu ngầm khi lưu
  const items = danhMuc.filter((d) => d.dang_dung || checked.has(d.id));

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">Chuyên môn (trình độ, bằng cấp)</legend>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Chưa có danh mục chuyên môn.</p>}
      {items.map((d) => {
        const on = checked.has(d.id);
        return (
          <div key={d.id} className="rounded-lg border p-3">
            <label className="flex min-h-6 cursor-pointer items-center gap-3 text-sm max-md:min-h-9">
              <input
                type="checkbox"
                name="chuyen_mon"
                value={d.id}
                checked={on}
                onChange={(e) =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(d.id);
                    else next.delete(d.id);
                    return next;
                  })
                }
                className="size-4 accent-primary"
              />
              <span className="font-medium">{d.ten}</span>
              {!d.dang_dung && <span className="text-xs text-muted-foreground">(đã tắt)</span>}
            </label>
            {on && (
              <Input
                name={`chi_tiet_${d.id}`}
                defaultValue={chiTiet.get(d.id) ?? ""}
                placeholder="Chi tiết (vd: chuyên ngành, nơi đào tạo) — không bắt buộc"
                className="mt-2"
                aria-label={`Chi tiết ${d.ten}`}
              />
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

export function EditProfileDrawer({
  profile,
  chuyenMon,
  danhMucChuyenMon,
}: {
  profile: Profile;
  chuyenMon: ChuyenMonCuaNguoi[];
  danhMucChuyenMon: DanhMuc[];
}) {
  return (
    <FormDrawer
      trigger={
        <Button variant="outline" size="sm">
          <Pencil /> Chỉnh sửa hồ sơ
        </Button>
      }
      title="Chỉnh sửa hồ sơ"
      description={profile.ho_ten}
      action={capNhatHoSo}
    >
      <input type="hidden" name="user_id" value={profile.id} />
      <Field label="Họ và tên" htmlFor="ho_ten">
        <Input id="ho_ten" name="ho_ten" defaultValue={profile.ho_ten} required />
      </Field>
      <Field label="Email" hint="Email đăng nhập, không sửa tại đây.">
        <Input value={profile.email} disabled readOnly />
      </Field>
      <Field label="Số điện thoại" htmlFor="so_dien_thoai">
        <Input id="so_dien_thoai" name="so_dien_thoai" type="tel" defaultValue={profile.so_dien_thoai ?? ""} />
      </Field>
      <Field label="Kinh nghiệm" htmlFor="kinh_nghiem">
        <Textarea id="kinh_nghiem" name="kinh_nghiem" defaultValue={profile.kinh_nghiem ?? ""} rows={4} />
      </Field>
      <ChuyenMonPicker danhMuc={danhMucChuyenMon} current={chuyenMon} />
    </FormDrawer>
  );
}
