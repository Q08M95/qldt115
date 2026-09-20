import { Award, CalendarDays, MapPin, ShieldCheck, Users } from "lucide-react";
import { BaiList, type NguoiXem } from "@/components/lop-hoc/bai-list";
import { KetQuaCard } from "@/components/lop-hoc/ket-qua-card";
import { TienDoLop } from "@/components/lop-hoc/tien-do-vai-tro";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DangKyLop } from "@/lib/dang-ky/queries";
import { fmtDate } from "@/lib/format";
import {
  DOI_TUONG_LABEL,
  LOAI_KINH_PHI_LABEL,
  TRANG_THAI_LOP_LABEL,
  TRANG_THAI_LOP_VARIANT,
} from "@/lib/lop-hoc/labels";
import type { LopChiTiet } from "@/lib/lop-hoc/queries";
import type { DiemDanh } from "@/types/database";
import { NHOM_LABEL } from "@/lib/nhan-su/labels";

function Fact({ icon: Icon, nhan, children }: { icon?: typeof Users; nhan: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {nhan}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

// Trang chi tiết lớp (mục 4.2, 8.8): thông tin + progress bar đầy đủ ở đầu trang, bên dưới là các Bài kèm nhân sự đảm nhiệm
export function LopChiTietView({
  data,
  isQuanTri,
  headerActions,
  viewer,
  dangKy,
  diemDanh,
  baiCheckIn,
}: {
  data: LopChiTiet;
  isQuanTri: boolean;
  // Người đang xem + dữ liệu đăng ký/gợi ý (Giai đoạn 5); bỏ trống thì chỉ xem thông tin lớp
  viewer?: NguoiXem;
  dangKy?: DangKyLop;
  // Điểm danh B1 các Bài trong lớp + các Bài của người xem đang trong khung check-in (Giai đoạn 7)
  diemDanh?: Map<string, DiemDanh>;
  baiCheckIn?: Set<string>;
  // Nút sửa lớp / chuyển trạng thái (chỉ truyền cho người quản trị)
  headerActions?: React.ReactNode;
}) {
  const { lop, bai, nhom_du_dieu_kien, chung_chi_yeu_cau, khao_sat } = data;
  const coTheSua = isQuanTri && (lop.trang_thai === "nhap" || lop.trang_thai === "dang_mo");

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{lop.nhom_lop_ten}</Badge>
              <Badge variant={TRANG_THAI_LOP_VARIANT[lop.trang_thai_hien_thi]}>{TRANG_THAI_LOP_LABEL[lop.trang_thai_hien_thi]}</Badge>
              {lop.trang_thai === "nhap" && lop.cong_khai_som && <Badge variant="outline">Công khai sớm</Badge>}
            </div>
            <h2 className="text-2xl leading-tight font-semibold">{lop.ten}</h2>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <Fact icon={CalendarDays} nhan="Thời gian">
              <span className="tabular-nums">
                {fmtDate(lop.ngay_bat_dau)}
                {lop.ngay_ket_thuc !== lop.ngay_bat_dau && ` – ${fmtDate(lop.ngay_ket_thuc)}`}
              </span>
            </Fact>
            <Fact icon={MapPin} nhan="Địa điểm">
              {lop.dia_diem || <span className="font-normal text-muted-foreground">Chưa cập nhật</span>}
            </Fact>
            <Fact icon={Users} nhan="Đối tượng">
              {DOI_TUONG_LABEL[lop.doi_tuong]}
            </Fact>
            <Fact nhan="Loại kinh phí">{LOAI_KINH_PHI_LABEL[lop.loai_kinh_phi]}</Fact>
          </dl>

          {headerActions && <div className="flex flex-wrap gap-2 border-t pt-5">{headerActions}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiến độ phân công</CardTitle>
        </CardHeader>
        <CardContent>
          {lop.gv_tong + lop.tg_tong === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có Bài nào nên chưa có slot nhân sự.</p>
          ) : (
            <TienDoLop lop={lop} className="sm:grid-cols-2 sm:gap-x-10" />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BaiList
          lopId={lop.id}
          ngayBatDau={lop.ngay_bat_dau}
          bai={bai}
          coTheSua={coTheSua}
          lopTrangThai={lop.trang_thai}
          khongKinhPhi={lop.loai_kinh_phi === "khong_kinh_phi"}
          viewer={viewer}
          dangKy={dangKy}
          diemDanh={diemDanh}
          baiCheckIn={baiCheckIn}
        />

        <div className="flex min-w-0 flex-col gap-5">
          {(isQuanTri || chung_chi_yeu_cau.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Điều kiện đăng ký
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                {/* Nhãn nhóm chỉ Admin/Quản lý lớp thấy (mục 4.7); với GV/TG RLS trả rỗng và không render */}
                {isQuanTri && (
                  <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Nhóm đủ điều kiện</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nhom_du_dieu_kien.map((n) => (
                        <Badge key={n} variant="outline">
                          {NHOM_LABEL[n]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Award className="size-3.5" aria-hidden /> Chứng chỉ yêu cầu thêm
                  </p>
                  {chung_chi_yeu_cau.length === 0 ? (
                    <p className="text-muted-foreground">Không yêu cầu.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {chung_chi_yeu_cau.map((c) => (
                        <Badge key={c.id} variant="navy">
                          {c.ten}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <KetQuaCard lop={lop} khaoSat={khao_sat} isQuanTri={isQuanTri} />
        </div>
      </div>
    </div>
  );
}
