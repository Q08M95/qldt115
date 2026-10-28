import Link from "next/link";
import { ClipboardCheck, Inbox, MailQuestion, Hourglass } from "lucide-react";
import { NutDuyet, NutPhanHoiMoi, NutRut } from "@/components/dang-ky/dang-ky-controls";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getViecCuaToi, type ViecCuaToi } from "@/lib/dang-ky/queries";
import { fmtDate, fmtTime } from "@/lib/format";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";

type Bai = ViecCuaToi["dang_cho"][number]["bai"];

// Trên điện thoại tên Bài được xuống tối đa 2 dòng (không cắt cụt), lớp và giờ tách dòng riêng — đây là thông tin cần
// đọc được trước khi bấm Duyệt/Rút; máy tính giữ 1 dòng như cũ
function BaiInfo({ bai }: { bai: Bai }) {
  return (
    <div className="min-w-0 sm:flex-1">
      <Link href={`/lop-hoc/${bai.lop_id}`} className="line-clamp-2 font-semibold hover:underline sm:block sm:truncate">
        {bai.ten}
      </Link>
      <p className="mt-0.5 flex flex-wrap gap-x-1 text-xs text-muted-foreground sm:mt-0 sm:flex-nowrap">
        <span className="min-w-0 truncate">{bai.lop_ten}</span>
        <span className="shrink-0 tabular-nums">
          · 
          {fmtDate(bai.bat_dau)} {fmtTime(bai.bat_dau)}–{fmtTime(bai.ket_thuc)}
        </span>
      </p>
    </div>
  );
}

// 1 mục trong danh sách: điện thoại xếp dọc (mỗi phần 1 dòng, dùng hết chiều ngang), máy tính 1 hàng ngang
const DONG = "flex flex-col gap-2 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3";

function Khung({ icon: Icon, tieuDe, dem, children }: { icon: typeof Inbox; tieuDe: string; dem: number; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> {tieuDe} <Badge variant="teal">{dem}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Trang "Đăng ký giảng dạy": không có danh sách riêng — việc đăng ký/duyệt/mời nằm ngay trong trang chi tiết lớp (mục 8.8).
// Đây là nơi tập trung "việc của tôi": lời mời cần phản hồi, đăng ký đang chờ; Admin thêm hàng đợi cần duyệt. Lịch dạy xem ở
// chế độ Lịch của trang Lớp học ("Của tôi").
export default async function DangKyPage() {
  const { profile, isQuanTri } = await requireSession();
  const v = await getViecCuaToi(profile.id, isQuanTri);
  const loiMoi = v.dang_cho.filter((d) => d.loai === "duoc_moi");
  const dangKy = v.dang_cho.filter((d) => d.loai === "tu_dang_ky");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {isQuanTri && (
        <div className="lg:col-span-2">
          <Khung icon={ClipboardCheck} tieuDe="Đăng ký chờ duyệt" dem={v.can_duyet.length}>
            {v.can_duyet.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="Không có đăng ký nào đang chờ duyệt." />
            ) : (
              <ul className="divide-y">
                {v.can_duyet.map((d) => (
                  <li key={d.id} className={DONG}>
                    <div className="flex min-w-0 items-center gap-2 sm:min-w-56 sm:flex-1">
                      <UserAvatar name={d.ho_ten} src={d.avatar_url} className="size-8 shrink-0 sm:size-9" />
                      <Link href={`/nhan-su/${d.user_id}`} className="min-w-0 truncate font-semibold hover:underline">
                        {d.ho_ten}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{VAI_TRO_LABEL[d.vai_tro]}</span>
                    </div>
                    <BaiInfo bai={d.bai} />
                    <div className="flex">
                      <NutDuyet id={d.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Xem xếp hạng gợi ý và cảnh báo dồn tải ngay trong trang chi tiết từng lớp trước khi duyệt.
            </p>
          </Khung>
        </div>
      )}

      <Khung icon={MailQuestion} tieuDe="Lời mời cần bạn phản hồi" dem={loiMoi.length}>
        {loiMoi.length === 0 ? (
          <EmptyState icon={MailQuestion} title="Chưa có lời mời dạy nào." />
        ) : (
          <ul className="divide-y">
            {loiMoi.map((d) => (
              <li key={d.id} className={DONG}>
                <BaiInfo bai={d.bai} />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="blue">{VAI_TRO_LABEL[d.vai_tro]}</Badge>
                  <NutPhanHoiMoi id={d.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Khung>

      <Khung icon={Hourglass} tieuDe="Đăng ký của tôi đang chờ duyệt" dem={dangKy.length}>
        {dangKy.length === 0 ? (
          <EmptyState icon={Hourglass} title="Bạn chưa có đăng ký nào đang chờ. Vào một lớp đang mở để đăng ký các Bài." />
        ) : (
          <ul className="divide-y">
            {dangKy.map((d) => (
              <li key={d.id} className={DONG}>
                <BaiInfo bai={d.bai} />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="warning">Chờ duyệt</Badge>
                  <NutRut id={d.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Khung>
    </div>
  );
}
