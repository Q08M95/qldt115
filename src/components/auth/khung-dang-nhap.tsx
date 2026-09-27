"use client";

import { useTheme } from "next-themes";
import { Eye, EyeOff, GraduationCap, Moon, Sun, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const TEN_APP = "QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY";

// Ô nhập trên thẻ trắng: giữ nền thẻ khi trình duyệt tự điền (tránh bị tô xanh)
export const O_NHAP = "autofill:shadow-[inset_0_0_0_1000px_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)]";

function DoiGiaoDien() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-white hover:bg-white/15 hover:text-white"
      aria-label="Đổi chế độ sáng/tối"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}

// Khung chung cho các trang chưa đăng nhập (đăng nhập, đặt lại mật khẩu): nền chuyển sắc trong tone thương hiệu + thẻ trắng ở giữa
export function KhungDangNhap({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-brand-gradient text-white">
      <div className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full bg-[#A2EFC3]/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[36rem] rounded-full bg-[#C6DCFA]/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute top-1/3 left-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-white/[0.06] blur-2xl" aria-hidden />

      <div className="relative flex justify-end p-3 sm:p-5">
        <DoiGiaoDien />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-[0_24px_60px_-12px_rgba(8,30,70,0.45)] sm:p-8 dark:border">
            <div className="flex flex-col items-center gap-2.5 pb-1 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-card">
                <GraduationCap className="size-6" aria-hidden />
              </span>
              <p className="text-base leading-snug font-semibold tracking-wide text-balance">{TEN_APP}</p>
            </div>
            {children}
          </div>
          <p className="mt-5 text-center text-sm text-white/75">Cần hỗ trợ? Liên hệ Admin của đơn vị.</p>
        </div>
      </div>
    </main>
  );
}

export function ThongBaoLoi({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-grad-danger px-3 py-2.5 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

// Ô mật khẩu có nút hiện/ẩn
export function OMatKhau({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [hien, setHien] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={hien ? "text" : "password"}
        required
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`pr-11 ${O_NHAP}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
      />
      <button
        type="button"
        onClick={() => setHien((v) => !v)}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={hien}
      >
        {hien ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
