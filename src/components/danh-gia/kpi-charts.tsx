// Biểu đồ SVG thuần cho Bảng KPI cá nhân và cấu hình điểm danh (mục 4.4/8.6) — không thêm thư viện chart.
// Mọi nét/nền có màu đều dùng gradient thương hiệu (--brand-from → --brand-to), theo nguyên tắc "có màu là có gradient" (mục 8.1).

export interface DiemXuHuong {
  nhan: string;
  gia_tri: number;
}

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Định nghĩa gradient dùng chung (id riêng theo tiền tố để nhiều biểu đồ cùng trang không đụng nhau)
function GradDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-net`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--brand-from)" />
        <stop offset="100%" stopColor="var(--brand-to)" />
      </linearGradient>
      <linearGradient id={`${id}-nen`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--brand-to)" stopOpacity="0.30" />
        <stop offset="100%" stopColor="var(--brand-from)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-dac`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--brand-from)" stopOpacity="0.38" />
        <stop offset="100%" stopColor="var(--brand-to)" stopOpacity="0.16" />
      </linearGradient>
    </defs>
  );
}

// Area chart xu hướng KPI qua các kỳ: trục dọc 0–100 điểm, nền gradient nhạt dần xuống đáy, đường 2px gradient, chấm + nhãn giá trị
export function AreaXuHuong({ diem, className }: { diem: DiemXuHuong[]; className?: string }) {
  const W = 600;
  const H = 210;
  const L = 34;
  const R = 22;
  const T = 24;
  const B = 32;
  const cw = W - L - R;
  const ch = H - T - B;
  const PAD = 28; // chừa khoảng trống hai đầu để nhãn giá trị/kỳ không đè lên trục và không bị cắt
  const x = (i: number) => (diem.length === 1 ? L + cw / 2 : L + PAD + ((cw - 2 * PAD) * i) / (diem.length - 1));
  const y = (v: number) => T + (1 - Math.max(0, Math.min(100, v)) / 100) * ch;

  let duong = "";
  diem.forEach((d, i) => {
    if (i === 0) duong = `M${x(0)},${y(d.gia_tri)}`;
    else {
      const mx = (x(i - 1) + x(i)) / 2;
      duong += ` C${mx},${y(diem[i - 1].gia_tri)} ${mx},${y(d.gia_tri)} ${x(i)},${y(d.gia_tri)}`;
    }
  });
  const vung = diem.length > 1 ? `${duong} L${x(diem.length - 1)},${T + ch} L${x(0)},${T + ch} Z` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Xu hướng KPI qua các kỳ" className={className}>
      <GradDefs id="kpi-xh" />
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 0 ? undefined : "3 4"} />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
            {g}
          </text>
        </g>
      ))}
      {vung && <path d={vung} fill="url(#kpi-xh-nen)" />}
      {diem.length > 1 && <path d={duong} fill="none" stroke="url(#kpi-xh-net)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {diem.map((d, i) => {
        const cuoi = i === diem.length - 1;
        return (
          <g key={`${d.nhan}-${i}`}>
            <circle cx={x(i)} cy={y(d.gia_tri)} r={cuoi ? 5.5 : 4} fill="var(--card)" stroke="url(#kpi-xh-net)" strokeWidth="2.5" />
            <text
              x={x(i)}
              y={y(d.gia_tri) - 11}
              textAnchor="middle"
              fontSize={cuoi ? 14 : 11}
              fontWeight={cuoi ? 700 : 500}
              fill={cuoi ? "var(--primary)" : "var(--muted-foreground)"}
            >
              {fmt(d.gia_tri)}
            </text>
            <text x={x(i)} y={H - 9} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
              {d.nhan}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface TrucRadar {
  nhan: string;
  // null = chưa có dữ liệu ở nhóm này (vẽ ở tâm)
  gia_tri: number | null;
}

// Radar 3 trục A/B/C: thấy ngay điểm mạnh/yếu (sản lượng / chuyên cần / chất lượng), không chỉ điểm tổng
export function RadarNhom({ truc, className }: { truc: TrucRadar[]; className?: string }) {
  const W = 340;
  const H = 270;
  const cx = W / 2;
  const cy = 138;
  const r = 88;
  const n = truc.length;
  const goc = (i: number) => (-90 + (360 * i) / n) * (Math.PI / 180);
  const diem = (i: number, ty: number) => `${cx + r * ty * Math.cos(goc(i))},${cy + r * ty * Math.sin(goc(i))}`;
  const vong = (ty: number) => truc.map((_, i) => diem(i, ty)).join(" ");
  const du = truc.map((t, i) => diem(i, Math.max(0, Math.min(100, t.gia_tri ?? 0)) / 100)).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Điểm theo nhóm tiêu chí" className={className}>
      <GradDefs id="kpi-rd" />
      {[0.25, 0.5, 0.75, 1].map((ty) => (
        <polygon key={ty} points={vong(ty)} fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {truc.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(goc(i))} y2={cy + r * Math.sin(goc(i))} stroke="var(--border)" strokeWidth="1" />
      ))}
      <polygon points={du} fill="url(#kpi-rd-dac)" stroke="url(#kpi-rd-net)" strokeWidth="2.5" strokeLinejoin="round" />
      {truc.map((t, i) => {
        const lx = cx + (r + 22) * Math.cos(goc(i));
        const ly = cy + (r + 20) * Math.sin(goc(i));
        const canh = Math.abs(Math.cos(goc(i))) < 0.2 ? "middle" : Math.cos(goc(i)) > 0 ? "start" : "end";
        return (
          <g key={t.nhan}>
            {t.gia_tri !== null && (
              <circle
                cx={cx + r * (t.gia_tri / 100) * Math.cos(goc(i))}
                cy={cy + r * (t.gia_tri / 100) * Math.sin(goc(i))}
                r="4"
                fill="var(--card)"
                stroke="url(#kpi-rd-net)"
                strokeWidth="2.5"
              />
            )}
            <text x={lx} y={ly - 3} textAnchor={canh} fontSize="12" fontWeight="500" fill="var(--foreground)">
              {t.nhan}
            </text>
            <text x={lx} y={ly + 13} textAnchor={canh} fontSize="14" fontWeight="700" fill="var(--primary)">
              {t.gia_tri === null ? "—" : fmt(t.gia_tri)}
            </text>
            <title>{`${t.nhan}: ${t.gia_tri === null ? "chưa có dữ liệu" : fmt(t.gia_tri)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export interface DiemNhomKy {
  nhan: string;
  A: number | null;
  B: number | null;
  C: number | null;
}

// Đường điểm 3 nhóm tiêu chí A/B/C qua các kỳ (so sánh cùng lúc sản lượng / chuyên cần / chất lượng để thấy nhóm nào đang kéo điểm tổng).
// Mỗi đường là gradient từ màu gốc nhạt sang đậm theo màu gốc hệ thống (mục 8.1); số cuối mỗi đường ghi giá trị kỳ gần nhất.
export const MAU_NHOM = [
  { ma: "A" as const, nhan: "Sản lượng", bien: "--hue-blue" },
  { ma: "B" as const, nhan: "Chuyên cần", bien: "--hue-teal" },
  { ma: "C" as const, nhan: "Chất lượng", bien: "--hue-navy" },
];

export function DuongNhomQuaKy({ ky, className }: { ky: DiemNhomKy[]; className?: string }) {
  const W = 460;
  const H = 230;
  const L = 32;
  const R = 44;
  const T = 16;
  const B = 30;
  const cw = W - L - R;
  const ch = H - T - B;
  const PAD = 18;
  // Trục dọc tự co theo dữ liệu (không luôn 0–100) để 3 đường không dồn thành một dải mỏng ở phần trên
  const tatCa = ky.flatMap((k) => [k.A, k.B, k.C]).filter((v): v is number => v !== null);
  const thap = tatCa.length ? Math.min(...tatCa) : 0;
  const cao = tatCa.length ? Math.max(...tatCa) : 100;
  let lo = Math.max(0, Math.floor((thap - 8) / 10) * 10);
  let hi = Math.min(100, Math.ceil((cao + 4) / 10) * 10);
  if (hi - lo < 30) {
    lo = Math.max(0, hi - 30);
    hi = lo + 30;
  }
  const moc = [lo, Math.round((lo + hi) / 2), hi];
  // Số cuối các đường có thể sát nhau: đẩy nhẹ xuống để không chồng chữ (cách tối thiểu 13px)
  const cuoiNhom = MAU_NHOM.map((m) => {
    const k = [...ky].reverse().find((d) => d[m.ma] !== null);
    return { ma: m.ma, v: k ? (k[m.ma] as number) : null };
  })
    .filter((d): d is { ma: "A" | "B" | "C"; v: number } => d.v !== null)
    .map((d) => ({ ma: d.ma, y: T + (1 - (Math.max(lo, Math.min(hi, d.v)) - lo) / (hi - lo)) * ch }))
    .sort((a, b) => a.y - b.y);
  const viTriNhan: Record<string, number> = {};
  cuoiNhom.forEach((d, i) => {
    viTriNhan[d.ma] = i === 0 ? d.y : Math.max(d.y, viTriNhan[cuoiNhom[i - 1].ma] + 13);
  });
  const x = (i: number) => (ky.length === 1 ? L + cw / 2 : L + PAD + ((cw - 2 * PAD) * i) / (ky.length - 1));
  const y = (v: number) => T + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * ch;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Điểm 3 nhóm tiêu chí qua các kỳ" className={className}>
      <defs>
        {MAU_NHOM.map((m) => (
          <linearGradient key={m.ma} id={`nhom-${m.ma}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={`var(${m.bien})`} stopOpacity="0.55" />
            <stop offset="100%" stopColor={`var(${m.bien})`} />
          </linearGradient>
        ))}
      </defs>
      {moc.map((g, gi) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" strokeDasharray={gi === 0 ? undefined : "3 4"} />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
            {g}
          </text>
        </g>
      ))}
      {MAU_NHOM.map((m) => {
        const diem = ky.map((k, i) => ({ i, v: k[m.ma] })).filter((d): d is { i: number; v: number } => d.v !== null);
        if (diem.length === 0) return null;
        const duong = diem.map((d, j) => `${j === 0 ? "M" : "L"}${x(d.i)},${y(d.v)}`).join(" ");
        const cuoi = diem[diem.length - 1];
        return (
          <g key={m.ma}>
            {diem.length > 1 && <path d={duong} fill="none" stroke={`url(#nhom-${m.ma})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            {diem.map((d) => (
              <circle key={d.i} cx={x(d.i)} cy={y(d.v)} r={d.i === cuoi.i ? 4.5 : 3} fill="var(--card)" stroke={`url(#nhom-${m.ma})`} strokeWidth="2.25" />
            ))}
            <text x={x(cuoi.i) + 9} y={(viTriNhan[m.ma] ?? y(cuoi.v)) + 4} fontSize="12" fontWeight="700" fill={`url(#nhom-${m.ma})`}>
              {fmt(cuoi.v)}
            </text>
          </g>
        );
      })}
      {ky.map((k, i) => (
        <text key={`${k.nhan}-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          {k.nhan}
        </text>
      ))}
    </svg>
  );
}

// Đồng hồ bán nguyệt 0–100: vị trí so với đồng nghiệp (top X%) hoặc chỉ số đơn lẻ; số lớn ở giữa
export function DongHoBanNguyet({ phanTram, so, nhan, className }: { phanTram: number; so: string; nhan?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, phanTram));
  const a = Math.PI * (1 - v / 100);
  const px = 60 + 50 * Math.cos(a);
  const py = 60 - 50 * Math.sin(a);
  return (
    <svg viewBox="0 0 120 78" role="img" aria-label={nhan ? `${nhan}: ${so}` : so} className={className}>
      <GradDefs id="kpi-dh" />
      <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="var(--border)" strokeWidth="11" strokeLinecap="round" />
      {v > 0 && <path d={`M10,60 A50,50 0 0 1 ${px},${py}`} fill="none" stroke="url(#kpi-dh-net)" strokeWidth="11" strokeLinecap="round" />}
      <text x="60" y="52" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--foreground)">
        {so}
      </text>
      {nhan && (
        <text x="60" y="70" textAnchor="middle" fontSize="9.5" fill="var(--muted-foreground)">
          {nhan}
        </text>
      )}
    </svg>
  );
}
