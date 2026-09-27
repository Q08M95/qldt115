import { cn } from "@/lib/utils";
import { hienThiTienDo, type TienDoVaiTro } from "@/lib/lop-hoc/tien-do";

// Tiến độ phân công của 1 vai trò (CLAUDE.md mục 4.2): nhãn "X/Y lượt phân công" + "Z nhân sự khác nhau tham gia".
// Luôn hiện dạng thanh, kể cả khi chỉ 1 người đảm nhiệm toàn bộ — đồng nhất với các thanh tiến độ khác.
export function TienDoVaiTroRow({
  label,
  tien,
  className,
}: {
  label: string;
  tien: TienDoVaiTro;
  className?: string;
}) {
  const h = hienThiTienDo(tien);
  if (h.kieu === "khong_can") return null;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums", h.du ? "font-medium text-success" : "text-muted-foreground")}>
          {h.da}/{h.tong} lượt phân công
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label}: ${h.da}/${h.tong} lượt phân công`}
        aria-valuemin={0}
        aria-valuemax={h.tong}
        aria-valuenow={h.da}
      >
        <div className={cn("h-full rounded-full", h.du ? "bg-[linear-gradient(90deg,#86efac,#16a34a)]" : "bg-brand-gradient")} style={{ width: `${h.phanTram}%` }} />
      </div>
      {h.da > 0 && <p className="text-xs text-muted-foreground">{h.nhanSu} nhân sự khác nhau tham gia</p>}
    </div>
  );
}

// Ghép 2 vai trò từ 1 dòng của view lop_hoc_tong_hop
export function TienDoLop({
  lop,
  className,
}: {
  lop: {
    gv_tong: number;
    gv_da_phan_cong: number;
    gv_nhan_su: number;
    tg_tong: number;
    tg_da_phan_cong: number;
    tg_nhan_su: number;
  };
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <TienDoVaiTroRow label="Giảng viên" tien={{ tong: lop.gv_tong, da: lop.gv_da_phan_cong, nhanSu: lop.gv_nhan_su }} />
      <TienDoVaiTroRow label="Trợ giảng" tien={{ tong: lop.tg_tong, da: lop.tg_da_phan_cong, nhanSu: lop.tg_nhan_su }} />
    </div>
  );
}
