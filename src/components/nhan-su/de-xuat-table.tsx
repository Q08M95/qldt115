import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ThuGonDanhSach } from "@/components/thu-gon-danh-sach";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DuyetButtons } from "@/components/nhan-su/de-xuat-ui";
import { fmtDate } from "@/lib/format";
import {
  LOAI_DE_XUAT_LABEL,
  TRANG_THAI_DE_XUAT_LABEL,
  TRANG_THAI_DE_XUAT_VARIANT,
} from "@/lib/nhan-su/labels";
import type { DeXuatNhanSu } from "@/types/database";

export function DeXuatTable({ rows, choDuyet }: { rows: DeXuatNhanSu[]; choDuyet: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title={choDuyet ? "Không có đề xuất nào đang chờ duyệt." : "Chưa có đề xuất nào đã xử lý."}
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người được đề xuất</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className={choDuyet ? "text-right" : undefined}>{choDuyet ? "Hành động" : "Kết quả"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">
                  <Link href={`/nhan-su/${r.user_id}`} className="hover:underline">
                    {r.ho_ten}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="navy">{LOAI_DE_XUAT_LABEL[r.loai]}</Badge>
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal">{r.noi_dung}</TableCell>
                <TableCell className="tabular-nums">{fmtDate(r.created_at)}</TableCell>
                <TableCell className={choDuyet ? "text-right" : undefined}>
                  {choDuyet ? (
                    <DuyetButtons id={r.id} />
                  ) : (
                    <Badge variant={TRANG_THAI_DE_XUAT_VARIANT[r.trang_thai]}>{TRANG_THAI_DE_XUAT_LABEL[r.trang_thai]}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-3 px-5 pb-5 md:hidden">
        <ThuGonDanhSach soDau={5}>
{rows.map((r) => (
          <li key={r.id} className="grid gap-2 rounded-xl border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/nhan-su/${r.user_id}`} className="font-semibold hover:underline">
                {r.ho_ten}
              </Link>
              <Badge variant="navy">{LOAI_DE_XUAT_LABEL[r.loai]}</Badge>
            </div>
            <p>{r.noi_dung}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{fmtDate(r.created_at)}</p>
            {choDuyet ? (
              <DuyetButtons id={r.id} />
            ) : (
              <Badge variant={TRANG_THAI_DE_XUAT_VARIANT[r.trang_thai]} className="w-fit">
                {TRANG_THAI_DE_XUAT_LABEL[r.trang_thai]}
              </Badge>
            )}
          </li>
        ))}
</ThuGonDanhSach>
      </ul>
    </>
  );
}
