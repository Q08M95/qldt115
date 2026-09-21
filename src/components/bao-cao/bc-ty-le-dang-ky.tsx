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
import { LocVaiTroLinks } from "./thanh-dieu-khien";

const pt = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);

function ThanhTyLe({ v }: { v: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted/70">{v !== null && v > 0 && <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, v)}%` }} />}</div>
      <span className="w-12 text-right text-sm font-medium tabular-nums">{pt(v)}</span>
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
            <StatTile icon={MailCheck} label="Nhận lời mời (A3)" value={pt(t.a3)} trend={xuHuong(t.a3, truoc.a3)} />
            <StatTile icon={Users} label="Người có dữ liệu" value={t.soNguoi} />
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
                <>
                  {/* Máy tính: bảng */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-[13px] font-medium text-muted-foreground">
                          <th className="pb-2 font-medium">Người dạy</th>
                          <th className="pb-2 text-right font-medium">Bài đã dạy</th>
                          <th className="pb-2 pl-6 font-medium">Tự đăng ký (A2)</th>
                          <th className="pb-2 text-right font-medium">Lời mời</th>
                          <th className="pb-2 pl-6 font-medium">Nhận lời mời (A3)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dong.map((r) => (
                          <tr key={r.user_id} className="border-b last:border-0 hover:bg-background">
                            <td className="py-2.5 pr-3">
                              <Nguoi r={r} />
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              {r.so_bai_da_day}
                              {r.so_bai_da_day > 0 && <span className="text-xs text-muted-foreground"> ({r.so_tu_dang_ky} tự ĐK)</span>}
                            </td>
                            <td className="py-2.5 pl-6">
                              <ThanhTyLe v={r.a2} />
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              {r.soMoi}
                              {r.soMoi > 0 && <span className="text-xs text-muted-foreground"> ({r.so_moi_dong_y} đồng ý)</span>}
                            </td>
                            <td className="py-2.5 pl-6">
                              <ThanhTyLe v={r.a3} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Điện thoại: mỗi người 1 thẻ */}
                  <ul className="grid gap-2 md:hidden">
                    {dong.map((r) => (
                      <li key={r.user_id} className="grid gap-2.5 rounded-xl border p-3">
                        <Nguoi r={r} />
                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                          <div className="grid gap-1">
                            <span>Tự đăng ký · {r.so_tu_dang_ky}/{r.so_bai_da_day} Bài</span>
                            <ThanhTyLe v={r.a2} />
                          </div>
                          <div className="grid gap-1">
                            <span>Nhận lời mời · {r.so_moi_dong_y}/{r.soMoi}</span>
                            <ThanhTyLe v={r.a3} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
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
