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

// Ô tỷ lệ: thanh + % ở trên, số đếm nhỏ ở dưới (vd "4/5 Bài") — gọn trong 1 cột nên bảng không bị tràn
function OTyLe({ v, chu }: { v: number | null; chu: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <ThanhMini v={v} />
        <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">{pt(v)}</span>
      </div>
      <span className="text-xs text-muted-foreground">{chu}</span>
    </div>
  );
}

function Nguoi({ r }: { r: DongTyLeTinh }) {
  return (
    <Link href={`/nhan-su/${r.user_id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
      <UserAvatar name={r.ho_ten} src={r.avatar_url} className="size-8" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{r.ho_ten}</span>
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
                <div className="@container">
                  {/* Khu vực đủ rộng: bảng 3 cột (theo bề rộng của thẻ, không theo màn hình) */}
                  <div className="hidden @[40rem]:block">
                    <table className="w-full table-fixed text-sm">
                      <thead>
                        <tr className="border-b text-left text-[13px] font-medium text-muted-foreground">
                          <th className="w-[34%] pb-2 font-medium">Người dạy</th>
                          <th className="w-[33%] pb-2 pl-4 font-medium">Tự đăng ký (A2)</th>
                          <th className="w-[33%] pb-2 pl-4 font-medium">Nhận lời mời (A3)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dong.map((r) => (
                          <tr key={r.user_id} className="border-b last:border-0 hover:bg-background">
                            <td className="py-2.5 pr-3">
                              <Nguoi r={r} />
                            </td>
                            <td className="py-2.5 pl-4">
                              <OTyLe v={r.a2} chu={`${r.so_tu_dang_ky}/${r.so_bai_da_day} Bài đã dạy`} />
                            </td>
                            <td className="py-2.5 pl-4">
                              <OTyLe v={r.a3} chu={`${r.so_moi_dong_y}/${r.soMoi} lời mời`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Khu vực hẹp: mỗi người 1 thẻ */}
                  <ul className="grid gap-2 @[40rem]:hidden">
                    {dong.map((r) => (
                      <li key={r.user_id} className="grid gap-2.5 rounded-xl border p-3">
                        <Nguoi r={r} />
                        <div className="grid grid-cols-2 gap-4">
                          <OTyLe v={r.a2} chu={`Tự đăng ký ${r.so_tu_dang_ky}/${r.so_bai_da_day} Bài`} />
                          <OTyLe v={r.a3} chu={`Nhận mời ${r.so_moi_dong_y}/${r.soMoi}`} />
                        </div>
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
