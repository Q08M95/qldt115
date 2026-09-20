import Link from "next/link";
import { CalendarCheck, ClipboardCheck, Inbox, MailQuestion, Hourglass } from "lucide-react";
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

function BaiInfo({ bai }: { bai: Bai }) {
  return (
    <div className="min-w-0 flex-1">
      <Link href={`/lop-hoc/${bai.lop_id}`} className="block truncate font-semibold hover:underline">
        {bai.ten}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {bai.lop_ten} · <span className="tabular-nums">{fmtDate(bai.bat_dau)} {fmtTime(bai.bat_dau)}–{fmtTime(bai.ket_thuc)}</span>
      </p>
    </div>
  );
}

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
// Đây là nơi tập trung "việc của tôi": lời mời cần phản hồi, đăng ký đang chờ, lịch được phân công; Admin thêm hàng đợi cần duyệt.
export default async function DangKyPage() {
  const { profile, isQuanTri } = await requireSession();
  const v = await getViecCuaToi(profile.id, isQuanTri);
  const loiMoi = v.dang_cho.filter((d) => d.loai === "duoc_moi");
  const dangKy = v.dang_cho.filter((d) => d.loai === "tu_dang_ky");
  const sapToi = v.da_phan_cong;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {isQuanTri && (
        <div className="lg:col-span-2">
          <Khung icon={ClipboardCheck} tieuDe="Đăng ký chờ duyệt" dem={v.can_duyet.length}>
            {v.can_duyet.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="Không có đăng ký nào đang chờ duyệt." />
            ) : (
              <ul className="divide-y">
                {v.can_duyet.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <UserAvatar name={d.ho_ten} src={d.avatar_url} className="size-9" />
                    <div className="min-w-40 flex-1">
                      <Link href={`/nhan-su/${d.user_id}`} className="font-semibold hover:underline">
                        {d.ho_ten}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">{VAI_TRO_LABEL[d.vai_tro]}</span>
                    </div>
                    <BaiInfo bai={d.bai} />
                    <NutDuyet id={d.id} />
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
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <BaiInfo bai={d.bai} />
                <Badge variant="blue">{VAI_TRO_LABEL[d.vai_tro]}</Badge>
                <NutPhanHoiMoi id={d.id} />
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
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <BaiInfo bai={d.bai} />
                <Badge variant="warning">Chờ duyệt</Badge>
                <NutRut id={d.id} />
              </li>
            ))}
          </ul>
        )}
      </Khung>

      <div className="lg:col-span-2">
        <Khung icon={CalendarCheck} tieuDe="Lịch sắp diễn ra của tôi" dem={sapToi.length}>
          {sapToi.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Bạn chưa có Bài nào sắp diễn ra. Các Bài đã dạy xem ở Lịch sử giảng dạy trong hồ sơ." />
          ) : (
            <ul className="divide-y">
              {sapToi.map((s) => (
                <li key={s.slot_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <BaiInfo bai={s.bai} />
                  <Badge variant="success">{VAI_TRO_LABEL[s.vai_tro]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Khung>
      </div>
    </div>
  );
}
