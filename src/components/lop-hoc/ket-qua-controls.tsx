"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Link2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { batTatKhaoSat } from "@/lib/lop-hoc/actions";
import type { ActionState } from "@/lib/nhan-su/actions";
import type { KhaoSatLop } from "@/types/database";

// Ô nhập % (C1 nhập tay hoặc C3): để trống rồi lưu = xóa giá trị
export function PhanTramForm({
  action,
  lopId,
  name,
  label,
  hint,
  value,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  lopId: string;
  name: "c1" | "c3";
  label: string;
  hint?: string;
  value: number | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    // key theo giá trị để ô nhập cập nhật lại sau khi lưu / khi khảo sát ghi đè
    <form key={value ?? "trong"} action={formAction} className="grid gap-1.5">
      <input type="hidden" name="lop_id" value={lopId} />
      <Label htmlFor={`${name}-${lopId}`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={`${name}-${lopId}`}
          name={name}
          inputMode="decimal"
          defaultValue={value ?? ""}
          placeholder="0 – 100"
          className="max-w-32"
        />
        <span className="flex items-center text-sm text-muted-foreground">%</span>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">Đã lưu.</p>}
    </form>
  );
}

// Hình thức 1: link khảo sát công khai, ẩn danh. Admin copy link gửi cho học viên qua kênh ngoài (Zalo, QR...).
export function KhaoSatControls({ lopId, khaoSat }: { lopId: string; khaoSat: KhaoSatLop | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run(mo: boolean) {
    setError(null);
    start(async () => {
      const res = await batTatKhaoSat(lopId, mo);
      if (res?.error) setError(res.error);
    });
  }

  async function copy() {
    if (!khaoSat) return;
    await navigator.clipboard.writeText(`${window.location.origin}/khao-sat/${khaoSat.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Link khảo sát học viên</p>
      {!khaoSat ? (
        <>
          <p className="text-xs text-muted-foreground">
            Tạo đường dẫn công khai (không cần đăng nhập, ẩn danh) gồm 2 câu hỏi đánh giá 1–5. Điểm khảo sát hài lòng học viên (C1) được tự tính lại mỗi khi có phản hồi mới.
          </p>
          <div>
            <Button variant="outline" onClick={() => run(true)} disabled={pending}>
              <Link2 /> {pending ? "Đang tạo..." : "Tạo link khảo sát"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <Input readOnly value={`/khao-sat/${khaoSat.token}`} aria-label="Đường dẫn khảo sát" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy} aria-label="Sao chép link đầy đủ">
              {copied ? <Check /> : <Copy />} {copied ? "Đã chép" : "Sao chép"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {khaoSat.so_phan_hoi} phản hồi · {khaoSat.mo ? "Đang nhận phản hồi" : "Đã đóng"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => run(!khaoSat.mo)} disabled={pending}>
              <Power /> {khaoSat.mo ? "Đóng khảo sát" : "Mở lại khảo sát"}
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
