"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { guiKhaoSat } from "@/lib/lop-hoc/khao-sat-actions";

const CAU_HOI = [
  { name: "diem_tong_the", nhan: "Bạn hài lòng như thế nào về khóa học nói chung?" },
  { name: "diem_giang_day", nhan: "Bạn hài lòng như thế nào về giảng viên và trợ giảng?" },
] as const;

function ChonDiem({ name, nhan }: { name: string; nhan: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{nhan}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required className="peer sr-only" />
            <span className="flex h-12 items-center justify-center rounded-lg border bg-card text-base font-semibold text-foreground/70 transition-colors peer-checked:border-transparent peer-checked:bg-brand-gradient peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 · Rất không hài lòng</span>
        <span>5 · Rất hài lòng</span>
      </div>
    </fieldset>
  );
}

// Biểu mẫu khảo sát công khai — không cần đăng nhập, ẩn danh (mục 4.2, hình thức 1)
export function KhaoSatForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(guiKhaoSat, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-14 text-success" strokeWidth={1.5} aria-hidden />
        <h2 className="text-lg font-semibold">Cảm ơn bạn đã phản hồi!</h2>
        <p className="text-sm text-muted-foreground">Ý kiến của bạn giúp chúng tôi nâng cao chất lượng các khóa học tiếp theo.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="token" value={token} />
      {/* Ô bẫy bot: người thật không thấy nên không điền */}
      <input type="text" name="hp_url" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

      {CAU_HOI.map((c) => (
        <ChonDiem key={c.name} name={c.name} nhan={c.nhan} />
      ))}

      <div className="grid gap-1.5">
        <label htmlFor="nhan_xet" className="text-sm font-medium">
          Góp ý thêm (không bắt buộc)
        </label>
        <Textarea id="nhan_xet" name="nhan_xet" rows={3} maxLength={1000} />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Đang gửi..." : "Gửi phản hồi"}
      </Button>
    </form>
  );
}
