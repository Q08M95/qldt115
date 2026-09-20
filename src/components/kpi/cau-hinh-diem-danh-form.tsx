"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { luuCauHinhDiemDanh } from "@/lib/danh-gia/actions";
import type { CauHinhDiemDanh } from "@/types/database";

const soNguyen = (s: string) => {
  const t = s.trim();
  return t === "" ? NaN : Number(t);
};

// Điểm danh B1 (khung giờ check-in, ngưỡng trễ tối đa) và rubric dự giờ C2 (mục 4.8). Đổi cấu hình chỉ ảnh hưởng các lần check-in/chấm điểm sau đó.
export function CauHinhDiemDanhForm({ cauHinh }: { cauHinh: CauHinhDiemDanh }) {
  const [pending, start] = useTransition();
  const [ketQua, setKetQua] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [truoc, setTruoc] = useState(String(cauHinh.checkin_truoc_phut));
  const [tre, setTre] = useState(String(cauHinh.b1_tre_toi_da_phut));
  const [rubric, setRubric] = useState(() =>
    Object.fromEntries(cauHinh.rubric.map((r) => [String(r.muc), { ten: r.ten, mo_ta: r.mo_ta }])),
  );

  const t = soNguyen(truoc);
  const m = soNguyen(tre);
  const truocSai = !(Number.isInteger(t) && t >= 0 && t <= 240);
  const treSai = !(Number.isInteger(m) && m >= 1 && m <= 240);
  const rubricSai = cauHinh.rubric.some((r) => rubric[String(r.muc)].ten.trim() === "");
  const hopLe = !truocSai && !treSai && !rubricSai;

  const luu = () =>
    start(async () => {
      setKetQua(await luuCauHinhDiemDanh({ checkin_truoc_phut: t, b1_tre_toi_da_phut: m, rubric }));
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh (B1) và rubric dự giờ (C2)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Được check-in trước giờ học</span>
            <span className="inline-flex items-center gap-1.5">
              <Input
                value={truoc}
                onChange={(e) => setTruoc(e.target.value)}
                inputMode="numeric"
                aria-label="Số phút được check-in trước giờ học"
                aria-invalid={truocSai || undefined}
                className="w-20 text-right tabular-nums"
              />
              <span className="text-muted-foreground">phút</span>
            </span>
            <span className="text-xs text-muted-foreground">Khung check-in kéo dài đến hết giờ học của Bài.</span>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Ngưỡng trễ tối đa của B1</span>
            <span className="inline-flex items-center gap-1.5">
              <Input
                value={tre}
                onChange={(e) => setTre(e.target.value)}
                inputMode="numeric"
                aria-label="Ngưỡng trễ tối đa của B1 (phút)"
                aria-invalid={treSai || undefined}
                className="w-20 text-right tabular-nums"
              />
              <span className="text-muted-foreground">phút</span>
            </span>
            <span className="text-xs text-muted-foreground">B1 giảm tuyến tính từ 100% (đúng giờ) xuống 0% khi trễ đủ số phút này.</span>
          </label>
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium">Rubric dự giờ — 4 mức</p>
          <ul className="grid gap-3">
            {cauHinh.rubric.map((r) => (
              <li key={r.muc} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[6rem_minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
                <span className="pt-2 text-sm font-semibold tabular-nums">{r.muc}%</span>
                <Input
                  value={rubric[String(r.muc)].ten}
                  onChange={(e) => setRubric({ ...rubric, [String(r.muc)]: { ...rubric[String(r.muc)], ten: e.target.value } })}
                  aria-label={`Tên mức ${r.muc}%`}
                  aria-invalid={rubric[String(r.muc)].ten.trim() === "" || undefined}
                />
                <Textarea
                  value={rubric[String(r.muc)].mo_ta}
                  onChange={(e) => setRubric({ ...rubric, [String(r.muc)]: { ...rubric[String(r.muc)], mo_ta: e.target.value } })}
                  aria-label={`Mô tả mức ${r.muc}%`}
                  maxLength={500}
                  className="min-h-16"
                />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Điểm 4 mức cố định 100/80/60/0; chỉ tên và mô tả chỉnh được.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm" role={ketQua?.error || !hopLe ? "alert" : undefined}>
            {!hopLe ? (
              <span className="text-danger">
                {truocSai
                  ? "Số phút check-in trước giờ học phải là số nguyên từ 0 đến 240."
                  : treSai
                    ? "Ngưỡng trễ tối đa phải là số nguyên phút từ 1 đến 240."
                    : "Tên các mức rubric không được để trống."}
              </span>
            ) : ketQua?.error ? (
              <span className="text-danger">{ketQua.error}</span>
            ) : ketQua?.ok ? (
              <span className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-4" aria-hidden /> Đã lưu.
              </span>
            ) : null}
          </div>
          <Button onClick={luu} disabled={pending || !hopLe}>
            <Save /> {pending ? "Đang lưu..." : "Lưu cấu hình điểm danh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
