"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KhungDangNhap, OMatKhau, ThongBaoLoi } from "@/components/auth/khung-dang-nhap";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

// Trang đích của liên kết trong email "Quên mật khẩu". Trình duyệt tự đổi mã trên địa chỉ thành phiên đăng nhập tạm
// (PKCE: phải mở cùng trình duyệt đã bấm "Gửi liên kết"), sau đó người dùng đặt mật khẩu mới.
export default function DatLaiMatKhauPage() {
  const router = useRouter();
  const [trangThai, setTrangThai] = useState<"cho" | "san-sang" | "khong-hop-le">("cho");
  const [moi, setMoi] = useState("");
  const [xacNhan, setXacNhan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let xong = false;
    // Liên kết kiểu cũ mang phiên tạm trong phần # của địa chỉ; kiểu mới (mã ?code=) do chính thư viện tự đổi
    const bam = new URLSearchParams(window.location.hash.slice(1));
    if (bam.get("access_token") && bam.get("refresh_token")) {
      supabase.auth
        .setSession({ access_token: bam.get("access_token")!, refresh_token: bam.get("refresh_token")! })
        .then(() => window.history.replaceState(null, "", window.location.pathname));
    }
    const { data: sub } = supabase.auth.onAuthStateChange((sk, session) => {
      if (session && (sk === "PASSWORD_RECOVERY" || sk === "SIGNED_IN" || sk === "INITIAL_SESSION")) {
        xong = true;
        setTrangThai("san-sang");
      }
    });
    // Không có phiên sau khi trình duyệt xử lý xong liên kết = liên kết sai, hết hạn hoặc mở khác trình duyệt
    const h = setTimeout(() => {
      if (!xong) setTrangThai("khong-hop-le");
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(h);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (moi.length < MIN_PASSWORD) return setError(`Mật khẩu mới tối thiểu ${MIN_PASSWORD} ký tự.`);
    if (moi !== xacNhan) return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password: moi });
    if (error) {
      setLoading(false);
      setError(
        /different from the old|same password/i.test(error.message)
          ? "Mật khẩu mới phải khác mật khẩu cũ."
          : "Chưa đặt được mật khẩu mới. Liên kết có thể đã hết hạn, hãy yêu cầu liên kết mới.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <KhungDangNhap>
      {trangThai === "cho" && (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Đang xác nhận liên kết...
        </p>
      )}

      {trangThai === "khong-hop-le" && (
        <div className="space-y-4">
          <ThongBaoLoi>Liên kết không hợp lệ hoặc đã hết hạn. Hãy mở liên kết trên cùng thiết bị và trình duyệt bạn dùng để yêu cầu, hoặc yêu cầu liên kết mới.</ThongBaoLoi>
          <Button asChild className="w-full">
            <Link href="/login">Về trang đăng nhập</Link>
          </Button>
        </div>
      )}

      {trangThai === "san-sang" && (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-lg font-semibold">Đặt mật khẩu mới</h1>
            <p className="text-sm text-muted-foreground">Tối thiểu {MIN_PASSWORD} ký tự.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="moi" className="text-sm font-medium">
              Mật khẩu mới
            </label>
            <OMatKhau id="moi" value={moi} onChange={setMoi} placeholder="Nhập mật khẩu mới" autoComplete="new-password" autoFocus invalid={!!error} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="xac-nhan" className="text-sm font-medium">
              Nhập lại mật khẩu mới
            </label>
            <OMatKhau id="xac-nhan" value={xacNhan} onChange={setXacNhan} placeholder="Nhập lại mật khẩu" autoComplete="new-password" invalid={!!error} />
          </div>
          {error && <ThongBaoLoi>{error}</ThongBaoLoi>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
          </Button>
        </form>
      )}
    </KhungDangNhap>
  );
}
