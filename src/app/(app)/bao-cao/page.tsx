import { BaoCaoSanLuong } from "@/components/bao-cao/bc-san-luong";
import { BaoCaoTyLe } from "@/components/bao-cao/bc-ty-le-dang-ky";
import { BaoCaoVanHanhDangKy } from "@/components/bao-cao/bc-van-hanh-dang-ky";
import { BaoCaoVanHanhLop } from "@/components/bao-cao/bc-van-hanh-lop";
import { ThanhDieuKhien } from "@/components/bao-cao/thanh-dieu-khien";
import { requireSession } from "@/lib/auth/session";
import { laKhung, tinhKhoang } from "@/lib/bao-cao/khoang";
import { getCanhBaoPool, getLopTrongKhoang, getNguongPool, getSanLuong, getTyLeDangKy, getVanHanhDangKy } from "@/lib/bao-cao/queries";
import { laLocVaiTro } from "@/lib/bao-cao/tinh-toan";
import { BAO_CAO, laKhoaBaoCao } from "@/lib/bao-cao/url";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Báo cáo (mục 4.7) — lượt 1: #3 sản lượng, #4 A2/A3, #5 vận hành đăng ký, #8 vận hành lớp học, lọc tuần/tháng/quý/năm.
// Công khai cho mọi người đăng nhập ở dạng tổng hợp toàn đơn vị; không có nhãn nhóm ở bất kỳ báo cáo nào.
export default async function BaoCaoPage(props: PageProps<"/bao-cao">) {
  const sp = await props.searchParams;
  await requireSession();

  const bc = laKhoaBaoCao(first(sp.bc)) ? (first(sp.bc) as (typeof BAO_CAO)[number]["khoa"]) : "san-luong";
  const kt = laKhung(first(sp.kt)) ? (first(sp.kt) as "tuan" | "thang" | "quy" | "nam") : "thang";
  const khoang = tinhKhoang(kt, first(sp.moc));
  const vt = laLocVaiTro(first(sp.vt)) ? first(sp.vt) : "tat-ca";
  const loc = vt as "tat-ca" | "giang_vien" | "tro_giang";

  let noiDung: React.ReactNode;
  if (bc === "san-luong") {
    const [rows, rowsTruoc] = await Promise.all([getSanLuong(khoang.tu, khoang.den), getSanLuong(khoang.tuTruoc, khoang.denTruoc)]);
    noiDung = <BaoCaoSanLuong rows={rows} rowsTruoc={rowsTruoc} loc={loc} khoang={khoang} bc={bc} />;
  } else if (bc === "ty-le-dang-ky") {
    const [rows, rowsTruoc] = await Promise.all([getTyLeDangKy(khoang.tu, khoang.den), getTyLeDangKy(khoang.tuTruoc, khoang.denTruoc)]);
    noiDung = <BaoCaoTyLe rows={rows} rowsTruoc={rowsTruoc} loc={loc} khoang={khoang} bc={bc} />;
  } else if (bc === "van-hanh-dang-ky") {
    const [hienTai, truoc, canhBao, nguong] = await Promise.all([
      getVanHanhDangKy(khoang.tu, khoang.den),
      getVanHanhDangKy(khoang.tuTruoc, khoang.denTruoc),
      getCanhBaoPool(),
      getNguongPool(),
    ]);
    noiDung = <BaoCaoVanHanhDangKy hienTai={hienTai} truoc={truoc} canhBao={canhBao} nguongPool={nguong} />;
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
