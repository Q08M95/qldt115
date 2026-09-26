# Chương 1 — Làm quen với hệ thống

## 1.1 Hệ thống này dùng để làm gì?

Đây là một trang web nội bộ của tổ đào tạo. Trang web giúp cả đơn vị làm ba việc, và mỗi việc được giải quyết ở một khu riêng:

1. **Biết ai đang làm gì.** Mỗi giảng viên và trợ giảng có một hồ sơ: thông tin liên hệ, chuyên môn, chứng chỉ, các lớp đã dạy.
2. **Chia việc dạy một cách công bằng và có trật tự.** Khi mở một lớp học, các buổi cần người dạy được đăng lên. Người dạy có thể tự đăng ký, hoặc được quản lý mời. Quản lý duyệt và hệ thống tự kiểm tra trùng lịch.
3. **Đo chất lượng giảng dạy theo từng quý.** Hệ thống gom dữ liệu thật (điểm danh, khảo sát học viên, dự giờ, số giờ dạy…) rồi tính ra điểm **KPI**, để cả đơn vị nhìn thấy điều gì đang tốt, điều gì cần cải thiện.

Trang web **không** làm những việc sau: tính lương hoặc thù lao, chấm công để trả lương, quản lý hợp đồng lao động, và cũng không có tài khoản cho học viên. Học viên chỉ tham gia bằng một đường link khảo sát ẩn danh (xem mục 5.7).

> **Lưu ý:** Điểm KPI trong hệ thống dùng để nhìn lại chất lượng và ra quyết định phân công, đào tạo, khen thưởng. Điểm này **không** dùng để tính lương.

## 1.2 Ai dùng hệ thống, và mỗi người làm được gì?

Mỗi người có một tài khoản (email và mật khẩu). Có ba loại người dùng:

| Bạn là… | Bạn làm được |
|---|---|
| **Giảng viên hoặc Trợ giảng** | Xem các lớp và các buổi còn thiếu người; đăng ký dạy; trả lời lời mời; xem lịch dạy của mình; điểm danh (check-in) khi đến buổi dạy; xem KPI của mình và của mọi người; cập nhật hồ sơ của mình; xem các báo cáo toàn đơn vị. |
| **Người giữ Quyền Quản lý lớp** | Có **tất cả** quyền của Giảng viên/Trợ giảng, cộng thêm gần như toàn bộ quyền quản lý: tạo và quản lý lớp, mời và duyệt người dạy, nhập kết quả sau lớp, chấm dự giờ, chỉnh điểm danh, duyệt đề xuất nhân sự, xuất báo cáo, xem Nhật ký hệ thống, chỉnh cấu hình. Một người vừa có hồ sơ giảng dạy vừa được giao quyền này sẽ thấy **cả hai** bộ chức năng. |
| **Admin** | Toàn quyền, và là người duy nhất tạo tài khoản, đặt lại mật khẩu, sửa email đăng nhập, gán hoặc thu hồi Quyền Quản lý lớp. |

Giảng viên và Trợ giảng có quyền ngang nhau trong hệ thống. Điểm khác nhau chỉ là **vai trò trong lớp**: giảng viên đứng ở vị trí "Giảng viên", trợ giảng đứng ở vị trí "Trợ giảng".

> **Quan trọng:** Hồ sơ và điểm KPI của mọi người đều **công khai nội bộ**. Trang web không giấu điểm của đồng nghiệp với nhau. Ngoại lệ duy nhất là **nhãn nhóm** (xem mục 1.3), chỉ Admin và người giữ Quyền Quản lý lớp thấy.

## 1.3 Từ điển khái niệm

Bạn sẽ gặp các từ dưới đây trong suốt tài liệu và trên màn hình. Đọc kỹ bảng này một lần, các chương sau sẽ dễ hiểu hơn nhiều.

| Từ | Nghĩa |
|---|---|
| **Lớp học** | Một khóa học cụ thể, ví dụ "ACLS khóa 08". Lớp có tên, **nhóm lớp**, đối tượng học viên, loại kinh phí, địa điểm, ngày bắt đầu và kết thúc. |
| **Nhóm lớp** | Loại khóa học: ABCDE, ACLS, BLS, SCC-LX, SCC-CĐ… Mỗi nhóm lớp có sẵn một **hệ số độ khó (D1)** do Admin cấu hình. |
| **Đối tượng** | Học viên của lớp là **Nhân viên y tế** hay **Cộng đồng**. |
| **Loại kinh phí** | Lớp **Có kinh phí** (có nguồn tài trợ) hay **Không kinh phí**. Hai thuộc tính "đối tượng" và "loại kinh phí" độc lập nhau. Lớp không kinh phí được ghi nhận riêng để công bằng và vinh danh (xem chỉ số A4, mục 4.5). |
| **Bài** | Một buổi học cụ thể của lớp: có tên nội dung, giờ bắt đầu, giờ kết thúc. **Mỗi Bài có số người cần riêng** (ví dụ Bài lý thuyết cần 1 giảng viên, Bài thực hành cần 1 giảng viên và 3 trợ giảng). Bài là đơn vị dùng để kiểm tra trùng lịch, tính giờ dạy và điểm danh. |
| **Slot** | Một **vị trí** cần người trong một Bài. Ví dụ Bài 2 cần 1 giảng viên và 3 trợ giảng thì Bài 2 có 4 slot. Đăng ký, mời và duyệt luôn làm ở cấp slot. |
| **Vai trò** | **Giảng viên** hoặc **Trợ giảng**. Quyết định bạn được đăng ký vào loại slot nào. |
| **Nhóm nhân sự** | 5 nhóm: Ban giám đốc, Giảng viên là bác sĩ, Giảng viên không là bác sĩ, Trợ giảng là bác sĩ, Trợ giảng không là bác sĩ. Mỗi lớp quy định nhóm nào được đăng ký. Hệ thống dùng nhóm ngầm khi tính điểm và gợi ý người dạy. **Giảng viên/Trợ giảng không thấy tên nhóm**, để tránh cảm giác bị xếp hạng. |
| **Chứng chỉ** | Bằng hoặc chứng nhận bạn khai trong hồ sơ. Một số lớp yêu cầu chứng chỉ thì chỉ người có chứng chỉ đó mới được đăng ký. |
| **Đăng ký** | Bạn chủ động xin dạy một Bài còn thiếu người. Chờ quản lý duyệt. |
| **Lời mời** | Quản lý chủ động mời bạn dạy một Bài. Bạn trả lời "Đồng ý" hoặc "Từ chối". |
| **Phân công** | Bạn đã được duyệt (hoặc đã đồng ý lời mời). Slot đó là của bạn. |
| **Check-in** | Bấm nút **"Tôi đã có mặt"** khi đến buổi dạy. Hệ thống dùng thời điểm này để tính điểm đúng giờ (B1). |
| **Kỳ đánh giá** | Một quý (3 tháng). KPI luôn được tính theo kỳ. |
| **KPI** | Điểm từ 0 đến 100 đo chất lượng giảng dạy của bạn trong một kỳ (xem Chương 4). |

### Trạng thái của một lớp

| Trạng thái | Ý nghĩa |
|---|---|
| **Dự kiến** | Lớp vừa tạo, chưa mở đăng ký. Thường chỉ quản lý thấy, trừ khi quản lý chọn "Công khai sớm". |
| **Đang mở đăng ký** | Giảng viên/trợ giảng đăng ký được. |
| **Đã đủ đăng ký** | Tự động: mọi Bài trong lớp đã đủ người cho mọi vai trò cần. |
| **Đang diễn ra** | Lớp đã bắt đầu. |
| **Đã hoàn thành** | Lớp đã kết thúc. Lúc này mới nhập được kết quả khảo sát (C1) và tỷ lệ đạt (C3). |
| **Đã hủy** | Lớp bị hủy. Không mở lại được. Lịch sử phân công vẫn được giữ. |

### Trạng thái của một slot

**Trống** → **Đang chờ duyệt** (có đăng ký hoặc lời mời chưa xử lý) → **Đã phân công**. Nếu lời mời bị từ chối, hoặc người đã được phân công bị hủy, slot **quay về Trống** và mở lại cho người khác.

### Trạng thái tham gia giảng dạy của một người

| Trạng thái | Ý nghĩa |
|---|---|
| **Đang tham gia** | Bình thường: đăng ký được, được gợi ý phân công. |
| **Tạm ngừng** | Tạm thời không tham gia. Bị ẩn khỏi danh sách gợi ý và không đăng ký được slot mới. |
| **Không còn tham gia** | Không còn làm việc trong hệ thống này. Vẫn giữ nguyên hồ sơ và lịch sử KPI để tra cứu. |

Trạng thái này chỉ phản ánh việc bạn có hoạt động trong hệ thống hay không. Nó **không phải** trạng thái lao động hay hợp đồng.

## 1.4 Một Bài có người dạy bằng hai cách

Có hai đường dẫn tới cùng một kết quả là slot chuyển sang **Đã phân công**.

```
Cách A — Bạn chủ động
  Bạn thấy Bài còn thiếu người  →  Bạn đăng ký  →  Quản lý duyệt  →  Đã phân công

Cách B — Bạn được mời
  Quản lý mời bạn  →  Bạn bấm Đồng ý  →  Đã phân công
                      (hoặc Từ chối → slot quay về Trống để mời người khác)
```

Bạn có thể **đăng ký nhiều Bài trong một lượt** (ví dụ "đăng ký hết các Bài lý thuyết của lớp này"). Bạn cũng trả lời lời mời **độc lập từng Bài**: đồng ý một Bài, từ chối Bài khác.

Hệ thống không cho hai điều sau:
- **Hai người cùng một vị trí**: một slot chỉ có một người.
- **Trùng giờ**: bạn không được phân công hai Bài diễn ra cùng giờ, dù cùng lớp hay khác lớp.

## 1.5 Vòng đời của một lớp học

| Bước | Việc xảy ra | Kết quả |
|---|---|---|
| 1 | Quản lý **tạo lớp** | Lớp ở trạng thái **Dự kiến** |
| 2 | Quản lý **thêm các Bài** | Mỗi Bài có giờ học và số slot Giảng viên/Trợ giảng riêng |
| 3 | Quản lý bấm **Mở đăng ký** | Lớp **Đang mở đăng ký**, mọi giảng viên/trợ giảng thấy |
| 4 | Đăng ký, lời mời, duyệt | Các slot dần chuyển sang **Đã phân công** |
| 5 | Đến ngày học | Người dạy check-in bằng nút **Tôi đã có mặt** |
| 6 | Kết thúc lớp | Quản lý bấm **Hoàn thành lớp** |
| 7 | Nhập kết quả | Khảo sát học viên (C1), tỷ lệ đạt (C3) |
| 8 | Cuối quý | KPI được tính, kỳ đánh giá được đóng và công bố |

> **Ví dụ:** Lớp "ACLS khóa 08" có 3 Bài. Bài 1 (lý thuyết) cần 1 giảng viên. Bài 2 và Bài 3 (thực hành) mỗi Bài cần 1 giảng viên và 3 trợ giảng. Như vậy lớp có 1 + 4 + 4 = 9 slot, mỗi slot được lấp riêng. Giảng viên A có thể nhận cả 3 slot giảng viên của 3 Bài, trong khi mỗi Bài thực hành có thể có 3 trợ giảng khác nhau.

![Ảnh 1.1 — Sơ đồ tổng quan: lớp gồm nhiều Bài, mỗi Bài gồm nhiều slot](1.1)
