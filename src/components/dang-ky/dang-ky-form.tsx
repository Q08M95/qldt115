"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dangKyBai } from "@/lib/dang-ky/actions";

// Đăng ký nhiều Bài trong 1 lượt (mục 4.2): người dùng tick các Bài (Bài không đăng ký được đã bị vô hiệu hóa sẵn
// kèm lý do), bấm 1 nút; về dữ liệu vẫn tách thành từng lượt đăng ký riêng theo Bài.
export function DangKyForm({
  baiTen,
  children,
}: {
  // id Bài -> tên Bài, để hiển thị kết quả từng Bài
  baiTen: Record<string, string>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(dangKyBai, null);
  const [soChon, setSoChon] = useState(0);

  return (
    <form
      action={formAction}
      onChange={(e) => setSoChon(new FormData(e.currentTarget).getAll("bai_id").length)}
      className="flex flex-col"
    >
      {children}

      <div className="sticky bottom-14 z-10 flex md:bottom-0 flex-col gap-3 border-t bg-card px-5 py-4">
        {state?.error && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state?.ketQua && state.ketQua.length > 0 && (
          <ul className="grid gap-1.5 text-sm">
            {state.ketQua.map((k) => (
              <li key={k.bai_id} className="flex items-start gap-2">
                {k.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                )}
                <span className={k.ok ? "" : "text-muted-foreground"}>
                  <strong className="font-medium">{baiTen[k.bai_id] ?? "Bài"}</strong>: {k.thong_bao}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {soChon > 0 ? `Đã chọn ${soChon} Bài` : "Chọn các Bài bạn muốn đăng ký dạy"}
          </p>
          <Button type="submit" disabled={pending || soChon === 0}>
            <ClipboardCheck /> {pending ? "Đang gửi..." : "Đăng ký các Bài đã chọn"}
          </Button>
        </div>
      </div>
    </form>
  );
}
