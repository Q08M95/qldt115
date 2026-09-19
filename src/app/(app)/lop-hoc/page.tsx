import { LopFormDrawer } from "@/components/lop-hoc/lop-form-drawer";
import { LopListView } from "@/components/lop-hoc/lop-list-view";
import { requireSession } from "@/lib/auth/session";
import { getLopList, getNhomLop } from "@/lib/lop-hoc/queries";
import { sapXepLop } from "@/lib/lop-hoc/sap-xep";
import { boDau } from "@/lib/nhan-su/labels";
import { getDanhMuc } from "@/lib/nhan-su/queries";

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function LopHocPage(props: PageProps<"/lop-hoc">) {
  const sp = await props.searchParams;

  const [{ isQuanTri }, tatCa, nhomLop, loaiChungChi] = await Promise.all([
    requireSession(),
    getLopList(),
    getNhomLop(),
    getDanhMuc("danh_muc_loai_chung_chi"),
  ]);

  const values = {
    q: first(sp.q).trim(),
    nhom_lop: first(sp.nhom_lop),
    trang_thai: first(sp.trang_thai),
    doi_tuong: first(sp.doi_tuong),
    kinh_phi: first(sp.kinh_phi),
  };

  const q = boDau(values.q);
  const rows = sapXepLop(
    tatCa.filter((l) => {
      if (q && !boDau(l.ten).includes(q) && !boDau(l.dia_diem ?? "").includes(q)) return false;
      if (values.nhom_lop && l.nhom_lop_id !== values.nhom_lop) return false;
      if (values.trang_thai && l.trang_thai_hien_thi !== values.trang_thai) return false;
      if (values.doi_tuong && l.doi_tuong !== values.doi_tuong) return false;
      if (values.kinh_phi && l.loai_kinh_phi !== values.kinh_phi) return false;
      return true;
    }),
  );

  return (
    <LopListView
      rows={rows}
      values={values}
      nhomLop={nhomLop.filter((n) => n.dang_dung).map((n) => ({ id: n.id, ten: n.ten }))}
      isQuanTri={isQuanTri}
      hrefFor={(l) => `/lop-hoc/${l.id}`}
      action={isQuanTri ? <LopFormDrawer nhomLop={nhomLop} loaiChungChi={loaiChungChi} /> : undefined}
    />
  );
}
