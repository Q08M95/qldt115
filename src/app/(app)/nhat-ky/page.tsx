import { NhatKyFilters } from "@/components/nhat-ky/nhat-ky-filters";
import { NhatKyList } from "@/components/nhat-ky/nhat-ky-list";
import { PhanTrang } from "@/components/nhat-ky/phan-trang";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getNhatKy, SO_DONG_NHAT_KY, TOI_DA_XUAT_NHAT_KY } from "@/lib/nhat-ky/queries";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Nhật ký hệ thống (mục 4.6): người giữ Quyền Quản lý lớp xem toàn bộ; GV/TG chỉ xem dòng liên quan trực tiếp đến mình (RLS ở database).
export default async function NhatKyPage(props: PageProps<"/nhat-ky">) {
  const sp = await props.searchParams;
  const loc = {
    q: first(sp.q).trim(),
    loai: first(sp.loai),
    tu: first(sp.tu),
    den: first(sp.den),
    trang: Math.max(1, Number.parseInt(first(sp.trang), 10) || 1),
  };
  const [{ isQuanTri }, { rows, tong }] = await Promise.all([requireSession(), getNhatKy(loc)]);
  const tongTrang = Math.max(1, Math.ceil(tong / SO_DONG_NHAT_KY));

  const boLoc = () => {
    const p = new URLSearchParams();
    if (loc.q) p.set("q", loc.q);
    if (loc.loai) p.set("loai", loc.loai);
    if (loc.tu) p.set("tu", loc.tu);
    if (loc.den) p.set("den", loc.den);
    return p;
  };
  const hrefTrang = (t: number) => {
    const p = boLoc();
    if (t > 1) p.set("trang", String(t));
    const s = p.toString();
    return s ? `/nhat-ky?${s}` : "/nhat-ky";
  };
  const hrefXuat = `/nhat-ky/xuat?${boLoc().toString()}`;

  return (
    <Card className="gap-4 px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Nhật ký hệ thống <Badge variant="teal">{tong}</Badge>
        </CardTitle>
        {/* Xuất Excel theo đúng bộ lọc đang xem — chỉ người quản trị (mục 4.7) */}
        {isQuanTri && (
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <a href={hrefXuat} download title={tong > TOI_DA_XUAT_NHAT_KY ? `Chỉ xuất được ${TOI_DA_XUAT_NHAT_KY} dòng mới nhất, hãy thu hẹp khoảng ngày` : undefined}>
                <Download /> Xuất Excel
              </a>
            </Button>
          </CardAction>
        )}
        {!isQuanTri && <p className="text-sm text-muted-foreground">Bạn chỉ xem được các dòng liên quan trực tiếp đến mình (ai duyệt, sửa gì, khi nào).</p>}
      </CardHeader>
      <NhatKyFilters values={{ q: loc.q, loai: loc.loai, tu: loc.tu, den: loc.den }} />
      <NhatKyList rows={rows} />
      <PhanTrang trang={loc.trang} tongTrang={tongTrang} hrefTrang={hrefTrang} />
    </Card>
  );
}
