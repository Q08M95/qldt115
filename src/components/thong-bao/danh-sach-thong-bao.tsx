"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { SU_KIEN_THONG_BAO_DOI } from "@/lib/thong-bao/hien-thi";
import { nhomNgay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ThongBao } from "@/types/database";
import { ThongBaoItem } from "./thong-bao-item";
import { danhDauDaDoc, danhDauTatCaDaDoc, taiThongBao, type LocThongBao } from "./thao-tac";

const SO_TREN_TRANG = 30;

const LOC: { gia_tri: LocThongBao; nhan: string }[] = [
  { gia_tri: "tat-ca", nhan: "Tất cả" },
  { gia_tri: "chua-doc", nhan: "Chưa đọc" },
  { gia_tri: "can-hanh-dong", nhan: "Cần hành động" },
];

const TRONG: Record<LocThongBao, string> = {
  "tat-ca": "Chưa có thông báo nào",
  "chua-doc": "Bạn đã đọc hết thông báo",
  "can-hanh-dong": "Không có việc nào cần hành động",
};

// Trang Thông báo: danh sách đầy đủ, lọc Tất cả / Chưa đọc / Cần hành động, đánh dấu đã đọc, tự cập nhật khi có thông báo mới.
export function DanhSachThongBao({ userId, banDau }: { userId: string; banDau: ThongBao[] }) {
  const router = useRouter();
  const [loc, setLoc] = useState<LocThongBao>("tat-ca");
  const [ds, setDs] = useState<ThongBao[]>(banDau);
  const [het, setHet] = useState(banDau.length < SO_TREN_TRANG);
  const [dangTai, batDau] = useTransition();
  // Số dòng đang hiển thị: làm mới giữ nguyên số đã "xem thêm"
  const soHienRef = useRef(banDau.length);
  const locRef = useRef<LocThongBao>("tat-ca");

  const lamMoi = useCallback(async () => {
    const soCan = Math.max(SO_TREN_TRANG, soHienRef.current);
    const list = await taiThongBao(soCan, 0, locRef.current);
    soHienRef.current = list.length;
    setDs(list);
    setHet(list.length < soCan);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const kenh = supabase
      .channel(`trang-thong-bao-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "thong_bao", filter: `user_id=eq.${userId}` }, () => void lamMoi())
      .subscribe();
    const khiDoi = () => void lamMoi();
    window.addEventListener(SU_KIEN_THONG_BAO_DOI, khiDoi);
    return () => {
      void supabase.removeChannel(kenh);
      window.removeEventListener(SU_KIEN_THONG_BAO_DOI, khiDoi);
    };
  }, [userId, lamMoi]);

  function doiLoc(v: LocThongBao) {
    locRef.current = v;
    setLoc(v);
    soHienRef.current = 0;
    batDau(async () => {
      const list = await taiThongBao(SO_TREN_TRANG, 0, v);
      soHienRef.current = list.length;
      setDs(list);
      setHet(list.length < SO_TREN_TRANG);
    });
  }

  function xemThem() {
    batDau(async () => {
      const them = await taiThongBao(SO_TREN_TRANG, ds.length, locRef.current);
      soHienRef.current = ds.length + them.length;
      setDs([...ds, ...them]);
      setHet(them.length < SO_TREN_TRANG);
    });
  }

  async function chon(tb: ThongBao) {
    // Chỉ thông báo "thông tin" chuyển đã đọc khi bấm; "cần hành động" giữ nguyên tới khi việc xử lý xong
    if (!tb.da_doc && tb.muc_do === "thong_tin") await danhDauDaDoc(tb.id);
    if (tb.lien_ket) router.push(tb.lien_ket);
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Lọc thông báo" className="flex flex-wrap gap-1.5">
            {LOC.map((o) => (
              <button
                key={o.gia_tri}
                type="button"
                role="tab"
                aria-selected={loc === o.gia_tri}
                onClick={() => doiLoc(o.gia_tri)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-medium sm:px-4 transition-colors duration-150",
                  loc === o.gia_tri ? "border-primary bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {o.nhan}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void danhDauTatCaDaDoc()}>
            <CheckCheck /> Đánh dấu tất cả đã đọc
          </Button>
        </div>

        {ds.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
            <BellOff className="size-12 opacity-40" aria-hidden />
            {dangTai ? "Đang tải..." : TRONG[loc]}
          </div>
        ) : (
          <ul className={cn("grid gap-0.5 transition-opacity", dangTai && "opacity-60")}>
            {ds.map((tb, i) => {
              // Tiêu đề nhóm thời gian khi sang nhóm mới — danh sách dài vẫn dễ lướt
              const nhom = nhomNgay(tb.created_at);
              const dauNhom = i === 0 || nhom !== nhomNgay(ds[i - 1].created_at);
              return (
                <li key={tb.id}>
                  {dauNhom && <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{nhom}</p>}
                  <ThongBaoItem tb={tb} onChon={chon} />
                </li>
              );
            })}
          </ul>
        )}

        {!het && ds.length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={xemThem} disabled={dangTai}>
              {dangTai ? "Đang tải..." : "Xem thêm"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
