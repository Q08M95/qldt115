import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Các route không cần đăng nhập (khảo sát C1 công khai sẽ bổ sung ở Giai đoạn 4)
// /design (trang demo Design System) chỉ public khi chạy dev, không bao giờ public ở production
const PUBLIC_PATHS = process.env.NODE_ENV === "production" ? ["/login"] : ["/login", "/design"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Xác thực bằng getClaims(): kiểm tra chữ ký JWT ngay tại server (khóa ES256 của project) nên KHÔNG gọi mạng
  // tới Supabase Auth mỗi request như getUser(); vẫn tự làm mới session khi token sắp hết hạn.
  // Guard phân quyền theo vai trò nằm ở requireSession/requireQuanTri (src/lib/auth/session.ts).
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
