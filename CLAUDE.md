# CLAUDE.md — Dự án Quản lý Nhân sự Giảng dạy (Nhân sự + Lớp học)

> Tài liệu định hướng dự án cho Claude Code / Antigravity khi làm việc trên codebase này.
> Trạng thái: **Phạm vi nghiệp vụ hoàn chỉnh** — sẵn sàng cho bước thiết kế schema Supabase/wireframe.

---

## Quy tắc bắt buộc khi thi công

Mọi công việc trên dự án này phải bám sát đồng thời **3 tài liệu**:
- `CLAUDE.md` (file này) — nguồn sự thật duy nhất về nghiệp vụ và thiết kế
- `Ke hoach trien khai.md` — lịch thi công theo giai đoạn; tham chiếu để biết đang ở giai đoạn nào và tiếp theo cần làm gì, cập nhật tick/trạng thái sau mỗi buổi làm việc
- `tham khao theme.jpeg` — ảnh chụp mẫu giao diện gốc (ProSale Sales Overview), là căn cứ hình ảnh duy nhất cho mục 8 (Thiết kế UI/UX)

**Riêng khi xây dựng bất kỳ màn hình UI/UX nào:** trước khi bắt tay code và sau khi dựng xong, phải **đối chiếu lại trực tiếp với `tham khao theme.jpeg`** (không chỉ đọc mô tả text ở mục 8) để xác nhận màu sắc, gradient, bo góc, shadow, bố cục card, kiểu chart, mật độ thông tin... thực sự đồng bộ với ảnh gốc — tránh tình trạng mô tả ở mục 8 đúng nhưng lúc code lại lệch phong cách so với ảnh mẫu ban đầu (mẫu tham khảo 1 đằng, thiết kế ra 1 nẻo).

---

## 1. Tổng quan dự án

Web app nội bộ cho một **tổ đào tạo**, kết hợp 2 mảng:
- **Nhân sự** — quản lý đội ngũ giảng viên/trợ giảng (nhân sự cơ hữu)
- **Lớp học** — quản lý lớp học theo nghĩa hẹp, KHÔNG phải nền tảng học online có video bài giảng

**3 mục tiêu cốt lõi:**
1. Quản lý tập trung đội ngũ giảng viên/trợ giảng (hồ sơ, năng lực, lịch sử giảng dạy)
2. Chuẩn hóa quy trình đăng ký và phân công giảng dạy cho từng lớp học
3. Theo dõi, đánh giá chất lượng theo thời gian để ra quyết định (KPI, đề xuất phân công/đào tạo bồi dưỡng)

**Ngoài phạm vi (explicit out-of-scope):**
- Lương/thù lao, chấm công tính lương — đã có hệ thống khác quản lý
- Hợp đồng lao động/cộng tác (file, thời hạn) — không cần quản lý ở đây
- Vai trò học viên (không có tài khoản học viên trong hệ thống)
- Cơ chế khiếu nại KPI chính thức (v1 không cần, trọng tâm là vận hành luồng đăng ký giảng dạy)

---

## 2. Stack kỹ thuật

| Thành phần | Công cụ |
|---|---|
| AI coding | Claude Code + Antigravity |
| Frontend framework | Next.js |
| Backend / Database | Supabase |
| Authentication | Supabase Auth — email/mật khẩu |
| Styling | Tailwind CSS |
| Component primitives | shadcn/ui (dựng trên Radix UI) |
| Icon | Lucide |
| Deploy | Vercel |
| Version control | GitHub |

**Yêu cầu bắt buộc:** Web phải **responsive/mobile-friendly** — giảng viên/trợ giảng nhiều khả năng thao tác đăng ký lớp, xem lịch từ điện thoại chứ không chỉ máy tính. Thiết kế UI (mục 8) phải tính đến việc bảng dữ liệu, lịch/calendar hiển thị tốt trên màn hình nhỏ.

### Quy trình phát triển & triển khai

Khuyến nghị **triển khai liên tục ngay từ đầu**, không đợi "làm xong hết ở local rồi mới đưa lên mạng":

1. Tạo GitHub repo ngay từ đầu dự án, push code thường xuyên
2. Kết nối Vercel với GitHub repo ngay từ đầu (Vercel Git Integration) → mỗi lần push sẽ tự có 1 **Preview Deployment** (link riêng trên internet), không cần đợi hoàn thiện mới deploy — điều này còn giúp test responsive/mobile trên điện thoại thật dễ dàng hơn nhiều so với chỉ giả lập trên máy tính
3. Local dev: chạy `next dev` trên máy, kết nối tới project Supabase (tạo project Supabase ngay từ đầu, dùng free tier)
4. Khi ổn định, merge vào nhánh `main` → Vercel tự động deploy bản chính thức (production)
5. Về lâu dài, nên tách **2 project Supabase riêng** (dev/staging và production) để tránh việc code/test làm ảnh hưởng dữ liệu thật khi hệ thống đã vận hành

---

## 3. Người dùng & vai trò

**Phân quyền** (ai làm được gì) và **Phân nhóm** (xếp hạng năng lực cho KPI/matching) là 2 thuộc tính độc lập trên cùng 1 hồ sơ, không phụ thuộc nhau.

### Phân quyền

| Vai trò | Quyền hạn |
|---|---|
| **Admin / Quản lý đào tạo** | Toàn quyền: tạo lớp, duyệt đăng ký, duyệt đề xuất nhân sự, xem báo cáo, quản lý hồ sơ, cấu hình hệ thống |
| **Giảng viên & Trợ giảng** | Ngang quyền: xem slot trống, đăng ký dạy, xem lịch cá nhân, xem điểm đánh giá, cập nhật hồ sơ |
| **Quyền Quản lý lớp** | Permission Admin gán thêm cho người đang có hồ sơ GV/TG — nhận toàn quyền Admin (trừ chỉnh sửa/build web) song song với hồ sơ GV/TG. Gán được cho nhiều người cùng lúc (hiện tại đơn vị chỉ đang gán cho 1 người) |

**Quyền riêng tư:** hồ sơ và KPI công khai toàn bộ trong nội bộ, không giới hạn chỉ xem của bản thân. **Ngoại lệ duy nhất — nhãn "nhóm" (5 nhóm, mục dưới):** không hiển thị cho GV/TG dù vẫn dùng ngầm cho mọi logic hệ thống (percentile, matching-score, điều kiện đăng ký), chỉ Admin/Quản lý lớp xem được nhãn nhóm đầy đủ — tránh cảm giác bị xếp hạng/phân biệt (chi tiết mục 4.7).

**Tự duyệt (self-approval):** hiện chỉ 1 người giữ Quyền Quản lý lớp, không có ai xử lý thay khi họ tự liên quan đến quyết định của chính mình:
- Tự duyệt đăng ký của chính mình → không chặn, gắn nhãn riêng trong Nhật ký hệ thống (mục 4.6)
- Tự chấm dự giờ (C2) cho chính mình → luôn ở trạng thái "không có dữ liệu", áp dụng trọng số động (mục 6)
- Nếu sau này có ≥2 người giữ quyền này, route các trường hợp trên cho người còn lại xử lý thay vì tự duyệt

### Phân nhóm (5 nhóm theo cấp bậc năng lực)

Mỗi người thuộc đúng 1 nhóm cố định:

| Nhóm | Vai trò trong lớp |
|---|---|
| Ban giám đốc | Giảng viên |
| Giảng viên là bác sĩ | Giảng viên |
| Giảng viên không là bác sĩ | Giảng viên |
| Trợ giảng là bác sĩ | Trợ giảng |
| Trợ giảng không là bác sĩ | Trợ giảng |

Nhóm quyết định slot đăng ký được (Giảng viên/Trợ giảng), là cơ sở so sánh percentile A1 (mục 6) và 1 yếu tố trong matching-score (mục 4.3). "Ban giám đốc" gắn theo chức vụ hành chính (bổ nhiệm/miễn nhiệm), không qua cơ chế đổi nhóm theo KPI bên dưới.

### Cơ chế đổi nhóm

"Là bác sĩ" là thuộc tính cố định (bằng cấp y khoa có sẵn từ trước), không đạt được qua thăng tiến nội bộ — nên cơ chế đổi nhóm chỉ có **1 trường hợp**: thăng/giáng **Trợ giảng ↔ Giảng viên trong cùng nhánh bác sĩ/không bác sĩ** theo KPI (không áp dụng nhóm Ban giám đốc).

- Cuối mỗi kỳ, hệ thống rà soát người đạt **KPI ≥ ngưỡng X điểm, liên tục Y kỳ** → xuất hiện như đề xuất trong "Đề xuất nhân sự" (module Nhân sự), Admin duyệt/bỏ qua thủ công — không tự động áp dụng
- X, Y cấu hình qua giao diện Admin, không hardcode. Giá trị khởi điểm: **X ≥ 85 điểm, Y = 3 kỳ liên tiếp**
- Lưu lịch sử mọi thay đổi đã duyệt: nhóm cũ, nhóm mới, ngày hiệu lực, người duyệt (phục vụ Nhật ký hệ thống, mục 4.6)

**Thời điểm áp dụng:** nhóm mới có hiệu lực từ **kỳ đánh giá tiếp theo**, kỳ đang tính dở vẫn dùng nhóm cũ (nhất quán nguyên tắc không hồi tố đã áp dụng cho cấu hình KPI, mục 7).

---

## 4. Kiến trúc module

### 4.1 NHÂN SỰ
Phạm vi: hồ sơ nhân sự, trạng thái tham gia giảng dạy, lịch sử giảng dạy, đánh giá hiệu suất (KPI), đề xuất nhân sự.

- **Hồ sơ nhân sự:** thông tin cá nhân, **chuyên môn** (trình độ/bằng cấp chi tiết: bác sĩ, điều dưỡng, thạc sĩ, cử nhân...), kinh nghiệm, danh mục chứng chỉ (số, nội dung — chọn từ danh mục loại chứng chỉ đã cấu hình sẵn, mục 4.8, để nhất quán khi dùng làm điều kiện lớp có yêu cầu chứng chỉ; ngày cấp, nơi cấp, hình ảnh minh chứng); **nhóm hiện tại** (1 trong 5 nhóm, mục 3 — Admin xác định dựa trên chuyên môn, không phải cờ tự động suy ra); quyền Quản lý lớp nếu có (mục 3, cờ độc lập với nhóm). **Chứng chỉ không đưa vào công thức KPI**, dùng làm điều kiện đăng ký lớp có yêu cầu chứng chỉ + tiêu chí ưu tiên trong matching-score (mục 4.3)

- **Điều kiện đăng ký lớp theo nhóm (liên kết module Lớp học, mục 4.2):** thay vì lưu "môn/lớp được phép dạy" như danh sách tự do trên từng hồ sơ cá nhân, điều kiện này gắn ở **cấp lớp học** — khi tạo 1 lớp mới, Admin/Quản lý lớp chọn **nhóm nào (trong 5 nhóm) đủ điều kiện đăng ký** cho lớp đó (vd lớp ALS chỉ mở cho "Giảng viên là bác sĩ" + "Trợ giảng là bác sĩ"), chứng chỉ yêu cầu thêm (nếu lớp cần) là điều kiện lọc thêm bên trong nhóm đã đủ điều kiện

- **Trạng thái tham gia giảng dạy:** Đang tham gia / Tạm ngừng tham gia / Không còn tham gia — phản ánh việc có đang hoạt động trong hệ thống đăng ký/giảng dạy này hay không, **không phải trạng thái lao động/hợp đồng** (do hệ thống nhân sự khác quản lý, mục 1). Khi không "Đang tham gia": ẩn khỏi danh sách đăng ký slot mới và matching-score, nhưng **giữ nguyên lịch sử KPI/hồ sơ** để tra cứu sau này

- **Lịch sử giảng dạy:** các lớp đã dạy, số tiết, số giờ/buổi, thời gian, tần suất — ghi chi tiết hoạt động giảng dạy của từng người; lịch sử thay đổi nhóm (nhóm cũ/mới, ngày hiệu lực, người duyệt — mục 3); A4 lũy kế (số lớp không kinh phí đã nhận, theo kỳ và toàn thời gian — mục 6, dùng cho tie-break khen thưởng/vinh danh/matching-score)

- **Đánh giá hiệu suất (KPI):** xem mục 6

- **Đề xuất nhân sự:** nơi tổng hợp các đề xuất cần Admin duyệt — tăng/giảm phân công, cử đào tạo bồi dưỡng, khen thưởng/nhắc nhở, và đề xuất đổi nhóm theo KPI (mục 3)

### 4.2 LỚP HỌC
Phạm vi: quản lý lớp học (không phải nền tảng học online).

- **Lớp học (Class):** tên lớp, **nhóm lớp** (loại khóa học cụ thể: ABCDE, ACLS, BLS, SCC-LX, SCC-CĐ... — danh mục cấu hình qua giao diện, mục 4.8, mỗi nhóm lớp gắn sẵn 1 hệ số D1 thay vì chọn tay "cơ bản/chuyên sâu/mới" mỗi lần tạo lớp), **đối tượng** (Nhân viên y tế / Cộng đồng), **loại kinh phí** (có kinh phí / không kinh phí — dùng cho A4, D2), **nhóm đủ điều kiện đăng ký** (1 hoặc nhiều trong 5 nhóm nhân sự, mục 3 — thay cho việc lưu "môn được phép dạy" trên hồ sơ cá nhân, mục 4.1), chứng chỉ yêu cầu thêm (nếu cần), ngày bắt đầu - kết thúc, địa điểm

"Đối tượng" và "Loại kinh phí" là **2 thuộc tính độc lập**, không suy ra lẫn nhau (1 lớp Cộng đồng vẫn có thể có kinh phí tài trợ).

- **Giáo trình = kế hoạch giảng dạy chi tiết theo Bài:** 1 lớp gồm nhiều **Bài** (lesson) — mỗi Bài có nội dung/tên bài, ngày-giờ cụ thể (1 buổi học), và **số slot nhân sự cần theo vai trò RIÊNG cho từng Bài** (không áp dụng chung cho cả lớp — vd Bài lý thuyết cần 1 Giảng viên, Bài thực hành cần 1 Giảng viên + 3 Trợ giảng). Bài là đơn vị dùng cho: **kiểm tra trùng lịch** (mục 4.3), **tính A1** (mục 6), **chấm điểm danh B1** (mục 5)

**Mô hình xử lý (vì slot gắn ở cấp Bài, 1 người đăng ký được nhiều Bài khác nhau trong cùng 1 lớp):**

- **Đơn vị nhỏ nhất là "slot"** = 1 vị trí cần lấp cho 1 vai trò trong 1 Bài cụ thể (vd Bài 2 cần {Giảng viên: 1, Trợ giảng: 3} → 4 slot độc lập thuộc Bài 2). Đăng ký & Phân công (mục 4.3) hoạt động ở cấp slot này — matching-score, duyệt, trùng lịch đều xét theo từng slot/Bài. **Ràng buộc:** 1 người không được duyệt 2 lần cho **cùng 1 slot** (cùng Bài + cùng vai trò + cùng vị trí — lỗi trùng lặp, phải chặn); nhưng 1 người được duyệt cho **nhiều slot khác Bài** là hợp lệ (không phải trùng lặp)

- **Không có 1 con số "số nhân sự cần cho lớp" duy nhất** — vì mỗi Bài có yêu cầu khác nhau. Thay vào đó, dùng **progress bar riêng theo từng vai trò**, đặt ở 2 nơi:
  - **Danh sách lớp:** mỗi thẻ/dòng lớp hiển thị progress bar mini theo vai trò — lướt nhanh toàn danh sách để biết lớp nào đang thiếu người gấp
  - **Trang chi tiết lớp học:** progress bar đầy đủ ở đầu trang, bên dưới hiển thị toàn bộ Bài trong lớp kèm nhân sự đảm nhiệm vai trò gì ở từng Bài

  **Tránh hiểu lầm số slot = số người** (đã giải quyết): vì 1 người có thể đảm nhiệm nhiều Bài, con số "Giảng viên: 4/4" không có nghĩa là 4 giảng viên khác nhau — có thể chỉ 1 người dạy cả 4 Bài. Xử lý ở tầng hiển thị + tầng logic:
  - **Hiển thị:** label rõ ràng **"X/Y lượt phân công"** (occurrences) kèm chỉ số phụ **"Z nhân sự khác nhau tham gia"** (Z ≤ Y); ở breakdown theo Bài luôn ghi rõ tên người đảm nhiệm từng slot
  - **Auto-collapse khi chỉ 1 người đảm nhiệm toàn bộ:** nếu tất cả slot của 1 vai trò trong lớp đều do cùng 1 người đảm nhiệm, hiển thị thẳng tên người đó ("Giảng viên: Dr. A — Đã đủ") thay vì progress bar dạng số vốn không còn thêm ý nghĩa gì trong trường hợp này — chỉ dùng progress bar khi thực sự có ≥2 người khác nhau
  - **Cảnh báo mềm khi dồn tải:** khi Admin sắp duyệt khiến 1 người vượt ngưỡng tỷ lệ đảm nhiệm slot của 1 vai trò trong cùng lớp (vd >70%, ngưỡng cấu hình qua mục 4.8), hệ thống hiện cảnh báo ("Người này đã đảm nhiệm X/Y Bài trong lớp này — vẫn duyệt?") để Admin chủ động cân nhắc — không chặn cứng, vì đôi khi 1 giảng viên xuyên suốt cả khóa là chủ đích sư phạm hợp lý
  - **Matching-score khuyến khích đa dạng hóa:** khi xếp hạng ứng viên cho 1 slot còn trống (mục 4.3), nếu ứng viên đã được duyệt ở Bài khác trong CÙNG lớp rồi, hạ nhẹ điểm ưu tiên gợi ý (không loại trừ) — để hệ thống tự nhiên phân bổ đều nhân sự khi có nhiều ứng viên đủ điều kiện, thay vì luôn gợi ý lặp lại cùng 1 người mạnh nhất
- **Tiện lợi cho người đăng ký:** UI nên cho phép **chọn nhiều Bài cùng lúc để đăng ký 1 lượt** (vd "đăng ký tất cả Bài lý thuyết trong lớp X"), nhưng về dữ liệu vẫn tách thành từng lượt đăng ký slot riêng theo Bài
- **A4 (lớp không kinh phí) tính theo LỚP, không theo Bài:** "loại kinh phí" là thuộc tính của cả Lớp, áp dụng cho mọi Bài trong lớp đó (không có chuyện 1 lớp vừa có Bài có kinh phí vừa có Bài không kinh phí) — nhưng vì 1 lớp không kinh phí có thể gồm nhiều Bài, nếu tính A4 theo từng Bài thì 1 người dạy nhiều Bài trong cùng lớp sẽ bị đếm nhiều lần cho cùng 1 đóng góp. Do đó chỉ tính **1 lần A4** cho mỗi lớp không kinh phí mà người đó tham gia dạy, bất kể dạy bao nhiêu Bài trong lớp đó
- **A1, B1, conflict detection không phát sinh phức tạp thêm** — các cơ chế này vốn đã thiết kế theo buổi (Bài), nên hoạt động tự nhiên khi tổng hợp từ nhiều Bài mà 1 người đảm nhiệm, không cần thay đổi gì

- **Trạng thái lớp:** Đang mở đăng ký / Đã đủ đăng ký / Đang diễn ra / Đã hoàn thành / Đã hủy — chi phối việc mở/đóng nhận đăng ký từng Bài (mục 4.3), việc hủy/đổi lịch (mục 4.3), và chỉ cho nhập kết quả C1/C3 sau khi lớp chuyển "Đã hoàn thành". **"Đã đủ đăng ký" là trạng thái suy ra (derived)** từ việc tất cả Bài trong lớp đã đủ số người được duyệt cho mọi vai trò cần, không phải trường nhập tay

- **Kết quả sau khi hoàn thành:** % đạt chuẩn đầu ra (C3) — nhập tay % tổng hợp, gắn vào hồ sơ lớp, không cần lưu danh sách học viên (mục 5)

- **Cơ chế nhập C1 (khảo sát hài lòng) — 2 hình thức song song, Admin chọn khi lớp chuyển "Đã hoàn thành":**
  - **Hình thức 1 — Link khảo sát tự động:** hệ thống sinh 1 URL công khai (không cần đăng nhập, ẩn danh) gắn với lớp đó, gồm 1-2 câu hỏi đơn giản (rating 1-5 hoặc %) — Admin copy link gửi cho học viên qua kênh riêng ngoài hệ thống (Zalo, in QR dán ở lớp...), vì hệ thống không có tài khoản học viên (mục 3). Mỗi phản hồi lưu vào bảng riêng, **hệ thống tự tính trung bình quy đổi % ngay khi có phản hồi mới**, không cần Admin tự tính tay
  - **Hình thức 2 — Nhập tay % tổng hợp:** 1 ô nhập số đơn giản, dùng khi khảo sát được thực hiện ngoài hệ thống (giấy, kênh khác) rồi Admin tự điền % đã biết
  - Cả 2 hình thức đều ghi vào cùng 1 trường C1 của lớp — hình thức nào nhập sau cùng thắng (ghi đè), không cộng dồn 2 nguồn

### 4.3 ĐĂNG KÝ GIẢNG DẠY

**Slot nhân sự gắn ở cấp Bài (không phải cấp Lớp) — mục 4.2.** 1 slot = 1 vị trí cụ thể (1 Bài + 1 vai trò + 1 vị trí thứ mấy) — 1 Bài có thể có nhiều slot cùng vai trò nếu cần nhiều hơn 1 người (vd 3 slot Trợ giảng). 1 người có thể đăng ký/được phân công cho nhiều Bài khác nhau trong cùng 1 lớp.

**Trạng thái của 1 slot:** Trống → Đang chờ duyệt (có ≥1 đăng ký/lời mời chưa xử lý) → Đã phân công (đã duyệt đủ). **Quay lại "Trống"** nếu lời mời (Luồng B) bị từ chối, hoặc người đã được duyệt bị hủy sau đó.

**2 luồng song song, cùng dẫn tới 1 slot chuyển "Đã phân công":**
- **Luồng A (chủ động):** GV/TG xem slot trống → đăng ký (có thể chọn nhiều Bài cùng lúc để đăng ký 1 lượt, mục 4.2) → Admin duyệt từng slot
- **Luồng B (được mời) — tích hợp ngay từ lúc tạo Bài:** ngay khi Admin tạo 1 Bài (định nghĩa vai trò + số lượng cần), hệ thống lập tức chạy matching-score trên tập người đủ điều kiện và hiển thị **toàn bộ danh sách xếp hạng ngay tại đó** — Admin gửi lời mời trực tiếp từ danh sách này, không cần thao tác tìm kiếm riêng sau. GV/TG xác nhận **độc lập theo từng Bài** (có thể đồng ý 1 phần, từ chối phần còn lại). Bài bị từ chối → slot tự động quay lại "Trống", mở lại cho cả luồng A lẫn Admin mời người khác

**Cảnh báo pool ứng viên nhỏ:** nếu số người đủ điều kiện (sau lọc cứng, xem Matching-score bên dưới) dưới ngưỡng cấu hình (vd <3 người, mục 4.8), hệ thống cảnh báo nổi bật ngay lúc tạo Bài — để Admin chủ động mời sớm (Luồng B) thay vì chờ đăng ký tự nhiên (Luồng A) vốn rủi ro không ai đăng ký khi pool quá hẹp. Nếu 0 người đủ điều kiện, cảnh báo mạnh hơn kèm gợi ý xem lại điều kiện nhóm/chứng chỉ của Bài có đang quá hẹp không.

**Khi nhiều người đăng ký cùng 1 slot, hoặc cùng vai trò có nhiều slot trong 1 Bài:** hệ thống xếp hạng ứng viên qua matching-score, Admin duyệt thủ công tới khi đủ số lượng slot cần của vai trò đó trong Bài (cần xem lại ai đủ năng lực). **Slot đóng dựa trên số lượng đã ĐƯỢC DUYỆT, không phải số lượng đăng ký:** còn thiếu thì vẫn mở nhận đăng ký thoải mái, đủ rồi thì đóng, không nhận đăng ký mới.

**Matching-score — mục đích và nguyên tắc:** đề xuất nhân sự gợi ý cho Admin/Quản lý lớp gửi lời mời (Luồng B) và xếp hạng khi nhiều người đăng ký cùng slot (Luồng A). **Nguyên tắc cốt lõi là công bằng phân bổ khối lượng giảng dạy** — tránh dồn việc lên 1 người trong khi người khác quá ít, không phải "chọn người giỏi nhất" mỗi lần.

*Giai đoạn 1 — Lọc cứng* (loại khỏi danh sách ứng viên hoàn toàn, không chấm điểm):
- Thuộc đúng 1 trong các nhóm đủ điều kiện đăng ký của lớp (mục 4.2) — nguyên tắc gốc: chỉ nhân sự trong nhóm đã thống nhất khi tạo lớp mới được xét
- Đủ chứng chỉ yêu cầu (nếu Bài/lớp cần)
- Trạng thái "Đang tham gia giảng dạy" (mục 4.1)
- Không trùng lịch với Bài khác đã được duyệt

*Giai đoạn 2 — Xếp hạng theo công bằng* (trong tập đã qua lọc cứng ở trên):
- **Ưu tiên chính:** người có **khối lượng giảng dạy trong kỳ hiện tại thấp hơn** được xếp lên đầu danh sách gợi ý — tái sử dụng cơ chế percentile rank của A1 theo nhóm (mục 6), nhưng tính **live/liên tục theo dữ liệu hiện tại của kỳ đang mở**, khác với bản snapshot đã khóa dùng để tính KPI chính thức cuối kỳ (mục 7) — không được dùng nhầm số liệu đã khóa. Cách này tự nhiên bao hàm luôn việc tránh dồn nhiều Bài vào 1 người trong cùng 1 lớp, không cần tách thành yếu tố riêng
- **Tie-break** (khi khối lượng ngang nhau): điểm KPI kỳ gần nhất cao hơn được ưu tiên (mục 6) — chỉ đóng vai trò phụ, không phải tiêu chí chính
- **Riêng lớp không kinh phí:** thay ưu tiên trên bằng **A4 lũy kế THẤP hơn** (mục 4.2/6) — cùng tinh thần công bằng, chỉ khác khía cạnh (đóng góp cộng đồng thay vì khối lượng tổng)

**Tỷ trọng kết hợp:** 80% công bằng khối lượng / 20% KPI tie-break (giá trị khởi điểm, cấu hình qua giao diện Admin — mục 4.8, không hardcode) — công bằng luôn là yếu tố áp đảo, đúng nguyên tắc đã nêu.

**Không mâu thuẫn với A2/A3 (KPI):** A2/A3 (mục 5) ghi nhận **đóng góp đã qua** của 1 người (thưởng điểm cho chủ động đăng ký/nhận lời mời) để tính điểm chất lượng — còn matching-score điều phối **cơ hội trong tương lai**, ưu tiên người ít việc hơn để tránh quá tải. 2 hệ thống phục vụ 2 mục đích khác nhau, không dùng chung 1 logic nên không xung đột: 1 người có thể vừa có A2/A3 tốt (được ghi nhận), vừa ít được gợi ý thêm ở các slot mới (vì đã đủ tải) — đó là kết quả **mong muốn**, không phải lỗi.

**Công khai cho mọi người, không chỉ Admin (nhất quán nguyên tắc công khai nội bộ, mục 3):**
- **Đề xuất nhân sự/matching-score** của mỗi Bài hiển thị công khai cho tất cả GV/TG xem (không chỉ Admin thao tác mời) — mọi người thấy được ai đang được gợi ý, tăng minh bạch
- **Progress bar theo vai trò** (mục 4.2) công khai trên danh sách lớp và trang chi tiết lớp cho mọi người, không riêng Admin
- Áp dụng **cho cả lớp đang mở đăng ký lẫn lớp cùng nhóm lớp (mục 4.2) sắp mở tiếp theo** đã được tạo sẵn trong hệ thống (kể cả đang ở trạng thái "Nháp" nếu Admin muốn công khai sớm) — để GV/TG chủ động thấy trước các lớp tương tự sắp tới và sắp xếp lịch cá nhân, không phải chỉ biết khi lớp chính thức mở đăng ký
- **Danh sách lớp** nên hỗ trợ lọc theo **nhóm lớp** để người dùng dễ dàng tìm các lớp cùng loại sắp mở

**Kiểm tra trùng lịch:** nguyên tắc đơn giản — không trùng giờ với Bài khác đã được duyệt của người đó là đủ điều kiện, không phân biệt cùng lớp hay khác lớp, không cần thêm phức tạp.

**Yêu cầu kỹ thuật bắt buộc:**
- Khi đăng ký hàng loạt nhiều Bài (mục 4.2), nên **lọc trước** — ẩn/disable các Bài trùng lịch khỏi danh sách có thể chọn, thay vì để submit xong mới báo lỗi
- **Log đầy đủ:** lưu cả lời mời bị từ chối, không chỉ lời mời được duyệt (phục vụ tính A3)
- **Sửa/hủy lớp đã có người được phân công:** khi Admin đổi lịch hoặc hủy 1 lớp đã có GV/TG được duyệt, hệ thống **bắt buộc gửi thông báo** cho người liên quan (module Thông báo, mục 4.5)

### 4.4 ĐÁNH GIÁ CHẤT LƯỢNG
Công thức chi tiết ở mục 5/6/7. Module này là nơi hiển thị và thu thập dữ liệu thực tế cho công thức đó.

- **Bảng KPI cá nhân — đề xuất cách hiển thị:**
  - **KPI kỳ hiện tại:** số lớn + trend pill so kỳ trước (tăng/giảm %) — theo đúng phong cách KPI Stat Card đã tham khảo (mục 8)
  - **Xu hướng qua nhiều kỳ:** area/line chart, trục ngang là các kỳ, trục dọc 0-100 điểm — cùng phong cách chart đã tham khảo
  - **Breakdown theo nhóm A/B/C:** bar chart ngang hoặc radar chart so sánh 3 nhóm cùng lúc, giúp thấy ngay điểm mạnh/yếu (sản lượng/chuyên cần/chất lượng) — không chỉ điểm tổng, đúng tinh thần minh bạch (mục 3)
  - **Vị trí so với đồng nghiệp:** progress bar/gauge đơn giản kiểu "Đang ở top X% so với đồng nghiệp cùng vai trò và chuyên môn tương đương" (dựa trên percentile A1 theo nhóm nội bộ, mục 6, nhưng **không nêu tên nhóm** — đúng nguyên tắc ẩn nhãn nhóm, mục 4.7) — **riêng trường hợp dùng cơ chế fallback** (nhóm ít người, khả năng cao là Ban giám đốc, mục 6), đổi cách hiển thị thành so sánh với lịch sử bản thân (vd "Cao hơn/thấp hơn X% so với trung bình 2-3 kỳ trước của chính bạn"), không hiển thị "top X%" vì không có ý nghĩa percentile trong nhóm quá nhỏ
  - **A4 lũy kế:** badge/counter đơn giản, không cần chart
  - **"Dự đoán tương lai":** không cần AI/dự báo phức tạp (không tương xứng quy mô app nội bộ) — thay bằng **progress tracker hướng tới ngưỡng đổi nhóm** đã có sẵn (X điểm/Y kỳ liên tiếp, mục 3), vd "Đã đạt ngưỡng 2/3 kỳ liên tiếp — còn 1 kỳ nữa để được đề xuất thăng nhóm" — dạng "dự đoán" thực dụng, gắn thẳng vào cơ chế đã thiết kế thay vì dự đoán trừu tượng
- **Xem KPI của người khác:** công khai nội bộ (mục 3), truy cập từ hồ sơ nhân sự (mục 4.1)
- **Nhập liệu quy về đúng nơi đã thiết kế**, module này chỉ tổng hợp hiển thị: C2 nhập ở module Nhân sự (mục 4.1), C1/C3 nhập ở hồ sơ lớp sau khi hoàn thành (mục 4.2), B1 tự động từ check-in (xem dưới)

**Cơ chế điểm danh (check-in) cho B1** (đã giải quyết):
- **Chỉ người đã "Đã phân công" đúng slot của Bài đó** mới thấy/bấm được nút check-in (mục 4.3) — không phải bất kỳ GV/TG nào. GV/TG bấm nút "Tôi đã có mặt" ngay trong màn hình Bài học đang diễn ra (trên điện thoại, nhờ đã có yêu cầu responsive/mobile, mục 2) — hệ thống ghi lại thời điểm bấm, so với giờ bắt đầu Bài để tính % theo thang đã định (mục 5)
- **Giới hạn khung giờ được phép bấm:** trước giờ học **45 phút** đến sau giờ học kết thúc (nới rộng từ đề xuất ban đầu 15 phút, vì check-in ở đây phục vụ KPI nội bộ, không phải chấm công tính lương — đã có hệ thống khác quản lý chặt việc đó, mục 1 — nên không cần siết quá chặt)
- **Bắt buộc có thông báo nhắc nhở** trước giờ học (module Thông báo, mục 4.5) để tránh quên check-in dẫn đến bị 0% oan — đây là yêu cầu quan trọng, không phải tùy chọn
- **Không bấm check-in** (dù đã nhắc) → mặc định 0% theo đúng rubric đã có
- Admin/Quản lý lớp có quyền **chỉnh sửa thủ công** nếu có lỗi kỹ thuật/khiếu nại, hành động này ghi vào Nhật ký hệ thống (mục 4.6)
- Giải pháp đơn giản, phù hợp quy mô nội bộ — không cần GPS/sinh trắc học phức tạp

### 4.5 THÔNG BÁO
Trong app, **không dùng email**.

**Kiến trúc hiển thị:** bell icon + badge số chưa đọc (theo phong cách tham khảo mục 8), trung tâm thông báo dạng dropdown/trang riêng, click dẫn thẳng tới màn hình liên quan, đánh dấu đã đọc.

**Phân loại mức độ:**
- **Cần hành động:** lời mời cần xác nhận, đăng ký cần duyệt, đề xuất nhân sự cần duyệt — hiển thị nổi bật hơn, có thể kèm nút hành động nhanh ngay trong thông báo
- **Thông tin:** KPI công bố, lớp bị đổi lịch, kết quả đề xuất đổi nhóm, điểm danh bị chỉnh sửa — chỉ để biết, không cần phản hồi

**Danh sách đầy đủ sự kiện (tổng hợp từ toàn bộ tài liệu):**

*Cho Giảng viên/Trợ giảng:*
- Lớp/Bài trống mới phù hợp nhóm đủ điều kiện (mục 4.2)
- Được mời dạy (Luồng B, mục 4.3)
- Đăng ký được duyệt/từ chối (Luồng A, mục 4.3)
- Lớp đã phân công bị Admin đổi lịch/hủy (mục 4.3)
- Nhắc check-in trước giờ học (mục 4.4, bắt buộc — tránh quên dẫn đến bị 0% điểm B1 oan)
- Kỳ đánh giá mới công bố KPI (mục 4.4)
- **Kết quả đề xuất đổi nhóm của bản thân** — được duyệt hoặc không được duyệt (mục 3)
- **Điểm danh (B1) của bản thân bị Admin chỉnh sửa thủ công** (mục 4.4) — minh bạch khi có thay đổi ảnh hưởng quyền lợi
- **Được gán hoặc bị thu hồi Quyền Quản lý lớp** (mục 3) — hành động nhạy cảm, cần biết ngay

*Cho Admin/người giữ Quyền Quản lý lớp:*
- Đề xuất nhân sự mới cần duyệt — khen thưởng/đào tạo/đổi nhóm (mục 3, mục 4.1)
- Lời mời bị từ chối (để biết slot đã mở lại, cần mời người khác, mục 4.3)

**Không tính là thông báo bất đồng bộ (chỉ là cảnh báo tại chỗ, xuất hiện ngay lúc thao tác, không qua bell icon):**
- Cảnh báo pool ứng viên nhỏ — xuất hiện ngay lúc Admin tạo Bài (mục 4.3)
- Cảnh báo dồn tải — xuất hiện ngay lúc Admin duyệt slot (mục 4.2)

**Cơ chế đẩy thông báo chủ động:** dùng **push notification qua trình duyệt (Web Push API/PWA)** — không chỉ hiển thị passive trong app, để đảm bảo "nhắc check-in trước giờ học" và các thông báo cần hành động khác thực sự đến được người dùng đúng lúc, kể cả khi không mở app.

**Yêu cầu kỹ thuật:** các thông báo theo giờ (nhắc check-in) cần cơ chế **lên lịch tự động** (scheduled job — vd Supabase pg_cron hoặc Edge Function) để kích hoạt đúng thời điểm trước mỗi Bài, khác với các thông báo sự kiện tức thời khác (duyệt/từ chối/mời...) vốn kích hoạt ngay khi hành động xảy ra.

### 4.6 NHẬT KÝ HỆ THỐNG

**Cấu trúc 1 bản ghi log:** người thực hiện, loại hành động, đối tượng bị tác động, thời gian, **giá trị trước/sau** — đặc biệt quan trọng với thay đổi cấu hình (cần biết giá trị cũ là gì, mới là gì, không chỉ biết "có thay đổi").

**Đầy đủ hành động cần ghi nhận:**
- Duyệt/từ chối đăng ký giảng dạy — gắn nhãn riêng khi tự duyệt chính mình (mục 3)
- Duyệt/bỏ qua đề xuất nhân sự — khen thưởng/đào tạo/đổi nhóm (mục 3, mục 4.1)
- Sửa/hủy lớp đã có người được phân công (mục 4.3)
- Thay đổi trạng thái tham gia giảng dạy của 1 người (mục 4.1)
- Thay đổi cấu hình hệ thống (mục 4.8: trọng số KPI, hệ số D, ngưỡng...)
- **Gán/thu hồi Quyền Quản lý lớp cho 1 người** (mục 3) — hành động nhạy cảm nhất trong toàn hệ thống (cấp quyền Admin cho ai đó), bắt buộc phải log rõ ràng, hiện chưa được liệt kê ở đâu trong tài liệu
- Chỉnh sửa thủ công điểm danh (B1) của người khác (mục 4.4)
- Chỉnh sửa hồ sơ nhân sự của người khác (mục 4.1)

**Quyền xem Nhật ký hệ thống:** khác với nguyên tắc "công khai nội bộ" áp dụng cho hồ sơ/KPI (mục 3) — Nhật ký hệ thống **giới hạn cho người giữ Quyền Quản lý lớp xem toàn bộ**; GV/TG chỉ xem được **phần log liên quan trực tiếp đến bản thân** (vd ai duyệt đăng ký của họ, khi nào, ai sửa điểm danh của họ), không xem được log của người khác hay log cấu hình hệ thống.

### 4.7 BÁO CÁO

**Khung thời gian xem báo cáo — không áp dụng đều cho mọi báo cáo:**
- **Báo cáo #3, #4, #5, #8** (dựa trên dữ liệu hoạt động liên tục — lớp, đăng ký, Bài): hỗ trợ lọc linh hoạt **tuần / tháng / quý / năm**, phục vụ phân tích/tra cứu, vd xem sản lượng theo tuần để phát hiện mất cân bằng sớm
- **Báo cáo #1, #2, #6, #7** (gắn chặt với KPI/kỳ đánh giá): chỉ xem được theo **kỳ đánh giá (quý)** — vì KPI, A4 lũy kế theo kỳ, đề xuất nhân sự đều không được tính ở granularity tuần/tháng, không có dữ liệu để hiển thị nếu ép theo khung thời gian khác

Đây là bộ lọc cho mục đích phân tích ở module này, hoàn toàn **tách biệt với việc "kỳ đánh giá" KPI chính thức cố định theo quý** (mục 3) — không thay đổi cách tính KPI.

**Danh sách báo cáo cụ thể, kèm đề xuất cách hiển thị (tổng hợp từ toàn bộ tài liệu):**

1. **KPI tổng hợp toàn đơn vị theo kỳ** — bảng xếp hạng (data table, sort/filter được); Admin xem đầy đủ kèm cột nhóm, GV/TG xem **ẩn cột nhóm** (theo nguyên tắc dưới); xuất Excel/PDF cho họp xét duyệt định kỳ
2. **Xu hướng KPI theo thời gian** — area/line chart nhiều kỳ (mục 6), realtime cho kỳ đang mở, dùng đúng số liệu snapshot đã khóa cho các kỳ đã đóng (mục 7)
3. **Sản lượng giảng dạy** — bar chart ngang so sánh theo người/kỳ (không gắn nhãn nhóm) — báo cáo quan trọng nhất để Admin **tự kiểm tra nguyên tắc công bằng của matching-score** (mục 4.3) có thực sự vận hành đúng không
4. **Tỷ lệ tự đăng ký/nhận lời mời (A2/A3)** — bar chart hoặc % theo người/kỳ (mục 5)
5. **Vận hành đăng ký & phân công** — KPI stat tile (tỷ lệ lấp đầy %, thời gian TB lấp đầy 1 slot) kèm sparkline nhỏ, số Bài từng cảnh báo pool nhỏ (mục 4.3) — **realtime**, phản ánh đúng trạng thái hiện tại
6. **A4 — đóng góp lớp không kinh phí** — bảng xếp hạng lũy kế + badge, phục vụ xét vinh danh cuối năm (mục 4.2/6)
7. **Đề xuất nhân sự** — bảng số liệu **tổng hợp theo loại/kỳ** (vd "12 đề xuất khen thưởng, 3 đề xuất đổi nhóm trong kỳ"), kèm donut chart tỷ lệ duyệt/từ chối (mục 3/4.1). **Không hiển thị chi tiết ai được đề xuất gì** (mức đó thuộc Nhật ký hệ thống, mục 4.6, giới hạn Admin) — báo cáo này chỉ dừng ở số liệu thống kê
8. **Vận hành lớp học** — donut/pie chart theo trạng thái lớp, bar chart theo nhóm lớp/loại kinh phí (mục 4.2)

**Dữ liệu realtime vs snapshot:** hầu hết báo cáo tính trực tiếp từ dữ liệu hiện tại (realtime) — **riêng báo cáo KPI của kỳ đã đóng phải dùng đúng bản snapshot đã khóa** (mục 7, nguyên tắc không hồi tố), không tính lại theo cấu hình mới nhất.

**Dự đoán xu hướng:** không cần AI/dự báo phức tạp (cùng lý do đã nêu ở mục 4.4) — nếu cần, chỉ thể hiện xu hướng tuyến tính đơn giản dựa trên vài kỳ gần nhất (tăng/giảm dần), đủ dùng cho quy mô nội bộ.

**Nguyên tắc ẩn nhãn "nhóm" khỏi GV/TG (áp dụng toàn bộ báo cáo + Tổng quan):** nhóm vẫn dùng ngầm cho mọi logic (percentile, matching-score, điều kiện đăng ký — mục 3/6). Riêng D3 (hệ số vai trò) dựa trên **vai trò** (Giảng viên/Trợ giảng) chứ không phải nhãn nhóm — vai trò vốn hiển nhiên, không cần ẩn. Nhưng **không hiển thị tên/nhãn "nhóm" trong bất kỳ màn hình GV/TG nhìn thấy** — chỉ Admin/Quản lý lớp xem nhãn nhóm đầy đủ. So sánh/percentile diễn đạt trung lập ("so với đồng nghiệp cùng vai trò và chuyên môn tương đương", không nêu tên nhóm cụ thể) — tránh cảm giác bị xếp hạng/phân biệt.

**Quyền xem:** cả 8 báo cáo đều **công khai cho GV/TG xem ở dạng tổng hợp toàn đơn vị** (không giới hạn chỉ cá nhân) — đúng tinh thần minh bạch xuyên suốt tài liệu, để mọi người nắm được tình trạng vận hành chung, biết được đơn vị đang phát triển tới đâu, không chỉ nhìn thấy mỗi góc nhỏ của riêng mình. Chỉ giới hạn 2 việc: **ẩn nhãn nhóm** (theo nguyên tắc trên) và **thao tác quản trị** (duyệt/từ chối cụ thể, chỉnh cấu hình) — vẫn chỉ Admin/Quyền Quản lý lớp thực hiện được, dù ai cũng xem được số liệu.

**Xuất báo cáo:** Excel/PDF cho các báo cáo dùng trong họp xét duyệt (báo cáo 1, 3, 6, 7 ở trên) — **chỉ Admin/Quyền Quản lý lớp xuất được**, dù xem trên màn hình đã công khai cho mọi người; file tải về dễ sao chép/phát tán hơn nên vẫn giới hạn.

### 4.7b TỔNG QUAN (trang chủ khi đăng nhập)

Module này từng bị thiếu trong danh sách 4.1-4.8 ở bản nháp đầu, nay đã bổ sung đầy đủ — **liên kết chặt nhưng không gộp** với 4.7 (Báo cáo) — Tổng quan tái sử dụng số liệu từ 4.7 nhưng hiển thị rút gọn, trả lời "hôm nay cần làm/biết gì", trong khi 4.7 dùng để phân tích sâu/ra quyết định định kỳ.

**"Rút gọn" nghĩa là ít mục hơn, KHÔNG phải trình bày sơ sài** — mỗi mục vẫn phải trực quan bằng biểu đồ/bảng biểu phù hợp, không phải chỉ liệt kê số/chữ khô khan. **Người giữ Quyền Quản lý lớp (mục 3) thấy CẢ 2 bộ widget dưới đây cùng lúc** (không phải chọn 1 trong 2), vì họ vừa quản lý vừa có hồ sơ GV/TG song song:

- **Bố cục Tổng quan (đúng ảnh mẫu):** 2 cột — cột chính (~64%) chứa hàng **3 thẻ stat nhỏ** rồi các khối lớn (bảng, chart lớn); cột phụ (~36%) chứa các chart nhỏ xếp dọc và chạy từ trên cùng. Không để thẻ stat trải hết chiều ngang (làm lệch bố cục các chart bên dưới). Dùng component `DashboardLayout` + `StatRow` (`src/components/dashboard-layout.tsx`); dưới `lg` xếp 1 cột
- **Admin/Quản lý lớp** — đa dạng loại biểu đồ, không chỉ area+bar, để 1 màn hình phản ánh nhiều góc độ như mẫu tham khảo (mục 8):
  - Hàng KPI stat card đầu trang (icon outline xám-xanh + nhãn + chevron ở hàng trên; số bên trái, trend pill không nền bên phải — đúng ảnh mẫu, không dùng icon badge nền màu): tổng nhân sự, lớp đang mở, slot còn trống, số cảnh báo pool nhỏ đang mở — mỗi stat tile kèm **sparkline nhỏ** phía dưới số (xu hướng 7-30 ngày gần nhất), giống style "Sales $94,127 ↑12%" trong ảnh tham khảo
  - **Bảng việc cần duyệt** (data table): đăng ký chờ, đề xuất nhân sự chờ — nút hành động nhanh ngay trong bảng, click dẫn thẳng tới màn hình xử lý
  - **Area chart** xu hướng KPI toàn đơn vị rút gọn (vài kỳ gần nhất, link báo cáo #2)
  - **Bar chart** tỷ lệ lấp đầy slot theo lớp đang mở (rút gọn từ báo cáo #5)
  - **Donut chart** phân bố lớp theo trạng thái (Đang mở/Đang diễn ra/Đã hoàn thành — rút gọn từ báo cáo #8), đặt cạnh bar chart trên cùng 1 hàng
  - **Gauge/radial** tỷ lệ % đăng ký trung bình toàn đơn vị (1 chỉ số duy nhất, hình tròn, giống khối "39.3%" trong ảnh tham khảo)
- **Giảng viên/Trợ giảng** — cùng tinh thần đa dạng:
  - **Tổng quan toàn đơn vị (không chỉ cá nhân):** KPI stat card rút gọn kèm sparkline — tổng lớp đang mở/đang diễn ra, xu hướng KPI trung bình toàn đơn vị (area chart, không gắn tên cá nhân), tỷ lệ lấp đầy slot chung (bar chart nhỏ), donut phân bố lớp theo nhóm lớp — để mọi người nắm được tình hình hoạt động chung, đơn vị đang phát triển tới đâu, không chỉ nhìn thấy mỗi góc riêng của bản thân
  - **Lịch dạy sắp tới** dạng mini-calendar hoặc timeline trực quan (không phải danh sách text), các Bài đã được phân công
  - **Progress bar/gauge** điểm KPI cá nhân rút gọn kỳ hiện tại (link tới Bảng KPI đầy đủ, mục 4.4)
  - Danh sách thông báo mới nhất, slot đang chờ duyệt của bản thân
  - **Thẻ gợi ý lớp** (card dạng lưới, giống thẻ lớp ở danh sách lớp mục 4.2) cho lớp trống/lớp cùng nhóm lớp sắp mở phù hợp (mục 4.3)

### 4.8 CẤU HÌNH HỆ THỐNG
Tất cả các giá trị sau **phải cấu hình qua giao diện, không hardcode** (xem kiến trúc ở mục 7):
- Trọng số công thức KPI (mọi cấp: 30/45/25 [B1/C/A, cộng thẳng = 100%], 40/35/25 [C2/C3/C1], 50/25/25 [A1/A2/A3] — mục 6)
- **Hệ số độ khó D — hiển thị/chỉnh sửa chung 1 màn hình "Hệ số độ khó"**, dù dữ liệu D1 vật lý nằm trong bảng nhóm lớp (backend): D2, D3 là ô nhập giá trị đơn ngay trên màn hình này; D1 hiển thị như 1 bảng con ngay trong cùng màn hình (danh sách nhóm lớp kèm ô giá trị D1 tương ứng, sửa trực tiếp tại đây) — Admin **không cần rời sang màn hình "Danh mục nhóm lớp" riêng** chỉ để đổi D1
- Ngưỡng tối đa chấm điểm B1 (khởi điểm 30 phút — phút trễ vượt mốc này = 0%, giảm tuyến tính trước đó, mục 5), khung giờ được phép check-in quanh giờ học (mục 4.4)
- Rubric C2 (mô tả 4 mức: 100/80/60/0%)
- Danh mục: môn học/chuyên môn, loại chứng chỉ, **nhóm lớp (kèm hệ số D1 gắn sẵn cho từng nhóm)**, loại kinh phí
- Kỳ đánh giá (ngày bắt đầu/kết thúc từng kỳ)
- Ngưỡng đề xuất đổi nhóm theo KPI (X điểm, Y kỳ liên tiếp — mục 3)
- **Ngưỡng số người tối thiểu trong 1 nhóm để dùng percentile A1** (khởi điểm 5 người, dưới ngưỡng này chuyển sang fallback so với lịch sử bản thân — mục 6)
- Ngưỡng cảnh báo dồn tải khi 1 người đảm nhiệm quá nhiều slot cùng vai trò trong 1 lớp (khởi điểm 70%, mục 4.2)
- Ngưỡng cảnh báo pool ứng viên nhỏ khi tạo Bài (khởi điểm <3 người, mục 4.3), tỷ trọng matching-score (80% công bằng khối lượng / 20% KPI tie-break, mục 4.3)
- Phương pháp gộp C1/C2/C3 khi 1 người dạy nhiều lớp trong kỳ: trung bình đơn giản (mặc định) / trung bình có trọng số theo số buổi (mục 6)

---

## 5. Đo lường chất lượng — Bộ tiêu chí gốc

**Mọi con số trong mục này (mốc %, hệ số, trọng số) là giá trị khởi điểm — tất cả đều cấu hình được qua mục 4.8, không hardcode** (kiến trúc chi tiết ở mục 7).

### Nhóm A — Sản lượng giảng dạy
| Mã | Tên | Công thức | Đơn vị |
|---|---|---|---|
| A1 | Số buổi/giờ đã dạy trong kỳ | Tổng giờ/buổi cộng dồn trong kỳ, từ điểm danh | Giờ/buổi |
| A2 | Tỷ lệ tự đăng ký slot trống | (Bài tự đăng ký & được duyệt) ÷ (Tổng Bài đã dạy) × 100% | % |
| A3 | Tỷ lệ nhận khi được mời | (Lời mời theo Bài được đồng ý) ÷ (Tổng lời mời đã gửi) × 100% | % |
| A4 | Số lớp không kinh phí đã nhận | Đếm thô, không quy đổi % | Số lớp |

### Nhóm B — Tiến độ/kỷ luật
| Mã | Tên | Công thức | Đơn vị |
|---|---|---|---|
| B1 | Điểm danh có mặt đúng giờ | **Giảm tuyến tính theo phút trễ**: `B1 = max(0%, 100% − phút trễ × (100% ÷ ngưỡng tối đa))`. Đúng giờ (0 phút trễ) = 100%, giảm dần đều tới 0% tại **ngưỡng tối đa (khởi điểm 30 phút, cấu hình qua mục 4.8)**. Vắng không check-in = 0% mặc định (mục 4.4) | % |

### Nhóm C — Chất lượng chuyên môn
| Mã | Tên | Công thức | Đơn vị | Bắt buộc? |
|---|---|---|---|---|
| C1 | Khảo sát hài lòng học viên | Điểm TB khảo sát, quy đổi % — **tính theo Lớp**, áp dụng như nhau cho mọi người đã dạy bất kỳ Bài nào trong lớp đó (không chia theo số Bài, cùng nguyên tắc với A4, mục 4.2) | % | Không bắt buộc |
| C2 | Dự giờ/đánh giá của Quản lý đào tạo | Rubric 4 mức (100/80/60/0%) — chấm riêng cho từng người ở Bài cụ thể được dự giờ | % | Không bắt buộc (nhưng vẫn cần màn hình nhập) — **giữ nguyên trọng số 40%, không giảm** (xem giải thích bên dưới) |
| C3 | Tỷ lệ học viên đạt chuẩn đầu ra | Nhập tay % tổng hợp (không cần danh sách học viên) — **tính theo Lớp**, cùng nguyên tắc phân bổ như C1 | % | Không bắt buộc |

### Nhóm D — Hệ số độ khó (D1/D2 kế thừa từ Lớp, D3 áp theo vai trò của từng Bài — xem mục 6; KHÔNG dùng cho tính lương)
| Mã | Tên | Giá trị |
|---|---|---|
| D1 | Hệ số theo nhóm lớp | Mỗi nhóm lớp (ABCDE, ACLS, BLS, SCC-LX, SCC-CĐ... — danh mục mục 4.8) gắn sẵn 1 giá trị hệ số, Admin cấu hình qua giao diện — không còn phân loại cứng "cơ bản/chuyên sâu/mới" |
| D2 | Hệ số bảo vệ lớp không kinh phí | ×1.1 (giá trị khởi điểm, cấu hình qua mục 4.8), lấy max với D1 (không cộng dồn) |
| D3 | Hệ số vai trò | Giảng viên ×1.1, Trợ giảng ×1.0 (giá trị khởi điểm, cấu hình qua mục 4.8) |

**Quyết định về tính khả thi vận hành C2:** với >50 nhân sự và chỉ 1 người (giữ Quyền Quản lý lớp) thực hiện dự giờ, phần lớn giảng viên/trợ giảng sẽ **không có dữ liệu C2 mỗi kỳ** — đây là tình huống bình thường, không phải lỗi hệ thống. Quyết định: **giữ nguyên C2 trong công thức, không bỏ, không giảm trọng số cơ bản (40%, cấu hình qua mục 4.8 như mọi trọng số khác — không hardcode)**, vì:
- Cơ chế trọng số động (đã thiết kế ở mục 6) đã tự xử lý việc thiếu dữ liệu bằng cách phân bổ lại cho C1/C3 — không cần thêm thay đổi gì ở tầng hệ thống
- Khi C2 *có* dữ liệu, đây là nguồn đánh giá trực tiếp/khách quan nhất từ quản lý, không nên hạ thấp giá trị của nó chỉ vì tần suất thấp
- Giảm trọng số cơ bản sẽ không giải quyết được vấn đề tần suất (C2 vẫn hiếm khi có), mà chỉ làm giảm giá trị của nó trong những trường hợp hiếm hoi nó thực sự xảy ra

Khuyến nghị vận hành (không phải thay đổi hệ thống): người giữ Quyền Quản lý lớp nên **ưu tiên dự giờ có chọn lọc** — tập trung vào giảng viên/trợ giảng mới, hoặc người có KPI thấp ở kỳ trước — thay vì cố gắng phủ hết toàn bộ nhân sự mỗi kỳ.

### Nhóm E — Nguồn dữ liệu minh chứng
- E1: Điểm danh — tự động qua check-in (mục 4.4)
- E2: Khảo sát hài lòng — link tự động hoặc nhập tay (mục 4.2)
- E3: Biên bản dự giờ — người giữ Quyền Quản lý lớp nhập trực tiếp (mục 3)
- E4: Giờ đào tạo tích lũy — tự tính từ A1

---

## 6. Công thức tổng hợp KPI (đã chốt)

```
KPI chính (0-100) = 30% × Điểm Chuyên cần (B1)
                   + 45% × Điểm Chất lượng (C)
                   + 25% × Điểm Sản lượng (A)
  (30 + 45 + 25 = 100%, cộng thẳng — không qua lớp trọng số trung gian nào khác)

Điểm Chất lượng (C) = 40%×C2 + 35%×C3 + 25%×C1
  → Trọng số động: nếu thiếu dữ liệu 1 tiêu chí (C1/C2/C3), phân bổ lại
    trọng số cho các tiêu chí còn dữ liệu trong cùng nhóm
  → Nếu 1 người dạy NHIỀU lớp trong cùng kỳ (mỗi lớp có C1/C3 riêng,
    có thể nhiều lần dự giờ C2 riêng): mỗi tiêu chí lấy TRUNG BÌNH CỘNG
    qua tất cả lớp/lần dự giờ trong kỳ (mặc định, cấu hình được qua
    mục 4.8 nếu sau này cần đổi sang trung bình có trọng số theo số
    buổi đã dạy mỗi lớp), ra 1 con số duy nhất trước khi đưa vào công
    thức trên

Điểm Sản lượng (A) = 50%×A1 + 25%×A2 + 25%×A3
  → A1 chuẩn hóa bằng percentile rank theo 5 nhóm nhân sự (mục 3, mỗi
    nhóm so sánh nội bộ, không trộn), trong cùng kỳ. Áp dụng cơ chế
    fallback (so với lịch sử 2-3 kỳ trước của chính người đó) cho các
    nhóm có **dưới ngưỡng tối thiểu (khởi điểm 5 người, cấu hình được
    qua mục 4.8)** — nhiều khả năng là "Ban giám đốc" — vì percentile
    chỉ đáng tin cậy với nhóm đủ lớn (đã xác nhận GV/TG bác sĩ và
    không bác sĩ đều >50 người)
  → A4 KHÔNG nằm trong công thức này (xem bên dưới)

Hệ số D áp dụng ở cấp từng Bài (D1, D2 kế thừa từ Lớp chứa Bài đó; D3 tùy
vai trò được phân công cho Bài đó), nhân vào giá trị giờ dạy (A1) hoặc
điểm dự giờ (C2) TRƯỚC KHI gộp lên thành điểm kỳ.
```

**A4 (lớp không kinh phí) — hoàn toàn tách khỏi công thức KPI:**
Lưu dạng bản ghi lũy kế (mỗi lần nhận lớp không kinh phí = 1 record), dùng cho:
1. Tie-breaker khi xét khen thưởng (KPI chính bằng nhau)
2. Xét vinh danh đóng góp cộng đồng theo năm
3. Matching-score khi có lớp không kinh phí mới → ưu tiên người có A4 **thấp** (đảo ngược, đảm bảo công bằng xoay vòng)

**Điểm KPI tối đa khi không tính A4 = 100 điểm** (do trọng số các thành phần cộng đúng 100%). A4 không được cộng thẳng vào KPI chính để tránh làm lệch ý nghĩa "phần trăm hoàn thành chuẩn".

---

## 7. Kiến trúc kỹ thuật cho hệ thống KPI (bắt buộc, để tránh hardcode)

Vì bộ tiêu chí/trọng số **sẽ còn thay đổi**, công thức phải là **dữ liệu cấu hình (DB-driven)**, không phải logic viết cứng trong code:

1. **Bảng cấu hình dữ liệu:**
   - `Nhóm tiêu chí`: mã (A/B/C), tên, trọng số trong công thức tổng
   - `Tiêu chí con`: mã (A1, A2, C1...), thuộc nhóm nào, trọng số trong nhóm, nguồn dữ liệu, đơn vị, trạng thái Bật/Tắt
   - `Hệ số độ khó D`: mã, tên, giá trị nhân

2. **Engine tính điểm tổng quát:** 1 hàm/service chung biết cách lấy danh sách tiêu chí con đang Bật của 1 nhóm → tính trung bình có trọng số → tự phân bổ lại trọng số nếu thiếu dữ liệu (trọng số động). Áp dụng được cho mọi nhóm, mọi cấp — thêm tiêu chí mới = thêm dữ liệu, không viết thêm code.

3. **Snapshot theo kỳ, không hồi tố:** khi 1 kỳ đánh giá đóng, lưu lại bản chụp cấu hình trọng số đã dùng, gắn liền với kết quả kỳ đó. Đổi trọng số cho kỳ mới không làm thay đổi kết quả các kỳ đã đóng.

4. **Áp dụng từ kỳ tiếp theo:** thay đổi cấu hình chỉ ảnh hưởng kỳ đang mở tiếp theo.

5. **Màn hình "Cấu hình KPI" cho Admin:** thêm/sửa/xóa tiêu chí, chỉnh trọng số, có validate tự động (tổng trọng số các tiêu chí con trong 1 nhóm phải = 100%, tổng trọng số nhóm A/B/C phải = 100%).

### Quản lý kỳ đánh giá
- Kỳ = **quý**, Admin tạo/quản lý danh sách kỳ với ngày bắt đầu-kết thúc cụ thể
- 3 trạng thái: **Đang mở** (thu thập dữ liệu) → **Chờ duyệt** (Admin xem KPI trước khi công bố) → **Đã đóng** (khóa cứng, chỉ xem)
- Lớp dạy xuyên 2 kỳ: tính theo ngày của từng buổi học cụ thể (không theo ngày bắt đầu lớp)

---

## 8. Thiết kế UI/UX — Design System

Phong cách tham khảo: **"Soft SaaS Dashboard"** (xem file `tham khao theme.jpeg` trong thư mục dự án — mẫu ProSale Sales Overview). Dựng bằng Tailwind CSS + shadcn/ui + Lucide icon (mục 2). Mục tiêu của mục này: **1 bộ token/component duy nhất, dùng lại xuyên suốt mọi màn hình** — không để mỗi module tự phát minh màu/kiểu riêng.

### 8.1 Màu sắc (design tokens)

**Nguyên tắc:** mọi màu trong app phải xuất phát từ **đúng 4 màu gốc thực sự xuất hiện trong ảnh tham khảo** — **Xanh dương, Navy (đậm hơn), Xanh ngọc (Teal), Xanh lá** (badge Products/Customers/Orders đều nằm trong gam xanh dương-xanh ngọc, KHÔNG có tím/cam — đã kiểm tra lại). Đỏ chỉ xuất hiện riêng cho trend giảm, không dùng làm màu badge thông thường. Khi cần thêm màu (vd nhiều hơn 4 loại KPI card), **chỉ đổi sắc độ (tint/shade) của 4 màu gốc này** — không thêm hue mới. Mọi bề mặt có màu (badge, button, chart fill) **dùng gradient nhẹ thay vì màu phẳng**, đúng tinh thần "Soft SaaS" của ảnh (dải area chart, card Sales đều có chiều sâu gradient).

**4 màu gốc (base hue) — lấy trực tiếp từ ảnh, mỗi màu có 1 công thức gradient riêng:**

| Màu gốc | Gradient nền (lấy mẫu từ ảnh) | Chữ đặt trên gradient | Solid (icon/chữ trên nền trắng) |
|---|---|---|
| Xanh dương (Blue nhạt) | `linear-gradient(135deg, #C6DCFA, #A9C4F2)` | `#1E3A8A` | `#2563EB` |
| Navy (Navy-lam, cũng là brand) | `linear-gradient(135deg, #166A8C, #14468A)` | `#FFFFFF` | `#14468A` |
| Xanh ngọc (Mint) | `linear-gradient(135deg, #A2EFC3, #9FDBE3)` | `#0F5A55` | `#0D9488` |
| Xanh lá (Lime) | `linear-gradient(135deg, #D1F591, #B1E9A2)` | `#365314` | `#16A34A` |

| Token | Giá trị | Dùng cho |
|---|---|---|
| `background` | `#F3F4F1` | Nền toàn trang (xám ngả xanh nhạt, không trắng thuần) |
| `surface` | `#FFFFFF` | Card, sidebar, table |
| `border` | `#E4E4E7` | Viền hairline 1px quanh card/input |
| `text-primary` | `#18181B` | Chữ chính, số liệu lớn |
| `text-secondary` | `#71717A` | Label, chú thích |
| `brand` | Solid `#14468A`; gradient **ngang** `linear-gradient(90deg, #166A8C, #14468A)` (xanh ngọc-lam → navy, lấy mẫu trực tiếp từ pill "Overview", nút "See More", "Upgrade now" trong ảnh) | Active nav pill, nút primary, focus ring |
| `success` | bg Green gradient / text Green solid | Đã duyệt, đạt, tăng |
| `danger` | bg `#FEE2E2` / text `#DC2626` (đỏ — chỉ riêng cho trend giảm/từ chối, đúng như ảnh, không gradient) | Từ chối, vi phạm, giảm |
| `warning` | bg `#FEF2F2` (đỏ pastel rất nhạt) / text `#F87171` (đỏ nhạt hơn danger) — cùng hue đỏ với `danger` nhưng **nhạt/nhẹ hơn hẳn về cường độ**, phân biệt bằng độ đậm chứ không phải đổi màu | Chờ duyệt, cảnh báo (pool nhỏ, dồn tải) |
| `neutral` | bg `#F4F4F5` / text `#71717A` (xám trung tính, không thuộc 4 màu gốc — dùng cho trạng thái "không màu" như Nháp/Vô hiệu hóa) | Nháp, vô hiệu hóa, không còn tham gia |

**Icon badge nền gradient (dùng cho phân loại/nhấn mạnh, KHÔNG dùng trên thẻ KPI stat — thẻ stat dùng icon outline xám-xanh theo ảnh mẫu):** luân phiên qua đúng 4 màu gốc ở trên (Blue → Navy → Teal → Green), nền dùng gradient tương ứng — nếu 1 màn hình cần nhiều hơn 4 badge, lặp lại chu kỳ hoặc đổi độ đậm/nhạt của gradient (vd Blue gradient sáng hơn/tối hơn) thay vì thêm hue thứ 5.


### 8.1b Dark mode (bắt buộc, làm song song ngay từ đầu — không thêm sau)

| Token | Light | Dark |
|---|---|---|
| `background` | `#F3F4F1` | `#0A0A0B` |
| `surface` | `#FFFFFF` | `#18181B` |
| `border` | `#E4E4E7` | `#27272A` |
| `text-primary` | `#18181B` | `#F4F4F5` |
| `text-secondary` | `#71717A` | `#A1A1AA` |
| `brand` | `#14468A` (gradient `#166A8C → #14468A`) | `#3B82F6` (gradient `#1F8DB3 → #2F6FDC`, sáng hơn để đủ tương phản trên nền tối) |
| `success` bg/text | `#DCFCE7`/`#16A34A` | `#052E16`/`#4ADE80` |
| `danger` bg/text | `#FEE2E2`/`#DC2626` | `#450A0A`/`#F87171` |
| `warning` bg/text | `#FEF2F2`/`#F87171` | `#3F2D2D`/`#FCA5A5` (nền khử bão hòa hơn `danger` dark — đỏ "xỉn" thay vì đỏ "rực", phân biệt bằng độ bão hòa) |
| `neutral` bg/text | `#F4F4F5`/`#71717A` | `#27272A`/`#A1A1AA` |

**Icon badge trong dark mode:** giữ nguyên 4 màu gốc (Blue/Navy/Teal/Green), nhưng đổi công thức gradient — nền dùng gradient bản tối/khử bão hòa của màu gốc (2 sắc độ tối gần nhau, giữ chiều sâu gradient nhưng không chói), icon dùng bản sáng của màu gốc — không dùng thẳng gradient nhạt (dành cho light mode) vì sẽ chói trên nền tối. Toggle dark mode đặt trong menu Avatar ở topbar (mục 8.5b), lưu lựa chọn theo thiết bị (localStorage), có thể theo hệ thống (`prefers-color-scheme`) làm mặc định.

### 8.2 Typography

- Font: **Plus Jakarta Sans** (giống ảnh mẫu, có subset tiếng Việt) — đã đổi từ Geist sau khi đối chiếu ảnh; load qua `next/font/google`
- Scale: 12 / 14 / 16 / 20 / 24 / 32px — heading dùng 20-32px semibold, body 14px regular, label/caption 12px medium
- Số liệu (KPI, bảng) dùng **tabular-nums** để căn cột thẳng hàng
- **Kích thước chữ đo từ ảnh mẫu ở khung 1440px (tỷ lệ 1.4:1)** — không được thu nhỏ hơn các mốc này (đã từng thu nhỏ quá tay làm giao diện trông "dẹt"): tiêu đề trang 28px; tiêu đề card 17px; menu sidebar 15px; nhãn thẻ stat 14px; số thẻ stat 26px; tên người dùng topbar 15-16px; chữ ô bảng 14px, header bảng 13px; phụ đề (mã, email) 12px
- Số lớn trong Stat Card: 28-32px, bold, `text-primary`

### 8.3 Spacing, bo góc, shadow

- Bo góc: button/input/badge nhỏ = 8px, card/thẻ stat = **20px** (đo từ ảnh), pill/badge trạng thái = full-round. Khoảng cách giữa các card 20px, giữa 3 thẻ stat 16px. Nội dung trang giới hạn `max-w-1400px` để không bị kéo giãn ngang trên màn hình rộng
- **Shadow đo từ ảnh mẫu:** card/pill/nút trong ảnh chỉ có shadow rất nhạt (độ sáng giảm ~1-3/255); nổi bật hơn hẳn chỉ có ô "Upgrade plans" ở đáy sidebar (`0 8px 24px rgba(16,24,40,.10)`) và nút primary (shadow màu brand nhẹ)
- Shadow card: mềm, lan rộng `0 1px 2px rgba(16,24,40,.04), 0 4px 14px rgba(16,24,40,.05)`. **Light mode: không viền** (ảnh mẫu chỉ có shadow mềm); **dark mode: thêm viền `border`** để card tách khỏi nền tối
- Spacing scale (Tailwind mặc định): 4/8/12/16/24/32/48px; gutter giữa các card 16-24px
- Card padding: 20-24px

### 8.4 Icon

**Lucide** (outline/stroke, đồng bộ shadcn/ui). Kích thước: 24px trong sidebar/nav, 20px mặc định trong nút/label, 16px trong badge nhỏ/pill.

### 8.5 Component chuẩn

**Button:**
- Primary: nền gradient `brand` (ngang, xanh ngọc-lam → navy), chữ trắng semibold, cao 40px, bo 8px, hover tối thêm 10%
- Outline: viền `border`, nền trắng, hover nền `background`
- Ghost: không viền/nền, chỉ chữ, hover nền `background`
- Danger: nền `danger`-solid, dùng cho hành động phá hủy (hủy lớp, xóa)
- Disabled: opacity 40%, không click được
- Icon button (hành động nhanh trong bảng): 36×36px vuông, bo 8px

**Badge/Pill:** nền nhạt + chữ đậm cùng tông theo semantic token, bo full-round, padding `4px 10px`, chữ 12px medium. Trend pill thêm icon mũi tên nhỏ trước %.

**Card:** nền `surface`, bo 16px, shadow mềm (light: không viền; dark: thêm viền `border` 1px). Header card: title 16px semibold trái; **icon "..." (menu) phải, chuẩn hóa dùng chung 1 component dropdown menu** cho mọi card có hành động phụ (Xem chi tiết / Xuất / Chỉnh sửa / Ẩn khỏi Tổng quan...) — đúng mẫu 3 icon nhỏ trên card "Sales" trong ảnh tham khảo (phóng to, sửa, thêm) — không để mỗi card tự chế 1 kiểu menu khác nhau.

**Data table:** header **không tô nền**, chữ 12px medium xám, viết thường bình thường (không uppercase), mỗi cột sort được có mũi tên ▾ nhỏ cạnh tên cột (đúng ảnh mẫu); ở header card chứa bảng: tiêu đề + pill đếm nhỏ (vd "15 Product") bên trái, nút Filters (outline) + nút "Xem thêm" (gradient brand, nhỏ) bên phải; trạng thái dùng pill viền mảnh (trung tính) hoặc pill nền nhạt (đã duyệt...); hàng cao 56px, hover nền `background`, border-bottom hairline; cột đầu có avatar/thumbnail 32px bo 8px nếu cần; cột trạng thái dùng Badge; phân trang dạng `‹ 1 2 3 … ›` đơn giản dưới cùng.

**Form/Input:** cao 40px, bo 8px, viền `border`, focus ring `brand` 2px; label 14px medium phía trên; lỗi: viền đỏ + text lỗi nhỏ bên dưới.

**Modal/Drawer:** **Drawer trượt từ phải** (480-560px) cho xem/sửa chi tiết nhanh (giữ ngữ cảnh danh sách) — dùng cho hầu hết thao tác; **Modal giữa màn hình** chỉ cho xác nhận ngắn (confirm hủy/xóa), không dùng cho form dài. Overlay đen mờ 40%.

**Avatar:** ảnh **hình tròn** (đã đổi từ vuông theo phản hồi) 32px trong bảng, 40px topbar, 64px trong hồ sơ chi tiết. **Fallback khi chưa có ảnh:** hình tròn nền 1 trong 4 gradient của bảng màu chung (bảng trên, chọn theo hash tên) + chữ cái đầu tên, dùng màu chữ "đặt trên gradient" tương ứng (navy → chữ trắng, 3 gradient nhạt → chữ đậm cùng tông) — không dùng ảnh mặc định chung chung.

**Empty state:** khi 1 bảng/danh sách rỗng (không có lớp trống, không có thông báo...) — icon outline lớn xám nhạt ở giữa + 1 dòng text mô tả ngắn + (nếu có) 1 nút hành động gợi ý (vd "Tạo lớp mới") — không để trống trơn hoặc chỉ hiện chữ "No data".

### 8.5b Bố cục khung ứng dụng (App Shell)

Ảnh tham khảo có cấu trúc khung rất rõ ràng nhưng file trước đó mới chỉ nói "sidebar cố định" chung chung — cụ thể hóa lại cho đồng bộ mọi trang:

**Sidebar (trái, cố định, ~240px):**
- Logo + tên app trên cùng
- Menu chia nhóm có nhãn nhỏ phía trên (đúng mẫu "MENU" / "ORDER" trong ảnh). **Thứ tự hiển thị trên UI** (khác thứ tự số mục trong tài liệu này — số mục chỉ để tham chiếu nội dung):
  1. **TỔNG QUAN** (4.7b) — đứng riêng đầu tiên, không thuộc nhóm nào, giống vị trí "Overview" trong ảnh tham khảo
  2. Nhóm **"QUẢN LÝ"**: Lớp học (4.2) → Đăng ký giảng dạy (4.3) → Nhân sự (4.1) → Đánh giá chất lượng (4.4) → Báo cáo (4.7)
  3. Nhóm **"HỆ THỐNG"**: Thông báo (4.5, hiện cho mọi người) → Nhật ký hệ thống (4.6) → Cấu hình hệ thống (4.8) — 2 mục cuối chỉ hiện với người có Quyền Quản lý lớp
- Nền sidebar **hòa cùng nền trang, không viền, không panel trắng riêng** (đúng ảnh mẫu); chữ menu xám đậm, icon outline 1.75px
- Active item: pill nền gradient `brand` ngang, chữ trắng, icon trắng (đúng mẫu ảnh)
- **Ô thẻ dưới cùng sidebar** (vị trí "Upgrade plans" trong ảnh — app này không có gói nâng cấp nên tái sử dụng vị trí này): hiển thị **"Kỳ đánh giá hiện tại"** dạng **card gọn** (nền tint lime nhạt, tiêu đề + 1 dòng "tên kỳ · còn X ngày" + nút "Xem KPI của tôi") — cố tình thấp để sidebar không phải scroll; tự ẩn khi chiều cao màn hình < 600px
- **Sidebar KHÔNG scroll** (ảnh mẫu không có scroll): chiều cao mục menu và khoảng cách co giãn theo chiều cao màn hình (`clamp` theo vh), luôn vừa khung từ ~650px trở lên

**Topbar (trên cùng, cố định):**
- Trái: tiêu đề trang hiện tại + **breadcrumb** khi vào trang con (vd `Lớp học › Lớp ACLS-08 › Bài 3`) — chưa được đặc tả ở đâu trước đó, cần thêm vì hệ thống có nhiều cấp lồng nhau (Lớp → Bài → Slot)
- Giữa/phải: **ô tìm kiếm toàn cục** (đúng mẫu ảnh) — tìm theo tên lớp, tên nhân sự, mã lớp; kết quả gộp nhóm theo loại (Lớp / Nhân sự) trong dropdown
- Icon lịch (calendar) — shortcut mở nhanh Lịch dạy cá nhân (mục 4.7b Tổng quan)
- Bell thông báo (đã có ở 8.7)
- Avatar + tên + email góc phải — click mở menu nhỏ (Hồ sơ của tôi / Đăng xuất / Toggle dark mode)

### 8.6 Biểu đồ (chart)

- **Area/Line chart:** gradient fill nhạt dần xuống đáy, đường 2px, tooltip bong bóng **nền trắng, shadow mềm, chữ màu brand/xanh lá đậm** (không phải nền navy — đã kiểm tra lại ảnh mẫu) có đuôi trỏ vào điểm
- **Bar chart:** bo đầu cột lớn (~8px); cột thường **xám rất nhạt `#F7F7F7`**, chỉ cột được chọn/nổi bật dùng gradient xanh lá nhạt (`#C4F099`) kèm tooltip trắng (đúng mẫu "Weekly Revenue")
- **Chart dạng phễu/sóng nhiều khối** (mẫu "Sales"): mỗi khối 1 gradient ngang theo đúng 4 màu gốc, màu lấy mẫu từ ảnh — Blue nhạt `#B9D6F8`, Navy-lam `#116A8C → #11488B`, Mint `#A2EFC3 → #9FDBE3`, Lime `#D1F591 → #B1E9A2`; ngăn cách giữa các khối bằng đường trắng mảnh
- **Donut/Pie:** dùng cho phân bố trạng thái (vd báo cáo #8 vận hành lớp học), legend đặt cạnh không đè lên chart
- **Sparkline:** line mảnh 1px, không trục, dùng trong Stat Tile nhỏ
- **Radar chart:** riêng cho breakdown A/B/C ở Bảng KPI cá nhân (mục 4.4)
- **Segment control chọn khoảng thời gian** (giống mẫu tham khảo "03-07 | 10-14 | 17-21 | 24-28"): dùng cho bộ lọc tuần/tháng/quý/năm ở báo cáo (mục 4.7) — pill active **nền trắng, viền `brand` mảnh, chữ `brand`** (không tô đặc), các pill còn lại chữ xám thường (đúng mẫu)

### 8.7 Thông báo & hiệu ứng

- **Bell icon** góc phải topbar + badge đỏ tròn nhỏ hiện số chưa đọc (đúng mẫu tham khảo)
- Click mở **dropdown panel**: mỗi item = icon theo loại sự kiện + nội dung + thời gian tương đối ("5 phút trước"); item "cần hành động" (mục 4.5) có viền trái `brand` để nổi bật hơn item "thông tin"
- Push notification (trình duyệt) dùng giao diện native của trình duyệt, không custom
- Motion: transition 150-200ms ease-out cho hover/focus/mở drawer — không dùng animation trang trí, chỉ phục vụ tương tác

### 8.8 Áp dụng cụ thể theo từng module

Mỗi module dưới đây là **1 khối thống nhất** — màn hình danh sách và chi tiết của cùng 1 module dùng chung ngôn ngữ thiết kế, không tách rời như 2 module khác nhau:

Thứ tự các dòng dưới đây theo đúng **thứ tự hiển thị trên UI** (mục 8.5b), không theo thứ tự số mục trong tài liệu:

| Module | Danh sách | Chi tiết |
|---|---|---|
| **TỔNG QUAN (4.7b)** | Hàng KPI Stat Card (kèm sparkline) → Data table việc cần duyệt → Area chart + Bar chart + Donut + Gauge (đa dạng loại biểu đồ, theo spec chi tiết ở mục 4.7b) | — |
| **LỚP HỌC (4.2)** | Card dạng lưới (grid), mỗi lớp 1 card: Badge nhóm lớp + Badge trạng thái, progress bar mini theo vai trò | Progress bar đầy đủ đầu trang, danh sách Bài dạng accordion/timeline — mở mỗi Bài thấy slot + tên người đảm nhiệm (auto-collapse nếu 1 người) — click từ card ở danh sách mở thẳng vào đây |
| **ĐĂNG KÝ GIẢNG DẠY (4.3)** | *(không có màn hình danh sách riêng — thao tác đăng ký/duyệt nằm lồng ngay trong trang chi tiết Lớp/Bài ở trên)* | Nút hành động (Đăng ký/Duyệt/Từ chối) trực tiếp trên từng slot trong trang chi tiết lớp, danh sách matching-score công khai dạng ranked list ngay dưới mỗi slot |
| **NHÂN SỰ (4.1)** | Data table, avatar cột đầu, Badge trạng thái tham gia, filter theo nhóm (Admin only, ẩn với GV/TG — mục 4.7) | 2 cột: trái = Card thông tin cá nhân/chuyên môn/chứng chỉ, phải = Bảng KPI cá nhân đầy đủ (spec 8.6 + mục 4.4) — cùng 1 trang, không tách route riêng biệt về mặt cảm nhận |
| **ĐÁNH GIÁ CHẤT LƯỢNG (4.4)** | — (truy cập từ Tổng quan hoặc hồ sơ Nhân sự) | Stat Card + Area chart xu hướng + Radar chart breakdown A/B/C + Progress bar percentile/fallback |
| **BÁO CÁO (4.7)** | Data table + chart theo loại báo cáo (8.6), segment control chọn khung thời gian ở đầu trang | — |
| **THÔNG BÁO (4.5)** | Bell + dropdown panel (8.7) | — |
| **CẤU HÌNH HỆ THỐNG (4.8)** | Form dài chia section/tab theo nhóm cấu hình, nút "Lưu" dính cố định (sticky) dưới cùng, validate realtime khi nhập sai tổng trọng số | — |

### 8.9 Responsive / Mobile-friendly (bắt buộc — mục 2)

Toàn bộ spec ở 8.1-8.8 mặc định cho desktop — dưới đây là cách **mỗi pattern đó biến đổi** trên màn hình nhỏ. Quan trọng hơn cả các module khác vì GV/TG được xác nhận thao tác chính (check-in, xem lịch dạy, đăng ký slot, xem thông báo) từ điện thoại (mục 2, mục 4.4).

**Breakpoint:** theo mặc định Tailwind — dưới `md` (768px) coi là mobile.

**Sidebar → 2 lớp điều hướng trên mobile** (240px cố định không khả thi):
- **Bottom tab bar** (cố định đáy màn hình, 4 icon lớn dễ bấm ngón cái) cho 4 mục dùng nhiều nhất của GV/TG: Trang chủ / **Lịch dạy** (gộp cả xem lịch cá nhân lẫn xem slot trống/đăng ký — tức lối vào chính của Lớp học 4.2 và Đăng ký giảng dạy 4.3 trên mobile, không tách riêng tab) / Thông báo / Hồ sơ
- **Hamburger menu (☰)** ở topbar mobile mở drawer full-height chứa **toàn bộ menu còn lại** (Lớp học — chế độ xem đầy đủ cho Admin quản lý toàn bộ lớp thay vì chỉ lịch cá nhân, Nhân sự, Đánh giá chất lượng, Báo cáo, Nhật ký hệ thống, Cấu hình hệ thống — các mục Admin dùng nhiều hơn, chấp nhận vào sâu hơn 1 cấp trên mobile)

**Topbar mobile:** thu gọn còn hamburger (trái) — tên trang, có nút back thay breadcrumb dài (giữa) — bell + avatar (phải). Ô tìm kiếm toàn cục thu về 1 icon kính lúp, bấm mới mở overlay tìm kiếm toàn màn hình.

**Data table → Card list:** bảng nhiều cột **không dùng cuộn ngang** trên mobile (trải nghiệm kém) — dưới `md`, tự động chuyển mỗi hàng thành **1 card dọc** hiển thị 2-3 trường quan trọng nhất (vd tên + trạng thái + 1 số liệu chính), tap để xem đầy đủ.

**Drawer → Full-screen overlay:** Drawer 480-560px bên phải chỉ dùng trên desktop — dưới `md` chuyển thành **overlay toàn màn hình** (100% width/height), có nút back/close rõ ràng ở trên cùng.

**KPI Stat Card row → Carousel vuốt ngang** hoặc xếp dọc 1 cột (ưu tiên carousel để giữ cảm giác "hàng số liệu nhanh" giống desktop, vuốt ngón tay thay vì cuộn dọc dài).

**Chart trên mobile:** co giãn full-width, ẩn bớt gridline/label phụ. **Riêng Radar chart** (breakdown A/B/C, mục 4.4) khó đọc trên màn hình hẹp → đổi thành **3 progress bar ngang xếp dọc** trên mobile thay vì giữ dạng radar.

**Lịch dạy (mini-calendar) → List theo ngày:** trên mobile, ưu tiên hiển thị dạng **danh sách "Hôm nay / Ngày mai / Tuần này"** dễ đọc hơn calendar dạng lưới thu nhỏ.

**Touch target:** mọi nút/hành động trên mobile tối thiểu **44×44px** (chuẩn Apple/Google HIG), lớn hơn mức 40px của desktop.

**Ưu tiên đặc biệt — nút check-in (mục 4.4):** đây là hành động mobile quan trọng nhất của cả hệ thống (ảnh hưởng trực tiếp điểm B1) — khi có Bài đang trong khung giờ check-in, hiển thị dạng **banner nổi bật đầu Trang chủ** hoặc **floating action button**, không chôn trong nhiều cấp menu khiến người dùng dễ quên/khó tìm.

⚠️ Đây vẫn là **tham khảo phong cách + component spec**, chưa phải file Figma/design cuối cùng — nhưng đủ chi tiết để bắt đầu dựng Tailwind config + shadcn/ui theme nhất quán ngay từ dòng code đầu tiên, cho cả desktop lẫn mobile.
