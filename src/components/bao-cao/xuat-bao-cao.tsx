import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KhungThoiGian } from "@/lib/bao-cao/khoang";

// Xuất báo cáo (mục 4.7): 1 CHỖ DUY NHẤT cho cả module, gộp báo cáo #1 KPI tổng hợp + #3 Sản lượng + #6 A4 + #7 Đề xuất
// nhân sự vào 1 file — nhiều sheet cho Excel, nhiều trang cho PDF — thay vì phải vào từng báo cáo tải từng file riêng.
// Chỉ Admin/Quản lý lớp nhìn thấy (kiểm tra ở nơi gọi). Luôn dùng đúng kỳ + khung thời gian đang xem trên trang.
export function XuatBaoCao({ ky, kt, moc }: { ky: string; kt: KhungThoiGian; moc: string }) {
  const qs = new URLSearchParams({ ky, kt, moc });
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/bao-cao/xuat?dinh_dang=excel&${qs}`} download>
          <FileSpreadsheet /> Xuất Excel
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/bao-cao/xuat?dinh_dang=pdf&${qs}`} download>
          <FileText /> Xuất PDF
        </a>
      </Button>
    </div>
  );
}
