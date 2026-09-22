import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { taoFileExcel } from "@/lib/xuat/excel";
import { laKhung, tinhKhoang } from "@/lib/bao-cao/khoang";
import { chonKy } from "@/lib/bao-cao/ky";
import { chuanHoaDeXuat, tongHopSanLuong } from "@/lib/bao-cao/tinh-toan";
import { getA4, getDeXuatThongKe, getKpiTongHop, getSanLuong } from "@/lib/bao-cao/queries";
import { getKyList } from "@/lib/kpi/queries";
import { LOAI_DE_XUAT_LABEL, NHOM_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";

// Xuất Excel cho báo cáo #1, #3, #6, #7 (mục 4.7) — CHỈ Admin/người giữ Quyền Quản lý lớp.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const vaiTro = (v: string | null) => (v ? VAI_TRO_LABEL[v as keyof typeof VAI_TRO_LABEL] : "");

export async function GET(req: NextRequest) {
  const phien = await getSession();
  if (!phien) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!phien.isQuanTri) return NextResponse.json({ error: "Chỉ người quản trị được xuất báo cáo" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const bc = sp.get("bc") ?? "";
  const ngay = new Date().toISOString().slice(0, 10);
  let ten = "";
  let buf: Buffer;

  if (bc === "kpi-tong-hop") {
    const list = await getKyList();
    const dieu = chonKy(list, sp.get("ky") ?? undefined);
    if (!dieu) return NextResponse.json({ error: "Chưa có kỳ đánh giá nào" }, { status: 404 });
    const rows = await getKpiTongHop(dieu.hienTai.id);
    ten = `bao-cao-1-kpi-tong-hop-${dieu.hienTai.ten}`;
    buf = await taoFileExcel({
      tenSheet: `KPI ${dieu.hienTai.ten}`.slice(0, 31),
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
      dong: rows.map((r) => ({
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
    });
  } else if (bc === "san-luong") {
    const kt = laKhung(sp.get("kt") ?? undefined) ? (sp.get("kt") as "tuan" | "thang" | "quy" | "nam") : "thang";
    const khoang = tinhKhoang(kt, sp.get("moc"));
    const t = tongHopSanLuong(await getSanLuong(khoang.tu, khoang.den), "tat-ca");
    ten = `bao-cao-3-san-luong-${khoang.tu}-${khoang.den}`;
    buf = await taoFileExcel({
      tenSheet: "Sản lượng giảng dạy".slice(0, 31),
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
      dong: t.nguoi.map((r) => ({
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        dang_tham_gia: r.dang_tham_gia ? "Có" : "Đã nghỉ",
        so_bai: r.so_bai,
        so_lop: r.so_lop,
        gio_thuc: r.gio_thuc,
        so_bai_sap: r.so_bai_sap,
        gio_sap: r.gio_sap,
      })),
    });
  } else if (bc === "a4") {
    const list = await getKyList();
    const dieu = chonKy(list, sp.get("ky") ?? undefined);
    if (!dieu) return NextResponse.json({ error: "Chưa có kỳ đánh giá nào" }, { status: 404 });
    const rows = [...(await getA4(dieu.hienTai.id))].sort((a, b) => b.a4_luy_ke - a.a4_luy_ke || b.a4_ky - a.a4_ky);
    ten = `bao-cao-6-a4-${dieu.hienTai.ten}`;
    buf = await taoFileExcel({
      tenSheet: `A4 ${dieu.hienTai.ten}`.slice(0, 31),
      cot: [
        { tieu_de: "Hạng", khoa: "hang", rong: 8 },
        { tieu_de: "Họ tên", khoa: "ho_ten", rong: 26 },
        { tieu_de: "Vai trò", khoa: "vai_tro", rong: 14 },
        { tieu_de: "Đang tham gia", khoa: "dang_tham_gia", rong: 14 },
        { tieu_de: `A4 ${dieu.hienTai.ten}`, khoa: "a4_ky", rong: 16 },
        { tieu_de: "A4 lũy kế", khoa: "a4_luy_ke", rong: 12 },
      ],
      dong: rows.map((r, i) => ({
        hang: i + 1,
        ho_ten: r.ho_ten,
        vai_tro: vaiTro(r.vai_tro),
        dang_tham_gia: r.dang_tham_gia ? "Có" : "Đã nghỉ",
        a4_ky: r.a4_ky,
        a4_luy_ke: r.a4_luy_ke,
      })),
    });
  } else if (bc === "de-xuat") {
    const list = await getKyList();
    const dieu = chonKy(list, sp.get("ky") ?? undefined);
    if (!dieu) return NextResponse.json({ error: "Chưa có kỳ đánh giá nào" }, { status: 404 });
    const t = chuanHoaDeXuat(await getDeXuatThongKe(dieu.hienTai.id));
    ten = `bao-cao-7-de-xuat-${dieu.hienTai.ten}`;
    buf = await taoFileExcel({
      tenSheet: `Đề xuất ${dieu.hienTai.ten}`.slice(0, 31),
      cot: [
        { tieu_de: "Loại đề xuất", khoa: "loai", rong: 26 },
        { tieu_de: "Chờ duyệt", khoa: "cho_duyet", rong: 12 },
        { tieu_de: "Đã duyệt", khoa: "da_duyet", rong: 12 },
        { tieu_de: "Đã bỏ qua", khoa: "bo_qua", rong: 12 },
        { tieu_de: "Tổng", khoa: "tong", rong: 10 },
      ],
      dong: t.theo_loai.map((l) => ({
        loai: LOAI_DE_XUAT_LABEL[l.loai],
        cho_duyet: l.cho_duyet,
        da_duyet: l.da_duyet,
        bo_qua: l.bo_qua,
        tong: l.cho_duyet + l.da_duyet + l.bo_qua,
      })),
    });
  } else {
    return NextResponse.json({ error: "Báo cáo này không hỗ trợ xuất Excel" }, { status: 400 });
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${ten}-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
