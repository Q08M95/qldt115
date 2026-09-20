"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkIn } from "@/lib/danh-gia/actions";

// Nút "Tôi đã có mặt" (mục 4.4). Hàm SQL kiểm tra đúng người được phân công, đúng khung giờ và chưa check-in.
export function CheckInButton({ baiId, variant = "default" }: { baiId: string; variant?: "default" | "outline" }) {
  const [pending, start] = useTransition();
  const [ketQua, setKetQua] = useState<{ ok?: boolean; error?: string; b1?: number } | null>(null);

  const bam = () =>
    start(async () => {
      setKetQua(await checkIn(baiId));
    });

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <Button size="lg" variant={variant} onClick={bam} disabled={pending || ketQua?.ok === true} className="min-h-11">
        <UserCheck /> {pending ? "Đang ghi nhận..." : ketQua?.ok ? "Đã ghi nhận" : "Tôi đã có mặt"}
      </Button>
      {ketQua?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {ketQua.error}
        </p>
      )}
    </div>
  );
}
