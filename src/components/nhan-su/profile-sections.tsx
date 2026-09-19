import { Award, BookOpen, Gauge, History, Mail, Phone } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChungChiDrawer } from "@/components/nhan-su/chung-chi-drawer";
import { EditProfileDrawer } from "@/components/nhan-su/edit-profile-drawer";
import { QuanTriDrawer } from "@/components/nhan-su/quan-tri-drawer";
import { XoaChungChiButton } from "@/components/nhan-su/xoa-chung-chi-button";
import { fmtDate } from "@/lib/format";
import {
  NHOM_LABEL,
  TRANG_THAI_LABEL,
  TRANG_THAI_VARIANT,
  VAI_TRO_LABEL,
} from "@/lib/nhan-su/labels";
import type {
  ChungChi,
  ChuyenMonCuaNguoi,
  DanhMuc,
  LichSuDoiNhom,
  NhomNhanSu,
  Profile,
} from "@/types/database";

// ---------- Thông tin cá nhân ----------
export function ProfileInfoCard({
  profile,
  nhom,
  chuyenMon,
  danhMucChuyenMon,
  canEdit,
  isQuanTri,
  laAdmin,
}: {
  profile: Profile;
  // null với GV/TG (ẩn nhãn nhóm) hoặc chưa xếp nhóm
  nhom: NhomNhanSu | null;
  chuyenMon: ChuyenMonCuaNguoi[];
  danhMucChuyenMon: DanhMuc[];
  canEdit: boolean;
  isQuanTri: boolean;
  laAdmin: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <UserAvatar name={profile.ho_ten} src={profile.avatar_url} className="size-16 text-2xl" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{profile.ho_ten}</h2>
            <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.vai_tro_giang_day && <Badge variant="blue">{VAI_TRO_LABEL[profile.vai_tro_giang_day]}</Badge>}
          <Badge variant={TRANG_THAI_VARIANT[profile.trang_thai_tham_gia]}>
            {TRANG_THAI_LABEL[profile.trang_thai_tham_gia]}
          </Badge>
          {profile.phan_quyen === "admin" && <Badge variant="navy">Admin</Badge>}
          {profile.co_quyen_quan_ly_lop && <Badge variant="teal">Quyền Quản lý lớp</Badge>}
          {/* Nhãn nhóm chỉ hiển thị cho Admin/Quản lý lớp (mục 3, 4.7) */}
          {isQuanTri && nhom && <Badge variant="outline">{NHOM_LABEL[nhom]}</Badge>}
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Email</dt>
            <dd className="truncate">{profile.email}</dd>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Số điện thoại</dt>
            <dd>{profile.so_dien_thoai || <span className="text-muted-foreground">Chưa cập nhật</span>}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">Kinh nghiệm</dt>
            <dd className="whitespace-pre-line">
              {profile.kinh_nghiem || <span className="text-muted-foreground">Chưa cập nhật</span>}
            </dd>
          </div>
        </dl>

        {(canEdit || isQuanTri) && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <EditProfileDrawer profile={profile} chuyenMon={chuyenMon} danhMucChuyenMon={danhMucChuyenMon} />
            )}
            {isQuanTri && <QuanTriDrawer profile={profile} nhom={nhom} laAdmin={laAdmin} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Chuyên môn ----------
export function ChuyenMonCard({ chuyenMon }: { chuyenMon: ChuyenMonCuaNguoi[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Chuyên môn
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chuyenMon.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa cập nhật chuyên môn.</p>
        ) : (
          <ul className="grid gap-2.5">
            {chuyenMon.map((c) => (
              <li key={c.chuyen_mon_id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="navy">{c.ten}</Badge>
                {c.chi_tiet && <span className="text-muted-foreground">{c.chi_tiet}</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Chứng chỉ ----------
export function ChungChiCard({
  userId,
  chungChi,
  loai,
  canEdit,
}: {
  userId: string;
  chungChi: ChungChi[];
  loai: DanhMuc[];
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Chứng chỉ
          <Badge variant="teal">{chungChi.length}</Badge>
        </CardTitle>
        {canEdit && (
          <CardAction>
            <ChungChiDrawer userId={userId} loai={loai} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {chungChi.length === 0 ? (
          <EmptyState icon={Award} title="Chưa có chứng chỉ nào." />
        ) : (
          <ul className="divide-y">
            {chungChi.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {c.hinh_anh_url ? (
                  <a href={c.hinh_anh_url} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Xem ảnh minh chứng">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.hinh_anh_url} alt="" className="size-14 rounded-lg border object-cover" />
                  </a>
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-grad-blue text-hue-blue-on">
                    <Award className="size-6" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {c.loai_ten}
                    {c.so_chung_chi && <span className="font-normal text-muted-foreground"> · Số {c.so_chung_chi}</span>}
                  </p>
                  {c.noi_dung && <p className="mt-0.5 whitespace-pre-line">{c.noi_dung}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[c.ngay_cap && `Cấp ngày ${fmtDate(c.ngay_cap)}`, c.noi_cap && `Nơi cấp: ${c.noi_cap}`]
                      .filter(Boolean)
                      .join(" · ") || "Chưa có ngày/nơi cấp"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0">
                    <ChungChiDrawer userId={userId} loai={loai} chungChi={c} />
                    <XoaChungChiButton id={c.id} ten={c.loai_ten} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Cột phải: KPI + lịch sử (khung — nội dung đổ dần ở các giai đoạn sau) ----------
export function KpiPlaceholderCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Bảng KPI cá nhân
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState icon={Gauge} title="Chưa có dữ liệu KPI. Điểm và biểu đồ theo kỳ đánh giá sẽ hiển thị tại đây." />
      </CardContent>
    </Card>
  );
}

export function LichSuGiangDayCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lịch sử giảng dạy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState icon={History} title="Chưa có lớp nào đã dạy." />
      </CardContent>
    </Card>
  );
}

// Chứa nhãn nhóm nên chỉ hiển thị cho Admin/Quản lý lớp (trang cha kiểm tra; RLS chặn thêm ở database)
export function LichSuDoiNhomCard({ lichSu }: { lichSu: LichSuDoiNhom[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5 text-slate-500" strokeWidth={1.75} aria-hidden /> Lịch sử thay đổi nhóm
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lichSu.length === 0 ? (
          <EmptyState icon={History} title="Chưa có thay đổi nhóm nào." />
        ) : (
          <ol className="grid gap-3">
            {lichSu.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDate(l.ngay_hieu_luc)}</span>
                {l.nhom_cu ? <Badge variant="outline">{NHOM_LABEL[l.nhom_cu]}</Badge> : <span className="text-muted-foreground">Chưa có nhóm</span>}
                <span aria-hidden>→</span>
                <Badge variant="navy">{NHOM_LABEL[l.nhom_moi]}</Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
