import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { NhapCsvLopDrawer } from "@/components/lop-hoc/nhap-csv-lop-drawer";
import { requireSession } from "@/lib/auth/session";
import { getLopListTrang, getNhomLop, SO_DONG_LOP } from "@/lib/lop-hoc/queries";
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

  const [{ isQuanTri }, { rows, tong, capTaiVe }, nhomLop, loaiChungChi] = await Promise.all([
    requireSession(),
    getLopListTrang({ ...values, trang }),
    getNhomLop(),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);
  const tongTrang = Math.max(1, Math.ceil(tong / SO_DONG_LOP));

  const hrefTrang = (t: number) => {
    const p = new URLSearchParams();
    if (values.q) p.set("q", values.q);
    if (values.nhom_lop) p.set("nhom_lop", values.nhom_lop);
    if (values.trang_thai) p.set("trang_thai", values.trang_thai);
    if (values.doi_tuong) p.set("doi_tuong", values.doi_tuong);
    if (values.kinh_phi) p.set("kinh_phi", values.kinh_phi);
    if (t > 1) p.set("trang", String(t));
    const s = p.toString();
    return s ? `/lop-hoc?${s}` : "/lop-hoc";
  };

  return (
    <LopListView
      rows={rows}
      tong={tong}
      values={values}
      nhomLop={nhomLop.filter((n) => n.dang_dung).map((n) => ({ id: n.id, ten: n.ten }))}
      isQuanTri={isQuanTri}
      hrefFor={(l) => `/lop-hoc/${l.id}`}
      trang={trang}
      tongTrang={tongTrang}
      hrefTrang={hrefTrang}
      capTaiVe={capTaiVe}
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
