import Link from "next/link";
import { HandHeart, MailCheck, Users } from "lucide-react";
import { DongHoBanNguyet } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { KhoangBaoCao } from "@/lib/bao-cao/khoang";
import { tongHopTyLe, xuHuong, type DongTyLeTinh, type LocVaiTro } from "@/lib/bao-cao/tinh-toan";
import type { DongTyLe } from "@/lib/bao-cao/types";
import type { KhoaBaoCao } from "@/lib/bao-cao/url";
import { ThanhMini } from "./bieu-do";
import { LocVaiTroLinks } from "./thanh-dieu-khien";

const pt = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);

// Hàng danh sách cùng kiểu bảng "Giờ dạy theo người": avatar + tên | thanh + giá trị (xếp dọc trên điện thoại)
const HANG = "flex flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-background sm:flex-row sm:items-center sm:gap-3";
const COT_NGUOI = "sm:w-[34%] sm:shrink-0";

// Ô tỷ lệ: thanh + % , số đếm nhỏ ở dưới (vd "4/5 Bài đã dạy")
function OTyLe({ v, chu, nhan }: { v: number | null; chu: string; nhan: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground sm:hidden">{nhan}</p>
      <div className="flex items-center gap-3">
        <ThanhMini v={v} className="h-3 min-w-10 flex-1" />
        <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">{pt(v)}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{chu}</p>
    </div>
  );
}

function Nguoi({ r }: { r: DongTyLeTinh }) {
  return (
    <Link href={`/nhan-su/${r.user_id}`} className={`flex min-w-0 items-center gap-2.5 hover:underline ${COT_NGUOI}`}>
      <UserAvatar name={r.ho_ten} src={r.avatar_url} className="size-7 shrink-0 text-xs" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium" title={r.ho_ten}>
          {r.ho_ten}
        </span>
        <span className="block text-xs text-muted-foreground">{VAI_TRO_LABEL[r.vai_tro]}</span>
      </span>
    </Link>
  );
}

// Báo cáo #4 — Tỷ lệ tự đăng ký (A2) và nhận lời mời (A3) theo người (mục 4.7/5).
// A2 = Bài tự đăng ký được duyệt ÷ Bài đã dạy; A3 = lời mời đồng ý ÷ (đồng ý + từ chối). Mẫu số 0 hiện "–" (không có dữ liệu).
export function BaoCaoTyLe({
  rows,
  rowsTruoc,
  loc,
  khoang,
  bc,
}: {
  rows: DongTyLe[];
  rowsTruoc: DongTyLe[];
  loc: LocVaiTro;
  khoang: KhoangBaoCao;
  bc: KhoaBaoCao;
}) {
  const t = tongHopTyLe(rows, loc);
  const truoc = tongHopTyLe(rowsTruoc, loc);
  const dong = [...t.dong].sort((a, b) => (b.a2 ?? -1) - (a.a2 ?? -1) || (b.a3 ?? -1) - (a.a3 ?? -1) || a.ho_ten.localeCompare(b.ho_ten, "vi"));

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={HandHeart} label="Tự đăng ký (A2)" value={pt(t.a2)} trend={xuHuong(t.a2, truoc.a2)} />
            <StatTile icon={MailCheck} label="Nhận mời (A3)" value={pt(t.a3)} trend={xuHuong(t.a3, truoc.a3)} />
            <StatTile icon={Users} label="Có dữ liệu" value={t.soNguoi} />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Theo từng người <span className="text-sm font-normal text-muted-foreground">· {t.soNguoi} người</span>
              </CardTitle>
              <CardAction>
                <LocVaiTroLinks bc={bc} khoang={khoang} vt={loc} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {dong.length === 0 ? (
                <EmptyState icon={HandHeart} title="Chưa có ai dạy xong Bài hoặc phản hồi lời mời trong khoảng thời gian này" />
              ) : (
                <div className="grid gap-1">
                  <div className={`hidden gap-3 border-b px-2 pb-2 text-[13px] font-medium text-muted-foreground sm:flex`}>
                    <span className={COT_NGUOI}>Người dạy</span>
                    <span className="flex-1">Tự đăng ký (A2)</span>
                    <span className="flex-1">Nhận lời mời (A3)</span>
                  </div>
                  <ul className="grid gap-0.5">
                    {dong.map((r) => (
                      <li key={r.user_id} className={HANG}>
                        <Nguoi r={r} />
                        <OTyLe nhan="Tự đăng ký (A2)" v={r.a2} chu={`${r.so_tu_dang_ky}/${r.so_bai_da_day} Bài đã dạy`} />
                        <OTyLe nhan="Nhận lời mời (A3)" v={r.a3} chu={`${r.so_moi_dong_y}/${r.soMoi} lời mời`} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle>Toàn đơn vị</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="grid gap-1 text-center">
                {t.a2 === null ? <Trong /> : <DongHoBanNguyet phanTram={t.a2} so={pt(t.a2)} nhan="Tự đăng ký" className="w-full" />}
                <p className="text-xs text-muted-foreground">{t.tongTuDangKy} Bài tự đăng ký</p>
              </div>
              <div className="grid gap-1 text-center">
                {t.a3 === null ? <Trong /> : <DongHoBanNguyet phanTram={t.a3} so={pt(t.a3)} nhan="Nhận lời mời" className="w-full" />}
                <p className="text-xs text-muted-foreground">{t.tongMoi} lời mời đã phản hồi</p>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-2 px-0">
            <CardHeader>
              <CardTitle>Cách đọc số liệu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Tự đăng ký (A2):</span> trong các Bài đã dạy xong, bao nhiêu % là do chính người đó đăng ký và được duyệt.
              </p>
              <p>
                <span className="font-medium text-foreground">Nhận lời mời (A3):</span> trong các lời mời đã phản hồi, bao nhiêu % được đồng ý (lời mời còn chờ chưa tính).
              </p>
              <p className="text-xs">Đây là ghi nhận đóng góp đã qua, không phải khối lượng còn lại — người dạy ít nhưng nhận lời mời tốt vẫn được ghi nhận.</p>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}

function Trong() {
  return <p className="grid h-24 place-items-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;
}
