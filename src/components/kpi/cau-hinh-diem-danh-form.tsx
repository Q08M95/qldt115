"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { luuCauHinhDiemDanh } from "@/lib/danh-gia/actions";
import { cn } from "@/lib/utils";
import type { CauHinhDiemDanh } from "@/types/database";

const soNguyen = (s: string) => {
  const t = s.trim();
  return t === "" ? NaN : Number(t);
};

// Màu gradient theo mức rubric (cùng bảng 4 màu gốc của hệ thống)
const MAU_MUC: Record<number, string> = {
  100: "bg-grad-green text-hue-green-on",
  80: "bg-grad-teal text-hue-teal-on",
  60: "bg-grad-blue text-hue-blue-on",
  0: "bg-grad-neutral text-neutral",
};

function OSo({ nhan, value, onChange, sai, aria }: { nhan: string; value: string; onChange: (v: string) => void; sai: boolean; aria: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {nhan}
      <span className="inline-flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          aria-label={aria}
          aria-invalid={sai || undefined}
          className="h-11 w-24 text-right text-lg font-semibold tabular-nums"
        />
        <span className="font-normal text-muted-foreground">phút</span>
      </span>
    </label>
  );
}

// Điểm danh B1 (khung check-in, ngưỡng trễ) và rubric dự giờ C2 (mục 4.8). Đổi cấu hình chỉ ảnh hưởng các lần check-in/chấm điểm sau đó.
// Hai con số nhập gọn; rubric là 4 thẻ theo mức điểm.
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
      <CardContent className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <OSo nhan="Check-in trước giờ học" value={truoc} onChange={setTruoc} sai={truocSai} aria="Số phút được check-in trước giờ học" />
          <OSo nhan="Ngưỡng trễ tối đa (B1 = 0%)" value={tre} onChange={setTre} sai={treSai} aria="Ngưỡng trễ tối đa của B1 (phút)" />
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-semibold">Rubric dự giờ</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {cauHinh.rubric.map((r) => {
              const k = String(r.muc);
              return (
                <li key={r.muc} className="grid gap-2.5 rounded-2xl bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-16 shrink-0 items-center justify-center rounded-xl text-base font-bold tabular-nums", MAU_MUC[r.muc])}>
                      {r.muc}%
                    </span>
                    <Input
                      value={rubric[k].ten}
                      onChange={(e) => setRubric({ ...rubric, [k]: { ...rubric[k], ten: e.target.value } })}
                      aria-label={`Tên mức ${r.muc}%`}
                      aria-invalid={rubric[k].ten.trim() === "" || undefined}
                      className="font-medium"
                    />
                  </div>
                  <Textarea
                    value={rubric[k].mo_ta}
                    onChange={(e) => setRubric({ ...rubric, [k]: { ...rubric[k], mo_ta: e.target.value } })}
                    aria-label={`Mô tả mức ${r.muc}%`}
                    maxLength={500}
                    className="min-h-20 text-sm"
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm" role={ketQua?.error || !hopLe ? "alert" : undefined}>
            {!hopLe ? (
              <span className="text-danger">
                {truocSai ? "Check-in trước giờ học: số nguyên 0–240 phút." : treSai ? "Ngưỡng trễ: số nguyên 1–240 phút." : "Tên mức rubric không được để trống."}
              </span>
            ) : ketQua?.error ? (
              <span className="text-danger">{ketQua.error}</span>
            ) : ketQua?.ok ? (
              <span className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-4" aria-hidden /> Đã lưu
              </span>
            ) : null}
          </div>
          <Button onClick={luu} disabled={pending || !hopLe}>
            <Save /> {pending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
