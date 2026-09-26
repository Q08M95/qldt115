"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { luuCauHinhDangKy } from "@/lib/cau-hinh/actions";
import type { CauHinhDangKy } from "@/lib/cau-hinh/queries";

const so = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const phanTram = (v: number) => String(Math.round(v * 1000) / 10);

function O({ nhan, mota, value, onChange, sai, donVi }: { nhan: string; mota: string; value: string; onChange: (v: string) => void; sai: boolean; donVi: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{nhan}</span>
      <span className="inline-flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label={nhan} aria-invalid={sai || undefined} className="h-11 w-24 text-right text-lg font-semibold tabular-nums" />
        <span className="text-muted-foreground">{donVi}</span>
      </span>
      <span className="text-xs text-muted-foreground">{mota}</span>
    </label>
  );
}

// Ngưỡng cảnh báo khi tạo Bài/duyệt slot và tỷ trọng matching-score (mục 4.3/4.8). Áp dụng ngay cho các lần tính gợi ý/cảnh báo sau đó.
export function CauHinhDangKyForm({ cauHinh }: { cauHinh: CauHinhDangKy }) {
  const [pending, start] = useTransition();
  const [ketQua, setKetQua] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pool, setPool] = useState(String(cauHinh.canh_bao_pool_nho));
  const [donTai, setDonTai] = useState(phanTram(cauHinh.canh_bao_don_tai_ty_le));
  const [congBang, setCongBang] = useState(phanTram(cauHinh.matching_ty_trong_cong_bang));
  const [phat, setPhat] = useState(phanTram(cauHinh.matching_phat_cung_lop));

  const p = so(pool);
  const d = so(donTai);
  const c = so(congBang);
  const f = so(phat);
  const poolSai = !(Number.isInteger(p) && p >= 1 && p <= 50);
  const donTaiSai = !(d >= 1 && d <= 100);
  const congBangSai = !(c >= 0 && c <= 100);
  const phatSai = !(f >= 0 && f <= 100);
  const hopLe = !poolSai && !donTaiSai && !congBangSai && !phatSai;
  const kpiTieBreak = congBangSai ? "–" : `${Math.round((100 - c) * 10) / 10}%`;

  const luu = () =>
    start(async () => {
      setKetQua(
        await luuCauHinhDangKy({
          canh_bao_pool_nho: p,
          canh_bao_don_tai_ty_le: d / 100,
          matching_ty_trong_cong_bang: c / 100,
          matching_phat_cung_lop: f / 100,
        }),
      );
    });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Cảnh báo khi tạo Bài và duyệt đăng ký</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <O nhan="Ngưỡng cảnh báo pool ứng viên nhỏ" mota="Bài có số người đủ điều kiện dưới mức này sẽ bị cảnh báo lúc tạo Bài." value={pool} onChange={setPool} sai={poolSai} donVi="người" />
          <O nhan="Ngưỡng cảnh báo dồn tải" mota="Cảnh báo mềm khi 1 người đảm nhiệm quá tỷ lệ này số slot của 1 vai trò trong cùng lớp." value={donTai} onChange={setDonTai} sai={donTaiSai} donVi="%" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matching-score (gợi ý ứng viên)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <O nhan="Tỷ trọng công bằng khối lượng" mota={`Phần còn lại (${kpiTieBreak}) là KPI tie-break khi khối lượng ngang nhau.`} value={congBang} onChange={setCongBang} sai={congBangSai} donVi="%" />
          <O nhan="Mức hạ điểm khi đã dạy Bài khác cùng lớp" mota="Hạ nhẹ điểm gợi ý (không loại trừ) để phân bổ đều nhân sự trong 1 lớp." value={phat} onChange={setPhat} sai={phatSai} donVi="%" />
        </CardContent>
      </Card>

      <div className="sticky bottom-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] md:bottom-4 dark:border">
        <div className="text-sm" role={ketQua?.error || !hopLe ? "alert" : undefined}>
          {!hopLe ? (
            <span className="text-danger">
              {poolSai ? "Pool nhỏ: số nguyên 1–50." : donTaiSai ? "Dồn tải: 1–100%." : congBangSai ? "Tỷ trọng công bằng: 0–100%." : "Mức hạ điểm: 0–100%."}
            </span>
          ) : ketQua?.error ? (
            <span className="text-danger">{ketQua.error}</span>
          ) : ketQua?.ok ? (
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" aria-hidden /> Đã lưu
            </span>
          ) : (
            <span className="text-muted-foreground">Áp dụng ngay cho các lần gợi ý và cảnh báo sau đó.</span>
          )}
        </div>
        <Button onClick={luu} disabled={pending || !hopLe}>
          <Save /> {pending ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}
