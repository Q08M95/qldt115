"use client";

import { ThongBaoItem } from "@/components/thong-bao/thong-bao-item";
import type { ThongBao } from "@/types/database";

// Danh sách thông báo tĩnh cho trang demo (hàm chọn không làm gì)
export function DemoList({ ds }: { ds: ThongBao[] }) {
  return (
    <ul className="grid gap-0.5">
      {ds.map((tb) => (
        <li key={tb.id}>
          <ThongBaoItem tb={tb} onChon={() => {}} />
        </li>
      ))}
    </ul>
  );
}
