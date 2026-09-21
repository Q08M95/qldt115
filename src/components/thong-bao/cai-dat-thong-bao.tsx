"use client";

import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BatPushCard } from "./bat-push-card";
import { TuyChonThongBao, type TuyChon } from "./tuy-chon-thong-bao";

// "Cài đặt thông báo": gom thông báo đẩy của thiết bị này + tùy chọn theo loại vào 1 thẻ gọn, mặc định thu lại, mở ra khi cần.
export function CaiDatThongBao({ tuyChon, isQuanTri, moMacDinh = false }: { tuyChon: TuyChon; isQuanTri: boolean; moMacDinh?: boolean }) {
  const [mo, setMo] = useState(moMacDinh);

  return (
    <Card className="gap-0 py-0">
      <button
        type="button"
        aria-expanded={mo}
        onClick={() => setMo(!mo)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[17px] font-semibold">
            <Settings2 className="size-5 text-muted-foreground" aria-hidden /> Cài đặt thông báo
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Thông báo đẩy trên thiết bị này · tùy chọn theo loại</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-150", mo && "rotate-180")} aria-hidden />
      </button>
      {mo && (
        <div className="grid gap-6 border-t px-5 py-5">
          <BatPushCard />
          <TuyChonThongBao banDau={tuyChon} isQuanTri={isQuanTri} />
        </div>
      )}
    </Card>
  );
}
