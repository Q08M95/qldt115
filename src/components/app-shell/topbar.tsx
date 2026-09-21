"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChuongThongBao } from "@/components/thong-bao/chuong-thong-bao";
import { UserAvatar } from "@/components/user-avatar";
import { usePageLabels } from "./page-labels";
import { BrandLogo, NavList } from "./sidebar";
import { SEGMENT_LABELS } from "./nav-config";

export interface ShellUser {
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

const ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useBreadcrumb() {
  const pathname = usePathname();
  const dynamicLabels = usePageLabels();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    // Đoạn URL là mã (uuid): dùng tên trang tự khai báo; chưa có thì để trống (không bao giờ hiện mã thô)
    const label = dynamicLabels[href] ?? SEGMENT_LABELS[seg] ?? (ID_SEGMENT.test(seg) ? "" : decodeURIComponent(seg));
    return { label, href };
  });
  const title = crumbs.length === 0 ? "Tổng quan" : crumbs[crumbs.length - 1].label;
  return { crumbs, title };
}

// Breadcrumb khi vào trang con (vd Lớp học › Lớp ACLS-08 › Bài 3) — chỉ hiện ở desktop
function Breadcrumb({ crumbs }: { crumbs: { label: string; href: string }[] }) {
  if (crumbs.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" aria-hidden />}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/40 md:ml-1 md:border-l md:border-border md:pl-4"
          aria-label="Menu tài khoản"
        >
          <UserAvatar name={user.name} src={user.avatarUrl} className="size-10" />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block text-[15px] font-semibold">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground lg:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ho-so">
            <User /> Hồ sơ của tôi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
          <span className="dark:hidden">Chế độ tối</span>
          <span className="hidden dark:inline">Chế độ sáng</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({
  user,
  isQuanTri,
  unreadCount = 0,
}: {
  user: ShellUser;
  isQuanTri: boolean;
  unreadCount?: number;
}) {
  const router = useRouter();
  const { crumbs, title } = useBreadcrumb();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-background/85 px-4 backdrop-blur md:h-[88px] md:gap-4 md:px-7">
        {/* Mobile: hamburger (trái) — nút back nếu ở trang con + tên trang (giữa) */}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
          <Menu />
        </Button>
        {crumbs.length > 1 && (
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Quay lại" onClick={() => router.back()}>
            <ChevronLeft />
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <Breadcrumb crumbs={crumbs} />
          <h1 className="min-h-7 truncate text-lg font-semibold md:min-h-9 md:text-[28px]">{title}</h1>
        </div>

        {/* Ô tìm kiếm toàn cục — desktop; mobile thu về icon kính lúp */}
        <div className="relative hidden w-64 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" placeholder="Tìm lớp, nhân sự, mã lớp..." className="border-transparent pl-9 shadow-card" aria-label="Tìm kiếm" />
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Tìm kiếm" onClick={() => setSearchOpen(true)}>
          <Search />
        </Button>

        <Button asChild variant="outline" size="icon" className="hidden rounded-full border-transparent shadow-card md:inline-flex">
          <Link href="/lop-hoc" aria-label="Lịch dạy của tôi">
            <CalendarDays />
          </Link>
        </Button>

        {/* Chuông thông báo (mục 4.5/8.7): cần mã người dùng để nghe Realtime; trang demo không có thì hiện chuông tĩnh */}
        {user.id ? (
          <ChuongThongBao userId={user.id} soChuaDocBanDau={unreadCount} />
        ) : (
          <Button asChild variant="outline" size="icon" className="relative rounded-full border-transparent shadow-card">
            <Link href="/thong-bao" aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}>
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-grad-danger-solid text-[10px] font-medium text-white tabular-nums">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>
        )}

        <UserMenu user={user} />
      </header>

      {/* Hamburger (mobile): drawer full-height chứa toàn bộ menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-6 p-4" showCloseButton={false}>
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Điều hướng chính</SheetDescription>
            <BrandLogo />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <NavList isQuanTri={isQuanTri} onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Tìm kiếm mobile: overlay toàn màn hình */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col gap-4 bg-background p-4 md:hidden" role="dialog" aria-label="Tìm kiếm">
          <div className="flex items-center gap-2">
            <Input autoFocus type="search" placeholder="Tìm lớp, nhân sự, mã lớp..." aria-label="Tìm kiếm" />
            <Button variant="ghost" size="icon" aria-label="Đóng tìm kiếm" onClick={() => setSearchOpen(false)}>
              <X />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Kết quả sẽ gộp theo loại: Lớp / Nhân sự.</p>
        </div>
      )}
    </>
  );
}
