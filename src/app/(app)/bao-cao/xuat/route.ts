import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { SheetExcel } from "@/lib/xuat/excel";
import { taoFileExcelNhieuSheet } from "@/lib/xuat/excel";
import { taoFileBaoCaoPdf } from "@/lib/xuat/pdf-bao-cao";
import { laKhung, tinhKhoang } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import { chuanHoaDeXuat, phanTram, tongHopLop, tongHopSanLuong, tongHopTyLe } from "@/lib/bao-cao/tinh-toan";
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
import { getKyList } from "@/lib/kpi/queries";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import { DOI_TUONG_LABEL, LOAI_KINH_PHI_LABEL, TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import { LOAI_DE_XUAT_LABEL, NHOM_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";

// Xuất báo cáo (mục 4.7) — 1 CHỖ DUY NHẤT cho cả module: gộp ĐỦ 8 báo cáo vào 1 file — nhiều sheet (Excel) hoặc nhiều
// trang có biểu đồ + phụ lục (PDF). CHỈ Admin/Quản lý lớp. Trước đây chỉ gộp #1/#3/#6/#7 ("chính thức cho họp xét
// duyệt") — mở rộng đủ 8 vì không có lý do để file xuất thiếu đúng những gì đã xem được trên trang /bao-cao.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const vaiTro = (v: string | null) => (v ? VAI_TRO_LABEL[v as keyof typeof VAI_TRO_LABEL] : "");
// Tên kỳ dạng "Quý 3/2026" có dấu "/" — không dùng thẳng trong tên file tải về (một số hệ điều hành/trình duyệt hiểu nhầm thành đường dẫn)
const choTenFile = (ten: string) => ten.replace(/\//g, "-");

export async function GET(req: NextRequest) {
  const phien = await getSession();
  if (!phien) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!phien.isQuanTri) return NextResponse.json({ error: "Chỉ người quản trị được xuất báo cáo" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const dinhDang = sp.get("dinh_dang") === "pdf" ? "pdf" : "excel";

  const kyList = await getKyList();
  const dieu = chonKy(kyList, sp.get("ky") ?? undefined);
  if (!dieu) return NextResponse.json({ error: "Chưa có kỳ đánh giá nào" }, { status: 404 });
  const kt = laKhung(sp.get("kt") ?? undefined) ? (sp.get("kt") as "tuan" | "thang" | "quy" | "nam") : "thang";
  const khoang = tinhKhoang(kt, sp.get("moc"));

  const [kpiRows, kpiTheoKy, slRows, tyLeRows, vanHanh, canhBao, nguongPool, a4Rows0, deXuatTho, lopRows] = await Promise.all([
    getKpiTongHop(dieu.hienTai.id),
    getKpiTheoKy(8),
    getSanLuong(khoang.tu, khoang.den),
    getTyLeDangKy(khoang.tu, khoang.den),
    getVanHanhDangKy(khoang.tu, khoang.den),
    getCanhBaoPool(),
    getNguongPool(),
    getA4(dieu.hienTai.id),
    getDeXuatThongKe(dieu.hienTai.id),
    getLopTrongKhoang(khoang.tu, khoang.den),
  ]);
  const slTong = tongHopSanLuong(slRows, "tat-ca");
  const tyLe = tongHopTyLe(tyLeRows, "tat-ca");
  const tyLeSapXep = [...tyLe.dong].sort((a, b) => (b.a2 ?? -1) - (a.a2 ?? -1) || (b.a3 ?? -1) - (a.a3 ?? -1));
  const a4Rows = [...a4Rows0].sort((a, b) => b.a4_luy_ke - a.a4_luy_ke || b.a4_ky - a.a4_ky);
  const deXuat = chuanHoaDeXuat(deXuatTho);
  const lopTong = tongHopLop(lopRows);

  const tenKy = choTenFile(dieu.hienTai.ten);
  const ten = `bao-cao-tong-hop-${tenKy}-${khoang.tu}`;
  const ngay = new Date().toISOString().slice(0, 10);

  if (dinhDang === "pdf") {
    const buf = await taoFileBaoCaoPdf({
      xuatLuc: new Date(),
      ky: dieu.hienTai,
      khoang,
      kpiRows,
      kpiTheoKy,
      sanLuong: slTong,
      tyLe,
      vanHanh,
      canhBao,
      nguongPool,
      a4Rows,
      deXuat,
      lopTong,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ten}-${ngay}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const sheets: SheetExcel[] = [
    {
      tenSheet: `1. KPI ${dieu.hienTai.ten}`,
      cot: [
        { tieu_de: "Hạng", khoa: "hang", rong: 8 },
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Nhóm", khoa: "nhom", rong: 24 },
        { tieu_de: "KPI", khoa: "kpi", rong: 10 },
        { tieu_de: "A", khoa: "a", rong: 8 },
        { tieu_de: "B", khoa: "b", rong: 8 },
        { tieu_de: "C", khoa: "c", rong: 8 },
        { tieu_de: "Giờ thực", khoa: "gio_thuc", rong: 10 },
        { tieu_de: "Giờ quy đổi", khoa: "gio_quy_doi", rong: 12 },
        { tieu_de: "Số Bài", khoa: "so_bai", rong: 8 },
        { tieu_de: "Số lớp", khoa: "so_lop", rong: 8 },
        { tieu_de: "A4 kỳ", khoa: "a4_ky", rong: 8 },
      ],
      dong: kpiRows.map((r) => ({
        hang: r.hang,
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        nhom: r.nhom ? NHOM_LABEL[r.nhom] : "",
        kpi: r.kpi,
        a: r.diem_nhom.A ?? "",
        b: r.diem_nhom.B ?? "",
        c: r.diem_nhom.C ?? "",
        gio_thuc: r.gio_thuc,
        gio_quy_doi: r.gio_quy_doi,
        so_bai: r.so_bai,
        so_lop: r.so_lop,
        a4_ky: r.a4_ky,
      })),
    },
    {
      tenSheet: "2. Xu hướng KPI",
      cot: [
        { tieu_de: "Kỳ", khoa: "ky", rong: 16 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 12 },
        { tieu_de: "KPI TB", khoa: "kpi_tb", rong: 10 },
        { tieu_de: "KPI TB Giảng viên", khoa: "kpi_tb_gv", rong: 14 },
        { tieu_de: "KPI TB Trợ giảng", khoa: "kpi_tb_tg", rong: 14 },
        { tieu_de: "Số người có KPI", khoa: "so_nguoi", rong: 12 },
      ],
      dong: kpiTheoKy.map((k) => ({
        ky: k.ten,
        trang_thai: TRANG_THAI_KY_LABEL[k.trang_thai],
        kpi_tb: k.kpi_tb ?? "",
        kpi_tb_gv: k.kpi_tb_gv ?? "",
        kpi_tb_tg: k.kpi_tb_tg ?? "",
        so_nguoi: k.so_nguoi,
      })),
    },
    {
      tenSheet: `3. Sản lượng ${khoang.nhan}`,
      cot: [
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Đang tham gia", khoa: "dang_tham_gia", rong: 14 },
        { tieu_de: "Số Bài", khoa: "so_bai", rong: 8 },
        { tieu_de: "Số lớp", khoa: "so_lop", rong: 8 },
        { tieu_de: "Giờ đã dạy", khoa: "gio_thuc", rong: 12 },
        { tieu_de: "Bài sắp tới", khoa: "so_bai_sap", rong: 12 },
        { tieu_de: "Giờ sắp tới", khoa: "gio_sap", rong: 12 },
      ],
      dong: slTong.nguoi.map((r) => ({
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        dang_tham_gia: r.dang_tham_gia ? "Có" : "Đã nghỉ",
        so_bai: r.so_bai,
        so_lop: r.so_lop,
        gio_thuc: r.gio_thuc,
        so_bai_sap: r.so_bai_sap,
        gio_sap: r.gio_sap,
      })),
    },
    {
      tenSheet: `4. Tỷ lệ đăng ký ${khoang.nhan}`,
      cot: [
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Bài đã dạy", khoa: "so_bai_da_day", rong: 12 },
        { tieu_de: "Tự đăng ký", khoa: "so_tu_dang_ky", rong: 12 },
        { tieu_de: "A2 (%)", khoa: "a2", rong: 10 },
        { tieu_de: "Lời mời đã phản hồi", khoa: "so_moi", rong: 16 },
        { tieu_de: "Đồng ý", khoa: "so_moi_dong_y", rong: 10 },
        { tieu_de: "A3 (%)", khoa: "a3", rong: 10 },
      ],
      dong: tyLeSapXep.map((r) => ({
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        so_bai_da_day: r.so_bai_da_day,
        so_tu_dang_ky: r.so_tu_dang_ky,
        a2: r.a2 ?? "",
        so_moi: r.soMoi,
        so_moi_dong_y: r.so_moi_dong_y,
        a3: r.a3 ?? "",
      })),
    },
    {
      tenSheet: `5. Vận hành đăng ký ${khoang.nhan}`,
      cot: [
        { tieu_de: "Chỉ số", khoa: "nhan", rong: 34 },
        { tieu_de: "Giá trị", khoa: "gia_tri", rong: 16 },
      ],
      dong: [
        { nhan: "Tỷ lệ lấp đầy slot (%)", gia_tri: phanTram(vanHanh.slot_da_phan_cong, vanHanh.slot_tong) ?? "" },
        { nhan: "Số slot tổng", gia_tri: vanHanh.slot_tong },
        { nhan: "Số slot đã phân công", gia_tri: vanHanh.slot_da_phan_cong },
        { nhan: "Thời gian TB lấp 1 slot (giờ)", gia_tri: vanHanh.gio_lap_tb ?? "" },
        { nhan: "Lượt tự đăng ký mới", gia_tri: vanHanh.dang_ky_moi },
        { nhan: "Lời mời đã gửi", gia_tri: vanHanh.loi_moi_gui },
        { nhan: "Đăng ký đang chờ duyệt", gia_tri: vanHanh.dang_ky_cho },
        { nhan: "Lời mời đang chờ phản hồi", gia_tri: vanHanh.loi_moi_cho },
        { nhan: `Số Bài cảnh báo pool nhỏ hiện tại (dưới ${nguongPool} người)`, gia_tri: canhBao.length },
        { nhan: "— trong đó không có ứng viên nào", gia_tri: canhBao.filter((c) => c.so_ung_vien === 0).length },
      ],
    },
    {
      tenSheet: "5b. Cảnh báo pool nhỏ",
      cot: [
        { tieu_de: "Lớp", khoa: "lop", rong: 26 },
        { tieu_de: "Bài", khoa: "bai", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Slot trống", khoa: "slot_trong", rong: 10 },
        { tieu_de: "Số ứng viên", khoa: "so_ung_vien", rong: 12 },
        { tieu_de: "Bắt đầu", khoa: "bat_dau", rong: 18 },
      ],
      dong: canhBao.map((c) => ({
        lop: c.lop_ten,
        bai: c.bai_ten,
        vai_tro: vaiTro(c.vai_tro),
        slot_trong: c.slot_trong,
        so_ung_vien: c.so_ung_vien,
        bat_dau: fmtDateTime(c.bat_dau),
      })),
    },
    {
      tenSheet: `6. A4 ${dieu.hienTai.ten}`,
      cot: [
        { tieu_de: "Hạng", khoa: "hang", rong: 8 },
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Đang tham gia", khoa: "dang_tham_gia", rong: 14 },
        { tieu_de: `A4 ${dieu.hienTai.ten}`, khoa: "a4_ky", rong: 16 },
        { tieu_de: "A4 lũy kế", khoa: "a4_luy_ke", rong: 12 },
      ],
      dong: a4Rows.map((r, i) => ({
        hang: i + 1,
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        dang_tham_gia: r.dang_tham_gia ? "Có" : "Đã nghỉ",
        a4_ky: r.a4_ky,
        a4_luy_ke: r.a4_luy_ke,
      })),
    },
    {
      tenSheet: `7. Đề xuất ${dieu.hienTai.ten}`,
      cot: [
        { tieu_de: "Loại đề xuất", khoa: "loai", rong: 26 },
        { tieu_de: "Chờ duyệt", khoa: "cho_duyet", rong: 12 },
        { tieu_de: "Đã duyệt", khoa: "da_duyet", rong: 12 },
        { tieu_de: "Đã bỏ qua", khoa: "bo_qua", rong: 12 },
        { tieu_de: "Tổng", khoa: "tong", rong: 10 },
      ],
      dong: deXuat.theo_loai.map((l) => ({
        loai: LOAI_DE_XUAT_LABEL[l.loai],
        cho_duyet: l.cho_duyet,
        da_duyet: l.da_duyet,
        bo_qua: l.bo_qua,
        tong: l.cho_duyet + l.da_duyet + l.bo_qua,
      })),
    },
    {
      tenSheet: `8. Vận hành lớp ${khoang.nhan}`,
      cot: [
        { tieu_de: "Tên lớp", khoa: "ten", rong: 26 },
        { tieu_de: "Nhóm lớp", khoa: "nhom_lop", rong: 16 },
        { tieu_de: "Đối tượng", khoa: "doi_tuong", rong: 16 },
        { tieu_de: "Loại kinh phí", khoa: "loai_kinh_phi", rong: 14 },
        { tieu_de: "Bắt đầu", khoa: "ngay_bat_dau", rong: 12 },
        { tieu_de: "Kết thúc", khoa: "ngay_ket_thuc", rong: 12 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 14 },
        { tieu_de: "Số Bài", khoa: "so_bai", rong: 8 },
        { tieu_de: "Slot tổng", khoa: "slot_tong", rong: 10 },
        { tieu_de: "Slot đã phân công", khoa: "slot_da_phan_cong", rong: 14 },
      ],
      dong: lopRows.map((r) => ({
        ten: r.ten,
        nhom_lop: r.nhom_lop_ten,
        doi_tuong: DOI_TUONG_LABEL[r.doi_tuong],
        loai_kinh_phi: LOAI_KINH_PHI_LABEL[r.loai_kinh_phi],
        ngay_bat_dau: fmtDate(r.ngay_bat_dau),
        ngay_ket_thuc: fmtDate(r.ngay_ket_thuc),
        trang_thai: TRANG_THAI_LOP_LABEL[r.trang_thai_hien_thi],
        so_bai: r.so_bai,
        slot_tong: r.slot_tong,
        slot_da_phan_cong: r.slot_da_phan_cong,
      })),
    },
  ];

  const buf = await taoFileExcelNhieuSheet(sheets);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${ten}-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
