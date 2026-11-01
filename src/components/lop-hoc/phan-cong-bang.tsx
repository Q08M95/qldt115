import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fmtDate, fmtTime } from "@/lib/format";
import { TRANG_THAI_LOP_LABEL, TRANG_THAI_LOP_VARIANT } from "@/lib/lop-hoc/labels";
import type { BaiPhanCong, SlotPhanCong } from "@/lib/lop-hoc/queries";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { LopHocTongHop, VaiTroGiangDay } from "@/types/database";

// Cột Bài | Thời gian | Giảng viên | Trợ giảng (máy tính); điện thoại xếp dọc, mỗi vai trò có nhãn riêng
const COT = "md:grid-cols-[minmax(0,1.2fr)_11.5rem_minmax(0,1fr)_minmax(0,1fr)]";

// Người được phân công của 1 vai trò trong 1 Bài; slot chưa có người gộp thành 1 nhãn đếm (Chờ duyệt / Còn trống)
function NguoiTheoVaiTro({ slots, vai }: { slots: SlotPhanCong[]; vai: VaiTroGiangDay }) {
  const cua = slots.filter((s) => s.vai_tro === vai);
  const choDuyet = cua.filter((s) => !s.nguoi && s.trang_thai === "cho_duyet").length;
  const conTrong = cua.filter((s) => !s.nguoi && s.trang_thai !== "cho_duyet").length;
  return (
    <div className={cua.length === 0 ? "max-md:hidden" : "flex min-w-0 items-start gap-2"}>
      <span className="w-20 shrink-0 text-xs text-muted-foreground md:hidden">{VAI_TRO_LABEL[vai]}</span>
      {cua.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        // Mỗi người 1 hàng; nhãn còn trống / chờ duyệt chung 1 hàng cuối
        <span className="flex min-w-0 flex-col items-start gap-1">
          {cua
            .filter((s) => s.nguoi)
            .map((s) => (
              <Link key={s.vi_tri} href={`/nhan-su/${s.nguoi!.id}`} className="max-w-full truncate hover:underline">
                {s.nguoi!.ho_ten}
              </Link>
            ))}
          {(choDuyet > 0 || conTrong > 0) && (
            <span className="flex flex-wrap gap-1.5">
              {choDuyet > 0 && <Badge variant="warning">{choDuyet} chờ duyệt</Badge>}
              {conTrong > 0 && <Badge variant="neutral">{conTrong} còn trống</Badge>}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Danh sách phân công các lớp đang lọc, gộp 1 bảng (chế độ "Phân công" của trang Lớp học)
export function PhanCongBang({ lops, baiTheoLop }: { lops: LopHocTongHop[]; baiTheoLop: Map<string, BaiPhanCong[]> }) {
  if (lops.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="Không có lớp nào phù hợp với bộ lọc." />
      </Card>
    );
  }
  return (
    <Card className="gap-0 overflow-clip py-0">
      <div className={`hidden gap-4 border-b px-5 py-3 text-[13px] font-medium text-muted-foreground md:grid ${COT}`}>
        <span>Bài</span>
        <span>Thời gian</span>
        <span>Giảng viên</span>
        <span>Trợ giảng</span>
      </div>
      {lops.map((l) => {
        const bai = baiTheoLop.get(l.id) ?? [];
        return (
          <section key={l.id} className="border-b last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-background px-5 py-3">
              <Link href={`/lop-hoc/${l.id}`} className="min-w-0 truncate font-semibold hover:underline">
                {l.ten}
              </Link>
              <Badge variant={TRANG_THAI_LOP_VARIANT[l.trang_thai_hien_thi]}>{TRANG_THAI_LOP_LABEL[l.trang_thai_hien_thi]}</Badge>
              <span className="min-w-0 text-xs text-muted-foreground tabular-nums">
                {fmtDate(l.ngay_bat_dau)}
                {l.ngay_ket_thuc !== l.ngay_bat_dau && ` – ${fmtDate(l.ngay_ket_thuc)}`}
                {l.dia_diem && ` · ${l.dia_diem}`}
              </span>
            </div>
            {bai.length === 0 ? (
              <p className="px-5 py-3 text-sm text-muted-foreground">Lớp chưa có Bài.</p>
            ) : (
              <ul className="divide-y">
                {bai.map((b) => (
                  <li key={b.id} className={`grid grid-cols-1 gap-x-4 gap-y-1.5 px-5 py-3 text-sm md:items-start ${COT}`}>
                    <span className="min-w-0 font-medium">{b.ten}</span>
                    <span className="text-xs text-muted-foreground tabular-nums md:text-sm md:text-foreground">
                      {fmtDate(b.bat_dau)} · {fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}
                    </span>
                    <NguoiTheoVaiTro slots={b.slots} vai="giang_vien" />
                    <NguoiTheoVaiTro slots={b.slots} vai="tro_giang" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </Card>
  );
}
