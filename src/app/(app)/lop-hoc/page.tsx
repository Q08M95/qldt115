import { LichLop } from "@/components/lop-hoc/lich-lop";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { NhapCsvLopDrawer } from "@/components/lop-hoc/nhap-csv-lop-drawer";
import { requireSession } from "@/lib/auth/session";
import { getLichCuaToi } from "@/lib/dang-ky/queries";
import { congThang, docThang, khoangLuoi, khoaThang, ngayVN, thangCua } from "@/lib/lich";
import { getLichLop, getLopListTrang, getNhomLop, SO_DONG_LOP } from "@/lib/lop-hoc/queries";
import { getDanhMuc } from "@/lib/nhan-su/queries";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Lớp học: 2 chế độ xem Danh sách | Lịch. Lịch là nơi DUY NHẤT xem lịch (icon lịch topbar, tab "Lịch" mobile, link "Xem lịch tháng"
// ở Tổng quan đều dẫn về đây): mặc định "Tất cả lớp"; người có hồ sơ GV/TG chuyển được sang "Của tôi" (?cua=toi).
export default async function LopHocPage(props: PageProps<"/lop-hoc">) {
  const sp = await props.searchParams;

  const values = {
    q: first(sp.q).trim(),
    nhom_lop: first(sp.nhom_lop),
    trang_thai: first(sp.trang_thai),
    doi_tuong: first(sp.doi_tuong),
    kinh_phi: first(sp.kinh_phi),
  };
  const trang = Math.max(1, Number.parseInt(first(sp.trang), 10) || 1);
  const xemLich = first(sp.xem) === "lich";
  const homNay = ngayVN(new Date());
  const thang = docThang(first(sp.thang)) ?? thangCua(homNay);

  const session = await requireSession();
  const { isQuanTri, profile } = session;
  const laGvTg = !!profile.vai_tro_giang_day;
  const cuaToi = laGvTg && first(sp.cua) === "toi";

  // Tạo URL /lop-hoc giữ nguyên bộ lọc hiện tại, ghi đè vài tham số
  const href = (ghiDe: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...values, ...ghiDe })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/lop-hoc?${s}` : "/lop-hoc";
  };
  // Ở chế độ Lịch chỉ giữ bộ lọc nhóm lớp
  const hrefLich = (t = thang, toi = cuaToi) => {
    const p = new URLSearchParams({ xem: "lich" });
    if (khoaThang(t) !== homNay.slice(0, 7)) p.set("thang", khoaThang(t));
    if (toi) p.set("cua", "toi");
    if (values.nhom_lop) p.set("nhom_lop", values.nhom_lop);
    return `/lop-hoc?${p}`;
  };

  const { tu, den } = khoangLuoi(thang);
  const [danhSach, lichRows, baiCuaToi, nhomLop, loaiChungChi] = await Promise.all([
    xemLich ? null : getLopListTrang({ ...values, trang }),
    xemLich ? getLichLop(tu, den) : null,
    xemLich && cuaToi ? getLichCuaToi(profile.id) : null,
    getNhomLop(),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);
  const tongTrang = danhSach ? Math.max(1, Math.ceil(danhSach.tong / SO_DONG_LOP)) : 1;
  const giuLich: Record<string, string> = { xem: "lich" };
  if (khoaThang(thang) !== homNay.slice(0, 7)) giuLich.thang = khoaThang(thang);
  if (cuaToi) giuLich.cua = "toi";

  return (
    <LopListView
      rows={danhSach?.rows ?? []}
      tong={danhSach?.tong}
      values={values}
      nhomLop={nhomLop.filter((n) => n.dang_dung).map((n) => ({ id: n.id, ten: n.ten }))}
      hrefFor={(l) => `/lop-hoc/${l.id}`}
      trang={trang}
      tongTrang={tongTrang}
      hrefTrang={(t) => href({ trang: t > 1 ? String(t) : undefined })}
      capTaiVe={danhSach?.capTaiVe}
      cheDo={{
        xem: xemLich ? "lich" : "danh-sach",
        hrefDanhSach: href({}),
        hrefLich: hrefLich(),
        giu: xemLich ? giuLich : {},
        xoaHref: xemLich ? `/lop-hoc?${new URLSearchParams(giuLich)}` : "/lop-hoc",
      }}
      lich={
        xemLich ? (
          <LichLop
            lops={(lichRows ?? []).filter((l) => !values.nhom_lop || l.nhom_lop_id === values.nhom_lop)}
            thang={thang}
            hrefTruoc={hrefLich(congThang(thang, -1))}
            hrefSau={hrefLich(congThang(thang, 1))}
            hrefHomNay={hrefLich(thangCua(homNay))}
            cuaToi={laGvTg ? { bat: cuaToi, hrefTatCa: hrefLich(thang, false), hrefCuaToi: hrefLich(thang, true) } : undefined}
            baiCuaToi={(baiCuaToi ?? []).filter((s) => ngayVN(s.bai.bat_dau).startsWith(khoaThang(thang)))}
          />
        ) : undefined
      }
      action={
        isQuanTri ? (
          <>
            <NhapCsvLopDrawer />
            <LopFormDrawer nhomLop={nhomLop} loaiChungChi={loaiChungChi} />
          </>
        ) : undefined
      }
    />
  );
}
