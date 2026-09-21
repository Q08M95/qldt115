import { Activity, Award, Clock, Gauge, Layers, Target } from "lucide-react";
import { AreaXuHuong, DongHoBanNguyet, RadarNhom } from "@/components/danh-gia/kpi-charts";
import { EmptyState } from "@/components/empty-state";
import { TrendPill } from "@/components/trend-pill";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import { cn } from "@/lib/utils";
import type { KpiCaNhan, KpiCaNhanKy } from "@/types/database";

const so = (n: number, toiDa = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });

// Nhóm A/B/C là nhóm TIÊU CHÍ (không phải nhóm nhân sự) nên hiển thị cho mọi người
const NHOM_TC = [
  { ma: "A", nhan: "Sản lượng" },
  { ma: "B", nhan: "Chuyên cần" },
  { ma: "C", nhan: "Chất lượng" },
];
const TIEU_CHI = [
  { ma: "A1", nhan: "Giờ dạy" },
  { ma: "A2", nhan: "Tự đăng ký" },
  { ma: "A3", nhan: "Nhận lời mời" },
  { ma: "B1", nhan: "Đúng giờ" },
  { ma: "C1", nhan: "Hài lòng" },
  { ma: "C2", nhan: "Dự giờ" },
  { ma: "C3", nhan: "Đạt chuẩn" },
];

// "Demo - Quý 4/2025" → "Q4/2025"; tên khác giữ nguyên nhưng cắt gọn để nhãn trục không tràn
function tenNganKy(k: KpiCaNhanKy) {
  const m = /Quý\s*(\d)\s*\/\s*(\d{4})/i.exec(k.ten);
  return m ? `Q${m[1]}/${m[2]}` : k.ten.length > 10 ? `${k.ten.slice(0, 9)}…` : k.ten;
}

function TrangThaiKyBadge({ k }: { k: KpiCaNhanKy }) {
  return (
    <Badge variant={k.trang_thai === "da_dong" ? "neutral" : k.trang_thai === "cho_duyet" ? "warning" : "teal"}>
      {k.trang_thai === "dang_mo" ? "Tạm tính" : TRANG_THAI_KY_LABEL[k.trang_thai]}
    </Badge>
  );
}

function ThanhTienDo({ phanTram, cao = "h-2", className }: { phanTram: number; cao?: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", cao, className)} role="presentation">
      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(0, Math.min(100, phanTram))}%` }} />
    </div>
  );
}

// Màu con số: 4 màu gốc của hệ thống, chữ gradient (mục 8.1); nền ô trung tính
const HUE = {
  navy: "text-grad-navy",
  blue: "text-grad-blue",
  teal: "text-grad-teal",
  green: "text-grad-green",
} as const;

// Ô số liệu: nhãn ngắn (icon + chữ) ở trên, giá trị lớn ở giữa; số có màu gradient, nền trung tính
function O({
  icon: Icon,
  nhan,
  children,
  className,
}: {
  icon: typeof Gauge;
  nhan: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-between gap-3 rounded-2xl bg-background p-4 text-center", className)}>
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
        <Icon className="hidden size-4 shrink-0 @sm:block" strokeWidth={1.75} aria-hidden />
        <span className="text-[12.5px] leading-tight font-medium">{nhan}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// Số lớn có màu gradient (chỉ áp cho chính con số, chú thích bên cạnh giữ màu chữ thường)
function So({ hue, children }: { hue: keyof typeof HUE; children: React.ReactNode }) {
  return <span className={cn("inline-block text-[30px] leading-none font-semibold tabular-nums", HUE[hue])}>{children}</span>;
}
const CHU_THICH = "mt-1.5 text-xs text-muted-foreground";

function Muc({ tieuDe, children, className }: { tieuDe: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-3 border-t px-5 pt-5", className)}>
      <h3 className="text-sm font-semibold">{tieuDe}</h3>
      {children}
    </section>
  );
}

// Vị trí so với đồng nghiệp — KHÔNG nêu tên nhóm (mục 4.7). Nhóm đủ lớn: đồng hồ "top X%"; nhóm quá nhỏ (fallback): % so với TB các kỳ trước của chính người đó.
function OViTri({ hienTai, lichSu, soKy }: { hienTai: KpiCaNhanKy; lichSu: KpiCaNhanKy[]; soKy: number }) {
  if (hienTai.che_do_a1 === "percentile" && hienTai.percentile !== null) {
    const top = Math.max(1, Math.round(100 - hienTai.percentile));
    return (
      <O icon={Gauge} nhan="Vị trí">
        <DongHoBanNguyet phanTram={hienTai.percentile} so={`Top ${top}%`} nhan="so với đồng nghiệp" className="mx-auto h-auto w-full max-w-36" />
      </O>
    );
  }
  const truoc = hienTai.che_do_a1 === "lich_su" ? lichSu.filter((k) => k.trang_thai === "da_dong" && k.gio_quy_doi > 0).slice(-soKy) : [];
  if (truoc.length > 0) {
    const tb = truoc.reduce((s, k) => s + k.gio_quy_doi, 0) / truoc.length;
    const chenh = Math.round((hienTai.gio_quy_doi / tb - 1) * 100);
    return (
      <O icon={Gauge} nhan="So với bản thân">
        <So hue="blue">
          {chenh >= 0 ? "+" : "−"}
          {Math.abs(chenh)}%
        </So>
        <p className={CHU_THICH}>TB {truoc.length} kỳ trước</p>
      </O>
    );
  }
  return (
    <O icon={Gauge} nhan="Vị trí">
      <So hue="blue">—</So>
    </O>
  );
}

// Tiến độ tới ngưỡng đổi nhóm (mục 4.4): chỉ nêu hướng thăng/giáng theo VAI TRÒ, không nêu tên nhóm
function OMucTieu({ td }: { td: NonNullable<KpiCaNhan["tien_do"]> }) {
  const thang = td.huong === "thang";
  const dem = Math.max(td.so_ky_can, 1);
  return (
    <O icon={Target} nhan={thang ? "Lên Giảng viên" : "Cảnh báo KPI thấp"}>
      <p>
        <So hue="teal">{so(td.so_ky_dat, 0)}</So>
        <span className="text-base font-medium text-muted-foreground">/{so(td.so_ky_can, 0)} kỳ</span>
      </p>
      <div className="mt-2.5 flex w-full gap-1" role="img" aria-label={`${td.so_ky_dat} trên ${td.so_ky_can} kỳ liên tiếp`}>
        {Array.from({ length: dem }, (_, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full", i < td.so_ky_dat ? (thang ? "bg-brand-gradient" : "bg-grad-danger-solid") : "bg-border")} />
        ))}
      </div>
      <p className={CHU_THICH}>
        {thang ? "≥" : "<"} {so(td.nguong)} điểm liên tiếp
      </p>
    </O>
  );
}

// Bảng KPI cá nhân (mục 4.4/8.8): số liệu + biểu đồ là chính, chữ tối thiểu. Bố cục co theo bề rộng của chính thẻ (container query)
// nên dùng được cả ở cột hẹp của hồ sơ nhân sự lẫn trang /danh-gia. Radar giữ nguyên ở mọi cỡ màn hình.
export function KpiCaNhanBoard({ data, tieuDe = "Bảng KPI cá nhân" }: { data: KpiCaNhan | null; tieuDe?: string }) {
  const coDuLieu = (data?.ky ?? []).filter((k) => k.kpi !== null);
  const hienTai = coDuLieu.at(-1);

  if (!data || !hienTai) {
    return (
      <Card className="gap-5 px-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> {tieuDe}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Gauge} title="Chưa có KPI. KPI được tính từ các Bài đã dạy xong trong kỳ đánh giá." />
          {data && data.a4_tong > 0 && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Award className="size-4" aria-hidden /> {data.a4_tong} lớp không kinh phí
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const kpi = hienTai.kpi ?? 0;
  const truoc = coDuLieu.at(-2);
  const xuHuong = truoc && (truoc.kpi ?? 0) > 0 ? Math.round(((kpi - (truoc.kpi ?? 0)) / (truoc.kpi ?? 1)) * 100) : undefined;
  const nhomDiem = NHOM_TC.map((n) => ({ ...n, gia_tri: hienTai.diem_nhom[n.ma] ?? null }));
  const tieuChi = TIEU_CHI.filter((t) => hienTai.gia_tri[t.ma] !== undefined);
  const hienMucTieu = !!data.tien_do && (data.tien_do.huong === "thang" || data.tien_do.so_ky_dat > 0);

  return (
    <Card className="@container gap-5 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> {tieuDe}
        </CardTitle>
        <CardAction>
          <TrangThaiKyBadge k={hienTai} />
        </CardAction>
      </CardHeader>

      <div className="grid grid-cols-3 gap-3 px-5">
        <O icon={Activity} nhan={`KPI ${tenNganKy(hienTai)}`}>
          <div className="flex flex-col items-center gap-2">
            <So hue="navy">{so(kpi)}</So>
            {xuHuong !== undefined && <TrendPill value={xuHuong} className="shrink-0" />}
          </div>
        </O>
        <O icon={Clock} nhan="Giờ dạy">
          <p>
            <So hue="blue">{so(hienTai.gio_thuc)}</So>
            <span className="text-base font-medium text-muted-foreground">h</span>
          </p>
          <p className={CHU_THICH}>quy đổi {so(hienTai.gio_quy_doi)}h</p>
        </O>
        <O icon={Layers} nhan="Số Bài">
          <So hue="teal">{hienTai.so_bai}</So>
          <p className={CHU_THICH}>{hienTai.so_lop} lớp</p>
        </O>
      </div>

      <Muc tieuDe="Xu hướng qua các kỳ">
        {coDuLieu.length < 2 ? (
          <p className="text-sm text-muted-foreground">Cần từ 2 kỳ có kết quả để vẽ xu hướng.</p>
        ) : (
          <AreaXuHuong diem={coDuLieu.map((k) => ({ nhan: tenNganKy(k), gia_tri: k.kpi ?? 0 }))} className="h-auto w-full" />
        )}
      </Muc>

      <Muc tieuDe={`Điểm theo nhóm và tiêu chí — ${tenNganKy(hienTai)}`}>
        <div className="grid items-center gap-x-6 gap-y-4 @lg:grid-cols-2">
          <div className="flex justify-center">
            <RadarNhom truc={nhomDiem.map((n) => ({ nhan: n.nhan, gia_tri: n.gia_tri }))} className="h-auto w-full max-w-xs" />
          </div>
          <ul className="grid gap-2.5">
            {tieuChi.map((t) => (
              <li
                key={t.ma}
                className="grid grid-cols-[6.75rem_minmax(0,1fr)_2.25rem] items-center gap-2.5 text-sm"
                title={hienTai.trong_so_hieu_luc[t.ma] !== undefined ? `Trọng số hiệu lực ${so(hienTai.trong_so_hieu_luc[t.ma], 2)}%` : undefined}
              >
                <span className="truncate text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.ma}</span> {t.nhan}
                </span>
                <ThanhTienDo phanTram={hienTai.gia_tri[t.ma]} />
                <span className="text-right font-semibold tabular-nums">{so(hienTai.gia_tri[t.ma], 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Muc>

      <div className={cn("grid gap-3 border-t px-5 pt-5", hienMucTieu ? "grid-cols-3" : "grid-cols-2")}>
        <OViTri hienTai={hienTai} lichSu={coDuLieu.slice(0, -1)} soKy={data.so_ky_fallback} />
        <O icon={Award} nhan="Lớp không kinh phí">
          <So hue="green">{data.a4_tong}</So>
          <p className={CHU_THICH}>lũy kế (A4)</p>
        </O>
        {hienMucTieu && data.tien_do && <OMucTieu td={data.tien_do} />}
      </div>
    </Card>
  );
}
