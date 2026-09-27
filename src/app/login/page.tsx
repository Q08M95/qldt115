"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CalendarCheck, ClipboardCheck, Eye, EyeOff, Gauge, GraduationCap, Info, LoaderCircle, Moon, Sun, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const TEN_APP = "QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY";

const DIEM_NOI_BAT = [
  { icon: ClipboardCheck, tieu_de: "Đăng ký dạy nhanh", mo_ta: "Xem Bài còn thiếu người, đăng ký hoặc nhận lời mời ngay trên điện thoại." },
  { icon: CalendarCheck, tieu_de: "Lịch dạy và check-in", mo_ta: "Theo dõi lịch dạy của bạn và điểm danh đúng giờ chỉ với một lần bấm." },
  { icon: Gauge, tieu_de: "KPI minh bạch", mo_ta: "Biết điểm của mình được tính từ đâu và cần cải thiện điều gì." },
];

function DoiGiaoDien() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
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
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
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
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Cột thương hiệu — chỉ hiện từ desktop */}
      <section className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/[0.07]" aria-hidden />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">QLĐT</span>
        </div>

        <div className="relative max-w-md space-y-10">
          <div className="space-y-3">
            <h2 className="text-[32px] leading-tight font-semibold text-balance">{TEN_APP}</h2>
            <p className="text-base text-white/80">Nơi đăng ký dạy, theo dõi lịch và xem kết quả đánh giá của đội ngũ giảng viên, trợ giảng.</p>
          </div>
          <ul className="space-y-5">
            {DIEM_NOI_BAT.map(({ icon: Icon, tieu_de, mo_ta }) => (
              <li key={tieu_de} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{tieu_de}</span>
                  <span className="block text-sm text-white/75">{mo_ta}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">Hệ thống nội bộ, chỉ dành cho nhân sự của đơn vị.</p>
      </section>

      {/* Cột form */}
      <section className="relative flex flex-col bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_9%,var(--background)),var(--background)_45%)] lg:bg-none">
        <div className="flex justify-end p-3 lg:p-5">
          <DoiGiaoDien />
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 pb-8 sm:px-8">
          <div className="mx-auto w-full max-w-sm">
            {/* Điện thoại: nhận diện đặt phía trên form vì không có cột thương hiệu */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-card">
                <GraduationCap className="size-6" aria-hidden />
              </span>
              <h2 className="text-lg leading-snug font-semibold">{TEN_APP}</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-card p-6 shadow-card sm:p-8 dark:border">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Đăng nhập</h1>
                <p className="text-sm text-muted-foreground">Dùng email và mật khẩu do quản trị viên cấp cho bạn.</p>
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
                    className="pr-11"
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
                    {hienMatKhau ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg bg-grad-danger px-3 py-2.5 text-sm text-destructive">
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
                    Hệ thống chưa tự gửi mật khẩu qua email. Hãy liên hệ Admin để được đặt lại mật khẩu, rồi đổi lại ngay sau khi đăng nhập.
                  </p>
                )}
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">Cần hỗ trợ? Liên hệ Admin của đơn vị.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
