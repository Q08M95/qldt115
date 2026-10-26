import { LichLop } from "@/components/lop-hoc/lich-lop";
import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { NhapCsvLopDrawer } from "@/components/lop-hoc/nhap-csv-lop-drawer";
import { requireSession } from "@/lib/auth/session";
import { congThang, docThang, khoangLuoi, khoaThang, ngayVN, thangCua } from "@/lib/lich";
import { getLichLop, getLopListTrang, getNhomLop, SO_DONG_LOP, type LichLopRow } from "@/lib/lop-hoc/queries";
import { boDau } from "@/lib/nhan-su/labels";
import { getDanhMuc } from "@/lib/nhan-su/queries";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

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
  const phuHop = first(sp.phu_hop) === "1";

  // Tạo URL /lop-hoc giữ nguyên bộ lọc hiện tại, ghi đè vài tham số
  const href = (ghiDe: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...values, ...ghiDe })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/lop-hoc?${s}` : "/lop-hoc";
  };
  const thamSoLich = (t = thang, ph = phuHop) => ({
    xem: "lich",
    thang: khoaThang(t) === homNay.slice(0, 7) ? undefined : khoaThang(t),
    phu_hop: ph ? "1" : undefined,
  });

  const { tu, den } = khoangLuoi(thang);
  const [{ isQuanTri, profile }, danhSach, lichRows, nhomLop, loaiChungChi] = await Promise.all([
    requireSession(),
    xemLich ? null : getLopListTrang({ ...values, trang }),
    xemLich ? getLichLop(tu, den) : null,
    getNhomLop(),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);
  const laGvTg = !!profile.vai_tro_giang_day;
  const tongTrang = danhSach ? Math.max(1, Math.ceil(danhSach.tong / SO_DONG_LOP)) : 1;

  // Bộ lọc của trang áp lên lịch ngay ở đây (dữ liệu chỉ 1 tháng nên lọc phía máy chủ app là đủ nhanh)
  const tuKhoa = boDau(values.q);
  const lich = (lichRows ?? []).filter(
    (b: LichLopRow) =>
      (!values.nhom_lop || b.nhom_lop_id === values.nhom_lop) &&
      (!values.trang_thai || b.trang_thai_hien_thi === values.trang_thai) &&
      (!values.doi_tuong || b.doi_tuong === values.doi_tuong) &&
      (!values.kinh_phi || b.loai_kinh_phi === values.kinh_phi) &&
      (!tuKhoa || boDau(b.lop_ten).includes(tuKhoa) || boDau(b.dia_diem ?? "").includes(tuKhoa) || boDau(b.bai_ten).includes(tuKhoa)) &&
      (!phuHop || !laGvTg || b.toi_du_dieu_kien || b.toi_day),
  );

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
        hrefLich: href({ xem: "lich" }),
        giu: Object.fromEntries(Object.entries(xemLich ? thamSoLich() : {}).filter(([, v]) => v)) as Record<string, string>,
        xoaHref: xemLich ? `/lop-hoc?${new URLSearchParams(Object.entries(thamSoLich()).filter(([, v]) => v) as [string, string][])}` : "/lop-hoc",
        phuHop: laGvTg ? { bat: phuHop, href: href(thamSoLich(thang, !phuHop)) } : undefined,
      }}
      lich={
        xemLich ? (
          // key theo tháng để ngày đang chọn đặt lại khi chuyển tháng
          <LichLop
            key={khoaThang(thang)}
            items={lich}
            thang={thang}
            hrefTruoc={href(thamSoLich(congThang(thang, -1)))}
            hrefSau={href(thamSoLich(congThang(thang, 1)))}
            hrefHomNay={href(thamSoLich(thangCua(homNay)))}
            laGvTg={laGvTg}
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
