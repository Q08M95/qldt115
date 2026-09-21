import type { MetadataRoute } from "next";

// PWA tối thiểu để iPhone/iPad "Thêm vào Màn hình chính" và nhận Web Push (mục 4.5). Màu theo brand (mục 8.1).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý Nhân sự Giảng dạy",
    short_name: "QLĐT",
    description: "Quản lý nhân sự giảng dạy, lớp học, đăng ký và đánh giá chất lượng",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F3F4F1",
    theme_color: "#14468A",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
