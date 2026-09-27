"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KhungDangNhap, O_NHAP, OMatKhau, ThongBaoLoi } from "@/components/auth/khung-dang-nhap";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [cheDo, setCheDo] = useState<"dang-nhap" | "quen-mat-khau">("dang-nhap");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [daGui, setDaGui] = useState(false);
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

  // Quên mật khẩu: gửi email chứa liên kết đặt lại. Luôn báo "đã gửi" dù email có tồn tại hay không (không lộ ai có tài khoản)
  async function guiLienKet(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
    });
    setLoading(false);
    if (error) {
      setError(
        error.status === 429 || /rate limit|security purposes/i.test(error.message)
          ? "Bạn vừa yêu cầu quá nhiều lần. Hãy đợi ít phút rồi thử lại."
          : "Chưa gửi được email lúc này. Hãy thử lại sau, hoặc liên hệ Admin để được đặt lại mật khẩu.",
      );
      return;
    }
    setDaGui(true);
  }

  function chuyenCheDo(cd: typeof cheDo) {
    setCheDo(cd);
    setError(null);
    setDaGui(false);
  }

  if (cheDo === "quen-mat-khau") {
    return (
      <KhungDangNhap>
        {daGui ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-lg bg-grad-success px-3 py-2.5 text-sm text-[var(--hue-green)]">
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Nếu email này có tài khoản, hệ thống đã gửi liên kết đặt lại mật khẩu. Hãy mở email (kiểm tra cả thư rác) và bấm vào liên kết, trên cùng thiết bị và trình duyệt bạn vừa dùng ở đây.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => chuyenCheDo("dang-nhap")}>
              Quay lại đăng nhập
            </Button>
          </div>
        ) : (
          <form onSubmit={guiLienKet} className="space-y-5">
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-semibold">Quên mật khẩu</h1>
              <p className="text-sm text-muted-foreground">Nhập email đăng nhập, hệ thống sẽ gửi liên kết để bạn đặt mật khẩu mới.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email-quen" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email-quen"
                type="email"
                required
                autoFocus
                autoComplete="username"
                inputMode="email"
                className={O_NHAP}
                placeholder="ten@donvi.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>
            {error && <ThongBaoLoi>{error}</ThongBaoLoi>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <LoaderCircle className="animate-spin" aria-hidden />}
              {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => chuyenCheDo("dang-nhap")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="size-3.5" aria-hidden /> Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}
      </KhungDangNhap>
    );
  }

  return (
    <KhungDangNhap>
      <form onSubmit={onSubmit} className="space-y-5">
        <h1 className="sr-only">Đăng nhập</h1>
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
            className={O_NHAP}
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
          <OMatKhau id="password" value={password} onChange={setPassword} placeholder="Nhập mật khẩu" autoComplete="current-password" invalid={!!error} />
        </div>
        {error && <ThongBaoLoi>{error}</ThongBaoLoi>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <LoaderCircle className="animate-spin" aria-hidden />}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
        <div className="text-center">
          <button type="button" onClick={() => chuyenCheDo("quen-mat-khau")} className="text-sm text-primary hover:underline">
            Quên mật khẩu?
          </button>
        </div>
      </form>
    </KhungDangNhap>
  );
}
