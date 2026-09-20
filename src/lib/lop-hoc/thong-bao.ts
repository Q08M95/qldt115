// Chuẩn hóa thông báo lỗi từ hàm SQL về đúng thuật ngữ trên giao diện:
// trạng thái lớp "nhap" hiển thị là "Dự kiến", C1/C3 luôn ghi rõ tên đầy đủ.
export function chuanHoaThongBao(msg: string): string {
  return msg
    .replace(/Nháp/g, "Dự kiến")
    .replace("Chỉ nhập C1", "Chỉ nhập khảo sát hài lòng học viên (C1)")
    .replace("Chỉ nhập C3", "Chỉ nhập tỷ lệ học viên đạt chuẩn đầu ra (C3)");
}
