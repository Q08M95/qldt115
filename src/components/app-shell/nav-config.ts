import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Chỉ hiện với Admin / người giữ Quyền Quản lý lớp
  quanTriOnly?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Thứ tự hiển thị theo CLAUDE.md mục 8.5b (khác thứ tự số mục 4.x):
// 2 nhãn như ảnh mẫu (MENU / ORDER): MENU (Tổng quan đứng đầu + 5 mục quản lý) → HỆ THỐNG.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { href: "/", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/lop-hoc", label: "Lớp học", icon: GraduationCap },
      { href: "/dang-ky", label: "Đăng ký giảng dạy", icon: ClipboardCheck },
      { href: "/nhan-su", label: "Nhân sự", icon: Users },
      { href: "/danh-gia", label: "Đánh giá chất lượng", icon: Gauge },
      { href: "/bao-cao", label: "Báo cáo", icon: BarChart3 },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/thong-bao", label: "Thông báo", icon: Bell },
      { href: "/nhat-ky", label: "Nhật ký hệ thống", icon: ScrollText, quanTriOnly: true },
      { href: "/cau-hinh", label: "Cấu hình hệ thống", icon: Settings, quanTriOnly: true },
    ],
  },
];

// Bottom tab bar mobile (mục 8.9): 4 mục GV/TG dùng nhiều nhất. "Lịch dạy" là lối vào Lớp học + Đăng ký trên mobile.
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Trang chủ", icon: LayoutDashboard },
  { href: "/lop-hoc", label: "Lịch dạy", icon: CalendarDays },
  { href: "/thong-bao", label: "Thông báo", icon: Bell },
  { href: "/ho-so", label: "Hồ sơ", icon: User },
];

// Nhãn breadcrumb / tiêu đề trang theo đoạn đường dẫn đầu
export const SEGMENT_LABELS: Record<string, string> = {
  "lop-hoc": "Lớp học",
  "dang-ky": "Đăng ký giảng dạy",
  "nhan-su": "Nhân sự",
  "danh-gia": "Đánh giá chất lượng",
  "bao-cao": "Báo cáo",
  "thong-bao": "Thông báo",
  "nhat-ky": "Nhật ký hệ thống",
  "cau-hinh": "Cấu hình hệ thống",
  "ho-so": "Hồ sơ của tôi",
  "quan-tri": "Khu vực quản trị",
  "de-xuat": "Đề xuất nhân sự",
  "danh-muc": "Danh mục",
  design: "Design System",
};

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
