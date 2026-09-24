import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getA4, getCanhBaoPool, getKpiTongHop, getKpiTheoKy, getSanLuong, getVanHanhDangKy } from "@/lib/bao-cao/queries";
import { chonKy } from "@/lib/bao-cao/ky";
import { phanTram, tongHopLop, tongHopSanLuong } from "@/lib/bao-cao/tinh-toan";
import type { DongLop } from "@/lib/bao-cao/types";
import type { DongThanh } from "@/components/bao-cao/bieu-do";
import type { TrucRadar } from "@/components/danh-gia/kpi-charts";
import { getLopList } from "@/lib/lop-hoc/queries";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { getKyList } from "@/lib/kpi/queries";
import type { A4Row, KpiTheoKyRow, KyDanhGia, LopHocTongHop } from "@/types/database";

const gioFmt = (n: number) => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}h`;

// Trang Tổng quan (4.7b) — số liệu "toàn đơn vị" tái dùng thẳng từ Báo cáo (4.7) nhưng rút gọn, không lọc theo khung
// thời gian (khác 4.7): mọi thứ ở đây là ảnh chụp HIỆN TẠI, trả lời "hôm nay cần làm/biết gì". Không lặp lại các
// danh sách bản ghi thô đã có sẵn ở module khác (đăng ký chờ duyệt ở /dang-ky, đề xuất ở /nhan-su/de-xuat, thông báo
// ở /thong-bao, lớp đang mở ở /lop-hoc) — Tổng quan chỉ hiện PHÂN TÍCH (xu hướng, phân bố, độ công bằng) mà các
// module con không có chỗ nào hiện sẵn (phản hồi người dùng, xem quyết định ở CLAUDE.md mục 4.7b).
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
  // Phân tích cho kỳ đánh giá hiện tại (null nếu hệ thống chưa có kỳ nào) — thay cho các danh sách bản ghi thô đã bỏ
  ky: KyDanhGia | null;
  doDongDeu: number | null;
  top20: number | null;
  radarTrungBinh: TrucRadar[];
  gioTop5: DongThanh[];
  a4Top5: A4Row[];
}

// Số liệu "toàn đơn vị" dùng chung cho cả Admin và GV/TG (mục 4.7b: GV/TG cũng xem được, không chỉ Admin).
export async function getChungTongQuan(): Promise<ChungTongQuan> {
  const [kpiXuHuong, lopListGoc, kyList] = await Promise.all([getKpiTheoKy(6), getLopList(), getKyList()]);
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

  const dieuKy = chonKy(kyList, undefined);
  let doDongDeu: number | null = null;
  let top20: number | null = null;
  let radarTrungBinh: TrucRadar[] = [];
  let gioTop5: DongThanh[] = [];
  let a4Top5: A4Row[] = [];
  if (dieuKy) {
    const [slRows, kpiRows, a4Rows] = await Promise.all([
      getSanLuong(dieuKy.hienTai.tu, dieuKy.hienTai.den),
      getKpiTongHop(dieuKy.hienTai.id),
      getA4(dieuKy.hienTai.id),
    ]);
    const tongHopSl = tongHopSanLuong(slRows, "tat-ca");
    doDongDeu = tongHopSl.chiSoDongDeu;
    top20 = tongHopSl.top20;
    const tb = (ma: string) => {
      const gt = kpiRows.map((r) => r.diem_nhom[ma]).filter((v): v is number => typeof v === "number");
      return gt.length ? Math.round((gt.reduce((s, v) => s + v, 0) / gt.length) * 10) / 10 : null;
    };
    radarTrungBinh = [
      { nhan: "Sản lượng", gia_tri: tb("A") },
      { nhan: "Chuyên cần", gia_tri: tb("B") },
      { nhan: "Chất lượng", gia_tri: tb("C") },
    ];
    gioTop5 = [...tongHopSl.nguoi]
      .sort((a, b) => b.gio_thuc - a.gio_thuc || a.ho_ten.localeCompare(b.ho_ten, "vi"))
      .slice(0, 5)
      .map((r) => ({
        khoa: r.user_id,
        nhan: r.ho_ten,
        phu: `${VAI_TRO_LABEL[r.vai_tro]}${r.dang_tham_gia ? "" : " · đã nghỉ"}`,
        avatar: { ten: r.ho_ten, src: r.avatar_url },
        href: `/nhan-su/${r.user_id}`,
        gia_tri: r.gio_thuc,
        hien_thi: gioFmt(r.gio_thuc),
      }));
    a4Top5 = [...a4Rows]
      .filter((r) => r.a4_luy_ke > 0)
      .sort((a, b) => b.a4_luy_ke - a.a4_luy_ke || a.ho_ten.localeCompare(b.ho_ten, "vi"))
      .slice(0, 5);
  }

  return {
    kpiXuHuong,
    lapDaySlot,
    tongHop,
    tyLeDangKyTrungBinh: phanTram(tongHop.slotDaPhanCong, tongHop.slotTong),
    dsLopDangMo: dangMo,
    ky: dieuKy?.hienTai ?? null,
    doDongDeu,
    top20,
    radarTrungBinh,
    gioTop5,
    a4Top5,
  };
}

export interface ThongKeChung {
  nhanSu: { tong: number; xuHuong: number[] };
  lopDangMo: { tong: number; xuHuong: number[] };
  slotTrong: { tong: number; xuHuong: number[] };
  canhBaoPool: number;
}

// Hàng 3 thẻ stat đầu trang Tổng quan (Nhân sự/Lớp đang mở/Slot còn trống) — dùng chung cho cả khối Admin và khối
// GV/TG (mục 4.7b, sau phản hồi người dùng: GV/TG cũng cần xem số liệu vận hành toàn đơn vị này kèm sparkline, không
// chỉ Admin). Mọi bảng/RPC đọc ở đây đều công khai nội bộ (RLS cho phép mọi người đăng nhập), an toàn để mở rộng.
export async function getThongKeChung(): Promise<ThongKeChung> {
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
