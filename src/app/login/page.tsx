"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CalendarCheck,
  ClipboardCheck,
  Eye,
  EyeOff,
  Gauge,
  GraduationCap,
  Info,
  LoaderCircle,
  Moon,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const TEN_APP = "QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY";

const DIEM_NOI_BAT = [
  { icon: ClipboardCheck, tieu_de: "Đăng ký dạy nhanh" },
  { icon: CalendarCheck, tieu_de: "Lịch dạy và check-in" },
  { icon: Gauge, tieu_de: "KPI minh bạch" },
];

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quenMk, setQuenMk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      // Sai thông tin và lỗi hệ thống (mạng, bị giới hạn lượt thử…) cần lời nhắc khác nhau
      setError(
        error.status === 400 || /invalid login credentials/i.test(error.message)
          ? "Email hoặc mật khẩu không đúng. Hãy kiểm tra lại rồi thử lại."
          : "Chưa đăng nhập được lúc này. Hãy kiểm tra kết nối mạng và thử lại sau ít phút.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-brand-gradient text-white">
      {/* Nền chuyển sắc trong tone thương hiệu: các vệt sáng mềm cho chiều sâu */}
      <div
        className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full bg-[#A2EFC3]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-32 size-[36rem] rounded-full bg-[#C6DCFA]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-white/[0.06] blur-2xl"
        aria-hidden
      />

      <div className="relative flex justify-end p-3 sm:p-5">
        <DoiGiaoDien />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <GraduationCap className="size-7" aria-hidden />
            </span>
            <h2 className="text-xl leading-snug font-semibold text-balance sm:text-2xl">
              {TEN_APP}
            </h2>
            <p className="text-sm text-white/80">
              Nơi đăng ký dạy, theo dõi lịch và xem kết quả đánh giá của đội ngũ
              giảng viên, trợ giảng.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-[0_24px_60px_-12px_rgba(8,30,70,0.45)] sm:p-8 dark:border"
          >
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Đăng nhập</h1>
              <p className="text-sm text-muted-foreground">
                Dùng email và mật khẩu do quản trị viên cấp cho bạn.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                inputMode="email"
                className="autofill:shadow-[inset_0_0_0_1000px_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)]"
                placeholder="ten@donvi.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={hienMatKhau ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  className="pr-11 autofill:shadow-[inset_0_0_0_1000px_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau((v) => !v)}
                  className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={hienMatKhau}
                >
                  {hienMatKhau ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-grad-danger px-3 py-2.5 text-sm text-destructive"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <LoaderCircle className="animate-spin" aria-hidden />}
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setQuenMk((v) => !v)}
                className="text-sm text-primary hover:underline"
                aria-expanded={quenMk}
              >
                Quên mật khẩu?
              </button>
              {quenMk && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-left text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Hệ thống chưa tự gửi mật khẩu qua email. Hãy liên hệ Admin để
                  được đặt lại mật khẩu, rồi đổi lại ngay sau khi đăng nhập.
                </p>
              )}
            </div>
          </form>

          <ul className="mt-7 hidden justify-center gap-2 sm:-mx-12 sm:flex">
            {DIEM_NOI_BAT.map(({ icon: Icon, tieu_de }) => (
              <li
                key={tieu_de}
                className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 backdrop-blur"
              >
                <Icon className="size-3.5" aria-hidden />
                {tieu_de}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-sm text-white/75">
            Cần hỗ trợ? Liên hệ Admin của đơn vị.
          </p>
        </div>
      </div>
    </main>
  );
}
