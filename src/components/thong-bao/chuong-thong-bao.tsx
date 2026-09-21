"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { SU_KIEN_THONG_BAO_DOI } from "@/lib/thong-bao/hien-thi";
import type { ThongBao } from "@/types/database";
import { ThongBaoItem } from "./thong-bao-item";
import { danhDauDaDoc, danhDauTatCaDaDoc, demChuaDoc, taiThongBao } from "./thao-tac";

const SO_TRONG_CHUONG = 10;

// Chuông thông báo ở topbar (mục 4.5/8.7): huy hiệu số chưa đọc + panel thả xuống danh sách mới nhất.
// Cập nhật tức thời qua Supabase Realtime; ngoài ra làm mới khi quay lại tab và khi nơi khác đánh dấu đã đọc.
export function ChuongThongBao({ userId, soChuaDocBanDau }: { userId: string; soChuaDocBanDau: number }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [dem, setDem] = useState(soChuaDocBanDau);
  const [ds, setDs] = useState<ThongBao[] | null>(null);
  // Trạng thái mở nằm trong ref để các sự kiện nền biết có cần tải lại danh sách không mà không phải đăng ký lại kênh Realtime
  const moRef = useRef(false);

  const lamMoi = useCallback(async (kemDanhSach: boolean) => {
    const [n, list] = await Promise.all([demChuaDoc(), kemDanhSach ? taiThongBao(SO_TRONG_CHUONG) : Promise.resolve(null)]);
    setDem(n);
    if (list) setDs(list);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const kenh = supabase
      .channel(`thong-bao-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "thong_bao", filter: `user_id=eq.${userId}` }, () => void lamMoi(moRef.current))
      .subscribe();
    const khiDoi = () => void lamMoi(moRef.current);
    const khiHienLai = () => {
      if (document.visibilityState === "visible") void lamMoi(moRef.current);
    };
    window.addEventListener(SU_KIEN_THONG_BAO_DOI, khiDoi);
    document.addEventListener("visibilitychange", khiHienLai);
    return () => {
      void supabase.removeChannel(kenh);
      window.removeEventListener(SU_KIEN_THONG_BAO_DOI, khiDoi);
      document.removeEventListener("visibilitychange", khiHienLai);
    };
  }, [userId, lamMoi]);

  function khiMo(v: boolean) {
    moRef.current = v;
    setMo(v);
    if (v) void lamMoi(true);
  }

  async function chon(tb: ThongBao) {
    khiMo(false);
    // Chỉ thông báo "thông tin" chuyển đã đọc khi bấm; "cần hành động" giữ nguyên tới khi việc xử lý xong
    if (!tb.da_doc && tb.muc_do === "thong_tin") await danhDauDaDoc(tb.id);
    if (tb.lien_ket) router.push(tb.lien_ket);
  }

  return (
    <Popover open={mo} onOpenChange={khiMo}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full border-transparent shadow-card" aria-label={`Thông báo${dem ? `, ${dem} chưa đọc` : ""}`}>
          <Bell />
          {dem > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-grad-danger-solid text-[10px] font-medium text-white tabular-nums">
              {dem > 9 ? "9+" : dem}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="text-[17px] font-semibold">Thông báo</h2>
          {dem > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void danhDauTatCaDaDoc()}>
              <CheckCheck /> Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[min(28rem,65vh)] overflow-y-auto px-2 pb-2">
          {ds === null ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : ds.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-muted-foreground">
              <BellOff className="size-10 opacity-40" aria-hidden />
              Chưa có thông báo nào
            </div>
          ) : (
            <ul className="grid gap-0.5">
              {ds.map((tb) => (
                <li key={tb.id}>
                  <ThongBaoItem tb={tb} onChon={chon} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-3">
          <Button asChild size="sm" className="w-full" onClick={() => khiMo(false)}>
            <Link href="/thong-bao">Xem tất cả thông báo</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
