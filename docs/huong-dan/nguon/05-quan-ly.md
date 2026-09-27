# Chương 5 — Hướng dẫn cho Admin và người giữ Quyền Quản lý lớp

Chương này dành cho người quản lý. Bạn vẫn dùng được mọi chức năng của Chương 3 (nếu có hồ sơ giảng dạy). Ở đây là các chức năng **thêm** của người quản lý.

> **Quan trọng:** Hai vai trò gần như giống nhau, khác ở một số việc về **tài khoản**. Chỉ **Admin** mới: tạo tài khoản mới, đặt lại mật khẩu và sửa email đăng nhập cho người khác, gán hoặc thu hồi Quyền Quản lý lớp. **Người giữ Quyền Quản lý lớp** không làm được các việc này, nhưng làm được mọi việc còn lại của Chương này.

## 5.1 Trang Tổng quan của quản lý

Ngoài các khối chung (mục 3.1), quản lý có thêm:

- **Tỷ lệ lấp đầy slot của các lớp đang mở** (thanh ngang cho từng lớp). Nếu có Bài đang thiếu người quá mức, thẻ có nhãn **"N cảnh báo pool nhỏ"** (xem mục 5.4).
- **Lớp theo trạng thái** (biểu đồ tròn).
- **Tỷ lệ đăng ký trung bình** toàn đơn vị (biểu đồ đồng hồ).

Nếu bạn vừa là quản lý vừa có hồ sơ giảng dạy, trang Tổng quan hiện **cả hai bộ** khối. Các khối trùng nhau chỉ hiện **một lần**.

![Ảnh 5.1 — Trang Tổng quan của Admin](5.1)

## 5.2 Tạo một lớp học

1. Vào **Lớp học**, bấm **Tạo lớp** (góc trên bên phải).
2. Trong cửa sổ **Tạo lớp học**, điền:

| Ô | Ghi chú |
|---|---|
| **Tên lớp** | Ví dụ "ACLS khóa 08". |
| **Nhóm lớp** | Chọn loại khóa học. Mỗi nhóm lớp có sẵn **hệ số độ khó D1**. |
| **Đối tượng** | Nhân viên y tế hoặc Cộng đồng. |
| **Loại kinh phí** | Có kinh phí hoặc Không kinh phí. Lớp không kinh phí được ghi nhận vào chỉ số A4. |
| **Nhóm đủ điều kiện đăng ký** | Tick một hoặc nhiều trong 5 nhóm nhân sự. **Chỉ người thuộc các nhóm này mới đăng ký hay được gợi ý.** Ví dụ lớp ACLS chỉ mở cho "Giảng viên là bác sĩ" và "Trợ giảng là bác sĩ". |
| **Chứng chỉ yêu cầu thêm** (nếu cần) | Lọc thêm bên trong các nhóm đã chọn. |
| **Ngày bắt đầu, Ngày kết thúc**, **Địa điểm** | |
| **Công khai sớm khi còn Dự kiến** | Tick nếu muốn giảng viên/trợ giảng nhìn thấy lớp trước khi mở đăng ký. |

3. Bấm **Tạo lớp**. Lớp mới ở trạng thái **Dự kiến**.

Muốn đổi thông tin sau này, vào chi tiết lớp và bấm **Sửa lớp học**. Các Bài và slot chỉnh riêng ở trang chi tiết lớp.

![Ảnh 5.2 — Cửa sổ Tạo lớp học](5.2)

### Tạo nhanh nhiều lớp cùng lúc từ kế hoạch năm

Nếu đơn vị đã có sẵn kế hoạch đào tạo (biết trước tháng nào mở lớp gì, gồm cả danh sách Bài), bấm **Nhập từ CSV** (cạnh nút Tạo lớp) để tạo hàng loạt lớp kèm Bài trong một lần, thay vì tạo tay từng lớp:

1. Tải file mẫu **"mau tao lop.xlsx"** (ở gốc dự án) để biết đúng các cột cần điền và xem danh mục nhóm lớp/nhóm nhân sự/chứng chỉ hiện có.
2. Điền vào sheet "Mẫu tạo lớp": mỗi dòng là 1 Bài. Các cột của lớp (tên, nhóm lớp, đối tượng, loại kinh phí…) chỉ cần điền ở dòng Bài **đầu tiên** của mỗi "mã lớp" — dòng sau để trống là tự lấy lại.
3. Dán nội dung (hoặc chọn file .csv) vào ô nhập, bấm **Tạo lớp và Bài**.
4. Xem kết quả theo từng lớp: lớp nào lỗi (tên nhóm lớp/chứng chỉ gõ sai, giờ Bài không hợp lệ…) sẽ không được tạo, báo rõ dòng lỗi để sửa và nhập lại.

Lớp tạo từ CSV cũng ở trạng thái **Dự kiến** như tạo tay — hãy rà lại trước khi mở đăng ký.

## 5.3 Thêm các Bài vào lớp

Lớp chưa có Bài thì chưa có slot. Ở trang chi tiết lớp, bấm **Thêm Bài** và điền:

- **Nội dung / tên Bài**, ví dụ "Lý thuyết hồi sinh tim phổi".
- **Bắt đầu** và **Kết thúc**: ngày giờ cụ thể của buổi học.
- **Số slot Giảng viên** và **Số slot Trợ giảng**: mỗi Bài có nhu cầu **riêng**.

Bài là buổi học cụ thể, dùng để kiểm tra trùng lịch, tính giờ dạy (A1) và điểm danh.

Sửa hoặc xóa một Bài bằng các nút ở dòng Bài đó. Lưu ý:

- **Giảm số slot** chỉ được khi các slot bị bỏ đi còn **trống**.
- Nếu **đổi giờ** một Bài đã có người phân công, hệ thống **kiểm tra trùng lịch** với các Bài khác của họ. Nếu ai bị trùng, hệ thống từ chối và nói rõ. Khi đổi được, những người liên quan **nhận thông báo đổi lịch tự động**.

![Ảnh 5.3 — Cửa sổ Thêm Bài](5.3)

## 5.4 Mời người dạy (gợi ý và xếp hạng)

Ngay khi một Bài được tạo, hệ thống **tự xếp hạng** những người đủ điều kiện. Bảng **Gợi ý nhân sự** hiện ngay dưới Bài.

**Bộ lọc cứng** (người không thỏa thì không xuất hiện): thuộc nhóm đủ điều kiện của lớp, đủ chứng chỉ yêu cầu, trạng thái **Đang tham gia**, không trùng lịch với Bài khác đã được duyệt.

**Xếp hạng** trong số người còn lại: người **dạy ít giờ hơn trong kỳ** lên trước (khoảng 80% ảnh hưởng), khi ngang nhau thì **KPI kỳ gần nhất cao hơn** lên trước (khoảng 20%). Với lớp không kinh phí, **A4 thấp hơn** lên trước. Người đã dạy Bài khác trong cùng lớp bị hạ nhẹ để việc được chia đều. Tỷ lệ 80/20 có thể chỉnh (mục 5.13).

**Để mời:** bấm **Mời** ở dòng người bạn chọn. Trạng thái đổi thành **Đã mời — chờ phản hồi**, và người đó nhận thông báo. Bạn có thể bấm **Thu hồi** nếu đổi ý trước khi họ trả lời.

**Mời ngoại lệ:** đôi khi bạn muốn mời người **ngoài danh sách đề xuất** (ví dụ giảng viên thỉnh giảng đã thống nhất với Ban giám đốc). Bấm **Mời ngoại lệ**, chọn **Nhân sự**, và nhập **Lý do mời ngoại lệ (bắt buộc)**. Danh sách chọn cho biết ai **đủ điều kiện**, ai **ngoài đề xuất**, và ai **không thể mời** (trùng lịch hoặc đã có đăng ký ở Bài này).

**Cảnh báo pool nhỏ:** nếu số người đủ điều kiện **thấp hơn ngưỡng** (khởi điểm là 3), bảng hiện dòng cảnh báo, ví dụ **"Chỉ có 2 người đủ điều kiện (ngưỡng cảnh báo: dưới 3). Nên mời sớm thay vì chờ đăng ký."** Nếu không có ai, hãy kiểm tra lại xem điều kiện nhóm hoặc chứng chỉ của lớp có quá hẹp không. Cảnh báo này chỉ quản lý thấy.

![Ảnh 5.4 — Gợi ý nhân sự cho một Bài và nút Mời](5.4)

## 5.5 Duyệt đăng ký

Khi giảng viên/trợ giảng đăng ký, bạn nhận thông báo **"Đăng ký cần duyệt"**. Thông báo được **gộp theo lớp** (một thông báo cho mỗi lớp, cập nhật số người đang chờ). Thông báo này không tự mất khi bạn bấm xem, chỉ hết hiệu lực khi bạn đã xử lý xong.

Duyệt ở hai nơi:

- Trang **Đăng ký giảng dạy**, khối **Đăng ký chờ duyệt** đầu trang, tổng hợp mọi lớp.
- Trang chi tiết lớp, ngay tại từng Bài (bạn xem được xếp hạng gợi ý ngay bên cạnh).

Mỗi đăng ký có hai nút: **Duyệt** và **Từ chối**.

- **Duyệt:** người đó được phân công. Nếu slot đã đủ người thì các đăng ký còn lại của slot đó tự đóng.
- **Từ chối:** đăng ký bị từ chối được ghi lại, slot vẫn mở cho người khác. Người đăng ký nhận thông báo.
- **Cảnh báo dồn tải:** nếu việc duyệt khiến một người đảm nhiệm **quá 70%** số slot của một vai trò trong cùng lớp (ngưỡng chỉnh được), hệ thống hỏi lại, ví dụ **"Người này sẽ đảm nhiệm 3/4 Bài trong lớp này — vẫn duyệt?"**. Bấm **Vẫn duyệt** để tiếp tục. Đây là **cảnh báo mềm**, không chặn, vì đôi khi để một giảng viên dạy xuyên suốt cả khóa là chủ ý.
- **Tự duyệt:** nếu bạn duyệt đăng ký của chính mình, hệ thống **không chặn** nhưng gắn nhãn **tự duyệt** trong Nhật ký.

**Hủy phân công:** bấm **Hủy phân công** ở người đã được phân công (kèm lý do). Slot quay về **Trống**, người đó nhận thông báo, hệ thống ghi vào Nhật ký.

![Ảnh 5.5 — Khối "Đăng ký chờ duyệt" và các nút Duyệt, Từ chối](5.5)

## 5.6 Mở đăng ký, theo dõi và đóng lớp

Ở trang chi tiết lớp, các nút thay đổi theo trạng thái của lớp:

| Nút | Khi nào và làm gì |
|---|---|
| **Mở đăng ký** | Lớp đang **Dự kiến**. Lớp chuyển sang **Đang mở đăng ký** và hiển thị công khai với mọi giảng viên/trợ giảng. Người đủ điều kiện nhận thông báo lớp mới. Nên thêm đủ các Bài trước. |
| **Đưa về Dự kiến** | Đưa lớp về lại trạng thái chưa mở đăng ký khi cần chỉnh sửa. |
| **Hoàn thành lớp** | Khi lớp đã kết thúc. Lớp chuyển **Đã hoàn thành**, và **mở khóa** phần nhập kết quả C1 và C3 (mục 5.7). |
| **Hủy lớp** | Lớp chuyển **Đã hủy** và **không thể mở lại**. Lịch sử phân công vẫn được giữ. Những người đã phân công hoặc đang chờ nhận thông báo tự động. |
| **Xóa lớp** | **Chỉ dùng cho lớp Dự kiến.** Xóa vĩnh viễn lớp cùng các Bài và slot của lớp. |

Các nút có hộp **xác nhận** để tránh bấm nhầm. Mọi thay đổi trạng thái lớp đã mở đều được ghi vào **Nhật ký hệ thống**.

Trạng thái **Đã đủ đăng ký** và **Đang diễn ra** do hệ thống tự cập nhật, không có nút để bấm.

## 5.7 Sau khi lớp hoàn thành: nhập kết quả C1 và C3

Khi lớp **Đã hoàn thành**, trang chi tiết lớp hiện khối kết quả gồm hai chỉ số dùng cho KPI của **mọi người đã dạy lớp đó**.

### C1 — Khảo sát hài lòng học viên

Có **hai cách**, và cách nào nhập **sau cùng** sẽ **ghi đè** cách kia (không cộng dồn):

**Cách 1 — Link khảo sát tự động (khuyến nghị):**

1. Bấm **Tạo link khảo sát**.
2. Bấm **Sao chép** (hoặc **Sao chép link đầy đủ**) và gửi cho học viên qua Zalo, in thành mã QR dán ở lớp… Học viên **không cần đăng nhập**, phản hồi ẩn danh.
3. Học viên trả lời hai câu: hài lòng về giảng viên và trợ giảng, hài lòng về khóa học nói chung (chấm 1 đến 5).
4. Hệ thống **tự tính trung bình** và đổi sang % mỗi khi có phản hồi mới. Trạng thái hiện **Đang nhận phản hồi**.
5. Khi đủ phản hồi, bấm **Đóng khảo sát** (trạng thái **Đã đóng**). Có thể **Mở lại khảo sát**.

**Cách 2 — Nhập tay:** nếu khảo sát làm ngoài hệ thống (giấy, kênh khác), nhập **% tổng hợp** (từ 0 đến 100) vào ô **C1 — nhập tay** rồi bấm **Lưu**. Không cần danh sách học viên.

### C3 — Tỷ lệ học viên đạt chuẩn đầu ra

Nhập **% tổng hợp** (0 đến 100) vào ô **C3 — nhập tay** rồi bấm **Lưu**.

> **Mẹo:** Nhập C1 và C3 **trước khi đóng kỳ đánh giá**. Nếu thiếu, danh sách kiểm tra trước khi đóng kỳ sẽ nhắc bạn (mục 5.10).

![Ảnh 5.7 — Khối kết quả lớp: link khảo sát và ô nhập C1, C3](5.7)

## 5.8 Chấm dự giờ (C2) và chỉnh điểm danh (B1)

Cả hai việc này nằm ở **hồ sơ của từng người** (**Nhân sự** → chọn người), trong khối **Dự giờ và điểm danh**, chỉ quản lý thấy. Khối liệt kê các Bài đã bắt đầu của người đó.

**Chấm dự giờ (C2):**

1. Ở dòng Bài bạn đã dự giờ, bấm **Chấm dự giờ**.
2. Chọn **Mức đánh giá** theo rubric (Xuất sắc 100, Tốt 80, Đạt 60, Chưa đạt 0). Điểm sẽ được nhân với hệ số độ khó của Bài (tối đa 100).
3. Có thể thêm **Ghi chú dự giờ** (không bắt buộc). Ghi chú chỉ quản lý và chính người được chấm đọc được.
4. Lưu. Có thể xóa điểm dự giờ (điểm đó không còn tính vào KPI, có thể chấm lại).

Bạn **không tự chấm cho chính mình**. Không chấm hoặc sửa được Bài thuộc **kỳ đã đóng**, phải mở lại kỳ trước.

**Chỉnh điểm danh (B1):**

1. Ở dòng Bài, bấm **Sửa điểm**.
2. Nhập **Điểm B1 (0–100%)**, với 100 là đúng giờ và 0 là vắng hoặc trễ quá ngưỡng.
3. Nhập **Lý do chỉnh sửa** (**bắt buộc**, tối thiểu 5 ký tự). Ví dụ: "mất mạng lúc check-in, có xác nhận của quản lý".

Điểm sửa tay được đánh dấu **sửa tay**, người bị sửa nhận thông báo, hành động được ghi vào Nhật ký. Chỉ nên dùng khi có lỗi kỹ thuật hoặc khiếu nại hợp lý.

> **Lưu ý (khuyến nghị):** Vì rất khó dự giờ hết mọi người mỗi quý, hãy **dự giờ có chọn lọc**: người mới, hoặc người có KPI thấp ở kỳ trước.

## 5.9 Quản lý nhân sự

### Xem danh sách

Vào **Nhân sự**. Lọc theo **trạng thái tham gia**, **vai trò**, **chuyên môn** và **nhóm** (bộ lọc nhóm chỉ quản lý thấy). Bấm vào một người để mở hồ sơ. Nhãn nhóm cũng chỉ quản lý thấy.

### Thêm một người mới (chỉ Admin)

1. Ở trang **Nhân sự**, bấm **Thêm nhân sự**.
2. Điền **Họ và tên**, **Email đăng nhập**, **Mật khẩu tạm** (tối thiểu 8 ký tự) và **Nhóm**.
3. Bấm **Tạo tài khoản**. Tài khoản dùng được ngay, **không cần thư xác nhận**.

Có thể **để trống Nhóm** và xếp sau trong hồ sơ. Người **chưa có nhóm** sẽ chưa dùng được cho đăng ký lớp. Hãy gửi email và mật khẩu tạm cho người đó và dặn họ **đổi mật khẩu ngay**.

### Thêm nhiều người cùng lúc (chỉ Admin)

1. Bấm **Nhập từ CSV**.
2. **Dán trực tiếp từ Excel** (các cột cách nhau bằng Tab) hoặc chọn file `.csv`. Mỗi dòng có dạng: **email, họ tên, nhóm, mật khẩu**. Tối đa **200 dòng** mỗi lần. Dòng tiêu đề (bắt đầu bằng "email") được bỏ qua.
3. Cột **nhóm** ghi **tên đầy đủ** (ví dụ "Giảng viên là bác sĩ") hoặc mã (ví dụ `gv_bac_si`). Cột **mật khẩu** có thể để trống, khi đó hệ thống **tự sinh mật khẩu tạm**.
4. Bấm **Tạo tài khoản**. Kết quả từng dòng hiện **Thành công** hoặc **Lỗi** (ví dụ thiếu email, thiếu họ tên).

> **Quan trọng:** Mật khẩu tạm do hệ thống tự sinh **chỉ hiện đúng một lần**. Hãy bấm **Sao chép (email ⇥ mật khẩu)** và lưu lại ngay.

### Đặt lại mật khẩu, sửa email (chỉ Admin)

Trong hồ sơ người đó, bấm **Đặt lại mật khẩu** (nhập mật khẩu tạm mới) hoặc **Sửa email** (đổi email đăng nhập). Việc sửa email có hiệu lực ngay, không gửi thư xác nhận, mật khẩu giữ nguyên. Hệ thống **không bao giờ ghi mật khẩu** vào Nhật ký.

### Chỉnh sửa hồ sơ của người khác

**Chỉnh sửa hồ sơ** (họ tên, số điện thoại, kinh nghiệm, chuyên môn) và **thêm hoặc sửa chứng chỉ** giúp người đó. Việc này được ghi vào Nhật ký.

### Quản trị hồ sơ

Bấm **Quản trị hồ sơ** để đổi:

- **Trạng thái tham gia giảng dạy:** Đang tham gia, Tạm ngừng, Không còn tham gia. Khi không còn "Đang tham gia", người đó bị **ẩn khỏi đăng ký slot mới và gợi ý phân công**, nhưng **vẫn giữ lịch sử KPI và hồ sơ**.
- **Nhóm:** một trong 5 nhóm. Đây là việc **Admin xác định dựa trên chuyên môn**, không tự động. Giảng viên/trợ giảng không thấy nhãn này.
- **Quyền Quản lý lớp:** bật hoặc tắt (**chỉ Admin được gán hoặc thu hồi**). Đây là quyền nhạy cảm nhất trong hệ thống, việc gán hay thu hồi đều được ghi rõ vào Nhật ký, và người liên quan được thông báo ngay.

### Đề xuất nhân sự

Vào **Nhân sự → Đề xuất nhân sự**. Đây là nơi tập trung các đề xuất cần bạn quyết, chia hai tab **Chờ duyệt** và **Đã xử lý**. Có bốn loại:

| Loại | Ý nghĩa |
|---|---|
| **Tăng/giảm phân công** | Đề xuất điều chỉnh khối lượng việc của một người. |
| **Đào tạo bồi dưỡng** | Đề xuất cử người đi đào tạo. |
| **Khen thưởng/nhắc nhở** | Ghi nhận thủ công. |
| **Đổi nhóm** | Do **hệ thống tự sinh** khi đóng kỳ, theo ngưỡng thăng giáng (mục 4.11). |

Bạn có thể **Tạo đề xuất** thủ công (chọn người, loại, nội dung). Mỗi đề xuất có nút **Duyệt** hoặc **Bỏ qua**. Duyệt một đề xuất đổi nhóm thì hồ sơ **đổi nhóm ngay**, nhưng ảnh hưởng tính điểm chỉ bắt đầu từ **kỳ tiếp theo**. Người liên quan nhận thông báo kết quả.

![Ảnh 5.9 — Hồ sơ một nhân sự với các nút quản trị](5.9)

## 5.10 Quản lý kỳ đánh giá

Vào **Cấu hình hệ thống → Kỳ đánh giá**.

### Tạo kỳ

Bấm **Tạo kỳ đánh giá**, nhập **Tên kỳ** (ví dụ "Quý 4/2026"), **Từ ngày** và **Đến ngày**. Mỗi kỳ là một quý và **không chồng ngày** với kỳ khác. Chỉ có thể **xóa** kỳ đang ở trạng thái **Đang mở**.

### Vòng đời

```
Đang mở  ⇄  Chờ duyệt  →  Đã đóng
```

| Bạn muốn | Bấm | Kết quả |
|---|---|---|
| Xem trước điểm để rà soát | **Chuyển sang chờ duyệt** | KPI ẩn với giảng viên/trợ giảng, chỉ quản lý xem. |
| Quay lại thu thập tiếp | **Quay lại đang mở** | Kỳ tiếp tục thu thập dữ liệu, KPI hiện công khai. |
| Chốt và công bố | **Đóng kỳ** | Điểm **khóa cứng**, lưu bản cấu hình đã dùng, mọi người nhận thông báo công bố KPI, hệ thống sinh **đề xuất đổi nhóm**. |
| Sửa sai sau khi đóng | **Mở lại kỳ** | Chỉ mở được **kỳ đã đóng gần nhất**, **bắt buộc nhập lý do**. Kết quả khóa bị xóa, các đề xuất đổi nhóm đang chờ do lần đóng đó bị thu hồi. **Không mở lại được** nếu đề xuất đổi nhóm từ kỳ đó đã được duyệt. |

Phải đóng kỳ **theo thứ tự thời gian**: kỳ sớm hơn đóng trước.

### Danh sách kiểm tra trước khi đóng kỳ

Mở chi tiết kỳ, khối **Kiểm tra trước khi đóng kỳ** cho biết:

- Kỳ đã kết thúc hay chưa.
- Mọi lớp có Bài đã dạy trong kỳ đã **"Đã hoàn thành"** chưa (kèm danh sách lớp chưa hoàn thành, chưa nhập C1/C3 được).
- Lớp thiếu **C1**, lớp thiếu **C3**.
- Lượt dạy nào chưa có **điểm danh (B1)**.

Đây chỉ là **cảnh báo, không chặn**. Khi đủ, thẻ ghi **Sẵn sàng đóng kỳ**. Bên dưới là **bảng KPI toàn đơn vị** của kỳ để bạn xem trước.

## 5.11 Báo cáo và xuất file

Trang **Báo cáo** như mô tả ở mục 3.11. Riêng quản lý thấy thêm **nhãn nhóm** trong bảng KPI tổng hợp, và có nút **Xuất Excel** và **Xuất PDF** ở đầu trang.

- Một lần bấm xuất ra **một file duy nhất** chứa 4 báo cáo chính thức: **KPI tổng hợp, Sản lượng giảng dạy, A4 và Đề xuất nhân sự**, đúng theo kỳ hoặc khung thời gian đang chọn.
- **Excel** là bảng số nhiều sheet. **PDF** là báo cáo có thiết kế: trang bìa, thẻ số, biểu đồ, bảng top, và trang **Phụ lục** giải thích các chỉ số.
- Chỉ quản lý xuất được, vì file tải về dễ sao chép, chia sẻ.

> **Chưa có:** Bản PDF xuất báo cáo **chưa gồm trang Tổng quan**. Phần này sẽ bổ sung sau.

## 5.12 Nhật ký hệ thống

**Nhật ký hệ thống** ghi lại **ai đã làm gì, khi nào, với đối tượng nào**, kèm **giá trị trước và sau** của những thứ thay đổi. Quản lý xem **toàn bộ**.

Ghi lại các việc như: duyệt hoặc từ chối đăng ký (có nhãn tự duyệt); mời, thu hồi lời mời; hủy phân công; sửa hoặc hủy lớp, đổi giờ Bài; nhập kết quả C1/C3; đổi trạng thái tham gia, đổi nhóm, gán hoặc thu hồi Quyền Quản lý lớp; chỉnh điểm danh B1; chấm dự giờ C2; sửa hồ sơ người khác; mọi thay đổi **cấu hình**; các thao tác **kỳ đánh giá**; tạo tài khoản, đặt lại mật khẩu, sửa email.

Cách dùng:

- Lọc theo **loại hành động**, **khoảng ngày** (**Từ ngày**, **Đến ngày**) và **từ khóa** (nội dung hoặc người thực hiện). Bấm **Lọc**.
- Bấm **Xem thay đổi** ở một dòng để xem bảng **trước → sau**. Bấm **Mở liên quan** để đến đối tượng liên quan.
- Bấm **Xuất Excel** để tải theo đúng bộ lọc đang xem (tối đa 5000 dòng mới nhất).
- Nhật ký **chỉ thêm, không sửa, không xóa được**. Thao tác chạy trực tiếp trong công cụ kỹ thuật (không có người đăng nhập) cố ý không ghi.

## 5.13 Cấu hình hệ thống

Vào **Cấu hình hệ thống** (menu bên trái). Trang gồm bốn thẻ. Mọi giá trị đều **đổi được bằng giao diện**, và thay đổi được ghi vào Nhật ký với giá trị cũ và mới.

> **Quan trọng:** Thay đổi cấu hình **không làm đổi điểm của các kỳ đã đóng**. Kỳ **Đang mở** và **Chờ duyệt** dùng cấu hình mới nhất (để bạn sửa được số nhập sai ngay trong kỳ).

### Danh mục

- **Chuyên môn:** trình độ, bằng cấp để gán vào hồ sơ (bác sĩ, điều dưỡng, thạc sĩ…).
- **Loại chứng chỉ:** danh sách chọn khi nhân sự khai chứng chỉ, và làm điều kiện cho lớp yêu cầu chứng chỉ.
- **Nhóm lớp** kèm **hệ số D1** của từng nhóm (ABCDE, ACLS, BLS, SCC-LX, SCC-CĐ…).

Thêm một mục mới bằng ô **Thêm mục mới…**, sửa tên rồi **Lưu tên**, hoặc bỏ mục không dùng.

### Cấu hình KPI

- **Trọng số** của các nhóm A, B, C (khởi điểm 25/30/45) và của từng tiêu chí trong nhóm. **Tổng trọng số của mỗi nhóm phải bằng 100%**, hệ thống báo ngay khi bạn nhập sai và không cho lưu.
- **Bật hoặc tắt** từng tiêu chí.
- **Hệ số độ khó D2 và D3** (D1 nằm ở Danh mục, nhóm lớp).
- **Tham số khác:** số người tối thiểu để dùng xếp hạng A1 (khởi điểm 5), số kỳ dùng để so lịch sử, cách gộp C1/C3 khi dạy nhiều lớp, và **ngưỡng đổi nhóm** (thăng: điểm và số kỳ; giáng: điểm và số kỳ).
- **Điểm danh B1:** số phút cho phép check-in trước giờ học (khởi điểm 45), **ngưỡng trễ tối đa** (khởi điểm 30 phút, quá mức này B1 = 0%), và số phút gửi **thông báo nhắc check-in** trước giờ học (khởi điểm 30).
- **Rubric dự giờ (C2):** tên và mô tả 4 mức.

### Đăng ký và matching

- **Ngưỡng cảnh báo pool nhỏ** (khởi điểm 3 người).
- **Ngưỡng cảnh báo dồn tải** (khởi điểm 70%).
- **Tỷ trọng công bằng khối lượng** trong xếp hạng gợi ý (khởi điểm 80%, phần còn lại là KPI khi khối lượng ngang nhau).
- **Mức hạ điểm** khi ứng viên đã dạy Bài khác trong cùng lớp (khởi điểm 10%).

Có nút **Lưu cấu hình** cố định dưới cùng. Giá trị mới áp dụng ngay cho các lần gợi ý và cảnh báo sau đó.

### Kỳ đánh giá

Như mục 5.10.

![Ảnh 5.13 — Trang Cấu hình hệ thống](5.13)

## 5.14 Việc cần làm theo thời điểm

**Hằng ngày / hằng tuần**

- Xem **thông báo** và khối **Đăng ký chờ duyệt**, duyệt hoặc từ chối đăng ký.
- Kiểm tra các Bài có nhãn **cảnh báo pool nhỏ**, mời sớm.
- Theo dõi **Vận hành đăng ký** và **Sản lượng giảng dạy** để chắc việc được chia đều.

**Sau mỗi lớp**

- Bấm **Hoàn thành lớp**.
- Tạo **link khảo sát** (C1) và nhập **C3**.
- Kiểm tra điểm danh, chỉnh nếu có lý do chính đáng.

**Cuối quý**

1. Bảo đảm mọi lớp trong kỳ đã **Hoàn thành**, đã có **C1** và **C3**.
2. Dự giờ (C2) cho những người ưu tiên.
3. Chuyển kỳ sang **Chờ duyệt**, xem bảng KPI, rà soát các trường hợp bất thường.
4. **Đóng kỳ** để công bố.
5. Vào **Đề xuất nhân sự** xử lý các đề xuất đổi nhóm.
6. Xuất báo cáo Excel/PDF phục vụ họp xét duyệt.
7. Tạo kỳ đánh giá cho quý tiếp theo.
