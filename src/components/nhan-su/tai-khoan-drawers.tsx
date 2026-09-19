"use client";

import { KeyRound, UserPlus } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { NHOM_OPTIONS } from "@/lib/nhan-su/labels";
import { datLaiMatKhau, doiMatKhau, themNhanSu } from "@/lib/nhan-su/tai-khoan-actions";

// Chỉ Admin gốc thấy (trang cha kiểm tra; Server Action kiểm tra lại)
export function ThemNhanSuDrawer() {
  return (
    <FormDrawer
      trigger={
        <Button size="sm">
          <UserPlus /> Thêm nhân sự
        </Button>
      }
      title="Thêm nhân sự"
      description="Tạo tài khoản đăng nhập kèm hồ sơ. Tài khoản dùng được ngay, không cần thư xác nhận."
      action={themNhanSu}
      submitLabel="Tạo tài khoản"
    >
      <Field label="Email đăng nhập" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="off" />
      </Field>
      <Field label="Họ và tên" htmlFor="ho_ten">
        <Input id="ho_ten" name="ho_ten" required />
      </Field>
      <Field
        label="Nhóm"
        htmlFor="nhom"
        hint="Có thể để trống và xếp sau trong hồ sơ. Người chưa có nhóm sẽ chưa dùng được cho đăng ký lớp."
      >
        <NativeSelect id="nhom" name="nhom" defaultValue="">
          <option value="">— Chưa xếp nhóm —</option>
          {NHOM_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <PasswordField id="mat_khau" name="mat_khau" label="Mật khẩu tạm (tối thiểu 8 ký tự)" withGenerate required />
      <p className="text-xs text-muted-foreground">
        Hãy gửi email và mật khẩu này cho nhân sự, rồi nhắc họ đổi mật khẩu ở “Hồ sơ của tôi” sau khi đăng nhập lần đầu.
      </p>
    </FormDrawer>
  );
}

// Người dùng tự đổi mật khẩu của mình (xác minh mật khẩu hiện tại)
export function DoiMatKhauDrawer() {
  return (
    <FormDrawer
      trigger={
        <Button variant="outline" size="sm">
          <KeyRound /> Đổi mật khẩu
        </Button>
      }
      title="Đổi mật khẩu"
      action={doiMatKhau}
      submitLabel="Đổi mật khẩu"
    >
      <PasswordField id="mat_khau_hien_tai" name="mat_khau_hien_tai" label="Mật khẩu hiện tại" autoComplete="current-password" required />
      <PasswordField id="mat_khau_moi" name="mat_khau_moi" label="Mật khẩu mới (tối thiểu 8 ký tự)" required />
      <PasswordField id="xac_nhan" name="xac_nhan" label="Nhập lại mật khẩu mới" required />
    </FormDrawer>
  );
}

// Admin gốc đặt lại mật khẩu cho người khác (khi họ quên — app chưa có luồng “quên mật khẩu” qua email)
export function DatLaiMatKhauDrawer({ userId, hoTen }: { userId: string; hoTen: string }) {
  return (
    <FormDrawer
      trigger={
        <Button variant="outline" size="sm">
          <KeyRound /> Đặt lại mật khẩu
        </Button>
      }
      title="Đặt lại mật khẩu"
      description={hoTen}
      action={datLaiMatKhau}
      submitLabel="Đặt lại"
    >
      <input type="hidden" name="user_id" value={userId} />
      <PasswordField id="mat_khau" name="mat_khau" label="Mật khẩu mới (tối thiểu 8 ký tự)" withGenerate required />
      <p className="text-xs text-muted-foreground">
        Mật khẩu cũ sẽ không còn dùng được. Hãy gửi mật khẩu mới cho {hoTen} và nhắc họ đổi lại sau khi đăng nhập.
      </p>
    </FormDrawer>
  );
}
