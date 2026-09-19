"use client";

import { ShieldCheck } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { capNhatQuanTri } from "@/lib/nhan-su/actions";
import { NHOM_OPTIONS, TRANG_THAI_OPTIONS } from "@/lib/nhan-su/labels";
import type { NhomNhanSu, Profile } from "@/types/database";

// Chỉ render cho Admin/Quản lý lớp (trang cha kiểm tra; Server Action + hàm SQL kiểm tra lại).
export function QuanTriDrawer({
  profile,
  nhom,
  laAdmin,
}: {
  profile: Profile;
  nhom: NhomNhanSu | null;
  // Chỉ Admin gốc gán/thu hồi Quyền Quản lý lớp
  laAdmin: boolean;
}) {
  return (
    <FormDrawer
      trigger={
        <Button variant="outline" size="sm">
          <ShieldCheck /> Quản trị hồ sơ
        </Button>
      }
      title="Quản trị hồ sơ"
      description="Trạng thái tham gia, nhóm và quyền — chỉ Admin / Quản lý lớp thấy mục này."
      action={capNhatQuanTri}
    >
      <input type="hidden" name="user_id" value={profile.id} />

      <Field
        label="Trạng thái tham gia giảng dạy"
        htmlFor="trang_thai"
        hint="Khi không “Đang tham gia”, người này bị ẩn khỏi đăng ký slot mới và gợi ý phân công, nhưng vẫn giữ lịch sử KPI và hồ sơ."
      >
        <NativeSelect id="trang_thai" name="trang_thai" defaultValue={profile.trang_thai_tham_gia}>
          {TRANG_THAI_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Nhóm"
        htmlFor="nhom"
        hint="Nhãn nhóm chỉ Admin / Quản lý lớp nhìn thấy, GV/TG không thấy dù vẫn được dùng ngầm cho xếp hạng và điều kiện đăng ký."
      >
        <NativeSelect id="nhom" name="nhom" defaultValue={nhom ?? ""}>
          {!nhom && <option value="">— Chưa xếp nhóm —</option>}
          {NHOM_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-60">
          <input
            type="checkbox"
            name="co_quyen_quan_ly_lop"
            defaultChecked={profile.co_quyen_quan_ly_lop}
            disabled={!laAdmin}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="block font-medium">Quyền Quản lý lớp</span>
            <span className="block text-xs text-muted-foreground">
              Toàn quyền Admin (trừ chỉnh sửa/build web) song song với hồ sơ GV/TG.
              {!laAdmin && " Chỉ Admin được gán hoặc thu hồi."}
            </span>
          </span>
        </label>
      </div>
    </FormDrawer>
  );
}
