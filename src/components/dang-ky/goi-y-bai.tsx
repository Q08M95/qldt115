import Link from "next/link";
import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import {
  NutDuyet,
  NutMoi,
  NutPhanHoiMoi,
  NutRut,
  NutThuHoi,
} from "@/components/dang-ky/dang-ky-controls";
import { MoiNgoaiLe } from "@/components/dang-ky/moi-ngoai-le";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { cn } from "@/lib/utils";
import type { DangKyCho, UngVien, VaiTroGiangDay } from "@/types/database";

const HIEN_TRUOC = 3;

function TenNguoi({ id, ten, avatar }: { id: string; ten: string; avatar: string | null }) {
  return (
    <Link href={`/nhan-su/${id}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
      <UserAvatar name={ten} src={avatar} className="size-7" />
      <span className="truncate">{ten}</span>
    </Link>
  );
}

// Trên điện thoại tên được ưu tiên chỗ: giờ/điểm/nhãn trạng thái dồn xuống dòng phụ, nút Mời chỉ còn biểu tượng
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
  const diem = u.diem.toFixed(2).replace(".", ",");
  return (
    <li className={cn("flex items-center gap-2 py-2 text-sm sm:gap-3", laToi && "rounded-lg bg-grad-primary-soft px-2")}>
      <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">{u.hang}</span>
      <Link href={`/nhan-su/${u.user_id}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <UserAvatar name={u.ho_ten} src={u.avatar_url} className="size-8" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/nhan-su/${u.user_id}`} className="block truncate font-medium hover:underline">
          {u.ho_ten}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span>{khongKinhPhi ? (
              `${u.so_lop_khong_kinh_phi} lớp không kinh phí`
            ) : (
              <>
                {u.gio_ky} giờ<span className="max-sm:hidden"> trong kỳ</span>
              </>
            )}</span>
          <span className="sm:hidden" title="Điểm gợi ý (0–1)">· điểm {diem}</span>
          {u.cung_lop > 0 && <span>· đã có {u.cung_lop} Bài khác trong lớp</span>}
          {laToi && <Badge variant="default">Bạn</Badge>}
          {u.trang_thai_hien_co === "dang_ky" && <Badge variant="warning">Đã đăng ký</Badge>}
          {u.trang_thai_hien_co === "duoc_moi" && <Badge variant="teal">Đã mời</Badge>}
        </p>
      </div>
      <span className="hidden w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block" title="Điểm gợi ý (0–1)">
        {diem}
      </span>
      {isQuanTri && !u.trang_thai_hien_co && <NutMoi baiId={baiId} vaiTro={vaiTro} userId={u.user_id} />}
    </li>
  );
}

// Gợi ý nhân sự (matching-score) + việc chờ xử lý của 1 vai trò trong 1 Bài còn slot trống.
// Danh sách xếp hạng công khai cho mọi người xem lớp (mục 4.3); nút Mời/Duyệt chỉ cho người quản trị.
// Danh sách gợi ý thu gọn sẵn (bấm mới mở, hiện 3 người đầu) cho gọn lớp nhiều Bài; cảnh báo pool nhỏ và việc chờ xử lý
// luôn hiện vì cần hành động.
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

      {/* Cảnh báo pool ứng viên nhỏ — chỉ người quản trị, để chủ động mời sớm (mục 4.3) */}
      {isQuanTri && soUngVien === 0 && (
        <div role="alert" className="flex gap-2 rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Chưa có ai đủ điều kiện cho slot {nhan} này. Hãy xem lại điều kiện nhóm/chứng chỉ của lớp có đang quá hẹp không.
          </span>
        </div>
      )}
      {isQuanTri && soUngVien > 0 && soUngVien < nguongPool && (
        <div role="alert" className="flex gap-2 rounded-lg bg-grad-warning px-3 py-2 text-sm text-warning">
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
                  {isQuanTri && d.ngoai_le && (
                    <p className="mt-1 pl-9 text-xs text-warning">
                      <Badge variant="warning" className="mr-1.5">Ngoại lệ</Badge>
                      {d.ly_do_ngoai_le}
                      {d.vuot_loc && <span className="text-muted-foreground"> (bỏ qua: {d.vuot_loc})</span>}
                    </p>
                  )}
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

      <details className="group/goiy">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase marker:hidden [&::-webkit-details-marker]:hidden">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            Gợi ý<span className="hidden sm:inline"> nhân sự</span> · {nhan}
          </span>
          {soUngVien > 0 && <span className="shrink-0 font-normal tracking-normal normal-case tabular-nums">{soUngVien} người</span>}
          <ChevronDown className="size-4 shrink-0 transition-transform group-open/goiy:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {isQuanTri && (
            <div className="-mx-1">
              <MoiNgoaiLe baiId={baiId} vaiTro={vaiTro} />
            </div>
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
      </details>
    </div>
  );
}
