import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCanhBaoPool, getKpiTheoKy, getVanHanhDangKy } from "@/lib/bao-cao/queries";
import { phanTram, tongHopLop } from "@/lib/bao-cao/tinh-toan";
import type { DongLop } from "@/lib/bao-cao/types";
import { getLopList } from "@/lib/lop-hoc/queries";
import { getDeXuatList } from "@/lib/nhan-su/queries";
import { LOAI_DE_XUAT_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { getViecCuaToi } from "@/lib/dang-ky/queries";
import type { KpiTheoKyRow, LopHocTongHop } from "@/types/database";

// Trang Tổng quan (4.7b) — số liệu "toàn đơn vị" tái dùng thẳng từ Báo cáo (4.7) nhưng rút gọn, không lọc theo khung
// thời gian (khác 4.7): mọi thứ ở đây là ảnh chụp HIỆN TẠI, trả lời "hôm nay cần làm/biết gì".
const SO_NGAY_XU_HUONG = 14;

// Xuất để trang demo /design/tong-quan dùng lại đúng 1 cách quy đổi, không lặp logic.
export function sangDongLop(l: LopHocTongHop): DongLop {
  return {
    id: l.id,
    ten: l.ten,
    nhom_lop_ten: l.nhom_lop_ten,
    doi_tuong: l.doi_tuong,
    loai_kinh_phi: l.loai_kinh_phi,
    ngay_bat_dau: l.ngay_bat_dau,
    ngay_ket_thuc: l.ngay_ket_thuc,
    trang_thai_hien_thi: l.trang_thai_hien_thi,
    so_bai: l.so_bai,
    slot_tong: l.gv_tong + l.tg_tong,
    slot_da_phan_cong: l.gv_da_phan_cong + l.tg_da_phan_cong,
  };
}

function ngayIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Đếm số dòng mới mỗi ngày trong `soNgay` ngày gần nhất (kể cả hôm nay) — dùng giờ UTC cho gọn (sai lệch tối đa 1 ngày
// so với giờ VN), chấp nhận được vì đây chỉ là sparkline trang trí cho xu hướng gần đây, không phải số liệu báo cáo
// chính thức (khác nguyên tắc giờ VN nghiêm ngặt dùng cho KPI/A1, mục 6).
function demTheoNgay(rows: { created_at: string }[], tuNgay: Date, soNgay: number): number[] {
  const dem = new Map<string, number>();
  for (const r of rows) {
    const ngay = r.created_at.slice(0, 10);
    dem.set(ngay, (dem.get(ngay) ?? 0) + 1);
  }
  const out: number[] = [];
  for (let i = 0; i < soNgay; i++) {
    const d = new Date(tuNgay);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(dem.get(ngayIso(d)) ?? 0);
  }
  return out;
}

export interface ChungTongQuan {
  kpiXuHuong: KpiTheoKyRow[];
  lapDaySlot: { id: string; ten: string; phanTram: number; hienThi: string }[];
  tongHop: ReturnType<typeof tongHopLop>;
  tyLeDangKyTrungBinh: number | null;
  dsLopDangMo: LopHocTongHop[];
}

// Số liệu "toàn đơn vị" dùng chung cho cả Admin và GV/TG (mục 4.7b: GV/TG cũng xem được, không chỉ Admin).
export async function getChungTongQuan(): Promise<ChungTongQuan> {
  const [kpiXuHuong, lopListGoc] = await Promise.all([getKpiTheoKy(6), getLopList()]);
  const lopList = lopListGoc.map(sangDongLop);
  const tongHop = tongHopLop(lopList.filter((l) => l.trang_thai_hien_thi !== "da_huy" && l.trang_thai_hien_thi !== "nhap"));
  const dangMo = lopListGoc.filter((l) => l.trang_thai_hien_thi === "dang_mo");
  const lapDaySlot = dangMo
    .map((l) => {
      const tong = l.gv_tong + l.tg_tong;
      const daPhanCong = l.gv_da_phan_cong + l.tg_da_phan_cong;
      return { id: l.id, ten: l.ten, tong, phanTram: phanTram(daPhanCong, tong) ?? 0, hienThi: `${daPhanCong}/${tong}` };
    })
    .filter((l) => l.tong > 0)
    .sort((a, b) => a.phanTram - b.phanTram)
    .slice(0, 6);

  return {
    kpiXuHuong,
    lapDaySlot,
    tongHop,
    tyLeDangKyTrungBinh: phanTram(tongHop.slotDaPhanCong, tongHop.slotTong),
    dsLopDangMo: dangMo,
  };
}

export interface ThongKeAdmin {
  nhanSu: { tong: number; xuHuong: number[] };
  lopDangMo: { tong: number; xuHuong: number[] };
  slotTrong: { tong: number; xuHuong: number[] };
  canhBaoPool: number;
}

// Hàng 3 thẻ stat đầu trang Tổng quan Admin (mục 4.7b) + số cảnh báo pool nhỏ (gộp vào thẻ "Việc cần duyệt" thay vì
// thêm thẻ thứ 4 — StatRow cố định 3 cột theo đúng ảnh mẫu, mục 8.5b).
export async function getThongKeAdmin(): Promise<ThongKeAdmin> {
  const supabase = await createClient();
  const tuNgay = new Date();
  tuNgay.setUTCDate(tuNgay.getUTCDate() - (SO_NGAY_XU_HUONG - 1));
  const tuIso = tuNgay.toISOString();
  const denStr = ngayIso(new Date());
  const tuStr = ngayIso(tuNgay);

  const [nsRes, nsMoiRes, lopMoiRes, canhBao, lopList, vanHanh] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("trang_thai_tham_gia", "dang_tham_gia"),
    supabase.from("profiles").select("created_at").gte("created_at", tuIso),
    supabase.from("lop_hoc").select("created_at").gte("created_at", tuIso),
    getCanhBaoPool(),
    getLopList(),
    getVanHanhDangKy(tuStr, denStr),
  ]);
  if (nsRes.error) throw new Error(`Không đếm được nhân sự: ${nsRes.error.message}`);
  if (nsMoiRes.error) throw new Error(`Không đọc được xu hướng nhân sự: ${nsMoiRes.error.message}`);
  if (lopMoiRes.error) throw new Error(`Không đọc được xu hướng lớp: ${lopMoiRes.error.message}`);

  const lopMo = lopList.filter((l) => l.trang_thai_hien_thi === "dang_mo");
  const slotTrongTong = lopMo.reduce((s, l) => s + Math.max(0, l.gv_tong + l.tg_tong - (l.gv_da_phan_cong + l.tg_da_phan_cong)), 0);

  return {
    nhanSu: { tong: nsRes.count ?? 0, xuHuong: demTheoNgay(nsMoiRes.data ?? [], tuNgay, SO_NGAY_XU_HUONG) },
    lopDangMo: { tong: lopMo.length, xuHuong: demTheoNgay(lopMoiRes.data ?? [], tuNgay, SO_NGAY_XU_HUONG) },
    // Không có lịch sử trạng thái slot — dùng "slot mới được phân công mỗi ngày" (đã có sẵn từ báo cáo #5) làm xu
    // hướng hoạt động lấp slot gần đây thay cho lịch sử slot-còn-trống (không tồn tại, không hồi tố được).
    slotTrong: { tong: slotTrongTong, xuHuong: vanHanh.serie.map((s) => s.phan_cong) },
    canhBaoPool: canhBao.length,
  };
}

export interface MucCanDuyet {
  id: string;
  loai: "dang_ky" | "de_xuat";
  tieuDe: string;
  phu: string;
  href: string;
  created_at: string;
}

// Bảng việc cần duyệt (mục 4.7b, Admin/Quản lý lớp): gộp đăng ký tự do đang chờ + đề xuất nhân sự đang chờ, mới nhất
// trước, rút gọn 8 dòng — xem đầy đủ ở /dang-ky và /nhan-su/de-xuat.
export async function getVieccanDuyetAdmin(userId: string): Promise<MucCanDuyet[]> {
  const [viec, deXuat] = await Promise.all([getViecCuaToi(userId, true), getDeXuatList("cho_duyet")]);
  const tuDangKy: MucCanDuyet[] = viec.can_duyet.map((d) => ({
    id: d.id,
    loai: "dang_ky",
    tieuDe: d.ho_ten,
    phu: `${VAI_TRO_LABEL[d.vai_tro]} · ${d.bai.ten} · ${d.bai.lop_ten}`,
    href: `/lop-hoc/${d.bai.lop_id}`,
    created_at: d.created_at,
  }));
  const tuDeXuat: MucCanDuyet[] = deXuat.map((d) => ({
    id: d.id,
    loai: "de_xuat",
    tieuDe: d.ho_ten,
    phu: LOAI_DE_XUAT_LABEL[d.loai],
    href: "/nhan-su/de-xuat",
    created_at: d.created_at,
  }));
  return [...tuDangKy, ...tuDeXuat].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
}
