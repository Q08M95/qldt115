import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { SheetExcel } from "@/lib/xuat/excel";
import { taoFileExcelNhieuSheet } from "@/lib/xuat/excel";
import { laKhung, tinhKhoang } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import { getKyList } from "@/lib/kpi/queries";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  getBaiHocXuat,
  getChungChiXuat,
  getChuyenMonXuat,
  getDangKyXuat,
  getDanhMucXuat,
  getDeXuatXuat,
  getDiemDanhXuat,
  getDuGioXuat,
  getKhaoSatXuat,
  getKyDanhGiaXuat,
  getLichSuDoiNhomXuat,
  getLopHocXuat,
  getNhanSuXuat,
  getSlotXuat,
} from "@/lib/bao-cao/xuat-du-lieu";

// "Xuất dữ liệu chi tiết" (mục 4.7, Giai đoạn 11c) — khác "Xuất báo cáo" (số liệu đã tính/tổng hợp): đây là
// TOÀN BỘ bản ghi thô về nhân sự/lớp học/phân công/đăng ký/điểm danh/dự giờ/KPI/đề xuất..., nhiều sheet trong
// 1 file .xlsx, dùng chung đúng bộ lọc (kỳ đánh giá + khung thời gian) đang xem ở /bao-cao. CHỈ Admin/Quản lý lớp.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phien = await getSession();
  if (!phien) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!phien.isQuanTri) return NextResponse.json({ error: "Chỉ người quản trị được xuất dữ liệu" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const kyList = await getKyList();
  const dieu = chonKy(kyList, sp.get("ky") ?? undefined);
  if (!dieu) return NextResponse.json({ error: "Chưa có kỳ đánh giá nào" }, { status: 404 });
  const kt = laKhung(sp.get("kt") ?? undefined) ? (sp.get("kt") as "tuan" | "thang" | "quy" | "nam") : "thang";
  const khoang = tinhKhoang(kt, sp.get("moc"));
  const { tu, den } = khoang;
  const ky = dieu.hienTai;

  const [
    nhanSu,
    chuyenMon,
    chungChi,
    danhMuc,
    kyDanhGia,
    lopHoc,
    baiHoc,
    slot,
    dangKy,
    diemDanh,
    duGio,
    khaoSat,
    deXuat,
    lichSuDoiNhom,
  ] = await Promise.all([
    getNhanSuXuat(),
    getChuyenMonXuat(),
    getChungChiXuat(),
    getDanhMucXuat(),
    getKyDanhGiaXuat(),
    getLopHocXuat(tu, den),
    getBaiHocXuat(tu, den),
    getSlotXuat(tu, den),
    getDangKyXuat(tu, den),
    getDiemDanhXuat(tu, den),
    getDuGioXuat(tu, den),
    getKhaoSatXuat(tu, den),
    getDeXuatXuat(ky.id, tu, den),
    getLichSuDoiNhomXuat(tu, den),
  ]);

  const sheets: SheetExcel[] = [
    {
      tenSheet: "1. Nhân sự",
      cot: [
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Email", khoa: "email", rong: 26 },
        { tieu_de: "Điện thoại", khoa: "so_dien_thoai", rong: 16 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 12 },
        { tieu_de: "Trạng thái tham gia", khoa: "trang_thai_tham_gia", rong: 18 },
        { tieu_de: "Nhóm", khoa: "nhom", rong: 22 },
        { tieu_de: "Quyền Quản lý lớp", khoa: "quyen_quan_ly_lop", rong: 14 },
        { tieu_de: "Kinh nghiệm", khoa: "kinh_nghiem", rong: 34 },
        { tieu_de: "Ngày tạo hồ sơ", khoa: "created_at", rong: 16 },
      ],
      dong: nhanSu.map((r) => ({ ...r, created_at: fmtDate(r.created_at) })),
    },
    {
      tenSheet: "2. Chuyên môn",
      cot: [
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Chuyên môn", khoa: "chuyen_mon", rong: 22 },
        { tieu_de: "Chi tiết", khoa: "chi_tiet", rong: 34 },
      ],
      dong: chuyenMon.map((r) => ({ ...r })),
    },
    {
      tenSheet: "3. Chứng chỉ",
      cot: [
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Loại chứng chỉ", khoa: "loai", rong: 22 },
        { tieu_de: "Số chứng chỉ", khoa: "so_chung_chi", rong: 16 },
        { tieu_de: "Nội dung", khoa: "noi_dung", rong: 30 },
        { tieu_de: "Ngày cấp", khoa: "ngay_cap", rong: 12 },
        { tieu_de: "Nơi cấp", khoa: "noi_cap", rong: 22 },
        { tieu_de: "Có ảnh minh chứng", khoa: "co_anh", rong: 14 },
      ],
      dong: chungChi.map((r) => ({ ...r, ngay_cap: r.ngay_cap ? fmtDate(r.ngay_cap) : "" })),
    },
    {
      tenSheet: "4. Danh mục",
      cot: [
        { tieu_de: "Loại danh mục", khoa: "loai", rong: 16 },
        { tieu_de: "Tên", khoa: "ten", rong: 30 },
        { tieu_de: "Hệ số D1", khoa: "he_so_d1", rong: 10 },
        { tieu_de: "Đang dùng", khoa: "dang_dung", rong: 10 },
      ],
      dong: danhMuc.map((r) => ({ ...r, he_so_d1: r.he_so_d1 ?? "" })),
    },
    {
      tenSheet: "5. Kỳ đánh giá",
      cot: [
        { tieu_de: "Tên kỳ", khoa: "ten", rong: 18 },
        { tieu_de: "Từ ngày", khoa: "tu", rong: 12 },
        { tieu_de: "Đến ngày", khoa: "den", rong: 12 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 12 },
      ],
      dong: kyDanhGia.map((r) => ({ ...r, tu: fmtDate(r.tu), den: fmtDate(r.den) })),
    },
    {
      tenSheet: `6. Lớp học (${khoang.nhan})`,
      cot: [
        { tieu_de: "Tên lớp", khoa: "ten", rong: 26 },
        { tieu_de: "Nhóm lớp", khoa: "nhom_lop", rong: 16 },
        { tieu_de: "D1", khoa: "he_so_d1", rong: 8 },
        { tieu_de: "Đối tượng", khoa: "doi_tuong", rong: 16 },
        { tieu_de: "Loại kinh phí", khoa: "loai_kinh_phi", rong: 14 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 16 },
        { tieu_de: "Ngày bắt đầu", khoa: "ngay_bat_dau", rong: 12 },
        { tieu_de: "Ngày kết thúc", khoa: "ngay_ket_thuc", rong: 12 },
        { tieu_de: "Địa điểm", khoa: "dia_diem", rong: 24 },
        { tieu_de: "Công khai sớm", khoa: "cong_khai_som", rong: 12 },
        { tieu_de: "Nhóm đủ điều kiện", khoa: "nhom_du_dieu_kien", rong: 40 },
        { tieu_de: "Chứng chỉ yêu cầu", khoa: "chung_chi_yeu_cau", rong: 30 },
        { tieu_de: "C1 (%)", khoa: "c1_phan_tram", rong: 10 },
        { tieu_de: "C3 (%)", khoa: "c3_phan_tram", rong: 10 },
        { tieu_de: "Số Bài", khoa: "so_bai", rong: 8 },
      ],
      dong: lopHoc.map((r) => ({
        ...r,
        ngay_bat_dau: fmtDate(r.ngay_bat_dau),
        ngay_ket_thuc: fmtDate(r.ngay_ket_thuc),
        c1_phan_tram: r.c1_phan_tram ?? "",
        c3_phan_tram: r.c3_phan_tram ?? "",
      })),
    },
    {
      tenSheet: `7. Bài học (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Thứ tự", khoa: "thu_tu", rong: 8 },
        { tieu_de: "Tên Bài", khoa: "ten", rong: 26 },
        { tieu_de: "Bắt đầu", khoa: "bat_dau", rong: 16 },
        { tieu_de: "Kết thúc", khoa: "ket_thuc", rong: 16 },
      ],
      dong: baiHoc.map((r) => ({ ...r, bat_dau: fmtDateTime(r.bat_dau), ket_thuc: fmtDateTime(r.ket_thuc) })),
    },
    {
      tenSheet: `8. Slot & phân công (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Bài", khoa: "bai_ten", rong: 26 },
        { tieu_de: "Giờ Bài", khoa: "bai_bat_dau", rong: 16 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 12 },
        { tieu_de: "Vị trí", khoa: "vi_tri", rong: 8 },
        { tieu_de: "Trạng thái slot", khoa: "trang_thai", rong: 14 },
        { tieu_de: "Người đảm nhiệm", khoa: "nguoi_dam_nhiem", rong: 26 },
      ],
      dong: slot.map((r) => ({ ...r, bai_bat_dau: fmtDateTime(r.bai_bat_dau) })),
    },
    {
      tenSheet: `9. Đăng ký-lời mời (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Bài", khoa: "bai_ten", rong: 26 },
        { tieu_de: "Giờ Bài", khoa: "bai_bat_dau", rong: 16 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 12 },
        { tieu_de: "Người", khoa: "nguoi", rong: 24 },
        { tieu_de: "Loại", khoa: "loai", rong: 12 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 16 },
        { tieu_de: "Tự duyệt", khoa: "tu_duyet", rong: 10 },
        { tieu_de: "Thời gian tạo", khoa: "created_at", rong: 16 },
        { tieu_de: "Thời gian xử lý", khoa: "xu_ly_luc", rong: 16 },
      ],
      dong: dangKy.map((r) => ({
        ...r,
        bai_bat_dau: fmtDateTime(r.bai_bat_dau),
        created_at: fmtDateTime(r.created_at),
        xu_ly_luc: r.xu_ly_luc ? fmtDateTime(r.xu_ly_luc) : "",
      })),
    },
    {
      tenSheet: `10. Điểm danh (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Bài", khoa: "bai_ten", rong: 26 },
        { tieu_de: "Giờ Bài", khoa: "bai_bat_dau", rong: 16 },
        { tieu_de: "Người", khoa: "nguoi", rong: 24 },
        { tieu_de: "Check-in lúc", khoa: "check_in_luc", rong: 16 },
        { tieu_de: "B1 (%)", khoa: "b1_phan_tram", rong: 10 },
        { tieu_de: "Chỉnh tay", khoa: "chinh_tay", rong: 10 },
      ],
      dong: diemDanh.map((r) => ({
        ...r,
        bai_bat_dau: fmtDateTime(r.bai_bat_dau),
        check_in_luc: r.check_in_luc ? fmtDateTime(r.check_in_luc) : "",
      })),
    },
    {
      tenSheet: `11. Dự giờ - C2 (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Bài", khoa: "bai_ten", rong: 26 },
        { tieu_de: "Giờ Bài", khoa: "bai_bat_dau", rong: 16 },
        { tieu_de: "Người được chấm", khoa: "nguoi", rong: 24 },
        { tieu_de: "Mức", khoa: "muc", rong: 16 },
        { tieu_de: "Ghi chú", khoa: "ghi_chu", rong: 34 },
      ],
      dong: duGio.map((r) => ({ ...r, bai_bat_dau: fmtDateTime(r.bai_bat_dau) })),
    },
    {
      tenSheet: `12. Khảo sát - C1 (${khoang.nhan})`,
      cot: [
        { tieu_de: "Lớp", khoa: "lop_ten", rong: 26 },
        { tieu_de: "Điểm tổng thể (1-5)", khoa: "diem_tong_the", rong: 16 },
        { tieu_de: "Điểm giảng dạy (1-5)", khoa: "diem_giang_day", rong: 16 },
        { tieu_de: "Nhận xét", khoa: "nhan_xet", rong: 34 },
        { tieu_de: "Thời gian phản hồi", khoa: "created_at", rong: 16 },
      ],
      dong: khaoSat.map((r) => ({ ...r, created_at: fmtDateTime(r.created_at) })),
    },
    {
      tenSheet: `13. Đề xuất NS (${ky.ten})`,
      cot: [
        { tieu_de: "Loại đề xuất", khoa: "loai", rong: 20 },
        { tieu_de: "Người", khoa: "nguoi", rong: 24 },
        { tieu_de: "Nội dung", khoa: "noi_dung", rong: 40 },
        { tieu_de: "Trạng thái", khoa: "trang_thai", rong: 14 },
        { tieu_de: "Thời gian tạo", khoa: "created_at", rong: 16 },
        { tieu_de: "Thời gian xử lý", khoa: "xu_ly_luc", rong: 16 },
      ],
      dong: deXuat.map((r) => ({
        ...r,
        created_at: fmtDateTime(r.created_at),
        xu_ly_luc: r.xu_ly_luc ? fmtDateTime(r.xu_ly_luc) : "",
      })),
    },
    {
      tenSheet: `14. Lịch sử đổi nhóm (${khoang.nhan})`,
      cot: [
        { tieu_de: "Người", khoa: "nguoi", rong: 24 },
        { tieu_de: "Nhóm cũ", khoa: "nhom_cu", rong: 22 },
        { tieu_de: "Nhóm mới", khoa: "nhom_moi", rong: 22 },
        { tieu_de: "Ngày hiệu lực", khoa: "ngay_hieu_luc", rong: 14 },
        { tieu_de: "Lý do", khoa: "ly_do", rong: 30 },
      ],
      dong: lichSuDoiNhom.map((r) => ({ ...r, ngay_hieu_luc: fmtDate(r.ngay_hieu_luc) })),
    },
  ];

  const buf = await taoFileExcelNhieuSheet(sheets);
  const ngay = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="xuat-du-lieu-chi-tiet-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
