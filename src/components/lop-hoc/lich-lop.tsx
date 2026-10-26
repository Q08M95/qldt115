import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { pill } from "@/components/bao-cao/thanh-dieu-khien";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BaiLich } from "@/lib/dang-ky/queries";
import { fmtTime } from "@/lib/format";
import { khoaThang, ngayVN, oLichThang, THU, type OLich, type Thang } from "@/lib/lich";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import type { LichLopRow } from "@/lib/lop-hoc/queries";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { cn } from "@/lib/utils";
import type { TrangThaiLopHienThi } from "@/types/database";

// Màu thanh = trạng thái lớp (thay cho màu theo từng lớp) — nhìn là hiểu, chỉ trong 4 màu gốc + xám trung tính (mục 8.1)
const KIEU: Partial<Record<TrangThaiLopHienThi, string>> = {
  nhap: "border border-dashed border-muted-foreground/50 bg-card text-muted-foreground",
  dang_mo: "bg-grad-blue text-hue-blue-on",
  da_du_dang_ky: "bg-grad-green text-hue-green-on",
  dang_dien_ra: "bg-grad-teal text-hue-teal-on",
  da_hoan_thanh: "bg-grad-neutral text-neutral",
};
const nhanTrangThai = (t: TrangThaiLopHienThi) => (t === "nhap" ? "Sắp mở" : TRANG_THAI_LOP_LABEL[t]);
const CHU_GIAI: TrangThaiLopHienThi[] = ["nhap", "dang_mo", "da_du_dang_ky", "dang_dien_ra", "da_hoan_thanh"];
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const khoangNgay = (l: LichLopRow) => (l.ngay_bat_dau === l.ngay_ket_thuc ? ddmm(l.ngay_bat_dau) : `${ddmm(l.ngay_bat_dau)}–${ddmm(l.ngay_ket_thuc)}`);
// Thứ của 1 ngày YYYY-MM-DD (T2..CN)
const thuCua = (ngay: string) => THU[(new Date(`${ngay}T00:00:00Z`).getUTCDay() + 6) % 7];

function ChamThieu() {
  return <span className="size-1.5 shrink-0 rounded-full bg-grad-danger-solid" aria-label="còn thiếu người" />;
}

interface DoanTuan {
  lop: LichLopRow;
  tu: number; // cột bắt đầu 0..6
  den: number; // cột kết thúc 0..6
  lan: number; // hàng trong tuần
  noiTruoc: boolean; // lớp bắt đầu từ tuần trước
  noiSau: boolean; // lớp còn tiếp sang tuần sau
}

// Cắt từng lớp thành đoạn theo tuần rồi xếp hàng (lớp trùng ngày nằm hàng khác nhau)
function xepTuan(ngay: OLich[], lops: LichLopRow[]): DoanTuan[] {
  const dau = ngay[0].khoa;
  const cuoi = ngay[6].khoa;
  const doan = lops
    .filter((l) => l.ngay_bat_dau <= cuoi && l.ngay_ket_thuc >= dau)
    .map((l) => ({
      lop: l,
      tu: l.ngay_bat_dau < dau ? 0 : ngay.findIndex((o) => o.khoa === l.ngay_bat_dau),
      den: l.ngay_ket_thuc > cuoi ? 6 : ngay.findIndex((o) => o.khoa === l.ngay_ket_thuc),
      lan: 0,
      noiTruoc: l.ngay_bat_dau < dau,
      noiSau: l.ngay_ket_thuc > cuoi,
    }))
    .sort((a, b) => a.tu - b.tu || b.den - b.tu - (a.den - a.tu));
  const cuoiLan: number[] = [];
  for (const d of doan) {
    let i = cuoiLan.findIndex((c) => c < d.tu);
    if (i < 0) i = cuoiLan.length;
    cuoiLan[i] = d.den;
    d.lan = i;
  }
  return doan;
}

// Lịch các lớp (mục 4.3 — biết trước lịch để chủ động sắp xếp thời gian): ở mức LỚP, mỗi lớp 1 thanh ngang từ ngày bắt đầu đến
// ngày kết thúc, màu theo trạng thái, chấm đỏ = còn thiếu người; bấm thanh -> trang lớp. Máy tính: lưới tháng; điện thoại: danh sách
// theo tuần (lưới quá chật). "Của tôi": chỉ lớp mình được phân công + danh sách buổi dạy của mình trong tháng.
export function LichLop({
  lops,
  thang,
  hrefTruoc,
  hrefSau,
  hrefHomNay,
  cuaToi,
  baiCuaToi,
}: {
  lops: LichLopRow[];
  thang: Thang;
  hrefTruoc: string;
  hrefSau: string;
  hrefHomNay: string;
  // Chỉ người có hồ sơ GV/TG: công tắc Tất cả lớp | Của tôi
  cuaToi?: { bat: boolean; hrefTatCa: string; hrefCuaToi: string };
  // Bài đã phân công của tôi trong tháng (chỉ dùng khi đang xem "Của tôi")
  baiCuaToi?: BaiLich[];
}) {
  const homNay = ngayVN(new Date());
  const tienTo = khoaThang(thang);
  const o = oLichThang(thang);
  const tuan = Array.from({ length: o.length / 7 }, (_, i) => o.slice(i * 7, i * 7 + 7));
  const dauThang = `${tienTo}-01`;
  const cuoiThang = o.filter((d) => d.trongThang).at(-1)!.khoa;
  const dangXemCuaToi = !!cuaToi?.bat;
  const hien = dangXemCuaToi ? lops.filter((l) => l.toi_day) : lops;
  const trongThang = hien.filter((l) => l.ngay_bat_dau <= cuoiThang && l.ngay_ket_thuc >= dauThang);

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 whitespace-nowrap">
          <CalendarRange className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Tháng {thang.thang}/{thang.nam}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          {homNay.slice(0, 7) !== tienTo && (
            <Button asChild variant="ghost" size="sm">
              <Link href={hrefHomNay}>Hôm nay</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href={hrefTruoc} aria-label="Tháng trước">
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link href={hrefSau} aria-label="Tháng sau">
              <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {cuaToi ? (
            <nav aria-label="Phạm vi lịch" className="flex gap-1">
              <Link href={cuaToi.hrefTatCa} className={pill(!cuaToi.bat)} aria-current={!cuaToi.bat ? "page" : undefined}>
                Tất cả lớp
              </Link>
              <Link href={cuaToi.hrefCuaToi} className={pill(cuaToi.bat)} aria-current={cuaToi.bat ? "page" : undefined}>
                Của tôi
              </Link>
            </nav>
          ) : (
            <span />
          )}
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground" aria-label="Chú giải">
            {CHU_GIAI.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-5 rounded", KIEU[t])} aria-hidden /> {nhanTrangThai(t)}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <ChamThieu /> Còn thiếu người
            </li>
          </ul>
        </div>

        {trongThang.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={dangXemCuaToi ? "Bạn chưa được phân công lớp nào trong tháng này." : "Không có lớp nào trong tháng này."}
          />
        ) : (
          <>
            {/* Máy tính: lưới tháng, mỗi lớp 1 thanh ngang */}
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <div className="grid grid-cols-7 border-b bg-muted/40">
                {THU.map((t) => (
                  <span key={t} className="py-2 text-center text-xs font-medium text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
              {tuan.map((ngay) => (
                <div key={ngay[0].khoa} className="relative min-h-24 border-b last:border-b-0">
                  {/* Lớp nền: ô ngày (đường kẻ dọc + số ngày) */}
                  <div className="absolute inset-0 grid grid-cols-7" aria-hidden>
                    {ngay.map((d) => (
                      <div
                        key={d.khoa}
                        className={cn("border-r pt-1.5 pr-2 text-right text-xs tabular-nums last:border-r-0", !d.trongThang && "bg-muted/30 text-muted-foreground/50")}
                      >
                        <span className={cn("inline-flex size-6 items-center justify-center rounded-full", d.khoa === homNay && "bg-brand-gradient font-semibold text-white")}>
                          {d.ngay}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Lớp trên: thanh lớp, chừa chỗ cho số ngày ở trên */}
                  <div className="relative grid grid-cols-7 gap-y-1 pt-9 pb-2">
                    {xepTuan(ngay, hien).map((d) => (
                      <Link
                        key={d.lop.lop_id}
                        href={`/lop-hoc/${d.lop.lop_id}`}
                        title={`${d.lop.ten} · ${nhanTrangThai(d.lop.trang_thai_hien_thi)} · ${khoangNgay(d.lop)}${d.lop.con_thieu ? " · còn thiếu người" : ""}`}
                        className={cn(
                          "mx-1 flex h-6 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-[filter] duration-150 hover:brightness-95",
                          KIEU[d.lop.trang_thai_hien_thi],
                          d.noiTruoc && "ml-0 rounded-l-none",
                          d.noiSau && "mr-0 rounded-r-none",
                        )}
                        style={{ gridColumn: `${d.tu + 1} / ${d.den + 2}`, gridRow: d.lan + 1 }}
                      >
                        <span className="truncate">{d.lop.ten}</span>
                        {d.lop.con_thieu && <ChamThieu />}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Điện thoại: danh sách lớp theo tuần */}
            <div className="grid gap-4 md:hidden">
              {tuan.map((ngay) => {
                const dau = ngay[0].khoa < dauThang ? dauThang : ngay[0].khoa;
                // Mỗi lớp nằm ở tuần đầu tiên nó xuất hiện trong tháng (không lặp lại ở các tuần sau)
                const ds = trongThang.filter((l) => {
                  const batDau = l.ngay_bat_dau < dauThang ? dauThang : l.ngay_bat_dau;
                  return batDau >= dau && batDau <= ngay[6].khoa;
                });
                if (ds.length === 0) return null;
                return (
                  <section key={ngay[0].khoa}>
                    <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Tuần {ddmm(ngay[0].khoa)} – {ddmm(ngay[6].khoa)}
                    </h3>
                    <ul className="grid grid-cols-1 gap-1.5">
                      {ds.map((l) => (
                        <li key={l.lop_id}>
                          <Link href={`/lop-hoc/${l.lop_id}`} className="flex min-h-11 items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                            <span className={cn("h-8 w-1.5 shrink-0 rounded-full", KIEU[l.trang_thai_hien_thi])} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{l.ten}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">
                                {khoangNgay(l)} · {nhanTrangThai(l.trang_thai_hien_thi)}
                              </span>
                            </span>
                            {l.con_thieu && (
                              <span className="flex shrink-0 items-center gap-1 text-xs text-danger">
                                <ChamThieu /> Thiếu người
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}

        {dangXemCuaToi && <BuoiDayCuaToi bai={baiCuaToi ?? []} />}
      </CardContent>
    </Card>
  );
}

// Buổi dạy của tôi trong tháng — giờ chính xác từng Bài (cần để đi dạy và check-in)
function BuoiDayCuaToi({ bai }: { bai: BaiLich[] }) {
  return (
    <section className="border-t pt-4">
      <h3 className="mb-2 text-sm font-semibold">Buổi dạy của tôi trong tháng</h3>
      {bai.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có buổi dạy nào.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {bai.map((s) => {
            const ngay = ngayVN(s.bai.bat_dau);
            return (
              <li key={s.slot_id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="w-12 shrink-0 text-center">
                  <span className="block text-xs text-muted-foreground">{thuCua(ngay)}</span>
                  <span className="block font-semibold tabular-nums">{ddmm(ngay)}</span>
                </span>
                <Link href={`/lop-hoc/${s.bai.lop_id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">{s.bai.ten}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {fmtTime(s.bai.bat_dau)}–{fmtTime(s.bai.ket_thuc)}
                    </span>{" "}
                    · {s.bai.lop_ten}
                  </span>
                </Link>
                <Badge variant="success" className="h-5 shrink-0">
                  {VAI_TRO_LABEL[s.vai_tro]}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
