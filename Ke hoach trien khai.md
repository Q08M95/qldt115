# Kế hoạch triển khai — Dự án Quản lý Nhân sự Giảng dạy

> Dựa trên `CLAUDE.md` (tài liệu định hướng nghiệp vụ/thiết kế đã chốt). File này là **kế hoạch thi công theo giai đoạn** — dùng để bám tiến độ qua từng buổi làm việc.

## Cách dùng file này

- Mỗi lần bắt đầu buổi làm việc mới: đọc **Trạng thái tổng quan** bên dưới để biết đang ở giai đoạn nào.
- Mỗi lần hoàn thành 1 việc: tick `[x]` vào đúng dòng, cập nhật % ở bảng tổng quan.
- Các giai đoạn được sắp theo **thứ tự phụ thuộc kỹ thuật** (schema nền trước, module nghiệp vụ sau), **không theo thứ tự số mục 4.1-4.8 trong CLAUDE.md** và cũng không theo thứ tự hiển thị UI (mục 8.5b) — 2 thứ tự đó phục vụ mục đích khác (đọc hiểu nghiệp vụ / điều hướng người dùng), còn thứ tự ở đây phục vụ mục đích **cái gì cần code trước để cái sau chạy được**.
- Mỗi giai đoạn ghi rõ **tham chiếu mục trong CLAUDE.md** — khi thi công, mở lại đúng mục đó để lấy spec chi tiết (công thức, bảng giá trị khởi điểm, wireframe mô tả) thay vì đoán lại.
- Không tự ý đổi trọng số/hệ số/ngưỡng đã ghi trong CLAUDE.md khi code — mọi giá trị đó phải nằm trong bảng cấu hình DB (mục 7 + 4.8), không hardcode.

---

## Trạng thái tổng quan

| # | Giai đoạn | Trạng thái | % |
|---|---|---|---|
| 0 | Khởi tạo hạ tầng | ⬜ Chưa bắt đầu | 0% |
| 1 | Schema nền tảng & Auth & Phân quyền | ⬜ Chưa bắt đầu | 0% |
| 2 | Design System nền tảng (token + App Shell) | ⬜ Chưa bắt đầu | 0% |
| 3 | Module Nhân sự (4.1) | ⬜ Chưa bắt đầu | 0% |
| 4 | Module Lớp học (4.2) | ⬜ Chưa bắt đầu | 0% |
| 5 | Module Đăng ký giảng dạy (4.3) | ⬜ Chưa bắt đầu | 0% |
| 6 | Hệ thống KPI — engine + cấu hình (5/6/7) | ⬜ Chưa bắt đầu | 0% |
| 7 | Module Đánh giá chất lượng (4.4) | ⬜ Chưa bắt đầu | 0% |
| 8 | Module Thông báo (4.5) | ⬜ Chưa bắt đầu | 0% |
| 9 | Nhật ký hệ thống (4.6) | ⬜ Chưa bắt đầu | 0% |
| 10 | Báo cáo (4.7) + Tổng quan (4.7b) | ⬜ Chưa bắt đầu | 0% |
| 11 | Cấu hình hệ thống — hoàn thiện (4.8) | ⬜ Chưa bắt đầu | 0% |
| 12 | Responsive/Mobile polish (8.9) | ⬜ Chưa bắt đầu | 0% |
| 13 | QA, kiểm thử, deploy production | ⬜ Chưa bắt đầu | 0% |

Trạng thái dùng 1 trong 4 mức: ⬜ Chưa bắt đầu / 🟡 Đang làm / ✅ Xong / ⏸️ Tạm hoãn.

---

## Giai đoạn 0 — Khởi tạo hạ tầng

*Tham chiếu: mục 2 (Stack kỹ thuật + Quy trình phát triển & triển khai)*

- [ ] Tạo GitHub repo, push commit đầu tiên
- [ ] Khởi tạo Next.js project (App Router)
- [ ] Cài Tailwind CSS + shadcn/ui + Lucide icon
- [ ] Cài font Geist (fallback Inter)
- [ ] Tạo project Supabase (môi trường dev, free tier)
- [ ] Kết nối Supabase Auth (email/mật khẩu) vào Next.js
- [ ] Kết nối Vercel với GitHub repo (Vercel Git Integration) → xác nhận Preview Deployment tự sinh khi push
- [ ] Cấu hình biến môi trường (`.env.local` cho dev, biến môi trường Vercel cho preview/production) — không commit secret
- [ ] Cấu trúc thư mục dự án cơ bản (`app/`, `components/`, `lib/`, `types/`...)

**Điều kiện hoàn thành:** push code lên `main`, có 1 URL Preview Deployment truy cập được, đăng nhập thử bằng 1 tài khoản test tạo qua Supabase Auth thành công.

---

## Giai đoạn 1 — Schema nền tảng & Auth & Phân quyền

*Tham chiếu: mục 3 (Người dùng & vai trò)*

- [ ] Bảng `profiles` (liên kết `auth.users`): thông tin cá nhân cơ bản
- [ ] Bảng/enum **Phân quyền**: Admin/Quản lý đào tạo, Giảng viên & Trợ giảng, cờ `co_quyen_quan_ly_lop` (permission gán thêm, gán được nhiều người)
- [ ] Bảng/enum **Phân nhóm** (5 nhóm cố định): Ban giám đốc, GV là/không là bác sĩ, TG là/không là bác sĩ — trường `nhom_hien_tai` trên `profiles`
- [ ] Thiết lập Row Level Security (RLS) Supabase theo nguyên tắc: hồ sơ/KPI công khai nội bộ, riêng nhãn "nhóm" chỉ Admin/Quản lý lớp đọc được (ẩn với GV/TG ở tầng query, không chỉ ẩn ở UI)
- [ ] Middleware/guard phân quyền route (Next.js) theo 3 vai trò
- [ ] Cơ chế tự duyệt (self-approval flag) — chuẩn bị field/logic đánh dấu khi người giữ Quyền Quản lý lớp tự duyệt chính mình (dùng ở giai đoạn 5)

**Điều kiện hoàn thành:** tạo được user với đủ 3 loại phân quyền, RLS chặn đúng — GV/TG query không lấy được cột nhóm của người khác.

---

## Giai đoạn 2 — Design System nền tảng (token + App Shell)

*Tham chiếu: mục 8.1 → 8.5b*

- [ ] Khai báo design token Tailwind (màu 4 màu gốc + semantic token) theo bảng 8.1
- [ ] Dark mode: cấu hình `next-themes` hoặc tương đương, token dark theo bảng 8.1b, toggle lưu localStorage + theo `prefers-color-scheme`
- [ ] Typography scale (8.2), spacing/bo góc/shadow (8.3)
- [ ] Component chuẩn dựng bằng shadcn/ui, tùy biến theo 8.5: Button (4 biến thể), Badge/Pill, Card (kèm dropdown menu "..." dùng chung), Data table, Form/Input, Modal/Drawer, Avatar (bo góc + fallback gradient theo hash tên), Empty state
- [ ] App Shell (8.5b): Sidebar desktop (menu nhóm TỔNG QUAN/QUẢN LÝ/HỆ THỐNG theo đúng thứ tự UI), Topbar (breadcrumb, tìm kiếm toàn cục, icon lịch, bell, avatar menu)
- [ ] Responsive App Shell (8.9): bottom tab bar + hamburger menu cho mobile, breakpoint `md`

**Điều kiện hoàn thành:** có 1 trang demo trống dựng đủ App Shell + bộ component mẫu, chạy đúng cả desktop/mobile/dark mode, chưa cần dữ liệu thật.

---

## Giai đoạn 3 — Module Nhân sự (4.1)

*Tham chiếu: mục 4.1, danh mục liên quan ở 4.8*

- [ ] Danh mục cấu hình trước (phục vụ module này): chuyên môn, loại chứng chỉ
- [ ] Bảng hồ sơ nhân sự đầy đủ: chuyên môn/bằng cấp, kinh nghiệm, danh mục chứng chỉ (số, nội dung, ngày cấp, nơi cấp, hình ảnh minh chứng)
- [ ] Trạng thái tham gia giảng dạy (Đang tham gia/Tạm ngừng/Không còn tham gia) + logic ẩn khỏi đăng ký slot/matching khi không "Đang tham gia"
- [ ] Màn hình danh sách Nhân sự (data table, filter nhóm chỉ Admin thấy)
- [ ] Màn hình chi tiết hồ sơ (2 cột: thông tin cá nhân | Bảng KPI — cột KPI để trống/placeholder, hoàn thiện ở giai đoạn 7)
- [ ] Lịch sử giảng dạy (khung dữ liệu — nội dung thật đổ vào khi có giai đoạn 5/6)
- [ ] Lịch sử thay đổi nhóm (khung dữ liệu, dùng ở giai đoạn 6 khi có cơ chế đổi nhóm)
- [ ] Đề xuất nhân sự — màn hình danh sách đề xuất cần duyệt (khung, nội dung đổ dần ở các giai đoạn sau)

**Điều kiện hoàn thành:** CRUD hồ sơ nhân sự hoạt động đầy đủ, đúng phân quyền xem/sửa, đúng nguyên tắc ẩn nhãn nhóm với GV/TG.

---

## Giai đoạn 4 — Module Lớp học (4.2)

*Tham chiếu: mục 4.2, danh mục nhóm lớp ở 4.8*

- [ ] Danh mục nhóm lớp (kèm hệ số D1 gắn sẵn từng nhóm), danh mục loại kinh phí
- [ ] Bảng `classes` (Lớp): tên, nhóm lớp, đối tượng, loại kinh phí, nhóm đủ điều kiện đăng ký, chứng chỉ yêu cầu thêm, ngày bắt đầu-kết thúc, địa điểm, trạng thái lớp
- [ ] Bảng `lessons` (Bài): thuộc lớp, nội dung/tên bài, ngày-giờ cụ thể
- [ ] Bảng `slots` (slot nhân sự theo Bài): vai trò, số lượng, trạng thái slot (Trống/Đang chờ duyệt/Đã phân công)
- [ ] Logic trạng thái lớp "Đã đủ đăng ký" — derived, không nhập tay
- [ ] Màn hình danh sách Lớp (card grid, badge nhóm lớp + trạng thái, progress bar mini theo vai trò)
- [ ] Màn hình chi tiết Lớp: progress bar đầy đủ + danh sách Bài dạng accordion/timeline, auto-collapse khi 1 người đảm nhiệm toàn bộ vai trò
- [ ] Cơ chế nhập C1 sau khi lớp "Đã hoàn thành": link khảo sát tự động (URL công khai ẩn danh, bảng phản hồi riêng, tự tính trung bình) + nhập tay % — cùng ghi đè 1 trường C1
- [ ] Nhập C3 (% đạt chuẩn đầu ra, tay) sau khi lớp hoàn thành
- [ ] Lọc danh sách lớp theo nhóm lớp

**Điều kiện hoàn thành:** tạo được 1 lớp với nhiều Bài, mỗi Bài có slot theo vai trò đúng cấu trúc, progress bar hiển thị đúng label "X/Y lượt phân công" + "Z nhân sự khác nhau".

---

## Giai đoạn 5 — Module Đăng ký giảng dạy (4.3)

*Tham chiếu: mục 4.3*

- [ ] Luồng A (chủ động đăng ký): GV/TG xem slot trống → đăng ký (hỗ trợ chọn nhiều Bài 1 lượt, lọc trước Bài trùng lịch) → Admin duyệt
- [ ] Luồng B (được mời): khi tạo Bài, chạy matching-score ngay, hiển thị danh sách xếp hạng, Admin gửi lời mời trực tiếp; GV/TG xác nhận độc lập theo từng Bài
- [ ] Giai đoạn 1 matching-score — lọc cứng: đúng nhóm đủ điều kiện, đủ chứng chỉ, đang tham gia giảng dạy, không trùng lịch
- [ ] Giai đoạn 2 matching-score — xếp hạng công bằng: percentile khối lượng giảng dạy live theo nhóm (tái dùng logic A1 percentile, tính live không dùng snapshot khóa), tie-break KPI kỳ gần nhất, nhánh riêng A4 thấp cho lớp không kinh phí, tỷ trọng 80/20 lấy từ cấu hình
- [ ] Cảnh báo pool ứng viên nhỏ khi tạo Bài (ngưỡng cấu hình)
- [ ] Cảnh báo dồn tải khi duyệt vượt ngưỡng tỷ lệ đảm nhiệm (ngưỡng cấu hình), không chặn cứng
- [ ] Kiểm tra trùng lịch (không phân biệt cùng/khác lớp)
- [ ] Ràng buộc 1 người không duyệt trùng đúng 1 slot, nhưng hợp lệ nếu khác Bài
- [ ] Sửa/hủy lớp đã có người được phân công → bắt buộc trigger thông báo (liên kết giai đoạn 8)
- [ ] Log lời mời bị từ chối (không chỉ lời mời được duyệt)
- [ ] Hiển thị công khai matching-score + progress bar cho mọi GV/TG, áp dụng cả lớp cùng nhóm lớp sắp mở tiếp theo

**Điều kiện hoàn thành:** đăng ký/duyệt/mời/từ chối chạy hết vòng đời 1 slot (Trống → Đang chờ duyệt → Đã phân công, và quay lại Trống khi bị từ chối/hủy), matching-score trả kết quả đúng thứ tự công bằng.

---

## Giai đoạn 6 — Hệ thống KPI: engine + cấu hình (mục 5/6/7)

*Tham chiếu: mục 5 (tiêu chí gốc), mục 6 (công thức tổng hợp), mục 7 (kiến trúc kỹ thuật)*

- [ ] Bảng cấu hình `nhom_tieu_chi` (A/B/C, trọng số trong công thức tổng)
- [ ] Bảng cấu hình `tieu_chi_con` (A1-A4, B1, C1-C3, trọng số trong nhóm, nguồn dữ liệu, đơn vị, Bật/Tắt)
- [ ] Bảng cấu hình `he_so_do_kho` (D1 theo nhóm lớp, D2, D3)
- [ ] Nạp giá trị khởi điểm đúng theo CLAUDE.md: 30/45/25 (B1/C/A), 40/35/25 (C2/C3/C1), 50/25/25 (A1/A2/A3), D2=×1.1, D3 GV×1.1/TG×1.0
- [ ] Engine tính điểm tổng quát (1 service dùng chung mọi nhóm/mọi cấp): lấy tiêu chí con đang Bật → trung bình có trọng số → tự phân bổ lại trọng số khi thiếu dữ liệu (trọng số động)
- [ ] Tính A1 bằng percentile rank theo nhóm (không trộn nhóm), cơ chế fallback so lịch sử 2-3 kỳ trước khi nhóm dưới ngưỡng tối thiểu (cấu hình, khởi điểm 5 người)
- [ ] Gộp C1/C2/C3 khi 1 người dạy nhiều lớp/nhiều lần dự giờ trong kỳ: trung bình cộng đơn giản (mặc định, cấu hình đổi sang trọng số theo số buổi)
- [ ] Áp hệ số D ở cấp từng Bài (D1/D2 kế thừa từ Lớp, D3 theo vai trò) nhân vào A1/C2 trước khi gộp lên điểm kỳ
- [ ] A4 lũy kế — tách hoàn toàn khỏi công thức KPI, lưu bản ghi riêng dùng cho tie-break/vinh danh/matching-score
- [ ] Quản lý kỳ đánh giá (quý): CRUD kỳ, 3 trạng thái Đang mở/Chờ duyệt/Đã đóng
- [ ] Snapshot cấu hình khi đóng kỳ — khóa cứng, không hồi tố khi cấu hình đổi sau đó
- [ ] Logic lớp dạy xuyên 2 kỳ: tính theo ngày từng buổi học, không theo ngày bắt đầu lớp
- [ ] Cơ chế đổi nhóm theo KPI: rà soát cuối kỳ người đạt X điểm/Y kỳ liên tiếp (cấu hình, khởi điểm 85/3) → sinh đề xuất trong Đề xuất nhân sự, hiệu lực từ kỳ tiếp theo
- [ ] Màn hình "Cấu hình KPI" cho Admin: sửa trọng số/hệ số, validate tổng trọng số = 100% theo từng nhóm

**Điều kiện hoàn thành:** nhập đủ dữ liệu A/B/C mẫu cho 1 kỳ test, engine ra đúng điểm KPI theo tay tính tay (đối chiếu ví dụ số cụ thể), đóng kỳ xong đổi cấu hình không ảnh hưởng điểm đã đóng.

---

## Giai đoạn 7 — Module Đánh giá chất lượng (4.4)

*Tham chiếu: mục 4.4 (cơ chế check-in chi tiết ở cuối mục)*

- [ ] Cơ chế check-in B1: nút "Tôi đã có mặt" chỉ hiện với người đã "Đã phân công" đúng slot, trong khung giờ cấu hình quanh giờ học (khởi điểm 45 phút trước)
- [ ] Tính B1 tự động theo công thức giảm tuyến tính (ngưỡng tối đa cấu hình, khởi điểm 30 phút)
- [ ] Không check-in → mặc định 0%
- [ ] Admin/Quản lý lớp chỉnh sửa thủ công điểm danh, ghi Nhật ký hệ thống (liên kết giai đoạn 9)
- [ ] Màn hình nhập C2 (rubric 4 mức) gắn theo Bài cụ thể được dự giờ — đặt trong module Nhân sự (4.1) theo đúng thiết kế "quy về đúng nơi"
- [ ] Bảng KPI cá nhân hoàn chỉnh: Stat Card + trend pill, Area/Line chart xu hướng nhiều kỳ, Radar/bar chart breakdown A/B/C, progress bar percentile (ẩn tên nhóm) hoặc fallback lịch sử bản thân, badge A4 lũy kế, progress tracker hướng tới ngưỡng đổi nhóm

**Điều kiện hoàn thành:** check-in 1 buổi học thật → B1 tự tính đúng, Bảng KPI cá nhân hiển thị đủ toàn bộ thành phần theo spec 4.4, đúng nguyên tắc ẩn nhãn nhóm.

---

## Giai đoạn 8 — Module Thông báo (4.5)

*Tham chiếu: mục 4.5*

- [ ] Bảng `notifications`, phân loại Cần hành động / Thông tin
- [ ] Bell icon + badge số chưa đọc + dropdown panel (8.7)
- [ ] Trigger tạo thông báo cho toàn bộ sự kiện đã liệt kê ở 4.5 (Bài trống mới, mời dạy, duyệt/từ chối, đổi lịch/hủy lớp, nhắc check-in, công bố KPI, kết quả đổi nhóm, sửa điểm danh, gán/thu hồi Quyền Quản lý lớp, đề xuất mới cần duyệt, lời mời bị từ chối)
- [ ] Web Push API/PWA — đăng ký subscription, gửi push thực sự (không chỉ trong-app)
- [ ] Scheduled job (Supabase pg_cron hoặc Edge Function) cho nhắc check-in đúng giờ trước mỗi Bài

**Điều kiện hoàn thành:** thực hiện 1 hành động (vd duyệt đăng ký) → người liên quan nhận thông báo trong app + push trình duyệt; job nhắc check-in tự chạy đúng giờ đã lên lịch.

---

## Giai đoạn 9 — Nhật ký hệ thống (4.6)

*Tham chiếu: mục 4.6*

- [ ] Bảng `audit_log`: người thực hiện, loại hành động, đối tượng, thời gian, giá trị trước/sau
- [ ] Ghi log cho toàn bộ hành động đã liệt kê ở 4.6 (duyệt/từ chối đăng ký có gắn nhãn tự duyệt, duyệt đề xuất, sửa/hủy lớp, đổi trạng thái tham gia, đổi cấu hình hệ thống, gán/thu hồi Quyền Quản lý lớp, sửa điểm danh, sửa hồ sơ người khác)
- [ ] Màn hình xem log: đầy đủ cho người giữ Quyền Quản lý lớp, giới hạn chỉ log liên quan bản thân cho GV/TG

**Điều kiện hoàn thành:** mọi hành động nhạy cảm ở các module trước đều để lại đúng 1 dòng log, phân quyền xem đúng.

---

## Giai đoạn 10 — Báo cáo (4.7) + Tổng quan (4.7b)

*Tham chiếu: mục 4.7, 4.7b*

- [ ] 8 báo cáo theo danh sách mục 4.7 (bảng/chart tương ứng từng báo cáo), đúng khung thời gian cho phép (tuần/tháng/quý/năm cho #3,4,5,8; chỉ theo kỳ cho #1,2,6,7)
- [ ] Nguyên tắc realtime vs snapshot: báo cáo kỳ đã đóng dùng đúng snapshot đã khóa
- [ ] Ẩn nhãn nhóm khỏi GV/TG xuyên suốt báo cáo
- [ ] Xuất Excel/PDF cho báo cáo #1,3,6,7 — giới hạn quyền xuất cho Admin/Quyền Quản lý lớp
- [ ] Trang Tổng quan Admin/Quản lý lớp: KPI stat card + sparkline, bảng việc cần duyệt, area/bar/donut/gauge theo spec 4.7b
- [ ] Trang Tổng quan GV/TG: tổng quan toàn đơn vị (không chỉ cá nhân), lịch dạy sắp tới dạng mini-calendar/timeline, progress KPI cá nhân rút gọn, thông báo mới nhất, thẻ gợi ý lớp
- [ ] Người giữ Quyền Quản lý lớp thấy cả 2 bộ widget cùng lúc

**Điều kiện hoàn thành:** cả 8 báo cáo lấy đúng số liệu thật từ dữ liệu đã có ở các giai đoạn trước, Tổng quan tải nhanh và đúng nguyên tắc phân quyền/ẩn nhãn nhóm.

---

## Giai đoạn 11 — Cấu hình hệ thống (4.8), hoàn thiện

*Tham chiếu: mục 4.8 (nhiều mục đã dựng rải rác ở các giai đoạn trước — giai đoạn này gom lại thành 1 màn hình thống nhất)*

- [ ] Màn hình "Hệ số độ khó" gộp D1 (bảng con theo nhóm lớp) + D2 + D3 trên cùng 1 màn hình
- [ ] Ngưỡng tối đa chấm B1, khung giờ check-in
- [ ] Rubric C2 (mô tả 4 mức)
- [ ] Toàn bộ danh mục: chuyên môn, loại chứng chỉ, nhóm lớp (kèm D1), loại kinh phí
- [ ] Kỳ đánh giá (đã dựng ở giai đoạn 6, kiểm tra lại UI đúng vị trí này)
- [ ] Ngưỡng đổi nhóm theo KPI (X/Y)
- [ ] Ngưỡng tối thiểu nhóm để dùng percentile A1
- [ ] Ngưỡng cảnh báo dồn tải, ngưỡng cảnh báo pool nhỏ, tỷ trọng matching-score 80/20
- [ ] Phương pháp gộp C1/C2/C3 (đơn giản/theo trọng số buổi dạy)
- [ ] Form chia section/tab, nút Lưu sticky, validate realtime tổng trọng số = 100%

**Điều kiện hoàn thành:** đổi 1 giá trị bất kỳ trong màn hình này → toàn hệ thống dùng giá trị mới ngay từ kỳ tiếp theo, không cần sửa code.

---

## Giai đoạn 12 — Responsive/Mobile polish (8.9)

*Tham chiếu: mục 8.9 — nhiều phần đã làm nền từ giai đoạn 2, giai đoạn này rà soát toàn bộ module đã xong*

- [ ] Data table → card list dưới `md` cho toàn bộ màn hình danh sách
- [ ] Drawer → full-screen overlay dưới `md`
- [ ] KPI Stat Card row → carousel vuốt ngang
- [ ] Radar chart → 3 progress bar dọc trên mobile
- [ ] Lịch dạy → list "Hôm nay/Ngày mai/Tuần này" trên mobile
- [ ] Touch target tối thiểu 44×44px toàn bộ nút mobile
- [ ] Banner/FAB check-in nổi bật đầu Trang chủ khi có Bài trong khung giờ check-in
- [ ] Test thật trên điện thoại qua Preview Deployment (không chỉ giả lập DevTools)

**Điều kiện hoàn thành:** dùng thử toàn bộ luồng chính (đăng ký slot, check-in, xem thông báo, xem KPI) trên điện thoại thật, không gặp vỡ layout hay thao tác khó bấm.

---

## Giai đoạn 13 — QA, kiểm thử, deploy production

*Tham chiếu: mục 2 (quy trình phát triển & triển khai)*

- [ ] Kiểm thử toàn bộ luồng nghiệp vụ chính đầu-cuối (tạo lớp → tạo Bài → đăng ký/mời → duyệt → check-in → tính KPI → xem báo cáo)
- [ ] Kiểm tra lại toàn bộ RLS/phân quyền theo mục 3 (đặc biệt: ẩn nhãn nhóm, giới hạn xem Nhật ký hệ thống)
- [ ] Kiểm tra dark mode toàn bộ màn hình
- [ ] Tạo project Supabase production riêng (tách khỏi dev/staging)
- [ ] Merge vào `main`, xác nhận Vercel tự deploy bản production
- [ ] Cấu hình biến môi trường production (trỏ đúng Supabase production)
- [ ] Migrate/seed dữ liệu danh mục khởi điểm (nhóm lớp, chuyên môn, chứng chỉ...) cho môi trường production
- [ ] Tạo tài khoản Admin đầu tiên trên production

**Điều kiện hoàn thành:** hệ thống chạy ổn định trên URL production, dữ liệu tách biệt hoàn toàn khỏi môi trường dev.

---

## Ghi chú vận hành kế hoạch

- Giai đoạn 6 (KPI engine) phụ thuộc dữ liệu từ giai đoạn 3/4/5/7 — có thể bắt đầu dựng schema/engine sớm hơn (song song giai đoạn 4-5) nhưng chỉ test được đầy đủ sau khi giai đoạn 7 xong phần check-in.
- Giai đoạn 8 (Thông báo) và giai đoạn 9 (Nhật ký hệ thống) có nhiều trigger nằm rải trong giai đoạn 3-7 — khi thi công các giai đoạn đó, nên tạo sẵn "hook" gọi thông báo/log dù chưa hoàn thiện module 8/9, tránh phải quay lại sửa nhiều nơi sau này.
- Nếu phát sinh thay đổi nghiệp vụ giữa chừng, cập nhật `CLAUDE.md` trước, rồi mới phản ánh lại vào kế hoạch này — `CLAUDE.md` luôn là nguồn sự thật (source of truth) về nghiệp vụ, file này chỉ là lịch thi công.
