import { Activity, Award, Clock, Gauge, Layers, TrendingUp } from "lucide-react";
import { AreaXuHuong, RadarNhom } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import { cn } from "@/lib/utils";
import type { KpiCaNhan, KpiCaNhanKy } from "@/types/database";

const so = (n: number, toiDa = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });

// Nhãn 3 nhóm và các tiêu chí — nhóm A/B/C là nhóm TIÊU CHÍ (không phải nhóm nhân sự), nên hiển thị cho mọi người
const NHOM_TC = [
  { ma: "A", nhan: "Sản lượng" },
  { ma: "B", nhan: "Chuyên cần" },
  { ma: "C", nhan: "Chất lượng" },
];
const TIEU_CHI = [
  { ma: "A1", nhan: "Số giờ dạy trong kỳ" },
  { ma: "A2", nhan: "Tự đăng ký slot trống" },
  { ma: "A3", nhan: "Nhận lời mời dạy" },
  { ma: "B1", nhan: "Điểm danh đúng giờ" },
  { ma: "C1", nhan: "Khảo sát hài lòng" },
  { ma: "C2", nhan: "Dự giờ của quản lý" },
  { ma: "C3", nhan: "Học viên đạt chuẩn" },
];

function tenNganKy(k: KpiCaNhanKy) {
  return k.ten.replace(/^Quý\s*/i, "Q");
}

// Nhãn phụ dưới số KPI: kỳ đang mở là số tạm tính theo thời gian thực
function GhiChuKy({ k }: { k: KpiCaNhanKy }) {
  return (
    <Badge variant={k.trang_thai === "da_dong" ? "neutral" : k.trang_thai === "cho_duyet" ? "warning" : "teal"}>
      {k.trang_thai === "dang_mo" ? "Tạm tính · đang mở" : TRANG_THAI_KY_LABEL[k.trang_thai]}
    </Badge>
  );
}

function ThanhTienDo({ phanTram, className }: { phanTram: number; className?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)} role="presentation">
      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(0, Math.min(100, phanTram))}%` }} />
    </div>
  );
}

// Vị trí so với đồng nghiệp — KHÔNG nêu tên nhóm (mục 4.7). Nhóm đủ lớn: "top X%"; nhóm quá nhỏ (fallback): so với lịch sử của chính người đó.
function ViTri({ hienTai, lichSu, soKy }: { hienTai: KpiCaNhanKy; lichSu: KpiCaNhanKy[]; soKy: number }) {
  if (hienTai.che_do_a1 === "percentile" && hienTai.percentile !== null) {
    const top = Math.max(1, Math.round(100 - hienTai.percentile));
    return (
      <div className="grid gap-2">
        <p className="text-sm">
          Đang ở <span className="font-semibold">top {top}%</span> so với đồng nghiệp cùng vai trò và chuyên môn tương đương.
        </p>
        <ThanhTienDo phanTram={hienTai.percentile} />
        <p className="text-xs text-muted-foreground">Dựa trên số giờ dạy quy đổi (đã nhân hệ số độ khó) trong kỳ.</p>
      </div>
    );
  }
  if (hienTai.che_do_a1 === "lich_su") {
    const truoc = lichSu.filter((k) => k.trang_thai === "da_dong" && k.gio_quy_doi > 0).slice(-soKy);
    if (truoc.length > 0) {
      const tb = truoc.reduce((s, k) => s + k.gio_quy_doi, 0) / truoc.length;
      const chenh = Math.round((hienTai.gio_quy_doi / tb - 1) * 100);
      return (
        <p className="text-sm">
          Số giờ dạy quy đổi kỳ này{" "}
          <span className="font-semibold">
            {chenh >= 0 ? "cao hơn" : "thấp hơn"} {Math.abs(chenh)}%
          </span>{" "}
          so với trung bình {truoc.length} kỳ trước của chính bạn.
        </p>
      );
    }
  }
  return <p className="text-sm text-muted-foreground">Chưa đủ dữ liệu để so sánh vị trí trong kỳ này.</p>;
}

// Tiến độ tới ngưỡng đổi nhóm (mục 4.4 "dự đoán thực dụng"): chỉ nêu hướng thăng/giáng theo VAI TRÒ, không nêu tên nhóm
function TienDo({ td }: { td: NonNullable<KpiCaNhan["tien_do"]> }) {
  const dem = Math.max(td.so_ky_can, 1);
  const du = td.so_ky_dat >= td.so_ky_can;
  if (td.huong === "giang" && td.so_ky_dat === 0) return null;
  const thang = td.huong === "thang";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{thang ? "Hướng tới đề xuất lên Giảng viên" : "Lưu ý: KPI thấp liên tiếp"}</span>
        <Badge variant={thang ? (du ? "success" : "teal") : "warning"}>
          {so(td.so_ky_dat, 0)}/{so(td.so_ky_can, 0)} kỳ
        </Badge>
      </div>
      <div className="flex gap-1.5" role="img" aria-label={`${td.so_ky_dat} trên ${td.so_ky_can} kỳ liên tiếp`}>
        {Array.from({ length: dem }, (_, i) => (
          <span
            key={i}
            className={cn("h-2.5 flex-1 rounded-full", i < td.so_ky_dat ? (thang ? "bg-brand-gradient" : "bg-warning-bg ring-1 ring-warning/50") : "bg-muted")}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {thang
          ? du
            ? `Đã đạt KPI từ ${so(td.nguong)} điểm ${td.so_ky_can} kỳ liên tiếp — đủ điều kiện để Admin xem xét đề xuất thăng nhóm.`
            : `Đã đạt KPI từ ${so(td.nguong)} điểm ${td.so_ky_dat}/${td.so_ky_can} kỳ liên tiếp — còn ${td.so_ky_can - td.so_ky_dat} kỳ nữa để được đề xuất thăng nhóm.`
          : du
            ? `KPI dưới ${so(td.nguong)} điểm ${td.so_ky_can} kỳ liên tiếp — Admin có thể xem xét đề xuất chuyển xuống Trợ giảng.`
            : `KPI dưới ${so(td.nguong)} điểm ${td.so_ky_dat}/${td.so_ky_can} kỳ liên tiếp. Nếu tiếp tục thấp thêm ${td.so_ky_can - td.so_ky_dat} kỳ nữa, Admin có thể xem xét đề xuất chuyển xuống Trợ giảng.`}
      </p>
    </div>
  );
}

function Muc({ tieuDe, children, className }: { tieuDe: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-3 border-t px-5 pt-5", className)}>
      <h3 className="text-sm font-semibold">{tieuDe}</h3>
      {children}
    </section>
  );
}

// Bảng KPI cá nhân (mục 4.4/8.8): Stat Card + trend pill, xu hướng nhiều kỳ (area), breakdown A/B/C (radar; thanh ngang trên mobile),
// vị trí so với đồng nghiệp (ẩn tên nhóm), A4 lũy kế, tiến độ tới ngưỡng đổi nhóm. Dùng chung cho hồ sơ nhân sự và trang /danh-gia.
export function KpiCaNhanBoard({ data, tieuDe = "Bảng KPI cá nhân" }: { data: KpiCaNhan | null; tieuDe?: string }) {
  const coDuLieu = (data?.ky ?? []).filter((k) => k.kpi !== null);
  const hienTai = coDuLieu.at(-1);

  return (
    <Card className="gap-5 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> {tieuDe}
        </CardTitle>
      </CardHeader>

      {!data || !hienTai ? (
        <CardContent>
          <EmptyState
            icon={Gauge}
            title="Chưa có dữ liệu KPI. KPI được tính từ các Bài đã dạy xong thuộc kỳ đánh giá; điểm và biểu đồ theo kỳ sẽ hiển thị tại đây."
          />
          {data && data.a4_tong > 0 && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Award className="size-4" aria-hidden /> Đã nhận {data.a4_tong} lớp không kinh phí
            </p>
          )}
        </CardContent>
      ) : (
        <>
          {(() => {
            const kpi = hienTai.kpi ?? 0;
            const truoc = coDuLieu.at(-2);
            const xuHuong = truoc && (truoc.kpi ?? 0) > 0 ? Math.round(((kpi - (truoc.kpi ?? 0)) / (truoc.kpi ?? 1)) * 100) : undefined;
            const nhomDiem = NHOM_TC.map((n) => ({ ...n, gia_tri: hienTai.diem_nhom[n.ma] ?? null }));
            const thieu = TIEU_CHI.filter((t) => hienTai.gia_tri[t.ma] === undefined);

            return (
              <>
                <div className="grid gap-4 px-5 sm:grid-cols-3">
                  <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 sm:contents">
                    <StatTile icon={Activity} label={`KPI ${hienTai.ten}`} value={so(kpi)} trend={xuHuong} className="min-w-56 flex-1 snap-start">
                      <div className="mt-2">
                        <GhiChuKy k={hienTai} />
                      </div>
                    </StatTile>
                    <StatTile icon={Clock} label="Giờ đã dạy trong kỳ" value={`${so(hienTai.gio_thuc)}h`} className="min-w-56 flex-1 snap-start">
                      <p className="mt-2 text-xs text-muted-foreground">Quy đổi theo độ khó: {so(hienTai.gio_quy_doi)}h</p>
                    </StatTile>
                    <StatTile icon={Layers} label="Số Bài đã dạy" value={hienTai.so_bai} className="min-w-56 flex-1 snap-start">
                      <p className="mt-2 text-xs text-muted-foreground">Thuộc {hienTai.so_lop} lớp</p>
                    </StatTile>
                  </div>
                </div>

                <Muc tieuDe="Xu hướng qua các kỳ">
                  {coDuLieu.length < 2 ? (
                    <p className="text-sm text-muted-foreground">
                      Mới có 1 kỳ có kết quả — biểu đồ xu hướng xuất hiện khi có từ 2 kỳ trở lên.
                    </p>
                  ) : (
                    <AreaXuHuong diem={coDuLieu.map((k) => ({ nhan: tenNganKy(k), gia_tri: k.kpi ?? 0 }))} className="h-auto w-full" />
                  )}
                </Muc>

                <Muc tieuDe={`Điểm theo nhóm tiêu chí — ${hienTai.ten}`}>
                  <div className="hidden justify-center md:flex">
                    <RadarNhom truc={nhomDiem.map((n) => ({ nhan: n.nhan, gia_tri: n.gia_tri }))} className="h-auto w-full max-w-md" />
                  </div>
                  {/* Radar khó đọc trên màn hình hẹp -> 3 thanh ngang (mục 8.9) */}
                  <ul className="grid gap-3 md:hidden">
                    {nhomDiem.map((n) => (
                      <li key={n.ma} className="grid gap-1.5">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-medium">
                            {n.nhan} <span className="text-muted-foreground">({n.ma})</span>
                          </span>
                          <span className="font-semibold tabular-nums">{n.gia_tri === null ? "—" : so(n.gia_tri)}</span>
                        </div>
                        <ThanhTienDo phanTram={n.gia_tri ?? 0} />
                      </li>
                    ))}
                  </ul>
                  <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {TIEU_CHI.filter((t) => hienTai.gia_tri[t.ma] !== undefined).map((t) => (
                      <li key={t.ma} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-b-0">
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{t.ma}</span> · {t.nhan}
                        </span>
                        <span className="tabular-nums">
                          <span className="font-semibold">{so(hienTai.gia_tri[t.ma])}</span>
                          {hienTai.trong_so_hieu_luc[t.ma] !== undefined && (
                            <span className="ml-1.5 text-xs text-muted-foreground">×{so(hienTai.trong_so_hieu_luc[t.ma])}%</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {thieu.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Chưa có dữ liệu: {thieu.map((t) => t.ma).join(", ")} — trọng số được chia lại cho các tiêu chí còn lại.
                    </p>
                  )}
                </Muc>

                <Muc tieuDe="Vị trí so với đồng nghiệp">
                  <ViTri hienTai={hienTai} lichSu={coDuLieu.slice(0, -1)} soKy={data.so_ky_fallback} />
                </Muc>

                <Muc tieuDe="Đóng góp cộng đồng (A4)">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="green">
                      <Award /> {data.a4_tong} lớp không kinh phí
                    </Badge>
                    <span className="text-muted-foreground">Số lũy kế toàn thời gian, không tính vào điểm KPI.</span>
                  </p>
                </Muc>

                {data.tien_do && (data.tien_do.huong === "thang" || data.tien_do.so_ky_dat > 0) && (
                  <Muc tieuDe="Mục tiêu tiếp theo">
                    <TienDo td={data.tien_do} />
                  </Muc>
                )}

                <p className="flex items-center gap-1.5 px-5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5 shrink-0" aria-hidden />
                  Kỳ đang mở là số tạm tính theo thời gian thực; kỳ đã đóng là kết quả đã khóa.
                </p>
              </>
            );
          })()}
        </>
      )}
    </Card>
  );
}
