import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { BaoCaoSanLuong } from "@/components/bao-cao/bc-san-luong";
import { BaoCaoTyLe } from "@/components/bao-cao/bc-ty-le-dang-ky";
import { BaoCaoVanHanhDangKy } from "@/components/bao-cao/bc-van-hanh-dang-ky";
import { BaoCaoVanHanhLop } from "@/components/bao-cao/bc-van-hanh-lop";
import { ThanhDieuKhien } from "@/components/bao-cao/thanh-dieu-khien";
import { tinhKhoang } from "@/lib/bao-cao/khoang";
import type { CanhBaoPool, DongLop, DongSanLuong, DongTyLe, VanHanhDangKy } from "@/lib/bao-cao/types";

// Trang demo Báo cáo (lượt 1) với dữ liệu giả — chỉ chạy khi dev, dùng để đối chiếu giao diện với ảnh mẫu. Production trả 404.
// ?bc=san-luong|ty-le-dang-ky|van-hanh-dang-ky|van-hanh-lop&vt=giang_vien|tro_giang&v=trong
const TEN = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức", "Võ Thu Hà", "Đặng Quốc Huy", "Bùi Lan Khanh", "Hoàng Gia Long", "Ngô Thanh Mai", "Đỗ Anh Nam", "Phan Thị Oanh", "Lý Quang Phúc", "Vũ Hải Quân", "Trương Diệu Linh", "Huỳnh Bảo Sơn", "Dương Mỹ Tâm", "Tạ Văn Uy", "Mai Thị Vân"];
const GIO = [22, 20, 18, 16.5, 14, 13, 12, 10, 9, 8, 6, 5, 4, 3, 2, 0, 0, 0];

const SAN_LUONG: DongSanLuong[] = TEN.map((ten, i) => ({
  user_id: `u${i}`,
  ho_ten: ten,
  avatar_url: null,
  vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
  dang_tham_gia: i !== 17,
  so_bai: Math.round(GIO[i] / 2.5),
  so_lop: Math.max(0, Math.round(GIO[i] / 8)),
  gio_thuc: GIO[i],
  so_bai_sap: i < 6 ? 2 : i < 9 ? 1 : 0,
  gio_sap: i < 6 ? 5 : i < 9 ? 2.5 : 0,
}));
const SAN_LUONG_TRUOC = SAN_LUONG.map((r) => ({ ...r, gio_thuc: Math.round(r.gio_thuc * 0.85 * 10) / 10 }));

const TY_LE: DongTyLe[] = TEN.slice(0, 14).map((ten, i) => ({
  user_id: `u${i}`,
  ho_ten: ten,
  avatar_url: null,
  vai_tro: i % 3 === 2 ? "tro_giang" : "giang_vien",
  so_bai_da_day: i === 11 ? 0 : 3 + (i % 5),
  so_tu_dang_ky: i === 11 ? 0 : (i * 2) % (3 + (i % 5) + 1),
  so_moi_dong_y: i % 4 === 3 ? 0 : 1 + (i % 3),
  so_moi_tu_choi: i % 4 === 0 ? 1 : 0,
}));
const TY_LE_TRUOC = TY_LE.map((r) => ({ ...r, so_tu_dang_ky: Math.max(0, r.so_tu_dang_ky - 1) }));

const SERIE = Array.from({ length: 30 }, (_, i) => ({
  ngay: `2026-09-${String(i + 1).padStart(2, "0")}`,
  dang_ky: [2, 0, 1, 3, 4, 0, 0, 2, 5, 3][i % 10],
  phan_cong: [1, 0, 0, 2, 3, 0, 0, 1, 6, 2, 0, 1, 2, 0, 0, 4, 1, 0, 2, 0, 0, 3, 1, 0, 0, 2, 5, 1, 0, 1][i],
}));
const VAN_HANH: VanHanhDangKy = {
  slot_tong: 64,
  slot_da_phan_cong: 47,
  gio_lap_tb: 31.4,
  so_slot_do_duyet: 41,
  dang_ky_moi: 58,
  loi_moi_gui: 22,
  dang_ky_cho: 6,
  loi_moi_cho: 3,
  serie: SERIE,
};
const VAN_HANH_TRUOC: VanHanhDangKy = { ...VAN_HANH, slot_tong: 52, slot_da_phan_cong: 33 };
const POOL: CanhBaoPool[] = [
  { bai_id: "b1", bai_ten: "Bài 3 · Cấp cứu ngưng tim", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-10-03T01:00:00Z", vai_tro: "giang_vien", slot_trong: 1, so_ung_vien: 0 },
  { bai_id: "b2", bai_ten: "Bài 5 · Thực hành", lop_id: "l1", lop_ten: "ACLS-08", bat_dau: "2026-10-04T01:00:00Z", vai_tro: "tro_giang", slot_trong: 3, so_ung_vien: 2 },
  { bai_id: "b3", bai_ten: "Bài 1 · Lý thuyết", lop_id: "l2", lop_ten: "SCC-LX-12", bat_dau: "2026-10-09T01:00:00Z", vai_tro: "giang_vien", slot_trong: 1, so_ung_vien: 1 },
];

const NHOM = ["ABCDE", "ACLS", "BLS", "SCC-LX", "SCC-CĐ"];
const TT = ["dang_mo", "dang_dien_ra", "da_hoan_thanh", "da_du_dang_ky", "da_huy", "nhap"] as const;
const LOP: DongLop[] = Array.from({ length: 11 }, (_, i) => ({
  id: `l${i}`,
  ten: `${NHOM[i % 5]}-${String(i + 1).padStart(2, "0")}`,
  nhom_lop_ten: NHOM[i % 5],
  doi_tuong: i % 4 === 3 ? "cong_dong" : "nhan_vien_y_te",
  loai_kinh_phi: i % 3 === 2 ? "khong_kinh_phi" : "co_kinh_phi",
  ngay_bat_dau: `2026-09-${String(2 + i * 2).padStart(2, "0")}`,
  ngay_ket_thuc: `2026-09-${String(4 + i * 2).padStart(2, "0")}`,
  trang_thai_hien_thi: TT[[0, 1, 2, 2, 1, 0, 3, 2, 4, 5, 2][i]],
  so_bai: 3 + (i % 3),
  slot_tong: 8 + i,
  slot_da_phan_cong: i === 4 ? 0 : 6 + (i % 4) + (i > 5 ? 2 : 0),
}));

export default async function DesignBaoCaoPage(props: { searchParams: Promise<{ bc?: string; vt?: string; v?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { bc = "san-luong", vt = "tat-ca", v } = await props.searchParams;
  const khoang = tinhKhoang("thang", "2026-09-15");
  const trong = v === "trong";
  const loc = vt === "giang_vien" || vt === "tro_giang" ? vt : "tat-ca";
  const khoa = (["san-luong", "ty-le-dang-ky", "van-hanh-dang-ky", "van-hanh-lop"] as const).find((k) => k === bc) ?? "san-luong";

  return (
    <AppShell user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }} isQuanTri period={{ name: "Quý 3/2026", daysLeft: 11 }} unreadCount={3} activeHref="/bao-cao">
      <div className="grid gap-5">
        <ThanhDieuKhien bc={khoa} khoang={khoang} vt={loc === "tat-ca" ? undefined : loc} />
        {khoa === "san-luong" && <BaoCaoSanLuong rows={trong ? [] : SAN_LUONG} rowsTruoc={SAN_LUONG_TRUOC} loc={loc} khoang={khoang} bc={khoa} />}
        {khoa === "ty-le-dang-ky" && <BaoCaoTyLe rows={trong ? [] : TY_LE} rowsTruoc={TY_LE_TRUOC} loc={loc} khoang={khoang} bc={khoa} />}
        {khoa === "van-hanh-dang-ky" && (
          <BaoCaoVanHanhDangKy
            hienTai={trong ? { ...VAN_HANH, slot_tong: 0, slot_da_phan_cong: 0, gio_lap_tb: null, so_slot_do_duyet: 0, serie: SERIE.map((s) => ({ ...s, phan_cong: 0 })) } : VAN_HANH}
            truoc={VAN_HANH_TRUOC}
            canhBao={trong ? [] : POOL}
            nguongPool={3}
          />
        )}
        {khoa === "van-hanh-lop" && <BaoCaoVanHanhLop rows={trong ? [] : LOP} />}
      </div>
    </AppShell>
  );
}
