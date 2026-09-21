import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fmtDateTime } from "@/lib/format";
import { getNhatKyXuat } from "@/lib/nhat-ky/queries";
import { hienGiaTri, LOAI_NHAT_KY, nhanTruong } from "@/lib/nhat-ky/labels";
import { taoFileExcel } from "@/lib/xuat/excel";

// Xuất Nhật ký hệ thống ra Excel theo đúng bộ lọc đang xem — CHỈ Admin/người giữ Quyền Quản lý lớp (mục 4.7: file tải về dễ phát tán).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function moTaThayDoi(o: Record<string, unknown> | null) {
  if (!o) return "";
  return Object.entries(o)
    .map(([k, v]) => `${nhanTruong(k)}: ${hienGiaTri(v)}`)
    .join("\n");
}

export async function GET(req: NextRequest) {
  const phien = await getSession();
  if (!phien) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!phien.isQuanTri) return NextResponse.json({ error: "Chỉ người quản trị được xuất nhật ký" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const { rows, tong } = await getNhatKyXuat({
    q: (sp.get("q") ?? "").trim(),
    loai: sp.get("loai") ?? "",
    tu: sp.get("tu") ?? "",
    den: sp.get("den") ?? "",
    trang: 1,
  });

  const buf = await taoFileExcel({
    tenSheet: "Nhật ký hệ thống",
    cot: [
      { tieu_de: "Thời gian", khoa: "thoi_gian", rong: 18 },
      { tieu_de: "Người thực hiện", khoa: "nguoi", rong: 24 },
      { tieu_de: "Hành động", khoa: "hanh_dong", rong: 22 },
      { tieu_de: "Nội dung", khoa: "noi_dung", rong: 60 },
      { tieu_de: "Đối tượng", khoa: "doi_tuong", rong: 34 },
      { tieu_de: "Lý do", khoa: "ly_do", rong: 30 },
      { tieu_de: "Tự duyệt", khoa: "tu_duyet", rong: 10 },
      { tieu_de: "Giá trị trước", khoa: "truoc", rong: 36 },
      { tieu_de: "Giá trị sau", khoa: "sau", rong: 36 },
    ],
    dong: rows.map((r) => ({
      thoi_gian: fmtDateTime(r.created_at),
      nguoi: r.nguoi_thuc_hien_ten ?? "Hệ thống",
      hanh_dong: LOAI_NHAT_KY[r.loai]?.nhan ?? r.loai,
      noi_dung: r.mo_ta,
      doi_tuong: r.doi_tuong ?? "",
      ly_do: r.ly_do ?? "",
      tu_duyet: r.tu_duyet ? "Có" : "",
      truoc: moTaThayDoi(r.truoc),
      sau: moTaThayDoi(r.sau),
    })),
  });

  const ngay = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nhat-ky-he-thong-${ngay}.xlsx"`,
      // Cho giao diện biết file có bị cắt bớt không
      "X-So-Dong": String(rows.length),
      "X-Tong-Dong": String(tong),
      "Cache-Control": "no-store",
    },
  });
}
