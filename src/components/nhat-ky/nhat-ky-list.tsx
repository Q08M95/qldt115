import Link from "next/link";
import { ArrowRight, ScrollText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ThuGonDanhSach } from "@/components/thu-gon-danh-sach";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { fmtDateTime } from "@/lib/format";
import { hienGiaTri, LOAI_NHAT_KY, nhanTruong } from "@/lib/nhat-ky/labels";
import type { NhatKy } from "@/types/database";

// Bảng "trước → sau": chỉ các trường thay đổi (cấu hình thì có cả giá trị cũ và mới)
function BangThayDoi({ truoc, sau }: { truoc: Record<string, unknown> | null; sau: Record<string, unknown> | null }) {
  const khoa = Array.from(new Set([...Object.keys(truoc ?? {}), ...Object.keys(sau ?? {})]));
  if (khoa.length === 0) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-background">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-3 py-1.5 font-medium">Trường</th>
            <th className="px-3 py-1.5 font-medium">Trước</th>
            <th className="px-3 py-1.5 font-medium">Sau</th>
          </tr>
        </thead>
        <tbody>
          {khoa.map((k) => (
            <tr key={k} className="border-t border-border/60 align-top">
              <td className="px-3 py-1.5 text-muted-foreground">{nhanTruong(k)}</td>
              <td className="px-3 py-1.5 break-words tabular-nums">{hienGiaTri(truoc?.[k])}</td>
              <td className="px-3 py-1.5 font-medium break-words tabular-nums">{hienGiaTri(sau?.[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 1 dòng nhật ký: thời gian · người thực hiện · loại · nội dung (mobile xếp dọc thành thẻ)
function Dong({ r }: { r: NhatKy }) {
  const loai = LOAI_NHAT_KY[r.loai];
  const coChiTiet = (r.truoc && Object.keys(r.truoc).length > 0) || (r.sau && Object.keys(r.sau).length > 0);
  const ten = r.nguoi_thuc_hien_ten ?? "Hệ thống";

  return (
    <li className="grid gap-2 border-b border-border/60 px-5 py-4 last:border-b-0 md:grid-cols-[9.5rem_12rem_9.5rem_minmax(0,1fr)] md:gap-4">
      <time dateTime={r.created_at} className="text-xs text-muted-foreground tabular-nums md:pt-1 md:text-[13px]">
        {fmtDateTime(r.created_at)}
      </time>
      <span className="flex min-w-0 items-center gap-2 self-start">
        <UserAvatar name={ten} className="size-7 text-[11px]" />
        <span className="truncate text-sm font-medium">{ten}</span>
      </span>
      <span className="self-start md:pt-0.5">
        <Badge variant={loai?.variant ?? "default"}>{loai?.nhan ?? r.loai}</Badge>
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug">
          {r.mo_ta}
          {r.tu_duyet && (
            <Badge variant="warning" className="ml-2 align-middle">
              Tự duyệt
            </Badge>
          )}
        </p>
        {r.doi_tuong && <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.doi_tuong}</p>}
        {r.ly_do && (
          <p className="mt-1 text-[13px]">
            <span className="text-muted-foreground">Lý do: </span>
            {r.ly_do}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {coChiTiet && (
            <details className="group w-full">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary select-none [&::-webkit-details-marker]:hidden">
                <ArrowRight className="size-3 transition-transform group-open:rotate-90" aria-hidden /> Xem thay đổi
              </summary>
              <BangThayDoi truoc={r.truoc} sau={r.sau} />
            </details>
          )}
          {r.lien_ket && (
            <Link href={r.lien_ket} className="text-xs font-medium text-primary hover:underline">
              Mở liên quan
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function NhatKyList({ rows }: { rows: NhatKy[] }) {
  if (rows.length === 0) return <EmptyState icon={ScrollText} title="Chưa có dòng nhật ký nào phù hợp" />;
  return (
    <div>
      {/* Tiêu đề cột chỉ hiện ở desktop; mobile mỗi dòng là 1 thẻ */}
      <div className="hidden border-y border-border/60 px-5 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[9.5rem_12rem_9.5rem_minmax(0,1fr)] md:gap-4">
        <span>Thời gian</span>
        <span>Người thực hiện</span>
        <span>Hành động</span>
        <span>Nội dung</span>
      </div>
      <ul>
        <ThuGonDanhSach soDau={5}>
          {rows.map((r) => (
            <Dong key={r.id} r={r} />
          ))}
        </ThuGonDanhSach>
      </ul>
    </div>
  );
}
