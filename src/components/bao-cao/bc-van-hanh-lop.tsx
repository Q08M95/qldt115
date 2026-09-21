import Link from "next/link";
import { BookOpen, CircleDot, Layers, School } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import {
  DOI_TUONG_LABEL,
  LOAI_KINH_PHI_LABEL,
  TRANG_THAI_LOP_LABEL,
  TRANG_THAI_LOP_OPTIONS,
  TRANG_THAI_LOP_VARIANT,
} from "@/lib/lop-hoc/labels";
import { phanTram, tongHopLop } from "@/lib/bao-cao/tinh-toan";
import type { DongLop } from "@/lib/bao-cao/types";
import type { TrangThaiLopHienThi } from "@/types/database";
import {
  ChuThichDonut,
  Donut,
  ThanhMini,
  ThanhNgang,
  type MauBieuDo,
} from "./bieu-do";

const MAU_TRANG_THAI: Record<TrangThaiLopHienThi, MauBieuDo> = {
  nhap: "neutral",
  dang_mo: "blue",
  da_du_dang_ky: "green",
  dang_dien_ra: "teal",
  da_hoan_thanh: "navy",
  da_huy: "danger",
};

const pt = (v: number | null) =>
  v === null
    ? "–"
    : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}%`;

// Báo cáo #8 — Vận hành lớp học (mục 4.7): lớp có thời gian giao với khoảng đã chọn, phân theo trạng thái, nhóm lớp và loại kinh phí.
export function BaoCaoVanHanhLop({ rows }: { rows: DongLop[] }) {
  const t = tongHopLop(rows);
  const lat = TRANG_THAI_LOP_OPTIONS.map(([khoa, nhan]) => ({
    khoa,
    nhan,
    so: t.theoTrangThai.find((x) => x.khoa === khoa)?.so ?? 0,
    mau: MAU_TRANG_THAI[khoa],
  })).filter((l) => l.so > 0);
  const dangHoatDong = rows.filter((r) =>
    ["dang_mo", "da_du_dang_ky", "dang_dien_ra"].includes(
      r.trang_thai_hien_thi,
    ),
  ).length;

  return (
    <DashboardLayout
      main={
        <>
          <StatRow>
            <StatTile icon={School} label="Số lớp" value={t.tong} />
            <StatTile
              icon={CircleDot}
              label="Đang hoạt động"
              value={dangHoatDong}
            />
            <StatTile
              icon={Layers}
              label="Lấp đầy slot"
              value={pt(phanTram(t.slotDaPhanCong, t.slotTong))}
            />
          </StatRow>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Danh sách lớp <Badge variant="teal">{t.tong}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Không có lớp nào diễn ra trong khoảng thời gian này"
                />
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
                  <p className="px-2 pb-1 text-xs text-muted-foreground">
                    Thanh: số slot đã phân công / tổng slot của lớp
                  </p>
                  <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
                    {rows.map((r) => (
                      <li key={r.id} className="min-w-0">
                        <Link
                          href={`/lop-hoc/${r.id}`}
                          className="flex flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-background sm:flex-row sm:items-center sm:gap-3"
                        >
                          <div className="min-w-0 sm:w-[38%] sm:shrink-0">
                            <p
                              className="truncate text-sm font-medium"
                              title={r.ten}
                            >
                              {r.ten}
                            </p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {r.nhom_lop_ten} ·{" "}
                              {LOAI_KINH_PHI_LABEL[r.loai_kinh_phi]} ·{" "}
                              {DOI_TUONG_LABEL[r.doi_tuong]}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-1 sm:w-44 sm:shrink-0">
                            <Badge
                              variant={
                                TRANG_THAI_LOP_VARIANT[r.trang_thai_hien_thi]
                              }
                            >
                              {TRANG_THAI_LOP_LABEL[r.trang_thai_hien_thi]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {fmtDate(r.ngay_bat_dau)} –{" "}
                              {fmtDate(r.ngay_ket_thuc)}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <ThanhMini
                              v={phanTram(r.slot_da_phan_cong, r.slot_tong)}
                              className="h-3 min-w-10 flex-1"
                            />
                            <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">
                              {r.slot_da_phan_cong}/{r.slot_tong}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      }
      aside={
        <>
          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Lớp theo trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              {lat.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Chưa có lớp nào.
                </p>
              ) : (
                <div className="@container">
                  <div className="grid items-center gap-4 @[22rem]:grid-cols-[auto_1fr]">
                    <Donut
                      lat={lat}
                      giua={String(t.tong)}
                      phu="lớp"
                      className="mx-auto size-32"
                    />
                    <ChuThichDonut lat={lat} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Lớp theo nhóm lớp</CardTitle>
            </CardHeader>
            <CardContent>
              {t.theoNhomLop.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có lớp nào.
                </p>
              ) : (
                <ThanhNgang
                  dong={t.theoNhomLop.map((n) => ({
                    khoa: n.nhan,
                    nhan: n.nhan,
                    gia_tri: n.so,
                    hien_thi: `${n.so} lớp`,
                  }))}
                  toiDa={Math.max(...t.theoNhomLop.map((n) => n.so), 1)}
                />
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 px-0">
            <CardHeader>
              <CardTitle>Loại kinh phí · đối tượng</CardTitle>
            </CardHeader>
            <CardContent>
              <ThanhNgang
                dong={[
                  {
                    khoa: "co",
                    nhan: LOAI_KINH_PHI_LABEL.co_kinh_phi,
                    gia_tri: t.kinhPhi.co,
                    hien_thi: `${t.kinhPhi.co} lớp`,
                  },
                  {
                    khoa: "khong",
                    nhan: LOAI_KINH_PHI_LABEL.khong_kinh_phi,
                    gia_tri: t.kinhPhi.khong,
                    hien_thi: `${t.kinhPhi.khong} lớp`,
                  },
                  {
                    khoa: "yte",
                    nhan: DOI_TUONG_LABEL.nhan_vien_y_te,
                    gia_tri: t.doiTuong.yTe,
                    hien_thi: `${t.doiTuong.yTe} lớp`,
                  },
                  {
                    khoa: "cd",
                    nhan: DOI_TUONG_LABEL.cong_dong,
                    gia_tri: t.doiTuong.congDong,
                    hien_thi: `${t.doiTuong.congDong} lớp`,
                  },
                ]}
                toiDa={Math.max(
                  t.kinhPhi.co,
                  t.kinhPhi.khong,
                  t.doiTuong.yTe,
                  t.doiTuong.congDong,
                  1,
                )}
              />
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
