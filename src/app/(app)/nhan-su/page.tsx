import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { NhanSuFilters } from "@/components/nhan-su/nhan-su-filters";
import { NhapCsvDrawer } from "@/components/nhan-su/nhap-csv-drawer";
import { ThemNhanSuDrawer } from "@/components/nhan-su/tai-khoan-drawers";
import { NhanSuList } from "@/components/nhan-su/nhan-su-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { boDau } from "@/lib/nhan-su/labels";
import { countDeXuatChoDuyet, getDanhMuc, getNhanSuList } from "@/lib/nhan-su/queries";

// Nhập CSV tạo tối đa 200 tài khoản trong 1 lần gọi — cần thời gian chạy dài hơn mặc định
export const maxDuration = 60;

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function NhanSuPage(props: PageProps<"/nhan-su">) {
  const sp = await props.searchParams;

  // Xác thực và đọc dữ liệu chạy SONG SONG (dữ liệu không phụ thuộc kết quả xác thực; RLS vẫn lọc theo người dùng).
  const [{ isQuanTri, isAdmin }, all, chuyenMon, choDuyetTho] = await Promise.all([
    requireSession(),
    getNhanSuList(),
    getDanhMuc("danh_muc_chuyen_mon"),
    countDeXuatChoDuyet(), // RLS trả 0 với GV/TG
  ]);

  const values = {
    q: first(sp.q).trim(),
    trang_thai: first(sp.trang_thai),
    vai_tro: first(sp.vai_tro),
    chuyen_mon: first(sp.chuyen_mon),
    // Ô lọc nhóm chỉ dành cho Admin/Quản lý lớp; với GV/TG bỏ qua giá trị này dù có ai gõ vào URL
    nhom: isQuanTri ? first(sp.nhom) : "",
  };

  const choDuyet = isQuanTri ? choDuyetTho : 0;

  const q = boDau(values.q);
  const rows = all.filter((r) => {
    if (q && !boDau(r.ho_ten).includes(q) && !boDau(r.email).includes(q)) return false;
    if (values.trang_thai && r.trang_thai_tham_gia !== values.trang_thai) return false;
    if (values.vai_tro && r.vai_tro_giang_day !== values.vai_tro) return false;
    if (values.chuyen_mon && !r.chuyen_mon.some((c) => c.id === values.chuyen_mon)) return false;
    if (values.nhom && r.nhom !== values.nhom) return false;
    return true;
  });

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Danh sách nhân sự <Badge variant="teal">{rows.length}</Badge>
        </CardTitle>
        {isQuanTri && (
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <Link href="/nhan-su/de-xuat">
                <Lightbulb /> Đề xuất nhân sự
                {choDuyet > 0 && <Badge variant="warning">{choDuyet}</Badge>}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      {/* Thêm tài khoản cần service_role nên chỉ Admin gốc thấy các nút này */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 px-5">
          <ThemNhanSuDrawer />
          <NhapCsvDrawer />
        </div>
      )}
      <NhanSuFilters
        values={values}
        chuyenMon={chuyenMon.filter((c) => c.dang_dung).map((c) => ({ id: c.id, ten: c.ten }))}
        isQuanTri={isQuanTri}
      />
      <NhanSuList rows={rows} isQuanTri={isQuanTri} />
    </Card>
  );
}
