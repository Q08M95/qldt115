import Link from "next/link";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";
import type { KiemTraDongKy, NhatKyKy } from "@/types/database";

// Số mục còn cần xử lý trong danh sách kiểm tra (dùng để nhắc ở hộp thoại đóng kỳ)
export function demCanhBao(k: KiemTraDongKy): number {
  return (
    (k.chua_ket_thuc ? 1 : 0) +
    (k.lop_chua_hoan_thanh.length > 0 ? 1 : 0) +
    (k.lop_thieu_c1.length > 0 ? 1 : 0) +
    (k.lop_thieu_c3.length > 0 ? 1 : 0) +
    (k.luot_thieu_diem_danh > 0 ? 1 : 0)
  );
}

function Muc({
  dat,
  title,
  children,
}: {
  dat: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      {dat ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

function DanhSachLop({ lop }: { lop: { id: string; ten: string }[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {lop.map((l) => (
        <Link key={l.id} href={`/lop-hoc/${l.id}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-background">
          {l.ten}
        </Link>
      ))}
    </span>
  );
}

// Danh sách kiểm tra trước khi đóng kỳ: chỉ cảnh báo, không chặn. Dữ liệu thiếu (C1/C3/điểm danh) làm KPI bị chia lại trọng số,
// và kỳ đã đóng thì khóa, nên nên bổ sung trước khi đóng.
export function KyKiemTraCard({ kiemTra }: { kiemTra: KiemTraDongKy }) {
  const soCanhBao = demCanhBao(kiemTra);
  return (
    <div className="mx-5 overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
        <p className="text-sm font-semibold">Kiểm tra trước khi đóng kỳ</p>
        {soCanhBao === 0 ? <Badge variant="success">Sẵn sàng đóng kỳ</Badge> : <Badge variant="warning">{soCanhBao} mục cần xem</Badge>}
      </div>
      <ul className="divide-y">
        <Muc
          dat={!kiemTra.chua_ket_thuc}
          title={kiemTra.chua_ket_thuc ? "Kỳ chưa kết thúc" : "Kỳ đã kết thúc"}
        >
          {kiemTra.chua_ket_thuc && <>Còn {kiemTra.con_ngay} ngày nữa mới hết kỳ; các Bài diễn ra sau khi đóng sẽ không được tính.</>}
        </Muc>
        <Muc dat={kiemTra.lop_chua_hoan_thanh.length === 0} title="Lớp có Bài đã dạy trong kỳ đều đã “Đã hoàn thành”">
          {kiemTra.lop_chua_hoan_thanh.length > 0 && (
            <>
              <span className="mb-1.5 block">Chưa hoàn thành nên chưa nhập được C1/C3:</span>
              <DanhSachLop lop={kiemTra.lop_chua_hoan_thanh} />
            </>
          )}
        </Muc>
        <Muc dat={kiemTra.lop_thieu_c1.length === 0} title="Khảo sát hài lòng học viên (C1) đã có ở mọi lớp">
          {kiemTra.lop_thieu_c1.length > 0 && (
            <>
              <span className="mb-1.5 block">Lớp đã hoàn thành nhưng chưa có C1:</span>
              <DanhSachLop lop={kiemTra.lop_thieu_c1} />
            </>
          )}
        </Muc>
        <Muc dat={kiemTra.lop_thieu_c3.length === 0} title="Tỷ lệ học viên đạt chuẩn đầu ra (C3) đã có ở mọi lớp">
          {kiemTra.lop_thieu_c3.length > 0 && (
            <>
              <span className="mb-1.5 block">Lớp đã hoàn thành nhưng chưa có C3:</span>
              <DanhSachLop lop={kiemTra.lop_thieu_c3} />
            </>
          )}
        </Muc>
        <Muc dat={kiemTra.luot_thieu_diem_danh === 0} title="Điểm danh (B1) đã có cho mọi lượt dạy">
          {kiemTra.luot_thieu_diem_danh > 0 && (
            <>
              {kiemTra.luot_thieu_diem_danh}/{kiemTra.tong_luot} lượt dạy chưa có điểm danh — từ ngày áp dụng, lượt không check-in bị tính B1 = 0% (Bài trước ngày áp dụng thì chia lại trọng số). Nếu do lỗi kỹ thuật, hãy chỉnh tay điểm danh trước khi đóng kỳ.
            </>
          )}
        </Muc>
      </ul>
    </div>
  );
}

// Lịch sử đóng / mở lại kỳ
export function KyNhatKy({ items }: { items: NhatKyKy[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mx-5 overflow-hidden rounded-xl border">
      <p className="flex items-center gap-2 border-b bg-background px-4 py-2.5 text-sm font-semibold">
        <History className="size-4 text-muted-foreground" aria-hidden /> Lịch sử đóng / mở lại
      </p>
      <ul className="divide-y">
        {items.map((n) => (
          <li key={n.id} className="px-4 py-2.5 text-sm">
            <span className="font-medium">{n.hanh_dong === "dong" ? "Đóng kỳ" : "Mở lại kỳ"}</span>
            <span className="text-muted-foreground">
              {" "}
              · {fmtDateTime(n.luc)}
              {n.nguoi_ten ? ` · ${n.nguoi_ten}` : ""}
            </span>
            {n.ly_do && <p className="mt-0.5 text-muted-foreground">Lý do: {n.ly_do}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
