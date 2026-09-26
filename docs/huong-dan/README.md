# Tài liệu "Hướng dẫn sử dụng" — cách cập nhật

File PDF: `huong dan su dung.pdf` (ở thư mục gốc dự án), dựng từ các file Markdown trong `docs/huong-dan/nguon/`.

## Dựng lại PDF

```
node docs/huong-dan/build.mjs
```

Cần Chrome đã cài (mặc định `C:/Program Files/Google/Chrome/Application/chrome.exe`, đổi bằng biến môi trường `CHROME_PATH`) và `pdftotext` (để điền số trang vào mục lục).

## Thêm ảnh chụp minh họa

1. Chụp màn hình đúng như mô tả ở bảng bên dưới.
2. Lưu file vào `docs/huong-dan/anh/` với **tên = mã ảnh** và đuôi `.png`, `.jpg` hoặc `.webp` (ví dụ `3.2.png`).
3. Chạy lại lệnh dựng PDF. Khung ảnh trống có mã đó sẽ tự được thay bằng ảnh.

Gợi ý: chụp ảnh trên máy tính rộng khoảng 1200 px, ảnh điện thoại chụp dọc. Che (làm mờ) thông tin thật nếu không muốn lộ. Dùng tài khoản demo khi chụp.

## Sửa nội dung

Sửa trực tiếp file `.md` rồi chạy lại. Ký hiệu đặc biệt:

- `![Ảnh 3.2 — Mô tả](3.2)`: chỗ chèn ảnh (mã ảnh nằm trong ngoặc tròn).
- `> **Lưu ý:** ...`, `> **Mẹo:** ...`, `> **Quan trọng:** ...`, `> **Ví dụ:** ...`, `> **Chưa có:** ...`: khung màu.
- `<!--PB-->`: ngắt trang.
- Tiêu đề chương phải theo dạng `# Chương N — Tên` hoặc `# Phụ lục X — Tên`.

**Khi giao diện hoặc quy định nghiệp vụ thay đổi, phải rà lại các chương liên quan** (tên nút, tên menu, giá trị khởi điểm) và tăng số phiên bản ở `build.mjs` (`PHIEN_BAN`).

## Danh sách ảnh cần chụp (25 ảnh)

| Mã ảnh | Mô tả | Thuộc mục |
|---|---|---|
| 1.1 | Sơ đồ tổng quan: lớp gồm nhiều Bài, mỗi Bài gồm nhiều slot | 1.5 Vòng đời của một lớp học |
| 2.1 | Màn hình đăng nhập | 2.1 Đăng nhập |
| 2.2 | Menu ảnh đại diện và nút Đổi mật khẩu trong hồ sơ | 2.2 Đổi mật khẩu và xem hồ sơ của bạn |
| 2.3a | Giao diện trên máy tính | 2.3 Làm quen với khung giao diện |
| 2.3b | Giao diện trên điện thoại (thanh 4 nút đáy màn hình và nút ☰) | 2.3 Làm quen với khung giao diện |
| 2.4 | Các bước thêm trang web vào màn hình chính iPhone | 2.4 Cài trang web lên điện thoại như một ứng dụng |
| 3.1 | Trang Tổng quan của giảng viên/trợ giảng | 3.1 Trang Tổng quan (trang chủ) |
| 3.2 | Danh sách lớp học và bộ lọc | 3.2 Xem danh sách lớp |
| 3.3 | Trang chi tiết lớp: danh sách Bài và các slot | 3.3 Xem chi tiết một lớp |
| 3.4a | Chọn nhiều Bài và bấm "Đăng ký các Bài đã chọn" | 3.4 Đăng ký dạy |
| 3.5 | Lời mời cần bạn phản hồi, nút Đồng ý và Từ chối | 3.5 Nhận lời mời dạy |
| 3.6 | Lịch dạy của tôi (lịch tháng) | 3.6 Trang "Đăng ký giảng dạy" và lịch dạy của bạn |
| 3.7 | Banner check-in trên trang Tổng quan | 3.7 Check-in khi đến buổi dạy |
| 3.8 | Trang Thông báo và mục Cài đặt thông báo | 3.8 Thông báo |
| 3.9 | Hồ sơ cá nhân và form Thêm chứng chỉ | 3.9 Hồ sơ cá nhân |
| 3.11 | Trang Báo cáo | 3.11 Xem báo cáo toàn đơn vị |
| 4.1 | Bảng KPI cá nhân: điểm tổng và ba nhóm A, B, C | 4.3 Công thức tổng |
| 5.1 | Trang Tổng quan của Admin | 5.1 Trang Tổng quan của quản lý |
| 5.2 | Cửa sổ Tạo lớp học | 5.2 Tạo một lớp học |
| 5.3 | Cửa sổ Thêm Bài | 5.3 Thêm các Bài vào lớp |
| 5.4 | Gợi ý nhân sự cho một Bài và nút Mời | 5.4 Mời người dạy (gợi ý và xếp hạng) |
| 5.5 | Khối "Đăng ký chờ duyệt" và các nút Duyệt, Từ chối | 5.5 Duyệt đăng ký |
| 5.7 | Khối kết quả lớp: link khảo sát và ô nhập C1, C3 | 5.7 Sau khi lớp hoàn thành: nhập kết quả C1 và C3 |
| 5.9 | Hồ sơ một nhân sự với các nút quản trị | 5.9 Quản lý nhân sự |
| 5.13 | Trang Cấu hình hệ thống | 5.13 Cấu hình hệ thống |
