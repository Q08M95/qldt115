import Link from "next/link";
import { Ban, CalendarDays, ChevronDown, Layers, UserCheck } from "lucide-react";
import { CheckInButton } from "@/components/danh-gia/check-in-button";
import { ChinhDiemDanhDrawer } from "@/components/danh-gia/diem-danh-controls";
import { NutHuyPhanCong } from "@/components/dang-ky/dang-ky-controls";
import { DangKyForm } from "@/components/dang-ky/dang-ky-form";
import { GoiYBai } from "@/components/dang-ky/goi-y-bai";
import { EmptyState } from "@/components/empty-state";
import { BaiFormDrawer } from "@/components/lop-hoc/bai-form-drawer";
import { XoaBaiButton } from "@/components/lop-hoc/xoa-bai-button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { DangKyLop } from "@/lib/dang-ky/queries";
import { daBatDau } from "@/lib/danh-gia/thoi-gian";
import { fmtDate, fmtTime } from "@/lib/format";
import { TRANG_THAI_SLOT_LABEL, TRANG_THAI_SLOT_VARIANT } from "@/lib/lop-hoc/labels";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { BaiHoc, DiemDanh, SlotGiangDay, TrangThaiLop, VaiTroGiangDay } from "@/types/database";

export interface NguoiXem {
  id: string;
  // Vai trò giảng dạy của người xem (null nếu chưa xếp nhóm — không đăng ký được)
  vaiTro: VaiTroGiangDay | null;
  isQuanTri: boolean;
}

function demVaiTro(slots: SlotGiangDay[], vai: VaiTroGiangDay) {
  const cua = slots.filter((s) => s.vai_tro === vai);
  return { tong: cua.length, da: cua.filter((s) => s.trang_thai === "da_phan_cong").length };
}

const fmtPt = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")}%`;

// Điểm danh (B1) của người đảm nhiệm slot: badge kết quả; người đó thấy nút "Tôi đã có mặt" khi Bài trong khung check-in;
// Admin/Quản lý lớp chỉnh tay được sau khi Bài đã bắt đầu (mục 4.4)
function DiemDanhSlot({
  baiId,
  slot,
  diemDanh,
  daBat,
  choCheckIn,
  isQuanTri,
  viewerId,
}: {
  baiId: string;
  slot: SlotGiangDay;
  diemDanh?: DiemDanh;
  daBat: boolean;
  choCheckIn: boolean;
  isQuanTri: boolean;
  viewerId?: string;
}) {
  if (!slot.nguoi) return null;
  const laToi = slot.nguoi.id === viewerId;
  return (
    <>
      {diemDanh ? (
        <Badge
          variant={diemDanh.b1_phan_tram >= 100 ? "success" : diemDanh.b1_phan_tram > 0 ? "warning" : "danger"}
          title={
            diemDanh.chinh_tay
              ? `Đã chỉnh tay${diemDanh.ly_do_chinh ? `: ${diemDanh.ly_do_chinh}` : ""}`
              : diemDanh.check_in_luc
                ? `Check-in lúc ${fmtTime(diemDanh.check_in_luc)}`
                : undefined
          }
        >
          <UserCheck /> B1 {fmtPt(diemDanh.b1_phan_tram)}
          {diemDanh.chinh_tay && " · sửa tay"}
        </Badge>
      ) : laToi && choCheckIn ? (
        <CheckInButton baiId={baiId} />
      ) : daBat ? (
        <Badge variant="neutral">Chưa check-in</Badge>
      ) : null}
      {isQuanTri && daBat && (
        <ChinhDiemDanhDrawer baiId={baiId} userId={slot.nguoi.id} ten={slot.nguoi.ho_ten} diemDanh={diemDanh ?? null} />
      )}
    </>
  );
}

function SlotRow({
  slot,
  coTheHuy,
  diemDanhProps,
}: {
  slot: SlotGiangDay;
  coTheHuy: boolean;
  diemDanhProps?: React.ComponentProps<typeof DiemDanhSlot>;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">Vị trí {slot.vi_tri}</span>
      {slot.nguoi ? (
        <Link href={`/nhan-su/${slot.nguoi.id}`} className="flex min-w-32 flex-1 items-center gap-2 font-medium hover:underline">
          <UserAvatar name={slot.nguoi.ho_ten} src={slot.nguoi.avatar_url} className="size-7" />
          <span className="truncate">{slot.nguoi.ho_ten}</span>
        </Link>
      ) : (
        <span className="flex-1 text-muted-foreground">Chưa có người</span>
      )}
      <Badge variant={TRANG_THAI_SLOT_VARIANT[slot.trang_thai]}>{TRANG_THAI_SLOT_LABEL[slot.trang_thai]}</Badge>
      {diemDanhProps && <DiemDanhSlot {...diemDanhProps} />}
      {coTheHuy && slot.nguoi && <NutHuyPhanCong slotId={slot.id} ten={slot.nguoi.ho_ten} />}
    </li>
  );
}

// Danh sách Bài dạng accordion (mục 8.8). Mỗi Bài liệt kê từng slot kèm TÊN người đảm nhiệm để không hiểu nhầm
// "số slot = số người" (mục 4.2). Đăng ký/duyệt/mời nằm lồng ngay trong từng Bài (mục 8.8, Đăng ký giảng dạy).
export function BaiList({
  lopId,
  ngayBatDau,
  bai,
  coTheSua,
  lopTrangThai,
  khongKinhPhi = false,
  viewer,
  dangKy,
  diemDanh,
  baiCheckIn,
}: {
  lopId: string;
  ngayBatDau: string;
  bai: BaiHoc[];
  // Người quản trị và lớp còn sửa được (Dự kiến / Đang mở)
  coTheSua: boolean;
  lopTrangThai?: TrangThaiLop;
  // Lớp không kinh phí: gợi ý xếp theo A4 thay vì khối lượng giờ (mục 4.3)
  khongKinhPhi?: boolean;
  viewer?: NguoiXem;
  dangKy?: DangKyLop;
  // Điểm danh B1 của các Bài trong lớp (khóa `${bai_id}:${user_id}`) và các Bài của người xem đang trong khung check-in
  diemDanh?: Map<string, DiemDanh>;
  baiCheckIn?: Set<string>;
}) {
  const khaNang = new Map((dangKy?.kha_nang ?? []).map((k) => [k.bai_id, k]));
  // Đăng ký chủ động chỉ khi lớp đã mở đăng ký và người xem đã có vai trò (Giảng viên/Trợ giảng)
  const choDangKy = lopTrangThai === "dang_mo" && !!viewer?.vaiTro;
  const hienGoiY = !!dangKy && (lopTrangThai === "dang_mo" || lopTrangThai === "nhap");
  const baiTen = Object.fromEntries(bai.map((b) => [b.id, b.ten]));

  const danhSach = (
    <ul className="divide-y border-t">
      {bai.map((b, i) => {
        const gv = demVaiTro(b.slots, "giang_vien");
        const tg = demVaiTro(b.slots, "tro_giang");
        const kn = khaNang.get(b.id);
        const khoa = !!kn && (!!kn.ly_do || kn.da_dang_ky);
        return (
          <li key={b.id} className="flex items-start">
            {choDangKy && (
              <label className="flex shrink-0 cursor-pointer pt-6 pl-3 sm:pl-5 has-disabled:cursor-not-allowed">
                <input
                  type="checkbox"
                  name="bai_id"
                  value={b.id}
                  disabled={khoa || !kn}
                  aria-label={`Chọn đăng ký ${b.ten}`}
                  className="size-5 accent-primary disabled:opacity-40"
                />
              </label>
            )}
            <details className="group min-w-0 flex-1" open={bai.length <= 3}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-4 outline-none sm:px-5 marker:hidden hover:bg-background focus-visible:bg-background [&::-webkit-details-marker]:hidden">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grad-blue text-sm font-semibold text-hue-blue-on">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.ten}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {fmtDate(b.bat_dau)} · {fmtTime(b.bat_dau)}–{fmtTime(b.ket_thuc)}
                  </span>
                  {choDangKy && kn?.ly_do && !kn.da_dang_ky && (
                    <span className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      Không đăng ký được: {kn.ly_do}
                    </span>
                  )}
                </span>
                <span className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
                  {choDangKy && kn?.da_dang_ky && (
                    <Badge variant={b.slots.some((x) => x.nguoi?.id === viewer?.id) ? "success" : "warning"}>
                      {b.slots.some((x) => x.nguoi?.id === viewer?.id) ? "Đã phân công" : "Đã đăng ký"}
                    </Badge>
                  )}
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

              <div className="grid grid-cols-1 gap-4 px-3 pb-5 sm:px-5">
                {(["giang_vien", "tro_giang"] as const).map((vai) => {
                  const slots = b.slots.filter((s) => s.vai_tro === vai);
                  if (slots.length === 0) return null;
                  const conTrong = slots.some((s) => !s.nguoi);
                  return (
                    <div key={vai} className="grid grid-cols-1 gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{VAI_TRO_LABEL[vai]}</p>
                        <ul className="divide-y rounded-xl border px-3">
                          {slots.map((s) => (
                            <SlotRow
                              key={s.id}
                              slot={s}
                              coTheHuy={coTheSua}
                              diemDanhProps={
                                lopTrangThai === "da_huy" || lopTrangThai === "nhap"
                                  ? undefined
                                  : {
                                      baiId: b.id,
                                      slot: s,
                                      diemDanh: s.nguoi ? diemDanh?.get(`${b.id}:${s.nguoi.id}`) : undefined,
                                      daBat: daBatDau(b.bat_dau),
                                      choCheckIn: !!baiCheckIn?.has(b.id),
                                      isQuanTri: !!viewer?.isQuanTri,
                                      viewerId: viewer?.id,
                                    }
                              }
                            />
                          ))}
                        </ul>
                      </div>
                      {hienGoiY && conTrong && dangKy && viewer && (
                        <GoiYBai
                          baiId={b.id}
                          vaiTro={vai}
                          ungVien={dangKy.goi_y.filter((u) => u.bai_id === b.id && u.vai_tro === vai)}
                          choXuLy={dangKy.dang_ky_cho.filter((d) => d.bai_id === b.id && d.vai_tro === vai)}
                          isQuanTri={viewer.isQuanTri}
                          viewerId={viewer.id}
                          nguongPool={dangKy.nguong_pool}
                          khongKinhPhi={khongKinhPhi}
                        />
                      )}
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
  );

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
      ) : choDangKy ? (
        <DangKyForm baiTen={baiTen}>{danhSach}</DangKyForm>
      ) : (
        danhSach
      )}
    </Card>
  );
}
