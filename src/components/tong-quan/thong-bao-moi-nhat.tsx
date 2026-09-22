"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { ThongBaoItem } from "@/components/thong-bao/thong-bao-item";
import { danhDauDaDoc } from "@/components/thong-bao/thao-tac";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThongBao } from "@/types/database";

// Danh sách thông báo mới nhất (mục 4.7b, GV/TG) — bản rút gọn của /thong-bao, không realtime/phân trang (xem đầy đủ
// tại /thong-bao). Cùng cách đánh dấu đã đọc + điều hướng như chuông thông báo ở topbar (mục 8.7).
export function ThongBaoMoiNhat({ items }: { items: ThongBao[] }) {
  const router = useRouter();

  async function chon(tb: ThongBao) {
    if (!tb.da_doc && tb.muc_do === "thong_tin") await danhDauDaDoc(tb.id);
    if (tb.lien_ket) router.push(tb.lien_ket);
  }

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Thông báo mới nhất
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="Chưa có thông báo nào." />
        ) : (
          <ul className="grid gap-0.5">
            {items.map((tb) => (
              <li key={tb.id}>
                <ThongBaoItem tb={tb} onChon={chon} />
              </li>
            ))}
          </ul>
        )}
        <Link href="/thong-bao" className="mt-2 block text-center text-xs text-muted-foreground hover:underline">
          Xem tất cả thông báo
        </Link>
      </CardContent>
    </Card>
  );
}
