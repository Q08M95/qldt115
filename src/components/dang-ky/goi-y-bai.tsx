import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import {
  NutDuyet,
  NutMoi,
  NutPhanHoiMoi,
  NutRut,
  NutThuHoi,
} from "@/components/dang-ky/dang-ky-controls";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { cn } from "@/lib/utils";
import type { DangKyCho, UngVien, VaiTroGiangDay } from "@/types/database";

const HIEN_TRUOC = 5;

function TenNguoi({ id, ten, avatar }: { id: string; ten: string; avatar: string | null }) {
  return (
    <Link href={`/nhan-su/${id}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
      <UserAvatar name={ten} src={avatar} className="size-7" />
      <span className="truncate">{ten}</span>
    </Link>
  );
}

function DongUngVien({
  u,
  baiId,
  vaiTro,
  isQuanTri,
  laToi,
  khongKinhPhi,
}: {
  u: UngVien;
  baiId: string;
  vaiTro: VaiTroGiangDay;
  isQuanTri: boolean;
  laToi: boolean;
  khongKinhPhi: boolean;
}) {
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm", laToi && "rounded-lg bg-primary/5 px-2")}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
        {u.hang}
      </span>
      <div className="min-w-40 flex-1">
        <TenNguoi id={u.user_id} ten={u.ho_ten} avatar={u.avatar_url} />
        <p className="mt-0.5 pl-9 text-xs text-muted-foreground tabular-nums">
          {khongKinhPhi ? `${u.so_lop_khong_kinh_phi} lớp không kinh phí đã nhận` : `${u.gio_ky} giờ trong kỳ`}
          {u.cung_lop > 0 && ` · đã có ${u.cung_lop} Bài khác trong lớp`}
        </p>
      </div>
      {laToi && <Badge variant="default">Bạn</Badge>}
      {u.trang_thai_hien_co === "dang_ky" && <Badge variant="warning">Đã đăng ký</Badge>}
      {u.trang_thai_hien_co === "duoc_moi" && <Badge variant="teal">Đã mời</Badge>}
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums" title="Điểm gợi ý (0–1)">
        {u.diem.toFixed(2)}
      </span>
      {isQuanTri && !u.trang_thai_hien_co && <NutMoi baiId={baiId} vaiTro={vaiTro} userId={u.user_id} />}
    </li>
  );
}

// Gợi ý nhân sự (matching-score) + việc chờ xử lý của 1 vai trò trong 1 Bài còn slot trống.
// Danh sách xếp hạng công khai cho mọi người xem lớp (mục 4.3); nút Mời/Duyệt chỉ cho người quản trị.
export function GoiYBai({
  baiId,
  vaiTro,
  ungVien,
  choXuLy,
  isQuanTri,
  viewerId,
  nguongPool,
  khongKinhPhi,
}: {
  baiId: string;
  vaiTro: VaiTroGiangDay;
  ungVien: UngVien[];
  choXuLy: DangKyCho[];
  isQuanTri: boolean;
  viewerId: string;
  nguongPool: number;
  khongKinhPhi: boolean;
}) {
  const nhan = VAI_TRO_LABEL[vaiTro];
  const soUngVien = ungVien.length;

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border bg-background p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Sparkles className="size-3.5" aria-hidden /> Gợi ý nhân sự · {nhan}
      </p>

      {/* Cảnh báo pool ứng viên nhỏ — chỉ người quản trị, để chủ động mời sớm (mục 4.3) */}
      {isQuanTri && soUngVien === 0 && (
        <div role="alert" className="flex gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Chưa có ai đủ điều kiện cho slot {nhan} này. Hãy xem lại điều kiện nhóm/chứng chỉ của lớp có đang quá hẹp không.
          </span>
        </div>
      )}
      {isQuanTri && soUngVien > 0 && soUngVien < nguongPool && (
        <div role="alert" className="flex gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Chỉ có {soUngVien} người đủ điều kiện (ngưỡng cảnh báo: dưới {nguongPool}). Nên mời sớm thay vì chờ đăng ký.
          </span>
        </div>
      )}

      {choXuLy.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card px-3">
          {choXuLy.map((d) => {
            const dangKy = d.loai === "tu_dang_ky";
            const laToi = d.user_id === viewerId;
            const hang = ungVien.find((u) => u.user_id === d.user_id)?.hang;
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <div className="min-w-40 flex-1">
                  <TenNguoi id={d.user_id} ten={d.ho_ten} avatar={d.avatar_url} />
                  <p className="mt-0.5 pl-9 text-xs text-muted-foreground">
                    {dangKy ? "Đăng ký chờ duyệt" : "Đã mời — chờ phản hồi"}
                    {dangKy && hang !== undefined && ` · hạng gợi ý #${hang}`}
                    {dangKy && hang === undefined && " · không còn đủ điều kiện"}
                  </p>
                </div>
                {isQuanTri && dangKy && <NutDuyet id={d.id} />}
                {isQuanTri && !dangKy && <NutThuHoi id={d.id} />}
                {!isQuanTri && laToi && (dangKy ? <NutRut id={d.id} /> : <NutPhanHoiMoi id={d.id} />)}
                {isQuanTri && laToi && !dangKy && <NutPhanHoiMoi id={d.id} />}
              </li>
            );
          })}
        </ul>
      )}

      {soUngVien === 0 ? (
        !isQuanTri && <p className="text-sm text-muted-foreground">Chưa có ứng viên phù hợp.</p>
      ) : (
        <>
          <ul className="divide-y">
            {ungVien.slice(0, HIEN_TRUOC).map((u) => (
              <DongUngVien key={u.user_id} u={u} baiId={baiId} vaiTro={vaiTro} isQuanTri={isQuanTri} laToi={u.user_id === viewerId} khongKinhPhi={khongKinhPhi} />
            ))}
          </ul>
          {soUngVien > HIEN_TRUOC && (
            <details className="group/more">
              <summary className="cursor-pointer list-none text-sm font-medium text-primary marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="group-open/more:hidden">Xem thêm {soUngVien - HIEN_TRUOC} người</span>
                <span className="hidden group-open/more:inline">Thu gọn</span>
              </summary>
              <ul className="divide-y">
                {ungVien.slice(HIEN_TRUOC).map((u) => (
                  <DongUngVien key={u.user_id} u={u} baiId={baiId} vaiTro={vaiTro} isQuanTri={isQuanTri} laToi={u.user_id === viewerId} khongKinhPhi={khongKinhPhi} />
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs text-muted-foreground">
            Xếp theo công bằng khối lượng giảng dạy: người{" "}
            {khongKinhPhi ? "nhận ít lớp không kinh phí hơn" : "dạy ít giờ hơn trong kỳ"} được xếp trước.
          </p>
        </>
      )}
    </div>
  );
}
