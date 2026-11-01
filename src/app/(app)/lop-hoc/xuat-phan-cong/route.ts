import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fmtDate, fmtTime } from "@/lib/format";
import { TRANG_THAI_LOP_LABEL, TRANG_THAI_SLOT_LABEL } from "@/lib/lop-hoc/labels";
import { getLopTheoLoc, getPhanCongTheoLop } from "@/lib/lop-hoc/queries";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { taoFileExcel } from "@/lib/xuat/excel";

// Xuất danh sách phân công của MỌI lớp đang lọc ở trang Lớp học (không chỉ trang đang xem), gộp 1 bảng: mỗi dòng 1 slot
// (1 vị trí của 1 vai trò trong 1 Bài) để dễ lọc/sắp trong Excel — kèm email, SĐT người được phân công.
// CHỈ Admin/người giữ Quyền Quản lý lớp (mục 4.7: file tải về dễ phát tán).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phien = await getSession();
  if (!phien) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!phien.isQuanTri) return NextResponse.json({ error: "Chỉ người quản trị được xuất danh sách phân công" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const { rows: lops } = await getLopTheoLoc({
    q: (sp.get("q") ?? "").trim(),
    nhom_lop: sp.get("nhom_lop") ?? "",
    trang_thai: sp.get("trang_thai") ?? "",
    doi_tuong: sp.get("doi_tuong") ?? "",
    kinh_phi: sp.get("kinh_phi") ?? "",
  });
  const baiTheoLop = await getPhanCongTheoLop(lops.map((l) => l.id));

  const dong = lops.flatMap((l) =>
    (baiTheoLop.get(l.id) ?? []).flatMap((b) =>
      b.slots.map((s) => ({
        lop: l.ten,
        nhom_lop: l.nhom_lop_ten,
        trang_thai_lop: TRANG_THAI_LOP_LABEL[l.trang_thai_hien_thi],
        dia_diem: l.dia_diem ?? "",
        bai: b.ten,
        ngay: fmtDate(b.bat_dau),
        gio: `${fmtTime(b.bat_dau)}–${fmtTime(b.ket_thuc)}`,
        vai_tro: VAI_TRO_LABEL[s.vai_tro],
        vi_tri: s.vi_tri,
        nguoi: s.nguoi?.ho_ten ?? "",
        email: s.nguoi?.email ?? "",
        sdt: s.nguoi?.so_dien_thoai ?? "",
        trang_thai: TRANG_THAI_SLOT_LABEL[s.trang_thai],
      })),
    ),
  );

  const buf = await taoFileExcel({
    tenSheet: "Phân công",
    cot: [
      { tieu_de: "Lớp", khoa: "lop", rong: 24 },
      { tieu_de: "Nhóm lớp", khoa: "nhom_lop", rong: 12 },
      { tieu_de: "Trạng thái lớp", khoa: "trang_thai_lop", rong: 16 },
      { tieu_de: "Địa điểm", khoa: "dia_diem", rong: 24 },
      { tieu_de: "Bài", khoa: "bai", rong: 30 },
      { tieu_de: "Ngày", khoa: "ngay", rong: 12 },
      { tieu_de: "Giờ", khoa: "gio", rong: 13 },
      { tieu_de: "Vai trò", khoa: "vai_tro", rong: 12 },
      { tieu_de: "Vị trí", khoa: "vi_tri", rong: 8 },
      { tieu_de: "Người được phân công", khoa: "nguoi", rong: 24 },
      { tieu_de: "Email", khoa: "email", rong: 28 },
      { tieu_de: "Số điện thoại", khoa: "sdt", rong: 14 },
      { tieu_de: "Trạng thái slot", khoa: "trang_thai", rong: 14 },
    ],
    dong,
  });

  const ngay = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="phan-cong-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
