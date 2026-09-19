import Link from "next/link";
import { CalendarDays, ChevronDown, Layers } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { BaiFormDrawer } from "@/components/lop-hoc/bai-form-drawer";
import { XoaBaiButton } from "@/components/lop-hoc/xoa-bai-button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtTime } from "@/lib/format";
import { TRANG_THAI_SLOT_LABEL, TRANG_THAI_SLOT_VARIANT } from "@/lib/lop-hoc/labels";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { BaiHoc, SlotGiangDay, VaiTroGiangDay } from "@/types/database";

function demVaiTro(slots: SlotGiangDay[], vai: VaiTroGiangDay) {
  const cua = slots.filter((s) => s.vai_tro === vai);
  return { tong: cua.length, da: cua.filter((s) => s.trang_thai === "da_phan_cong").length };
}

function SlotRow({ slot }: { slot: SlotGiangDay }) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">Vị trí {slot.vi_tri}</span>
      {slot.nguoi ? (
        <Link href={`/nhan-su/${slot.nguoi.id}`} className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:underline">
          <UserAvatar name={slot.nguoi.ho_ten} src={slot.nguoi.avatar_url} className="size-7" />
          <span className="truncate">{slot.nguoi.ho_ten}</span>
        </Link>
      ) : (
        <span className="flex-1 text-muted-foreground">Chưa có người</span>
      )}
      <Badge variant={TRANG_THAI_SLOT_VARIANT[slot.trang_thai]}>{TRANG_THAI_SLOT_LABEL[slot.trang_thai]}</Badge>
    </li>
  );
}

// Danh sách Bài dạng accordion (mục 8.8). Mỗi Bài liệt kê từng slot kèm TÊN người đảm nhiệm để không hiểu nhầm
// "số slot = số người" (mục 4.2). Nút sửa/xóa chỉ hiện với người quản trị khi lớp còn sửa được.
export function BaiList({
  lopId,
  ngayBatDau,
  bai,
  coTheSua,
}: {
  lopId: string;
  ngayBatDau: string;
  bai: BaiHoc[];
  coTheSua: boolean;
}) {
  return (
    <Card className="gap-0 px-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Các Bài trong lớp
          <Badge variant="teal">{bai.length}</Badge>
        </CardTitle>
        {coTheSua && (
          <CardAction>
            <BaiFormDrawer lopId={lopId} ngayMacDinh={ngayBatDau} />
          </CardAction>
        )}
      </CardHeader>

      {bai.length === 0 ? (
        <EmptyState icon={Layers} title="Lớp chưa có Bài nào. Thêm Bài để định nghĩa số slot Giảng viên/Trợ giảng cần cho từng buổi." />
      ) : (
        <ul className="divide-y border-t">
          {bai.map((b, i) => {
            const gv = demVaiTro(b.slots, "giang_vien");
            const tg = demVaiTro(b.slots, "tro_giang");
            return (
              <li key={b.id}>
                <details className="group" open={bai.length <= 3}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none marker:hidden hover:bg-background focus-visible:bg-background [&::-webkit-details-marker]:hidden">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grad-blue text-sm font-semibold text-hue-blue-on">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.ten}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {fmtDate(b.bat_dau)} · {fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
                      {gv.tong > 0 && (
                        <Badge variant={gv.da === gv.tong ? "success" : "outline"}>
                          GV {gv.da}/{gv.tong}
                        </Badge>
                      )}
                      {tg.tong > 0 && (
                        <Badge variant={tg.da === tg.tong ? "success" : "outline"}>
                          TG {tg.da}/{tg.tong}
                        </Badge>
                      )}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>

                  <div className="grid gap-4 px-5 pb-5">
                    {(["giang_vien", "tro_giang"] as const).map((vai) => {
                      const slots = b.slots.filter((s) => s.vai_tro === vai);
                      if (slots.length === 0) return null;
                      return (
                        <div key={vai}>
                          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{VAI_TRO_LABEL[vai]}</p>
                          <ul className="divide-y rounded-xl border px-3">
                            {slots.map((s) => (
                              <SlotRow key={s.id} slot={s} />
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {coTheSua && (
                      <div className="flex flex-wrap gap-2">
                        <BaiFormDrawer lopId={lopId} ngayMacDinh={ngayBatDau} bai={b} />
                        <XoaBaiButton id={b.id} lopId={lopId} ten={b.ten} />
                      </div>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
