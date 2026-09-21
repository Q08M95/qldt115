// Biểu đồ dùng chung cho các báo cáo (mục 4.7/8.6) — SVG/CSS thuần, không thêm thư viện.
// Mọi vùng màu đều là gradient theo 4 màu gốc (xanh dương, navy, xanh ngọc, xanh lá) hoặc gradient thương hiệu; nền cột thường xám rất nhạt như ảnh mẫu.
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export type MauBieuDo = "blue" | "navy" | "teal" | "green" | "neutral" | "danger";

const CSS_MAU: Record<MauBieuDo, { tu: string; den: string }> = {
  blue: { tu: "var(--hue-blue-from)", den: "var(--hue-blue-to)" },
  navy: { tu: "var(--hue-navy-from)", den: "var(--hue-navy-to)" },
  teal: { tu: "var(--hue-teal-from)", den: "var(--hue-teal-to)" },
  green: { tu: "var(--hue-green-from)", den: "var(--hue-green-to)" },
  neutral: { tu: "color-mix(in srgb, var(--muted-foreground) 30%, transparent)", den: "color-mix(in srgb, var(--muted-foreground) 55%, transparent)" },
  danger: { tu: "color-mix(in srgb, var(--danger-fg) 55%, transparent)", den: "var(--danger-fg)" },
};

export const gradientCss = (m: MauBieuDo) => `linear-gradient(90deg, ${CSS_MAU[m].tu}, ${CSS_MAU[m].den})`;

const so = (n: number, toiDa = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });

// ===== Thanh ngang xếp hạng theo người =====
export interface DongThanh {
  khoa: string;
  nhan: string;
  phu?: string;
  avatar?: { ten: string; src: string | null };
  href?: string;
  gia_tri: number;
  // Phần thêm (vd giờ đã phân công nhưng chưa diễn ra) — vẽ nối tiếp bằng màu nhạt hơn
  gia_tri_them?: number;
  hien_thi: string;
}

export function ThanhNgang({ dong, toiDa, chuThichThem }: { dong: DongThanh[]; toiDa?: number; chuThichThem?: string }) {
  const max = Math.max(toiDa ?? 0, ...dong.map((d) => d.gia_tri + (d.gia_tri_them ?? 0)), 0.0001);
  return (
    <div className="grid gap-1">
      {chuThichThem && (
        <p className="flex items-center gap-3 pb-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-brand-gradient" aria-hidden /> Đã dạy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-grad-blue" aria-hidden /> {chuThichThem}
          </span>
        </p>
      )}
      <ul className="grid gap-0.5">
        {dong.map((d) => {
          const noiDung = (
            <>
              <div className="flex min-w-0 items-center gap-2.5 sm:w-[38%] sm:shrink-0">
                {d.avatar && <UserAvatar name={d.avatar.ten} src={d.avatar.src} className="size-7 text-xs" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.nhan}</p>
                  {d.phu && <p className="truncate text-xs text-muted-foreground">{d.phu}</p>}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/70" role="img" aria-label={`${d.nhan}: ${d.hien_thi}`}>
                  {d.gia_tri > 0 && <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(d.gia_tri / max) * 100}%` }} />}
                  {(d.gia_tri_them ?? 0) > 0 && <div className="h-full bg-grad-blue" style={{ width: `${((d.gia_tri_them ?? 0) / max) * 100}%` }} />}
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums">{d.hien_thi}</span>
              </div>
            </>
          );
          const lop = "flex flex-col gap-1.5 rounded-lg px-2 py-1.5 sm:flex-row sm:items-center sm:gap-3";
          return (
            <li key={d.khoa}>
              {d.href ? (
                <Link href={d.href} className={cn(lop, "transition-colors duration-150 hover:bg-background")}>
                  {noiDung}
                </Link>
              ) : (
                <div className={lop}>{noiDung}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ===== Donut =====
export interface LatDonut {
  khoa: string;
  nhan: string;
  so: number;
  mau: MauBieuDo;
}

export function Donut({ lat, giua, phu, className }: { lat: LatDonut[]; giua: string; phu?: string; className?: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const tong = lat.reduce((s, l) => s + l.so, 0);
  const coLat = lat.filter((l) => l.so > 0);
  const gap = coLat.length > 1 ? 2.5 : 0;
  let lui = 0;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`${giua} ${phu ?? ""}`.trim()} className={className}>
      <defs>
        {(Object.keys(CSS_MAU) as MauBieuDo[]).map((m) => (
          <linearGradient key={m} id={`dn-${m}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CSS_MAU[m].tu} />
            <stop offset="100%" stopColor={CSS_MAU[m].den} />
          </linearGradient>
        ))}
      </defs>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--muted)" strokeWidth="13" />
      {tong > 0 &&
        coLat.map((l) => {
          const dai = (l.so / tong) * C;
          const hien = Math.max(0.5, dai - gap);
          const vt = lui;
          lui += dai;
          return (
            <circle
              key={l.khoa}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={`url(#dn-${l.mau})`}
              strokeWidth="13"
              strokeDasharray={`${hien} ${C - hien}`}
              strokeDashoffset={-(vt + gap / 2)}
              transform="rotate(-90 60 60)"
            />
          );
        })}
      <text x="60" y={phu ? 59 : 65} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--foreground)">
        {giua}
      </text>
      {phu && (
        <text x="60" y="75" textAnchor="middle" fontSize="8.5" fill="var(--muted-foreground)">
          {phu}
        </text>
      )}
    </svg>
  );
}

export function ChuThichDonut({ lat }: { lat: LatDonut[] }) {
  const tong = lat.reduce((s, l) => s + l.so, 0);
  return (
    <ul className="grid gap-1.5 text-sm">
      {lat.map((l) => (
        <li key={l.khoa} className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundImage: gradientCss(l.mau) }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.nhan}</span>
          <span className="font-medium tabular-nums">{l.so}</span>
          <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{tong > 0 ? `${Math.round((l.so / tong) * 100)}%` : "–"}</span>
        </li>
      ))}
    </ul>
  );
}

// ===== Sparkline (line mảnh, không trục) =====
export function Sparkline({ gia_tri, className, nhan }: { gia_tri: number[]; className?: string; nhan?: string }) {
  const W = 200;
  const H = 40;
  const p = 3;
  if (gia_tri.length < 2) return <div className={className} aria-hidden />;
  const max = Math.max(...gia_tri, 1);
  const x = (i: number) => p + ((W - 2 * p) * i) / (gia_tri.length - 1);
  const y = (v: number) => H - p - (v / max) * (H - 2 * p);
  const duong = gia_tri.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={nhan ?? "Xu hướng"} className={className}>
      <defs>
        <linearGradient id="sp-net" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-from)" />
          <stop offset="100%" stopColor="var(--brand-to)" />
        </linearGradient>
        <linearGradient id="sp-nen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-to)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand-from)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${duong} L${x(gia_tri.length - 1)},${H} L${x(0)},${H} Z`} fill="url(#sp-nen)" />
      <path d={duong} fill="none" stroke="url(#sp-net)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ===== Cột theo thời gian (kiểu "Weekly Revenue" trong ảnh mẫu): cột xám nhạt, cột lớn nhất nổi bật gradient + bong bóng trắng =====
export interface CotThoiGian {
  nhan: string;
  gia_tri: number;
}

export function CotTheoThoiGian({ cot, donVi, className }: { cot: CotThoiGian[]; donVi: string; className?: string }) {
  const W = 480;
  const H = 190;
  const L = 8;
  const R = 8;
  const T = 34;
  const B = 24;
  const n = cot.length;
  if (n === 0) return null;
  const max = Math.max(...cot.map((c) => c.gia_tri), 1);
  const ch = H - T - B;
  const slot = (W - L - R) / n;
  const rong = Math.min(34, slot * 0.62);
  const iMax = cot.reduce((im, c, i) => (c.gia_tri > cot[im].gia_tri ? i : im), 0);
  const coNoiBat = cot[iMax].gia_tri > 0;
  // Chỉ ghi nhãn ~6 mốc trục ngang để không chồng chữ khi có nhiều cột
  const buocNhan = Math.max(1, Math.ceil(n / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Biểu đồ cột ${donVi} theo thời gian`} className={className}>
      <defs>
        <linearGradient id="cot-nb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hue-green-from)" />
          <stop offset="100%" stopColor="var(--hue-green-to)" />
        </linearGradient>
      </defs>
      {cot.map((c, i) => {
        const cx = L + slot * i + slot / 2;
        const noiBat = coNoiBat && i === iMax;
        const cao = Math.max(c.gia_tri > 0 ? 6 : 3, (c.gia_tri / max) * ch);
        return (
          <g key={`${c.nhan}-${i}`}>
            <rect x={cx - rong / 2} y={T} width={rong} height={ch} rx={Math.min(8, rong / 2)} fill="var(--muted)" opacity="0.7" />
            <rect
              x={cx - rong / 2}
              y={T + ch - cao}
              width={rong}
              height={cao}
              rx={Math.min(8, rong / 2)}
              fill={noiBat ? "url(#cot-nb)" : "var(--border)"}
              opacity={noiBat ? 1 : c.gia_tri > 0 ? 0.9 : 0.5}
            />
            {i % buocNhan === 0 && (
              <text x={cx} y={H - 7} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
                {c.nhan}
              </text>
            )}
            {noiBat && (
              <g>
                <rect x={Math.max(2, Math.min(W - 62, cx - 30))} y={T + ch - cao - 30} width="60" height="22" rx="8" fill="var(--card)" stroke="var(--border)" />
                <text x={Math.max(2, Math.min(W - 62, cx - 30)) + 30} y={T + ch - cao - 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--hue-green)">
                  {so(c.gia_tri, 0)} {donVi}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
