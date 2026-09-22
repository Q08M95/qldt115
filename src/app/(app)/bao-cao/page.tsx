import { Info } from "lucide-react";
import { BaoCaoA4 } from "@/components/bao-cao/bc-a4";
import { BaoCaoDeXuat } from "@/components/bao-cao/bc-de-xuat";
import { BaoCaoKpiTongHop } from "@/components/bao-cao/bc-kpi-tong-hop";
import { BaoCaoSanLuong } from "@/components/bao-cao/bc-san-luong";
import { BaoCaoTyLe } from "@/components/bao-cao/bc-ty-le-dang-ky";
import { BaoCaoVanHanhDangKy } from "@/components/bao-cao/bc-van-hanh-dang-ky";
import { BaoCaoVanHanhLop } from "@/components/bao-cao/bc-van-hanh-lop";
import { BaoCaoXuHuongKpi } from "@/components/bao-cao/bc-xu-huong-kpi";
import { BoLocKy } from "@/components/bao-cao/chon-ky";
import { EmptyState } from "@/components/empty-state";
import { MucBaoCao, MucLuc } from "@/components/bao-cao/muc-bao-cao";
import { ChuyenNhomBaoCao, BoLocThoiGian } from "@/components/bao-cao/thanh-dieu-khien";
import { XuatBaoCao } from "@/components/bao-cao/xuat-bao-cao";
import { requireSession } from "@/lib/auth/session";
import { laKhung, tinhKhoang, type KhungThoiGian } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import {
  getA4,
  getCanhBaoPool,
  getDeXuatThongKe,
  getKpiTheoKy,
  getKpiTongHop,
  getLopTrongKhoang,
  getNguongPool,
  getSanLuong,
  getTyLeDangKy,
  getVanHanhDangKy,
} from "@/lib/bao-cao/queries";
import { laLocVaiTro } from "@/lib/bao-cao/tinh-toan";
import { BAO_CAO_KY, BAO_CAO_THOI_GIAN, laNhomBaoCao, type NhomBaoCao } from "@/lib/bao-cao/url";
import { getKyList } from "@/lib/kpi/queries";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Báo cáo (mục 4.7) — 8 báo cáo gộp thành 2 nhóm theo đúng bộ lọc dùng chung, xếp dọc trên 1 trang thay vì tách 8 tab
// (phản hồi người dùng: cuộn ngang bất tiện). "Xuất báo cáo" là 1 nút DUY NHẤT cho cả module (Admin/Quản lý lớp),
// luôn xuất báo cáo #1 + #3 + #6 + #7 gộp vào 1 file — nhiều sheet (Excel) hoặc nhiều trang (PDF).
export default async function BaoCaoPage(props: PageProps<"/bao-cao">) {
  const sp = await props.searchParams;
  const { isQuanTri } = await requireSession();

  const nhom: NhomBaoCao = laNhomBaoCao(first(sp.nhom)) ? (first(sp.nhom) as NhomBaoCao) : "ky";
  const kt: KhungThoiGian = laKhung(first(sp.kt)) ? (first(sp.kt) as KhungThoiGian) : "thang";
  const khoang = tinhKhoang(kt, first(sp.moc));
  const vt = laLocVaiTro(first(sp.vt)) ? first(sp.vt) : "tat-ca";
  const loc = vt as "tat-ca" | "giang_vien" | "tro_giang";
  const vtParam = loc === "tat-ca" ? undefined : loc;
  const mocParam = khoang.laHienTai ? undefined : khoang.tu;

  // Luôn xác định đủ CẢ 2 chiều ngữ cảnh (kỳ đánh giá + khung thời gian) dù đang xem nhóm nào, để nút "Xuất báo cáo"
  // ở đầu trang lúc nào cũng có đủ tham số cho cả 4 báo cáo chính thức (#1, #3, #6, #7).
  const kyList = await getKyList();
  const dieuKy = chonKy(kyList, first(sp.ky));

  let noiDung: React.ReactNode;
  if (nhom === "ky") {
    if (!dieuKy) {
      noiDung = <EmptyState icon={Info} title="Chưa có kỳ đánh giá nào — tạo kỳ ở Cấu hình hệ thống > Kỳ đánh giá trước." />;
    } else {
      const { hienTai, truoc, sau } = dieuKy;
      const [kpiRows, xuHuongKy, a4Rows, deXuat] = await Promise.all([getKpiTongHop(hienTai.id), getKpiTheoKy(8), getA4(hienTai.id), getDeXuatThongKe(hienTai.id)]);
      noiDung = (
        <div className="grid gap-8">
          <BoLocKy list={kyList} hienTai={hienTai} truoc={truoc} sau={sau} kt={kt} moc={mocParam} vt={vtParam} />
          <MucLuc items={BAO_CAO_KY} />
          <MucBaoCao id="kpi-tong-hop" so={1} nhan="KPI tổng hợp">
            <BaoCaoKpiTongHop ky={hienTai} rows={kpiRows} isQuanTri={isQuanTri} />
          </MucBaoCao>
          <MucBaoCao id="xu-huong-kpi" so={2} nhan="Xu hướng KPI">
            <BaoCaoXuHuongKpi ky={xuHuongKy} />
          </MucBaoCao>
          <MucBaoCao id="a4" so={6} nhan="A4 — Lớp không kinh phí">
            <BaoCaoA4 ky={hienTai} rows={a4Rows} />
          </MucBaoCao>
          <MucBaoCao id="de-xuat" so={7} nhan="Đề xuất nhân sự">
            <BaoCaoDeXuat ky={hienTai} data={deXuat} />
          </MucBaoCao>
        </div>
      );
    }
  } else {
    const [sl, slTruoc, tl, tlTruoc, vh, vhTruoc, canhBao, nguong, lop] = await Promise.all([
      getSanLuong(khoang.tu, khoang.den),
      getSanLuong(khoang.tuTruoc, khoang.denTruoc),
      getTyLeDangKy(khoang.tu, khoang.den),
      getTyLeDangKy(khoang.tuTruoc, khoang.denTruoc),
      getVanHanhDangKy(khoang.tu, khoang.den),
      getVanHanhDangKy(khoang.tuTruoc, khoang.denTruoc),
      getCanhBaoPool(),
      getNguongPool(),
      getLopTrongKhoang(khoang.tu, khoang.den),
    ]);
    noiDung = (
      <div className="grid gap-8">
        <BoLocThoiGian khoang={khoang} ky={dieuKy?.hienTai.id} vt={vtParam} />
        <MucLuc items={BAO_CAO_THOI_GIAN} />
        <MucBaoCao id="san-luong" so={3} nhan="Sản lượng giảng dạy">
          <BaoCaoSanLuong rows={sl} rowsTruoc={slTruoc} loc={loc} khoang={khoang} ky={dieuKy?.hienTai.id} />
        </MucBaoCao>
        <MucBaoCao id="ty-le-dang-ky" so={4} nhan="Tự đăng ký & nhận lời mời">
          <BaoCaoTyLe rows={tl} rowsTruoc={tlTruoc} loc={loc} khoang={khoang} ky={dieuKy?.hienTai.id} />
        </MucBaoCao>
        <MucBaoCao id="van-hanh-dang-ky" so={5} nhan="Vận hành đăng ký">
          <BaoCaoVanHanhDangKy hienTai={vh} truoc={vhTruoc} canhBao={canhBao} nguongPool={nguong} />
        </MucBaoCao>
        <MucBaoCao id="van-hanh-lop" so={8} nhan="Vận hành lớp học">
          <BaoCaoVanHanhLop rows={lop} />
        </MucBaoCao>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChuyenNhomBaoCao nhom={nhom} ky={dieuKy?.hienTai.id} kt={kt} moc={mocParam} vt={vtParam} />
        {isQuanTri && dieuKy && <XuatBaoCao ky={dieuKy.hienTai.id} kt={kt} moc={khoang.tu} />}
      </div>
      {noiDung}
    </div>
  );
}
