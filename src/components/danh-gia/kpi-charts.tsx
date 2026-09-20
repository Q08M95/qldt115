// Biểu đồ SVG thuần cho Bảng KPI cá nhân (mục 4.4/8.6) — không thêm thư viện chart; màu lấy từ token chung (chart-1 = xanh dương, brand = navy).

export interface DiemXuHuong {
  nhan: string;
  gia_tri: number;
}

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Area chart xu hướng KPI qua các kỳ: trục dọc 0–100 điểm, nền gradient nhạt dần xuống đáy, đường 2px, chấm + nhãn giá trị
export function AreaXuHuong({ diem, className }: { diem: DiemXuHuong[]; className?: string }) {
  const W = 600;
  const H = 230;
  const L = 34;
  const R = 22;
  const T = 26;
  const B = 34;
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
      <defs>
        <linearGradient id="kpi-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 0 ? undefined : "3 4"} />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
            {g}
          </text>
        </g>
      ))}
      {vung && <path d={vung} fill="url(#kpi-area-grad)" />}
      {diem.length > 1 && <path d={duong} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {diem.map((d, i) => {
        const cuoi = i === diem.length - 1;
        return (
          <g key={`${d.nhan}-${i}`}>
            <circle cx={x(i)} cy={y(d.gia_tri)} r={cuoi ? 5 : 3.5} fill="var(--card)" stroke="var(--chart-1)" strokeWidth="2" />
            <text
              x={x(i)}
              y={y(d.gia_tri) - 11}
              textAnchor="middle"
              fontSize={cuoi ? 13 : 11}
              fontWeight={cuoi ? 600 : 500}
              fill={cuoi ? "var(--chart-1)" : "var(--muted-foreground)"}
            >
              {fmt(d.gia_tri)}
            </text>
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
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
  const W = 420;
  const H = 320;
  const cx = W / 2;
  const cy = 165;
  const r = 110;
  const n = truc.length;
  const goc = (i: number) => (-90 + (360 * i) / n) * (Math.PI / 180);
  const diem = (i: number, ty: number) => `${cx + r * ty * Math.cos(goc(i))},${cy + r * ty * Math.sin(goc(i))}`;
  const vong = (ty: number) => truc.map((_, i) => diem(i, ty)).join(" ");
  const du = truc.map((t, i) => diem(i, Math.max(0, Math.min(100, t.gia_tri ?? 0)) / 100)).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Điểm theo nhóm tiêu chí" className={className}>
      {[0.25, 0.5, 0.75, 1].map((ty) => (
        <polygon key={ty} points={vong(ty)} fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {truc.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(goc(i))} y2={cy + r * Math.sin(goc(i))} stroke="var(--border)" strokeWidth="1" />
      ))}
      <polygon points={du} fill="var(--chart-1)" fillOpacity="0.2" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" />
      {truc.map((t, i) => {
        const lx = cx + (r + 26) * Math.cos(goc(i));
        const ly = cy + (r + 22) * Math.sin(goc(i));
        const canh = Math.abs(Math.cos(goc(i))) < 0.2 ? "middle" : Math.cos(goc(i)) > 0 ? "start" : "end";
        return (
          <g key={t.nhan}>
            {t.gia_tri !== null && (
              <circle
                cx={cx + r * (t.gia_tri / 100) * Math.cos(goc(i))}
                cy={cy + r * (t.gia_tri / 100) * Math.sin(goc(i))}
                r="3.5"
                fill="var(--chart-1)"
              />
            )}
            <text x={lx} y={ly - 3} textAnchor={canh} fontSize="12" fontWeight="500" fill="var(--foreground)">
              {t.nhan}
            </text>
            <text x={lx} y={ly + 12} textAnchor={canh} fontSize="12" fontWeight="600" fill="var(--chart-1)">
              {t.gia_tri === null ? "—" : fmt(t.gia_tri)}
            </text>
            <title>{`${t.nhan}: ${t.gia_tri === null ? "chưa có dữ liệu" : fmt(t.gia_tri)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
