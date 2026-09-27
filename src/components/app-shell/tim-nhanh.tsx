"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, GraduationCap, History, LayoutDashboard, Search, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";

// "Đi nhanh tới…" (mục 8.5b): nhảy thẳng tới trang / lớp / người từ bất kỳ đâu. Khác ô lọc trong từng trang
// (thu hẹp danh sách đang xem). Đọc qua trình duyệt nên RLS lo việc ẩn lớp Dự kiến; không hiện nhãn nhóm.
interface KetQua {
  key: string;
  loai: "trang" | "lop" | "nguoi";
  nhan: string;
  phu?: string;
  href: string;
  avatar?: string | null;
}

const NHAN_NHOM: Record<KetQua["loai"], { ten: string; icon: LucideIcon }> = {
  trang: { ten: "Trang", icon: LayoutDashboard },
  lop: { ten: "Lớp học", icon: GraduationCap },
  nguoi: { ten: "Nhân sự", icon: Users },
};

const KHOA_GAN_DAY = "qldt.tim-nhanh.gan-day";

function docGanDay(): KetQua[] {
  try {
    return JSON.parse(localStorage.getItem(KHOA_GAN_DAY) ?? "[]") as KetQua[];
  } catch {
    return [];
  }
}

function ghiGanDay(kq: KetQua) {
  try {
    const ds = [kq, ...docGanDay().filter((k) => k.key !== kq.key)].slice(0, 5);
    localStorage.setItem(KHOA_GAN_DAY, JSON.stringify(ds));
  } catch {
    /* localStorage có thể bị chặn */
  }
}

// Bỏ dấu để "hoi" khớp "Hội" khi lọc trang (lọc ở phía trình duyệt); tìm lớp/người dùng ilike của Postgres
const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

// Ký tự đặc biệt của bộ lọc PostgREST/ilike không được lọt vào câu lọc
const lamSach = (s: string) => s.replace(/[%_,()*\\]/g, " ").trim();

export function TimNhanh({ isQuanTri, className }: { isQuanTri: boolean; className?: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [q, setQ] = useState("");
  const [lop, setLop] = useState<KetQua[]>([]);
  const [nguoi, setNguoi] = useState<KetQua[]>([]);
  const [dangTim, setDangTim] = useState(false);
  const [chon, setChon] = useState(0);
  const [ganDay, setGanDay] = useState<KetQua[]>([]);
  const yeuCau = useRef(0);

  const trang = useMemo<KetQua[]>(
    () =>
      NAV_GROUPS.flatMap((g) => g.items)
        .filter((it) => !it.quanTriOnly || isQuanTri)
        .map((it) => ({ key: `trang:${it.href}`, loai: "trang" as const, nhan: it.label, href: it.href })),
    [isQuanTri],
  );

  const dong = useCallback(() => {
    setMo(false);
    setQ("");
    setLop([]);
    setNguoi([]);
    setDangTim(false);
    setChon(0);
  }, []);

  // Ctrl/Cmd + K mở ô tìm ở mọi trang
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setGanDay(docGanDay());
        setMo(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tu = lamSach(q);
  const coTuKhoa = tu.length >= 2;

  // Tìm lớp và người (tối đa 5 mỗi nhóm), chờ 250 ms sau lần gõ cuối; bỏ kết quả của lần gõ cũ
  useEffect(() => {
    if (!mo || !coTuKhoa) return;
    const lan = ++yeuCau.current;
    const h = setTimeout(async () => {
      setDangTim(true);
      const supabase = createClient();
      const mau = `%${tu}%`;
      const [rl, rn] = await Promise.all([
        supabase
          .from("lop_hoc_tong_hop")
          .select("id, ten, nhom_lop_ten, ngay_bat_dau, dia_diem")
          .or(`ten.ilike.${mau},dia_diem.ilike.${mau},nhom_lop_ten.ilike.${mau}`)
          .order("ngay_bat_dau", { ascending: false })
          .limit(5),
        supabase.from("profiles").select("id, ho_ten, email, avatar_url").or(`ho_ten.ilike.${mau},email.ilike.${mau}`).order("ho_ten").limit(5),
      ]);
      if (lan !== yeuCau.current) return;
      setLop(
        (rl.data ?? []).map((r) => ({
          key: `lop:${r.id}`,
          loai: "lop" as const,
          nhan: r.ten as string,
          phu: `${r.nhom_lop_ten} · ${new Date(r.ngay_bat_dau as string).toLocaleDateString("vi-VN")}`,
          href: `/lop-hoc/${r.id}`,
        })),
      );
      setNguoi(
        (rn.data ?? []).map((r) => ({
          key: `nguoi:${r.id}`,
          loai: "nguoi" as const,
          nhan: r.ho_ten as string,
          phu: r.email as string,
          href: `/nhan-su/${r.id}`,
          avatar: r.avatar_url as string | null,
        })),
      );
      setDangTim(false);
    }, 250);
    return () => clearTimeout(h);
  }, [mo, coTuKhoa, tu]);

  const trangKhop = useMemo(() => {
    if (!coTuKhoa) return [];
    const k = boDau(tu);
    return trang.filter((t) => boDau(t.nhan).includes(k)).slice(0, 5);
  }, [coTuKhoa, tu, trang]);

  // Chưa gõ gì: hiện mục truy cập gần đây, chưa có thì gợi ý vài trang hay dùng
  const danhSach: KetQua[] = coTuKhoa ? [...trangKhop, ...lop, ...nguoi] : ganDay.length > 0 ? ganDay : trang.slice(0, 5);
  const tieuDeMacDinh = ganDay.length > 0 ? "Truy cập gần đây" : "Gợi ý";

  function di(kq: KetQua) {
    ghiGanDay(kq);
    dong();
    router.push(kq.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setChon((c) => Math.min(c + 1, danhSach.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setChon((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && danhSach[chon]) {
      e.preventDefault();
      di(danhSach[chon]);
    }
  }

  function moHop() {
    setGanDay(docGanDay());
    setMo(true);
  }

  // Nhóm kết quả theo loại giữ nguyên thứ tự danh sách phẳng để phím mũi tên đi liền mạch
  const nhom: { loai: KetQua["loai"] | "mac-dinh"; muc: { kq: KetQua; chi: number }[] }[] = [];
  danhSach.forEach((kq, chi) => {
    const loai = coTuKhoa ? kq.loai : "mac-dinh";
    const cuoi = nhom.at(-1);
    if (cuoi && cuoi.loai === loai) cuoi.muc.push({ kq, chi });
    else nhom.push({ loai, muc: [{ kq, chi }] });
  });

  return (
    <>
      {/* Desktop: khung giống ô nhập nhưng bấm là mở hộp tìm nhanh */}
      <button
        type="button"
        onClick={moHop}
        className={cn(
          "hidden h-10 w-64 items-center gap-2 rounded-lg bg-card px-3 text-sm text-muted-foreground shadow-card outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 md:flex",
          className,
        )}
        aria-label="Đi nhanh tới lớp, người hoặc trang"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">Đi nhanh tới…</span>
        <kbd className="rounded border bg-background px-1.5 text-[11px] font-medium">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Đi nhanh tới lớp, người hoặc trang" onClick={moHop}>
        <Search />
      </Button>

      <Dialog open={mo} onOpenChange={(v) => (v ? setMo(true) : dong())}>
        <DialogContent showCloseButton={false} className="top-[10%] -translate-y-0 gap-0 p-0 sm:max-w-lg" onKeyDown={onKeyDown}>
          <DialogTitle className="sr-only">Đi nhanh tới</DialogTitle>
          <DialogDescription className="sr-only">Gõ tên lớp, tên người hoặc tên trang rồi chọn để mở ngay.</DialogDescription>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setChon(0);
              }}
              placeholder="Đi nhanh tới lớp, người hoặc trang…"
              aria-label="Đi nhanh tới"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Button variant="ghost" size="sm" onClick={dong} className="text-muted-foreground">
              Đóng
            </Button>
          </div>

          <div className="max-h-[60dvh] overflow-y-auto p-2">
            {q.trim().length > 0 && !coTuKhoa && <p className="px-2 py-3 text-sm text-muted-foreground">Gõ thêm ít nhất 2 ký tự để tìm.</p>}
            {coTuKhoa && danhSach.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{dangTim ? "Đang tìm…" : `Không thấy kết quả cho “${q.trim()}”.`}</p>
            )}
            {nhom.map(({ loai, muc }) => {
              const TieuDeIcon = loai === "mac-dinh" ? History : NHAN_NHOM[loai].icon;
              return (
                <div key={loai} className="mb-1">
                  <p className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <TieuDeIcon className="size-3.5" aria-hidden />
                    {loai === "mac-dinh" ? tieuDeMacDinh : NHAN_NHOM[loai].ten}
                  </p>
                  <ul>
                    {muc.map(({ kq, chi }) => (
                      <li key={kq.key}>
                        <button
                          type="button"
                          onClick={() => di(kq)}
                          onMouseMove={() => setChon(chi)}
                          className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none", chi === chon && "bg-muted")}
                        >
                          {kq.loai === "nguoi" ? (
                            <UserAvatar name={kq.nhan} src={kq.avatar} className="size-8" />
                          ) : (
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              {(() => {
                                const I = NHAN_NHOM[kq.loai].icon;
                                return <I className="size-4" aria-hidden />;
                              })()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{kq.nhan}</span>
                            {kq.phu && <span className="block truncate text-xs text-muted-foreground">{kq.phu}</span>}
                          </span>
                          {chi === chon && <CornerDownLeft className="hidden size-4 text-muted-foreground md:block" aria-hidden />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
