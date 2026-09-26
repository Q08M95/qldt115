# Chương 4 — KPI và cách đo lường chất lượng

Chương này giải thích **từ đầu** điểm KPI được tính như thế nào. Bạn không cần biết toán, mọi con số đều có ví dụ. Nếu chỉ muốn đọc nhanh, hãy xem mục 4.3 (công thức tổng) và mục 4.9 (một ví dụ tính trọn vẹn), rồi quay lại các mục còn lại khi cần.

> **Lưu ý:** Mọi con số như "30%", "45 phút", "30 phút" trong chương này là **giá trị khởi điểm**. Admin có thể đổi trong mục Cấu hình. Khi đổi, cách tính mới chỉ áp dụng cho **kỳ đánh giá tiếp theo**, không làm thay đổi điểm của các kỳ đã đóng.

## 4.1 KPI là gì và để làm gì?

**KPI** là một con số từ **0 đến 100**. Nó cho biết trong một quý, chất lượng giảng dạy của bạn thế nào, dựa trên **dữ liệu thật** mà hệ thống đã ghi lại: bạn có đến đúng giờ không, học viên có hài lòng không, quản lý dự giờ thấy ra sao, bạn dạy bao nhiêu giờ, bạn có chủ động nhận việc không.

KPI dùng để:

- Giúp mỗi người **tự nhìn lại** điểm mạnh và điểm yếu.
- Giúp đơn vị **ra quyết định**: ai cần thêm đào tạo, ai xứng đáng khen thưởng, ai được đề xuất thăng hoặc giáng vai trò (mục 4.11).
- Giúp việc **chia lớp công bằng** (xem mục 3.4.3).

KPI **không** dùng để tính lương, và **không phải** một "án tuyên" cuối cùng. Nó là một góc nhìn bằng số, cộng với đánh giá của con người.

Một quy tắc quan trọng: **chỉ người có dạy ít nhất một Bài trong kỳ mới có điểm KPI của kỳ đó.** Người không dạy trong kỳ không bị chấm thấp.

## 4.2 Kỳ đánh giá

KPI được tính theo **kỳ**. Mỗi kỳ là **một quý**, có ngày bắt đầu và kết thúc do Admin tạo (ví dụ Quý 3/2026: 01/07 đến 30/09). Hai kỳ không chồng ngày nhau.

- **Bài học thuộc kỳ nào?** Theo **ngày bắt đầu của Bài, tính theo giờ Việt Nam**. Một lớp kéo dài qua hai quý thì mỗi Bài được tính vào quý của chính nó.
- **"Đã dạy"** nghĩa là: bạn có slot được phân công ở Bài đó, Bài đó **đã kết thúc**, và lớp **không bị hủy**.

Một kỳ có ba trạng thái:

| Trạng thái | Chuyện gì xảy ra | Ai xem được điểm? |
|---|---|---|
| **Đang mở** | Dữ liệu vẫn đang được thu thập. Điểm cập nhật liên tục theo thời gian thực và ghi nhãn **Tạm tính**. | Mọi người |
| **Chờ duyệt** | Quản lý xem trước điểm để rà soát, chưa công bố. | **Chỉ quản lý** |
| **Đã đóng** | Kỳ được chốt và **khóa cứng**. Điểm không đổi nữa, kể cả khi sau này cấu hình đổi. Mọi người nhận thông báo "KPI được công bố". | Mọi người |

Trước khi đóng kỳ, hệ thống cho quản lý một **danh sách kiểm tra**: kỳ đã kết thúc chưa; các lớp đã dạy đều đã "Hoàn thành" chưa; đã có khảo sát học viên (C1) và tỷ lệ đạt (C3) cho từng lớp chưa; mọi lượt dạy đã có điểm danh chưa. Đây là cảnh báo, không chặn.

## 4.3 Công thức tổng

KPI của bạn gồm **ba phần** cộng lại:

```
KPI (0–100) =  30% × Điểm Chuyên cần   (nhóm B: đúng giờ)
             + 45% × Điểm Chất lượng   (nhóm C: học viên, dự giờ, kết quả)
             + 25% × Điểm Sản lượng    (nhóm A: giờ dạy, chủ động, nhận lời mời)
```

Ba phần cộng đúng 100%, nên điểm tối đa là **100**. Mỗi phần lại được tạo từ các **tiêu chí nhỏ**:

| Nhóm | Trọng số | Gồm các tiêu chí |
|---|---|---|
| **B — Chuyên cần** | 30% | **B1** Điểm danh đúng giờ |
| **C — Chất lượng** | 45% | **C2** Dự giờ (40%), **C3** Tỷ lệ học viên đạt chuẩn (35%), **C1** Khảo sát hài lòng (25%) |
| **A — Sản lượng** | 25% | **A1** Số giờ dạy (50%), **A2** Tỷ lệ tự đăng ký (25%), **A3** Tỷ lệ nhận lời mời (25%) |

Ngoài ra có **A4 — số lớp không kinh phí**: chỉ số này **không nằm trong công thức KPI** (xem mục 4.5).

![Ảnh 4.1 — Bảng KPI cá nhân: điểm tổng và ba nhóm A, B, C](4.1)

## 4.4 Nhóm B — Chuyên cần (30%)

### B1 — Điểm danh đúng giờ

B1 chấm việc bạn có **đến đúng giờ** ở mỗi buổi dạy hay không, thông qua nút **Tôi đã có mặt** (mục 3.7).

**Công thức cho mỗi Bài:**

```
B1 của Bài = 100% − (số phút trễ × 100% ÷ 30)     và không thấp hơn 0%
```

Nghĩa là: đúng giờ (hoặc sớm) được **100%**. Mỗi phút trễ trừ khoảng **3,3%**. Trễ **30 phút trở lên** thì **0%**. Số phút trễ được **làm tròn xuống theo phút**.

| Bạn check-in muộn | Điểm B1 của Bài |
|---|---|
| Đúng giờ hoặc sớm | 100% |
| 3 phút | 90% |
| 6 phút | 80% |
| 10 phút | 66,7% |
| 15 phút | 50% |
| 20 phút | 33,3% |
| 25 phút | 16,7% |
| 30 phút trở lên | 0% |

Điểm B1 trong kỳ là **trung bình** B1 của tất cả các Bài bạn đã dạy.

**Không check-in** (dù đã được nhắc) thì Bài đó là **0%**. Một điểm cần biết: quy tắc "vắng bằng 0%" chỉ áp dụng **từ một ngày mốc** mà Admin đã đặt khi bật tính năng. Các Bài trước ngày mốc mà chưa có check-in được coi là **thiếu dữ liệu** và không bị phạt.

**Quản lý có thể chỉnh điểm danh** khi có lỗi kỹ thuật hoặc khiếu nại hợp lý. Việc chỉnh này **bắt buộc có lý do**, được lưu vào Nhật ký, bạn được thông báo, và điểm bị chỉnh có nhãn **sửa tay**.

## 4.5 Nhóm A — Sản lượng (25%)

Nhóm này đo **bạn dạy bao nhiêu** và **bạn có chủ động không**.

### A1 — Số giờ dạy trong kỳ (chiếm 50% của nhóm A)

A1 không lấy thẳng số giờ, mà làm hai bước để công bằng.

**Bước 1: quy đổi giờ theo độ khó.** Mỗi Bài dạy được nhân với một **hệ số** (xem mục 4.7). Bài khó hơn thì mỗi giờ "đáng giá" hơn. Kết quả gọi là **giờ quy đổi**.

**Bước 2: so với đồng nghiệp.** Hệ thống đặt giờ quy đổi của bạn cạnh **những người cùng nhóm nhân sự** trong kỳ (ví dụ mọi giảng viên là bác sĩ), rồi cho **điểm theo thứ hạng** (gọi là *percentile*):

```
Điểm A1 = 100 × (số người có giờ THẤP hơn bạn + 0,5 × số người BẰNG bạn) ÷ tổng số người trong nhóm
```

Nếu bạn dạy nhiều hơn tất cả đồng nghiệp cùng nhóm, A1 gần 100. Nếu bạn ở giữa, A1 khoảng 50. Điểm so trong **cùng nhóm**, nên giảng viên không bị so với trợ giảng, và bác sĩ không bị so với không bác sĩ. Người **không dạy giờ nào trong kỳ vẫn được tính trong nhóm so sánh**, để thứ hạng công bằng.

> **Ví dụ:** Nhóm có 60 người. Có 42 người dạy ít giờ quy đổi hơn bạn, 2 người bằng bạn. A1 = 100 × (42 + 0,5×2) ÷ 60 = 100 × 43 ÷ 60 = **71,7**.

**Trường hợp nhóm quá nhỏ.** Xếp hạng chỉ đáng tin khi nhóm đủ đông. Nếu nhóm của bạn có **dưới 5 người** (thường là Ban giám đốc), hệ thống không so với đồng nghiệp mà **so với chính bạn** ở các kỳ trước:

```
Điểm A1 = 50 + 50 × (giờ quy đổi kỳ này ÷ trung bình giờ quy đổi các kỳ trước của bạn − 1)      (giới hạn 0–100)
```

Ví dụ: kỳ này bạn dạy 14,7 giờ quy đổi, trung bình các kỳ trước là 12 giờ. Điểm = 50 + 50 × (14,7 ÷ 12 − 1) = 50 + 50 × 0,225 = **61,3**. Nếu chưa có lịch sử kỳ trước thì A1 tạm thiếu, không bị tính là 0.

### A2 — Tỷ lệ tự đăng ký (25% của nhóm A)

```
A2 = số Bài BẠN TỰ ĐĂNG KÝ và được duyệt ÷ tổng số Bài bạn đã dạy trong kỳ × 100%
```

Ý nghĩa: hệ thống **khuyến khích sự chủ động**. Ví dụ bạn đã dạy 5 Bài, trong đó 3 Bài do bạn tự đăng ký (được duyệt), 2 Bài do được mời. A2 = 3 ÷ 5 = **60%**.

### A3 — Tỷ lệ nhận lời mời (25% của nhóm A)

```
A3 = số lời mời bạn ĐỒNG Ý ÷ số lời mời bạn ĐÃ PHẢN HỒI (đồng ý + từ chối) × 100%
```

Ý nghĩa: hệ thống **ghi nhận sự hỗ trợ đơn vị**. Được mời 2 lần, đồng ý cả 2 thì A3 = **100%**. Nếu đồng ý 1, từ chối 1 thì A3 = 50%. Lời mời chưa được trả lời **chưa được tính**.

### A4 — Số lớp không kinh phí (không nằm trong công thức KPI)

A4 chỉ **đếm số lớp không kinh phí** bạn đã tham gia dạy, đếm **một lần cho mỗi lớp**, dù bạn dạy bao nhiêu Bài trong lớp đó. Có hai con số: **trong kỳ** và **lũy kế** (từ trước đến nay).

A4 **cố ý không cộng vào KPI**, để KPI vẫn đúng nghĩa "phần trăm hoàn thành chuẩn" và tối đa là 100. A4 dùng cho ba việc:

1. **Phân định khi khen thưởng** nếu KPI hai người bằng nhau.
2. **Vinh danh đóng góp cộng đồng** theo năm.
3. **Xếp hạng gợi ý** khi có lớp không kinh phí mới: người có **A4 thấp hơn** được ưu tiên, để việc này được xoay vòng công bằng.

## 4.6 Nhóm C — Chất lượng (45%)

Ba tiêu chí dưới đây đến từ **người khác đánh giá bạn**, không phải từ hành động của bạn trên hệ thống.

### C1 — Khảo sát hài lòng của học viên (25% của nhóm C)

Sau khi lớp hoàn thành, học viên trả lời một khảo sát ngắn (chấm từ 1 đến 5) qua một đường link. Hệ thống quy đổi điểm trung bình sang **%**. C1 tính **theo lớp**: **mọi người đã dạy bất kỳ Bài nào của lớp đó đều nhận cùng một điểm C1** của lớp, không chia theo số Bài.

### C2 — Dự giờ của quản lý (40% của nhóm C)

Quản lý đến dự một buổi dạy của bạn rồi chấm theo **thang 4 mức**:

| Mức (tên khởi điểm) | Điểm | Ý nghĩa |
|---|---|---|
| **Xuất sắc** | 100% | Vượt yêu cầu: nội dung chính xác, truyền đạt cuốn hút, xử lý tình huống linh hoạt. |
| **Tốt** | 80% | Đạt đầy đủ yêu cầu, còn vài điểm nhỏ có thể cải thiện. |
| **Đạt** | 60% | Đạt yêu cầu tối thiểu, có một số hạn chế cần cải thiện. |
| **Chưa đạt** | 0% | Sai sót đáng kể, thiếu chuẩn bị hoặc không kiểm soát được lớp. |

(Tên và mô tả từng mức do Admin chỉnh được.) Điểm dự giờ được **nhân với hệ số độ khó của Bài** được dự giờ, tối đa 100. C2 **không bắt buộc**: không ai có thể dự giờ hết mọi người mỗi quý. Bạn **không thể tự chấm cho chính mình**.

### C3 — Tỷ lệ học viên đạt chuẩn đầu ra (35% của nhóm C)

Sau lớp, quản lý nhập **% học viên đạt chuẩn**. C3 cũng tính **theo lớp**, giống C1.

### Nhiều lớp trong một quý thì tính thế nào?

Nếu bạn dạy nhiều lớp, mỗi tiêu chí C1, C2, C3 lấy **trung bình** qua các lớp (hoặc các lần dự giờ) trong kỳ, ra một con số. Cấu hình có thể đổi thành **trung bình có trọng số theo số Bài bạn dạy ở mỗi lớp**.

## 4.7 Hệ số độ khó (D1, D2, D3)

Một giờ dạy khó không nên bị coi bằng một giờ dạy dễ. Vì vậy mỗi Bài có một **hệ số**:

```
Hệ số của Bài = lớn nhất giữa (D1 và D2 nếu lớp không kinh phí)  ×  D3
```

| Hệ số | Là gì | Giá trị khởi điểm |
|---|---|---|
| **D1** | Theo **nhóm lớp**. Mỗi nhóm lớp (ABCDE, ACLS, BLS…) có một số riêng do Admin đặt. | Tùy nhóm lớp |
| **D2** | Bảo vệ **lớp không kinh phí** (khuyến khích tham gia). Lấy **giá trị lớn hơn** giữa D1 và D2, không cộng dồn. | 1,1 |
| **D3** | Theo **vai trò** của bạn trong Bài đó. | Giảng viên 1,1; Trợ giảng 1,0 |

Hệ số được nhân vào **giờ dạy** (cho A1) và **điểm dự giờ** (cho C2). Nó **không** dùng để tính lương.

> **Ví dụ:** Bạn là giảng viên (D3 = 1,1) dạy một Bài 3 giờ của lớp ACLS có kinh phí (D1 = 1,2 trong ví dụ này). Hệ số = 1,2 × 1,1 = 1,32. Giờ quy đổi = 3 × 1,32 = **3,96 giờ**. Nếu là lớp BLS không kinh phí (D1 = 1,0; D2 = 1,1) thì hệ số = 1,1 × 1,1 = 1,21.

## 4.8 Khi thiếu dữ liệu: "trọng số động"

Không phải ai cũng có đủ mọi tiêu chí. Ví dụ bạn chưa được dự giờ (thiếu C2), hoặc lớp chưa có khảo sát. Hệ thống **không chấm 0** những thứ thiếu. Nó **chia lại trọng số cho các tiêu chí còn dữ liệu**, trong cùng nhóm. Nếu cả một nhóm thiếu thì chia lại giữa các nhóm còn lại.

> **Ví dụ:** Nhóm C có C2 (40%), C3 (35%), C1 (25%). Bạn chưa có C2. Hệ thống dùng chỉ C3 và C1, tỷ lệ 35 : 25, tức C3 chiếm khoảng **58,3%** và C1 khoảng **41,7%**.

Trên bảng KPI, bạn sẽ thấy dòng "Chưa có dữ liệu: C2 (trọng số đã chia lại)". Đây là tình huống bình thường, không phải lỗi.

## 4.9 Ví dụ tính trọn vẹn

> **Ví dụ:** *Đây là số liệu minh họa để bạn thấy các bước, không phải số của một người thật.* Giảng viên **An** dạy 5 Bài trong Quý 3. An thuộc một nhóm có 60 người.

**Bước 1. Các Bài đã dạy và giờ quy đổi**

| Bài | Giờ | Hệ số Bài | Giờ quy đổi |
|---|---|---|---|
| ACLS-08, Bài 1 | 3 | D1 1,2 × D3 1,1 = 1,32 | 3,96 |
| ACLS-08, Bài 2 | 3 | 1,32 | 3,96 |
| BLS-12, Bài 1 | 2 | D1 1,0 × 1,1 = 1,1 | 2,20 |
| BLS-12, Bài 2 | 2 | 1,1 | 2,20 |
| BLS-15 (không kinh phí), Bài 1 | 2 | max(1,0; D2 1,1) × 1,1 = 1,21 | 2,42 |
| **Tổng** | **12 giờ** | | **14,74 giờ quy đổi** |

**Bước 2. Nhóm A — Sản lượng**

- **A1:** 42 người thấp hơn, 2 người bằng, trong nhóm 60 → 100 × 43 ÷ 60 = **71,7**
- **A2:** 3 Bài tự đăng ký trên 5 Bài đã dạy → **60**
- **A3:** được mời 2 lần, đồng ý cả 2 → **100**
- **Điểm A** = 50% × 71,7 + 25% × 60 + 25% × 100 = 35,8 + 15 + 25 = **75,8**

**Bước 3. Nhóm B — Chuyên cần**

Check-in trễ lần lượt 0, 0, 6, 0 và 15 phút → B1 từng Bài là 100, 100, 80, 100, 50.
**Điểm B** = (100 + 100 + 80 + 100 + 50) ÷ 5 = **86,0**

**Bước 4. Nhóm C — Chất lượng**

- **C2:** được dự giờ 1 lần ở Bài của lớp BLS-12, mức **Tốt** (80%) → 80 × 1,1 = **88**
- **C3:** ACLS-08 đạt 90, BLS-12 đạt 80 (BLS-15 chưa nhập) → trung bình **85**
- **C1:** ACLS-08 được 92, BLS-12 được 86 → trung bình **89**
- **Điểm C** = 40% × 88 + 35% × 85 + 25% × 89 = 35,2 + 29,75 + 22,25 = **87,2**

**Bước 5. Ghép lại**

```
KPI = 30% × 86,0  +  45% × 87,2  +  25% × 75,8
    = 25,8       +  39,24      +  18,95
    = 84,0 điểm
```

**Nếu An chưa được dự giờ (thiếu C2):** C chỉ còn C3 và C1 chia lại → C = 58,3% × 85 + 41,7% × 89 ≈ 86,7. KPI ≈ 25,8 + 39,0 + 18,95 ≈ **83,8**. Điểm chỉ lệch nhẹ, vì hệ thống chia lại trọng số, không phạt việc thiếu dữ liệu.

## 4.10 Cách đọc bảng KPI cá nhân

Bảng KPI cá nhân (trên **Tổng quan**, trang **Đánh giá chất lượng** và **hồ sơ**) gồm các phần:

| Phần | Cho bạn biết |
|---|---|
| **KPI kỳ hiện tại** (số lớn) | Điểm tổng của kỳ gần nhất có kết quả, kèm **mũi tên tăng hoặc giảm %** so với kỳ trước. Nhãn **Tạm tính** nghĩa là kỳ chưa đóng. |
| **Giờ dạy** | Tổng giờ dạy và giờ quy đổi. |
| **Số Bài** | Số Bài và số lớp đã dạy trong kỳ. |
| **Xu hướng qua các kỳ** | Biểu đồ điểm KPI qua tối đa 8 kỳ gần nhất. Cần ít nhất 2 kỳ có kết quả mới vẽ được. |
| **Điểm theo nhóm và tiêu chí** | Biểu đồ radar ba đỉnh (Sản lượng, Chuyên cần, Chất lượng) và danh sách từng tiêu chí A1 đến C3. Trên điện thoại, thấy cả dạng thanh ngang. |
| **Vị trí** | "Top X% so với đồng nghiệp cùng vai trò và chuyên môn tương đương" (không nêu tên nhóm). Nếu nhóm quá nhỏ, thay bằng so với **chính bạn** ở các kỳ trước. |
| **Lớp không kinh phí** | Số lớp không kinh phí lũy kế (A4). |
| **Từng tiêu chí so với kỳ trước** | Tiêu chí **mạnh nhất**, tiêu chí **cần cải thiện**, và mức tăng giảm từng tiêu chí. |
| **Tiến độ đổi nhóm** | Xem mục 4.11. |

## 4.11 Thăng và giáng vai trò theo KPI

Hệ thống rà soát cuối mỗi kỳ và đề xuất **đổi vai trò** giữa **Trợ giảng và Giảng viên, trong cùng nhánh bác sĩ hoặc không bác sĩ**. Nhóm Ban giám đốc không nằm trong cơ chế này.

| Hướng | Điều kiện khởi điểm |
|---|---|
| **Thăng** (Trợ giảng lên Giảng viên) | KPI **từ 85 điểm trở lên**, liên tục **3 kỳ đã đóng** gần nhất. |
| **Giáng** (Giảng viên xuống Trợ giảng) | KPI **dưới 50 điểm**, liên tục **3 kỳ đã đóng** gần nhất. Kỳ nào không dạy thì **không bị tính là thấp**. |

Điểm quan trọng: hệ thống chỉ **đề xuất**. **Admin duyệt hoặc bỏ qua thủ công**, không có việc tự động đổi. Nhóm mới có hiệu lực từ **kỳ đánh giá tiếp theo**. Trên bảng KPI của bạn, một thanh tiến độ cho biết bạn đã đạt ngưỡng mấy trên mấy kỳ (ví dụ "đã đạt 2/3 kỳ liên tiếp"). Thanh này chỉ hiện cho **chính bạn và quản lý**.

## 4.12 Muốn tăng điểm thì làm gì?

| Muốn cải thiện | Việc nên làm |
|---|---|
| **B1 — Chuyên cần** (30%, lớn nhất và dễ nhất) | Bấm **Tôi đã có mặt** đúng giờ hoặc sớm, và **không quên**. Bật thông báo đẩy để được nhắc. Gặp sự cố thì báo quản lý ngay. |
| **A2** | **Chủ động đăng ký** các Bài còn thiếu người, thay vì chờ được mời. |
| **A3** | **Trả lời lời mời sớm**, và nhận khi có thể. Đồng ý nhiều hơn từ chối. |
| **A1** | Nhận thêm Bài khi sắp xếp được. Ưu tiên Bài thuộc nhóm lớp có hệ số cao hơn. |
| **C1, C3** | Chất lượng buổi dạy quyết định. Hai điểm này là của cả lớp. |
| **C2** | Chuẩn bị tốt cho buổi dự giờ. Điểm này ít có nên rất đáng giá khi có. |

## 4.13 Những câu thường gặp về KPI

**Vì sao tôi không thấy tên "nhóm" của mình?**
Nhóm dùng ngầm để so sánh công bằng, nhưng bị **ẩn với giảng viên và trợ giảng** để tránh cảm giác bị xếp hạng. Chỉ Admin và người giữ Quyền Quản lý lớp thấy.

**Vì sao KPI kỳ này của tôi không có?**
Vì bạn **chưa dạy Bài nào kết thúc** trong kỳ, hoặc kỳ đang ở trạng thái **Chờ duyệt** (chỉ quản lý xem).

**Vì sao điểm của tôi thay đổi khi kỳ chưa đóng?**
Kỳ **Đang mở** tính theo dữ liệu mới nhất. Mỗi khi có thêm Bài kết thúc, khảo sát, dự giờ… điểm cập nhật. Chỉ khi kỳ **Đã đóng** thì điểm mới chốt.

**Điểm kỳ đã đóng có bị đổi nếu cấu hình sau này thay đổi không?**
**Không.** Khi đóng kỳ, hệ thống lưu lại đúng bản cấu hình đã dùng. Chỉ có thể thay đổi nếu quản lý **mở lại kỳ** (kỳ đóng gần nhất, kèm lý do, và được ghi vào Nhật ký).

**Tôi nghĩ điểm danh của tôi bị sai. Tôi làm gì?**
Báo quản lý kèm lý do (ví dụ mất mạng). Quản lý chỉnh được kèm lý do bắt buộc, bạn sẽ nhận thông báo.

**Tôi thấy điểm của đồng nghiệp. Như vậy có bình thường không?**
Có. KPI **công khai nội bộ** để mọi người minh bạch với nhau. Chỉ nhãn nhóm bị ẩn.

**Vì sao tôi dạy nhiều mà A1 không cao?**
A1 là **thứ hạng trong nhóm**, và giờ được **quy đổi theo độ khó**. Nếu đồng nghiệp cùng nhóm dạy nhiều hơn bạn, hoặc dạy Bài có hệ số cao hơn, thứ hạng của bạn sẽ thấp hơn dù bạn dạy nhiều.
