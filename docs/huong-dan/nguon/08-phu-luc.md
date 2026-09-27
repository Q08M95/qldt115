# Phụ lục A — Bảng phân quyền

Dấu ✓ là làm được, dấu — là không làm được.

| Chức năng | Giảng viên / Trợ giảng | Người giữ Quyền Quản lý lớp | Admin |
|---|---|---|---|
| Xem lớp, xem các Bài còn trống | ✓ | ✓ | ✓ |
| Đăng ký dạy, trả lời lời mời | ✓ | ✓ | ✓ |
| Check-in khi được phân công | ✓ | ✓ | ✓ |
| Xem KPI của mọi người | ✓ | ✓ | ✓ |
| Xem nhãn nhóm | — | ✓ | ✓ |
| Xem báo cáo | ✓ (không nhãn nhóm) | ✓ | ✓ |
| Xuất báo cáo Excel/PDF | — | ✓ | ✓ |
| Xem Nhật ký hệ thống | Chỉ dòng liên quan bản thân | Toàn bộ | Toàn bộ |
| Sửa hồ sơ của mình | ✓ | ✓ | ✓ |
| Sửa hồ sơ, chứng chỉ của người khác | — | ✓ | ✓ |
| Tạo, sửa, hủy lớp; thêm, sửa, xóa Bài | — | ✓ | ✓ |
| Mời người dạy, Mời ngoại lệ | — | ✓ | ✓ |
| Duyệt hoặc từ chối đăng ký; Hủy phân công | — | ✓ | ✓ |
| Hoàn thành lớp; nhập C1, C3 | — | ✓ | ✓ |
| Chấm dự giờ (C2); chỉnh điểm danh (B1) | — | ✓ | ✓ |
| Duyệt hoặc bỏ qua đề xuất nhân sự | — | ✓ | ✓ |
| Đổi trạng thái tham gia, đổi nhóm | — | ✓ | ✓ |
| Quản lý kỳ đánh giá (tạo, đóng, mở lại) | — | ✓ | ✓ |
| Chỉnh cấu hình hệ thống, danh mục | — | ✓ | ✓ |
| Tạo tài khoản; nhập nhiều tài khoản từ CSV | — | — | ✓ |
| Đặt lại mật khẩu, sửa email của người khác | — | — | ✓ |
| Gán hoặc thu hồi Quyền Quản lý lớp | — | — | ✓ |

Mọi người tự **đổi mật khẩu của mình** được (cần nhập mật khẩu hiện tại).

# Phụ lục B — Bảng tóm tắt công thức KPI

**Công thức tổng**

```
KPI = 30% × B  +  45% × C  +  25% × A            (điểm tối đa 100)
```

| Nhóm | Tiêu chí | Cách tính | Trọng số trong nhóm |
|---|---|---|---|
| **B** (30%) | **B1** đúng giờ | Mỗi Bài: 100% − (phút trễ × 100 ÷ 30), tối thiểu 0. Lấy trung bình các Bài. Vắng = 0%. | 100% |
| **C** (45%) | **C2** dự giờ | Điểm mức rubric (100/80/60/0) × hệ số Bài, tối đa 100. Trung bình các lần. | 40% |
| | **C3** tỷ lệ đạt chuẩn | % do quản lý nhập, theo lớp. Trung bình các lớp. | 35% |
| | **C1** khảo sát hài lòng | % từ khảo sát hoặc nhập tay, theo lớp. Trung bình các lớp. | 25% |
| **A** (25%) | **A1** giờ dạy | Giờ quy đổi (giờ × hệ số Bài) xếp hạng trong nhóm nhân sự: 100 × (số người thấp hơn + 0,5 × số người bằng) ÷ tổng. Nhóm dưới 5 người: so với chính mình các kỳ trước. | 50% |
| | **A2** tự đăng ký | Số Bài tự đăng ký được duyệt ÷ số Bài đã dạy. | 25% |
| | **A3** nhận lời mời | Lời mời đồng ý ÷ lời mời đã phản hồi. | 25% |
| (không tính) | **A4** lớp không kinh phí | Đếm số lớp, một lần mỗi lớp. Chỉ để khen thưởng, vinh danh, xếp hạng gợi ý. | — |

**Hệ số của Bài**

```
Hệ số Bài = lớn nhất giữa (D1 của nhóm lớp, D2 nếu lớp không kinh phí)  ×  D3 (theo vai trò)
```

**Thiếu dữ liệu:** trọng số của tiêu chí thiếu được **chia lại** cho các tiêu chí còn dữ liệu trong cùng nhóm. Nhóm nào thiếu hẳn thì chia lại giữa các nhóm còn lại.

**Đổi nhóm (khởi điểm):** thăng khi KPI **≥ 85 điểm liên tục 3 kỳ đã đóng**; giáng khi KPI **< 50 điểm liên tục 3 kỳ đã đóng**. Chỉ đề xuất, Admin duyệt.

# Phụ lục C — Giải thích viết tắt và thuật ngữ

| Từ | Nghĩa |
|---|---|
| **A1, A2, A3, A4** | Các chỉ số **Sản lượng**: giờ dạy, tỷ lệ tự đăng ký, tỷ lệ nhận lời mời, số lớp không kinh phí. |
| **B1** | Chỉ số **Chuyên cần**: điểm danh đúng giờ. |
| **C1, C2, C3** | Các chỉ số **Chất lượng**: khảo sát hài lòng, dự giờ, tỷ lệ đạt chuẩn đầu ra. |
| **D1, D2, D3** | **Hệ số độ khó**: theo nhóm lớp, theo lớp không kinh phí, theo vai trò. |
| **KPI** | Điểm đo chất lượng giảng dạy từ 0 đến 100 của một kỳ. |
| **Kỳ đánh giá** | Một quý, đơn vị thời gian tính KPI. |
| **Percentile (xếp hạng phần trăm)** | Cách cho điểm theo vị trí của bạn so với những người cùng nhóm. |
| **Giờ quy đổi** | Số giờ dạy đã nhân với hệ số độ khó. |
| **Trọng số động** | Cách chia lại trọng số khi một tiêu chí thiếu dữ liệu. |
| **Lời mời (Luồng B) / Đăng ký (Luồng A)** | Hai cách một Bài có người dạy: quản lý mời, hoặc bạn chủ động xin. |
| **Slot** | Một vị trí cần người trong một Bài. |
| **Pool ứng viên** | Số người đủ điều kiện cho một Bài. |
| **Matching-score (điểm gợi ý)** | Điểm xếp hạng người được gợi ý cho một Bài. |
| **Snapshot (bản chụp)** | Bản lưu cấu hình và điểm khi kỳ đóng, để điểm không đổi về sau. |
| **Thông báo đẩy** | Thông báo hiện trên điện thoại hoặc máy tính ngay cả khi không mở trang web. |
| **Check-in** | Bấm **Tôi đã có mặt** khi đến buổi dạy. |

# Phụ lục D — Những điều hệ thống chưa có

Tài liệu này ghi lại các điểm **chưa có** để bạn không mất công tìm:

- **PDF xuất báo cáo chưa gồm trang Tổng quan.**
- **Tài khoản cho học viên:** không có và không dự định. Học viên chỉ trả lời khảo sát qua link ẩn danh.
- **Tính lương, chấm công:** ngoài phạm vi. Đã có hệ thống khác quản lý.
