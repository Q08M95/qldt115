"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { luuCauHinhKpi } from "@/lib/kpi/actions";
import { cn } from "@/lib/utils";
import type { CauHinhKpi } from "@/types/database";

// Chấp nhận dấu phẩy thập phân kiểu Việt Nam; ô trống hoặc không phải số => NaN
function parse(s: string): number {
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const sai100 = (n: number) => !(Math.abs(n - 100) <= 0.01);

function NumberInput({
  value,
  onChange,
  label,
  suffix,
  className,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn("w-20 text-right tabular-nums", className)}
      />
      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
    </span>
  );
}

function TongBadge({ tong, dung }: { tong: number; dung: boolean }) {
  return (
    <Badge variant={dung ? "success" : "danger"} className="tabular-nums">
      {dung ? <CheckCircle2 /> : <AlertTriangle />}
      Tổng {Number.isNaN(tong) ? "—" : fmt(tong)}%
    </Badge>
  );
}

// Màn hình "Cấu hình KPI" (mục 4.8/7): trọng số nhóm + tiêu chí con (Bật/Tắt), hệ số độ khó D1/D2/D3, tham số khác.
// Kiểm tra tổng trọng số = 100% ngay khi nhập; nút Lưu dính dưới cùng. Hàm SQL kiểm tra lại lần nữa khi lưu.
export function CauHinhKpiForm({ cauHinh }: { cauHinh: CauHinhKpi }) {
  const [pending, start] = useTransition();
  const [ketQua, setKetQua] = useState<{ ok?: boolean; error?: string } | null>(null);

  const [nhom, setNhom] = useState(() => Object.fromEntries(cauHinh.nhom.map((n) => [n.ma, fmt(n.trong_so)])));
  const [tc, setTc] = useState(() =>
    Object.fromEntries(cauHinh.tieuChi.map((t) => [t.ma, { w: fmt(t.trong_so), bat: t.bat }])),
  );
  const [he, setHe] = useState(() => Object.fromEntries(cauHinh.heSo.map((h) => [h.ma, fmt(h.gia_tri)])));
  const [d1, setD1] = useState(() => Object.fromEntries(cauHinh.nhomLop.map((n) => [n.id, fmt(n.he_so_d1)])));
  const [ts, setTs] = useState(() => ({
    min_nhom: fmt(cauHinh.thamSo.min_nhom),
    so_ky_fallback: fmt(cauHinh.thamSo.so_ky_fallback),
    gop_c: String(cauHinh.thamSo.gop_c),
    doi_nhom_x: fmt(cauHinh.thamSo.doi_nhom_x),
    doi_nhom_y: fmt(cauHinh.thamSo.doi_nhom_y),
    giang_nhom_x: fmt(cauHinh.thamSo.giang_nhom_x),
    giang_nhom_y: fmt(cauHinh.thamSo.giang_nhom_y),
  }));

  const nhomSapXep = useMemo(() => [...cauHinh.nhom].sort((a, b) => a.ma.localeCompare(b.ma)), [cauHinh.nhom]);

  // Tổng trọng số tiêu chí đang bật (và nằm trong công thức) của từng nhóm; nhóm không còn tiêu chí bật thì không tính vào tổng nhóm
  const tongNhom = useMemo(() => {
    return nhomSapXep.map((n) => {
      const dangBat = cauHinh.tieuChi.filter((t) => t.nhom === n.ma && t.tinh_vao_kpi && tc[t.ma]?.bat);
      const tong = dangBat.reduce((s, t) => s + parse(tc[t.ma].w), 0);
      return { ma: n.ma, soBat: dangBat.length, tong };
    });
  }, [nhomSapXep, cauHinh.tieuChi, tc]);
  const tongTatCaNhom = nhomSapXep.reduce(
    (s, n) => s + (tongNhom.find((x) => x.ma === n.ma)!.soBat > 0 ? parse(nhom[n.ma]) : 0),
    0,
  );

  const loi: string[] = [];
  for (const g of tongNhom) {
    if (g.soBat > 0 && sai100(g.tong)) loi.push(`Tổng trọng số các tiêu chí đang bật của nhóm ${g.ma} phải bằng 100%.`);
  }
  if (sai100(tongTatCaNhom)) loi.push("Tổng trọng số các nhóm tiêu chí phải bằng 100%.");
  for (const h of cauHinh.heSo) {
    const v = parse(he[h.ma]);
    if (!(v > 0 && v <= 9.99)) loi.push(`Hệ số ${h.ma.replace("_", " ")} phải lớn hơn 0 và không quá 9,99.`);
  }
  for (const n of cauHinh.nhomLop) {
    const v = parse(d1[n.id]);
    if (!(v > 0 && v <= 9.99)) loi.push(`Hệ số D1 của nhóm lớp ${n.ten} phải lớn hơn 0 và không quá 9,99.`);
  }
  const minNhom = parse(ts.min_nhom);
  const soKy = parse(ts.so_ky_fallback);
  const x = parse(ts.doi_nhom_x);
  const y = parse(ts.doi_nhom_y);
  const xg = parse(ts.giang_nhom_x);
  const yg = parse(ts.giang_nhom_y);
  if (!(Number.isInteger(minNhom) && minNhom >= 2)) loi.push("Số người tối thiểu của nhóm phải là số nguyên từ 2 trở lên.");
  if (!(Number.isInteger(soKy) && soKy >= 1 && soKy <= 8)) loi.push("Số kỳ so sánh lịch sử phải là số nguyên từ 1 đến 8.");
  if (!(x >= 0 && x <= 100)) loi.push("Ngưỡng KPI đổi nhóm phải từ 0 đến 100.");
  if (!(Number.isInteger(y) && y >= 1 && y <= 12)) loi.push("Số kỳ liên tiếp phải là số nguyên từ 1 đến 12.");
  if (!(xg >= 0 && xg <= 100)) loi.push("Ngưỡng KPI giáng nhóm phải từ 0 đến 100.");
  if (!(Number.isInteger(yg) && yg >= 1 && yg <= 12)) loi.push("Số kỳ liên tiếp để giáng nhóm phải là số nguyên từ 1 đến 12.");
  if (xg >= x) loi.push("Ngưỡng giáng nhóm phải thấp hơn ngưỡng thăng nhóm.");
  for (const t of cauHinh.tieuChi) {
    const v = parse(tc[t.ma].w);
    if (!(v >= 0 && v <= 100)) loi.push(`Trọng số của ${t.ma} phải từ 0 đến 100.`);
  }
  for (const n of nhomSapXep) {
    const v = parse(nhom[n.ma]);
    if (!(v >= 0 && v <= 100)) loi.push(`Trọng số nhóm ${n.ma} phải từ 0 đến 100.`);
  }
  const hopLe = loi.length === 0;

  function luu() {
    setKetQua(null);
    start(async () => {
      const res = await luuCauHinhKpi({
        nhom: Object.fromEntries(nhomSapXep.map((n) => [n.ma, parse(nhom[n.ma])])),
        tieu_chi: Object.fromEntries(cauHinh.tieuChi.map((t) => [t.ma, { trong_so: parse(tc[t.ma].w), bat: tc[t.ma].bat }])),
        he_so: Object.fromEntries(cauHinh.heSo.map((h) => [h.ma, parse(he[h.ma])])),
        d1: Object.fromEntries(cauHinh.nhomLop.map((n) => [n.id, parse(d1[n.id])])),
        tham_so: {
          min_nhom: minNhom,
          so_ky_fallback: soKy,
          gop_c: Number(ts.gop_c),
          doi_nhom_x: x,
          doi_nhom_y: y,
          giang_nhom_x: xg,
          giang_nhom_y: yg,
        },
      });
      setKetQua(res ?? { ok: true });
    });
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <p className="text-sm text-muted-foreground">
        Thay đổi có hiệu lực với kỳ đang mở và các kỳ sau. Kỳ đã đóng giữ nguyên kết quả và bản chụp cấu hình lúc đóng (không hồi tố).
        Khi một tiêu chí chưa có dữ liệu, trọng số của nó được chia lại cho các tiêu chí còn dữ liệu trong cùng nhóm.
      </p>

      {nhomSapXep.map((n) => {
        const g = tongNhom.find((v) => v.ma === n.ma)!;
        return (
          <Card key={n.ma}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>
                Nhóm {n.ma} — {n.ten}
              </CardTitle>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Trọng số trong KPI tổng
                <NumberInput
                  value={nhom[n.ma]}
                  onChange={(v) => setNhom({ ...nhom, [n.ma]: v })}
                  label={`Trọng số nhóm ${n.ma}`}
                  suffix="%"
                  invalid={!(parse(nhom[n.ma]) >= 0 && parse(nhom[n.ma]) <= 100)}
                />
              </label>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ul className="divide-y rounded-xl border">
                {cauHinh.tieuChi
                  .filter((t) => t.nhom === n.ma)
                  .map((t) => {
                    const trongCongThuc = t.tinh_vao_kpi;
                    return (
                      <li key={t.ma} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
                        <input
                          type="checkbox"
                          checked={tc[t.ma].bat}
                          onChange={(e) => setTc({ ...tc, [t.ma]: { ...tc[t.ma], bat: e.target.checked } })}
                          aria-label={`Bật ${t.ma}`}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <Badge variant="outline" className="shrink-0">
                          {t.ma}
                        </Badge>
                        <span className="min-w-40 flex-1">
                          <span className={cn("block text-sm font-medium", !tc[t.ma].bat && "text-muted-foreground line-through")}>{t.ten}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t.nguon} · đơn vị: {t.don_vi}
                          </span>
                        </span>
                        {trongCongThuc ? (
                          <NumberInput
                            value={tc[t.ma].w}
                            onChange={(v) => setTc({ ...tc, [t.ma]: { ...tc[t.ma], w: v } })}
                            label={`Trọng số ${t.ma} trong nhóm ${n.ma}`}
                            suffix="%"
                            disabled={!tc[t.ma].bat}
                            invalid={!(parse(tc[t.ma].w) >= 0 && parse(tc[t.ma].w) <= 100)}
                          />
                        ) : (
                          <Badge variant="neutral">Không tính vào KPI</Badge>
                        )}
                      </li>
                    );
                  })}
              </ul>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Tick để Bật/Tắt tiêu chí. Tiêu chí tắt không tham gia tính điểm.</span>
                {g.soBat > 0 ? (
                  <TongBadge tong={g.tong} dung={!sai100(g.tong)} />
                ) : (
                  <Badge variant="neutral">Nhóm không còn tiêu chí bật</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4 shadow-card">
        <span className="text-sm font-medium">Tổng trọng số các nhóm (chỉ tính nhóm còn tiêu chí bật)</span>
        <TongBadge tong={tongTatCaNhom} dung={!sai100(tongTatCaNhom)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hệ số độ khó (D)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Áp ở cấp từng Bài: nhân vào số giờ dạy (A1) và điểm dự giờ (C2). Bài của lớp không kinh phí lấy max(D1, D2), không cộng dồn.
            Không dùng cho tính lương.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {cauHinh.heSo.map((h) => (
              <label key={h.ma} className="grid gap-1.5 text-sm">
                <span className="font-medium">{h.ten}</span>
                <NumberInput
                  value={he[h.ma]}
                  onChange={(v) => setHe({ ...he, [h.ma]: v })}
                  label={h.ten}
                  suffix="×"
                  invalid={!(parse(he[h.ma]) > 0 && parse(he[h.ma]) <= 9.99)}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">D1 — theo nhóm lớp</p>
            <ul className="divide-y rounded-xl border">
              {cauHinh.nhomLop.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
                  <span className={cn("text-sm", !n.dang_dung && "text-muted-foreground line-through")}>{n.ten}</span>
                  <NumberInput
                    value={d1[n.id]}
                    onChange={(v) => setD1({ ...d1, [n.id]: v })}
                    label={`Hệ số D1 của ${n.ten}`}
                    suffix="×"
                    invalid={!(parse(d1[n.id]) > 0 && parse(d1[n.id]) <= 9.99)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tham số khác</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Số người tối thiểu trong 1 nhóm để dùng percentile A1</span>
            <NumberInput value={ts.min_nhom} onChange={(v) => setTs({ ...ts, min_nhom: v })} label="Số người tối thiểu" suffix="người" />
            <span className="text-xs text-muted-foreground">Nhóm nhỏ hơn: so sánh với lịch sử của chính người đó.</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Số kỳ trước dùng để so sánh lịch sử</span>
            <NumberInput value={ts.so_ky_fallback} onChange={(v) => setTs({ ...ts, so_ky_fallback: v })} label="Số kỳ so sánh lịch sử" suffix="kỳ" />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Gộp khảo sát hài lòng (C1) và tỷ lệ đạt chuẩn đầu ra (C3) khi dạy nhiều lớp trong kỳ</span>
            <NativeSelect value={ts.gop_c} onChange={(e) => setTs({ ...ts, gop_c: e.target.value })} aria-label="Cách gộp C1 và C3">
              <option value="0">Trung bình đơn giản giữa các lớp</option>
              <option value="1">Trung bình có trọng số theo số Bài đã dạy mỗi lớp</option>
            </NativeSelect>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Ngưỡng KPI đề xuất thăng nhóm</span>
            <NumberInput value={ts.doi_nhom_x} onChange={(v) => setTs({ ...ts, doi_nhom_x: v })} label="Ngưỡng KPI đổi nhóm" suffix="điểm" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Số kỳ đã đóng liên tiếp phải đạt ngưỡng</span>
            <NumberInput value={ts.doi_nhom_y} onChange={(v) => setTs({ ...ts, doi_nhom_y: v })} label="Số kỳ liên tiếp" suffix="kỳ" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Ngưỡng KPI đề xuất giáng nhóm (Giảng viên xuống Trợ giảng)</span>
            <NumberInput value={ts.giang_nhom_x} onChange={(v) => setTs({ ...ts, giang_nhom_x: v })} label="Ngưỡng KPI giáng nhóm" suffix="điểm" />
            <span className="text-xs text-muted-foreground">KPI dưới mức này. Người không dạy trong kỳ không bị tính là thấp.</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Số kỳ đã đóng liên tiếp dưới ngưỡng để giáng</span>
            <NumberInput value={ts.giang_nhom_y} onChange={(v) => setTs({ ...ts, giang_nhom_y: v })} label="Số kỳ liên tiếp để giáng nhóm" suffix="kỳ" />
          </label>
        </CardContent>
      </Card>

      {/* Thanh lưu dính dưới cùng; trên mobile nằm phía trên thanh tab điều hướng */}
      <div className="sticky bottom-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] md:bottom-4 dark:border">
        <div className="min-w-0 flex-1 text-sm" role={hopLe ? undefined : "alert"}>
          {!hopLe ? (
            <span className="flex items-start gap-2 text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {loi[0]}
              {loi.length > 1 && <span className="text-muted-foreground"> (+{loi.length - 1} lỗi khác)</span>}
            </span>
          ) : ketQua?.error ? (
            <span role="alert" className="text-danger">
              {ketQua.error}
            </span>
          ) : ketQua?.ok ? (
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" aria-hidden /> Đã lưu cấu hình KPI.
            </span>
          ) : (
            <span className="text-muted-foreground">Các tổng trọng số đều đủ 100%.</span>
          )}
        </div>
        <Button onClick={luu} disabled={pending || !hopLe}>
          <Save /> {pending ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}
