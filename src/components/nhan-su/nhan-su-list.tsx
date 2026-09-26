import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ThuGonDanhSach } from "@/components/thu-gon-danh-sach";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NhanSuRow } from "@/lib/nhan-su/queries";
import { NHOM_LABEL, TRANG_THAI_LABEL, TRANG_THAI_VARIANT, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";

function ChuyenMonBadges({ items }: { items: { id: string; ten: string }[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <Badge key={c.id} variant="navy">
          {c.ten}
        </Badge>
      ))}
    </div>
  );
}

// Bảng (md trở lên) + danh sách thẻ (mobile) — không dùng cuộn ngang trên mobile (mục 8.9).
// Cột Nhóm chỉ hiển thị với Admin/Quản lý lớp; với GV/TG không render và query cũng không trả về (RLS).
export function NhanSuList({ rows, isQuanTri }: { rows: NhanSuRow[]; isQuanTri: boolean }) {
  if (rows.length === 0) {
    return <EmptyState icon={Users} title="Không tìm thấy nhân sự phù hợp với bộ lọc." />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân sự</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Chuyên môn</TableHead>
              {isQuanTri && <TableHead>Nhóm</TableHead>}
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="relative cursor-pointer">
                <TableCell>
                  <Link href={`/nhan-su/${r.id}`} className="flex items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:underline">
                    <UserAvatar name={r.ho_ten} src={r.avatar_url} className="size-9" />
                    <span className="leading-tight">
                      <span className="block font-semibold">{r.ho_ten}</span>
                      <span className="block text-xs text-muted-foreground">{r.email}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>{r.vai_tro_giang_day ? VAI_TRO_LABEL[r.vai_tro_giang_day] : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <ChuyenMonBadges items={r.chuyen_mon} />
                </TableCell>
                {isQuanTri && (
                  <TableCell>
                    {r.nhom ? <Badge variant="outline">{NHOM_LABEL[r.nhom]}</Badge> : <span className="text-muted-foreground">Chưa xếp</span>}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={TRANG_THAI_VARIANT[r.trang_thai_tham_gia]}>{TRANG_THAI_LABEL[r.trang_thai_tham_gia]}</Badge>
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-3 px-5 pb-5 md:hidden">
        <ThuGonDanhSach soDau={5}>
{rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/nhan-su/${r.id}`}
              className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-background"
            >
              <UserAvatar name={r.ho_ten} src={r.avatar_url} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.ho_ten}</span>
                <span className="mb-2 block truncate text-xs text-muted-foreground">{r.email}</span>
                <span className="flex flex-wrap gap-1.5">
                  {r.vai_tro_giang_day && <Badge variant="blue">{VAI_TRO_LABEL[r.vai_tro_giang_day]}</Badge>}
                  <Badge variant={TRANG_THAI_VARIANT[r.trang_thai_tham_gia]}>{TRANG_THAI_LABEL[r.trang_thai_tham_gia]}</Badge>
                  {isQuanTri && r.nhom && <Badge variant="outline">{NHOM_LABEL[r.nhom]}</Badge>}
                </span>
              </span>
              <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
</ThuGonDanhSach>
      </ul>
    </>
  );
}
