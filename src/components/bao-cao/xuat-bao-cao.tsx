import { Database, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KhungThoiGian } from "@/lib/bao-cao/khoang";

// Xuất báo cáo (mục 4.7): 1 CHỖ DUY NHẤT cho cả module, gộp đủ 8 báo cáo vào 1 file Excel nhiều sheet — thay vì phải
// vào từng báo cáo tải từng file riêng. Từng có thêm nút "Xuất PDF" (Giai đoạn 10/11d) nhưng đã gỡ hẳn theo phản hồi
// người dùng (trình bày chưa đẹp, không hiệu quả — xem CLAUDE.md Giai đoạn 11e).
// "Xuất dữ liệu chi tiết" (Giai đoạn 11c) khác hẳn nút Excel trên: không tính toán/tổng hợp, xuất THÔ toàn bộ bản ghi
// nhân sự/lớp học/phân công/đăng ký/điểm danh/dự giờ/KPI/đề xuất... nhiều sheet — dùng CHUNG bộ lọc này, ra 1 file
// .xlsx riêng (không gộp vào file báo cáo để tránh phình to lẫn lộn 2 mục đích khác nhau).
// Chỉ Admin/Quản lý lớp nhìn thấy (kiểm tra ở nơi gọi). Luôn dùng đúng kỳ + khung thời gian đang xem trên trang.
export function XuatBaoCao({ ky, kt, moc }: { ky: string; kt: KhungThoiGian; moc: string }) {
  const qs = new URLSearchParams({ ky, kt, moc });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/bao-cao/xuat?${qs}`} download>
          <FileSpreadsheet /> Xuất Excel
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/bao-cao/xuat-du-lieu?${qs}`} download>
          <Database /> Xuất dữ liệu chi tiết
        </a>
      </Button>
    </div>
  );
}
