import { BaoCaoA4 } from "@/components/bao-cao/bc-a4";
import { BaoCaoDeXuat } from "@/components/bao-cao/bc-de-xuat";
import { BaoCaoKpiTongHop } from "@/components/bao-cao/bc-kpi-tong-hop";
import { BaoCaoSanLuong } from "@/components/bao-cao/bc-san-luong";
import { BaoCaoTyLe } from "@/components/bao-cao/bc-ty-le-dang-ky";
import { BaoCaoVanHanhDangKy } from "@/components/bao-cao/bc-van-hanh-dang-ky";
import { BaoCaoVanHanhLop } from "@/components/bao-cao/bc-van-hanh-lop";
import { BaoCaoXuHuongKpi } from "@/components/bao-cao/bc-xu-huong-kpi";
import { BoLocKy } from "@/components/bao-cao/chon-ky";
import { TabBaoCao, ThanhDieuKhien } from "@/components/bao-cao/thanh-dieu-khien";
import { requireSession } from "@/lib/auth/session";
import { laKhung, tinhKhoang } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import { getA4, getCanhBaoPool, getDeXuatThongKe, getKpiTheoKy, getKpiTongHop, getLopTrongKhoang, getNguongPool, getSanLuong, getTyLeDangKy, getVanHanhDangKy } from "@/lib/bao-cao/queries";
import { laLocVaiTro } from "@/lib/bao-cao/tinh-toan";
import { BAO_CAO, laKhoaBaoCao, nhomCuaBaoCao } from "@/lib/bao-cao/url";
import { getKyList } from "@/lib/kpi/queries";
import { EmptyState } from "@/components/empty-state";
import { Info } from "lucide-react";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Báo cáo (mục 4.7) — 8 báo cáo, 2 nhóm điều khiển: "thoi_gian" (#3,4,5,8, lọc tuần/tháng/quý/năm) và "ky" (#1,6,7, chọn 1
// kỳ đánh giá); #2 không lọc (luôn hiện nhiều kỳ). Công khai cho mọi người đăng nhập ở dạng tổng hợp toàn đơn vị, không
// có nhãn nhóm (trừ báo cáo #1 chỉ Admin/Quản lý lớp mới thấy cột nhóm — do chính hàm SQL tự ẩn/hiện).
export default async function BaoCaoPage(props: PageProps<"/bao-cao">) {
  const sp = await props.searchParams;
  const { isQuanTri } = await requireSession();

  const bc = laKhoaBaoCao(first(sp.bc)) ? (first(sp.bc) as (typeof BAO_CAO)[number]["khoa"]) : "kpi-tong-hop";
  const nhom = nhomCuaBaoCao(bc);

  if (nhom === "khong_loc") {
    return (
      <div className="grid gap-5">
        <TabBaoCao active={bc} />
        <BaoCaoXuHuongKpi ky={await getKpiTheoKy(8)} />
      </div>
    );
  }

  if (nhom === "ky") {
    const list = await getKyList();
    const dieu = chonKy(list, first(sp.ky));
    if (!dieu) {
      return (
        <div className="grid gap-5">
          <TabBaoCao active={bc} />
          <EmptyState icon={Info} title="Chưa có kỳ đánh giá nào — tạo kỳ ở Cấu hình hệ thống > Kỳ đánh giá trước." />
        </div>
      );
    }
    const { hienTai, truoc, sau } = dieu;
    let noiDung: React.ReactNode;
    if (bc === "kpi-tong-hop") noiDung = <BaoCaoKpiTongHop ky={hienTai} rows={await getKpiTongHop(hienTai.id)} isQuanTri={isQuanTri} />;
    else if (bc === "a4") noiDung = <BaoCaoA4 ky={hienTai} rows={await getA4(hienTai.id)} isQuanTri={isQuanTri} />;
    else noiDung = <BaoCaoDeXuat ky={hienTai} data={await getDeXuatThongKe(hienTai.id)} isQuanTri={isQuanTri} />;

    return (
      <div className="grid gap-5">
        <BoLocKy bc={bc} list={list} hienTai={hienTai} truoc={truoc} sau={sau} />
        {noiDung}
      </div>
    );
  }

  // nhom === "thoi_gian"
  const kt = laKhung(first(sp.kt)) ? (first(sp.kt) as "tuan" | "thang" | "quy" | "nam") : "thang";
  const khoang = tinhKhoang(kt, first(sp.moc));
  const vt = laLocVaiTro(first(sp.vt)) ? first(sp.vt) : "tat-ca";
  const loc = vt as "tat-ca" | "giang_vien" | "tro_giang";

  let noiDung: React.ReactNode;
  if (bc === "san-luong") {
    const [rows, rowsTruoc] = await Promise.all([getSanLuong(khoang.tu, khoang.den), getSanLuong(khoang.tuTruoc, khoang.denTruoc)]);
    noiDung = <BaoCaoSanLuong rows={rows} rowsTruoc={rowsTruoc} loc={loc} khoang={khoang} bc={bc} isQuanTri={isQuanTri} />;
  } else if (bc === "ty-le-dang-ky") {
    const [rows, rowsTruoc] = await Promise.all([getTyLeDangKy(khoang.tu, khoang.den), getTyLeDangKy(khoang.tuTruoc, khoang.denTruoc)]);
    noiDung = <BaoCaoTyLe rows={rows} rowsTruoc={rowsTruoc} loc={loc} khoang={khoang} bc={bc} />;
  } else if (bc === "van-hanh-dang-ky") {
    const [hienTaiVH, truocVH, canhBao, nguong] = await Promise.all([
      getVanHanhDangKy(khoang.tu, khoang.den),
      getVanHanhDangKy(khoang.tuTruoc, khoang.denTruoc),
      getCanhBaoPool(),
      getNguongPool(),
    ]);
    noiDung = <BaoCaoVanHanhDangKy hienTai={hienTaiVH} truoc={truocVH} canhBao={canhBao} nguongPool={nguong} />;
  } else {
    noiDung = <BaoCaoVanHanhLop rows={await getLopTrongKhoang(khoang.tu, khoang.den)} />;
  }

  return (
    <div className="grid gap-5">
      <ThanhDieuKhien bc={bc} khoang={khoang} vt={loc === "tat-ca" ? undefined : loc} />
      {noiDung}
    </div>
  );
}
