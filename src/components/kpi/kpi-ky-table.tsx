import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { NHOM_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { KpiKyRow } from "@/types/database";

const so = (n: number | undefined, toiDa = 2) =>
  n === undefined ? "—" : n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });

// Thứ tự hiển thị tiêu chí trong dòng chi tiết
const TIEU_CHI = ["A1", "A2", "A3", "B1", "C1", "C2", "C3"];

function ChiTiet({ r }: { r: KpiKyRow }) {
  const co = TIEU_CHI.filter((m) => r.gia_tri[m] !== undefined);
  const thieu = TIEU_CHI.filter((m) => r.gia_tri[m] === undefined);
  return (
    <div className="mt-0.5 grid gap-0.5 text-xs text-muted-foreground">
      <span className="tabular-nums">{co.map((m) => `${m} ${so(r.gia_tri[m], 1)}`).join(" · ")}</span>
      <span>
        {thieu.length > 0 && <>Chưa có dữ liệu: {thieu.join(", ")} (trọng số đã chia lại). </>}
        {r.che_do_a1 === "lich_su" && "A1 so với lịch sử bản thân. "}
      </span>
    </div>
  );
}

// Bảng KPI cả đơn vị của 1 kỳ — dùng ở màn hình Cấu hình > Kỳ đánh giá (Admin xem trước khi công bố) và báo cáo #1
// KPI tổng hợp toàn đơn vị (Giai đoạn 10, mục 4.7, công khai nội bộ). Nhóm (chỉ Admin/Quản lý lớp có dữ liệu) hiển thị
// thay cho vai trò ngay dưới tên — không thêm cột riêng để bảng không bị tràn ngang.
export function KpiKyTable({ rows }: { rows: KpiKyRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Chưa có ai dạy Bài nào đã kết thúc trong kỳ này. KPI chỉ tính cho người đã dạy ít nhất 1 Bài (đã kết thúc) thuộc kỳ."
      />
    );
  }

  // Cột Nhóm chỉ xuất hiện khi hàm SQL có trả (Admin/Quản lý lớp) — GV/TG nhận nhom = null nên không thêm cột (mục 4.7/3)
  const coNhom = rows.some((r) => r.nhom !== undefined && r.nhom !== null);

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Hạng</TableHead>
              <TableHead>Nhân sự</TableHead>
              <TableHead className="text-right">KPI</TableHead>
              <TableHead className="text-right">A</TableHead>
              <TableHead className="text-right">B</TableHead>
              <TableHead className="text-right">C</TableHead>
              <TableHead className="text-right">Giờ dạy</TableHead>
              <TableHead className="text-right">Bài / lớp</TableHead>
              <TableHead className="text-right">A4 kỳ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id} className="align-top">
                <TableCell className="tabular-nums text-muted-foreground">{r.hang}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={r.ho_ten} src={r.avatar_url} />
                    <div className="min-w-0">
                      <Link href={`/nhan-su/${r.user_id}`} className="font-semibold hover:underline">
                        {r.ho_ten}
                      </Link>
                      {/* Admin/Quản lý lớp thấy nhóm (thay cho vai trò, vì tên nhóm đã bao hàm vai trò); GV/TG chỉ thấy vai trò (mục 4.7/3) */}
                      <span className="ml-2 text-xs text-muted-foreground">{coNhom && r.nhom ? NHOM_LABEL[r.nhom] : r.vai_tro && VAI_TRO_LABEL[r.vai_tro]}</span>
                      <ChiTiet r={r} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-base font-bold tabular-nums">{so(r.kpi)}</TableCell>
                <TableCell className="text-right tabular-nums">{so(r.diem_nhom.A, 1)}</TableCell>
                <TableCell className="text-right tabular-nums">{so(r.diem_nhom.B, 1)}</TableCell>
                <TableCell className="text-right tabular-nums">{so(r.diem_nhom.C, 1)}</TableCell>
                <TableCell className="text-right tabular-nums" title="Giờ dạy thật → giờ quy đổi sau khi nhân hệ số độ khó">
                  {so(r.gio_thuc, 1)}
                  <span className="text-muted-foreground"> → {so(r.gio_quy_doi, 1)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.so_bai} / {r.so_lop}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.a4_ky}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-3 px-3 pb-4 md:hidden">
        {rows.map((r) => (
          <li key={r.user_id} className="grid gap-2 rounded-xl border p-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-xs tabular-nums text-muted-foreground">{r.hang}</span>
              <UserAvatar name={r.ho_ten} src={r.avatar_url} />
              <div className="min-w-0 flex-1">
                <Link href={`/nhan-su/${r.user_id}`} className="block truncate font-semibold hover:underline">
                  {r.ho_ten}
                </Link>
                <span className="text-xs text-muted-foreground">{coNhom && r.nhom ? NHOM_LABEL[r.nhom] : r.vai_tro && VAI_TRO_LABEL[r.vai_tro]}</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{so(r.kpi)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">A {so(r.diem_nhom.A, 1)}</Badge>
              <Badge variant="outline">B {so(r.diem_nhom.B, 1)}</Badge>
              <Badge variant="outline">C {so(r.diem_nhom.C, 1)}</Badge>
              <Badge variant="outline">{so(r.gio_thuc, 1)} giờ</Badge>
              <Badge variant="outline">{r.so_bai} Bài</Badge>
            </div>
            <ChiTiet r={r} />
          </li>
        ))}
      </ul>
    </>
  );
}
