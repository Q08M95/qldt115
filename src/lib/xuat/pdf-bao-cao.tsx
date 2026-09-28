import "server-only";

import path from "node:path";
import { Circle, Defs, Document, Font, LinearGradient, Page, Path, Rect, Stop, Svg, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/format";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import type { TongHopLop, TongHopSanLuong, TongHopTyLe, chuanHoaDeXuat } from "@/lib/bao-cao/tinh-toan";
import type { KhoangBaoCao } from "@/lib/bao-cao/khoang";
import type { CanhBaoPool, VanHanhDangKy } from "@/lib/bao-cao/types";
import { LOAI_DE_XUAT_LABEL, NHOM_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import type { A4Row, KpiKyRow, KpiTheoKyRow, KyDanhGia } from "@/types/database";

// Font Plus Jakarta Sans bản .woff (không dùng .woff2 — fontkit lỗi subset với vài file .woff2, đã kiểm chứng thủ công)
// có bộ chữ tiếng Việt riêng ("vietnamese" subset), khác hẳn Helvetica mặc định của react-pdf (thiếu dấu tiếng Việt).
const FONT_DIR = path.join(process.cwd(), "node_modules/@fontsource/plus-jakarta-sans/files");
let dangKyFont = false;
function dangKyFontNeuCanThiet() {
  if (dangKyFont) return;
  Font.register({
    family: "PJS",
    fonts: [
      { src: path.join(FONT_DIR, "plus-jakarta-sans-vietnamese-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "plus-jakarta-sans-vietnamese-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "plus-jakarta-sans-vietnamese-700-normal.woff"), fontWeight: 700 },
    ],
  });
  // Tắt tự động gạch nối tách âm tiết — quy tắc ngắt từ tiếng Anh mặc định của react-pdf không hợp với tiếng Việt
  // (từng làm vỡ chữ như "n-\năm"); chỉ ngắt dòng tại khoảng trắng.
  Font.registerHyphenationCallback((word) => [word]);
  dangKyFont = true;
}

// 4 màu gốc solid (mục 8.1, dùng cho chữ/viền) + cặp gradient nhạt→đậm cùng hue (dùng cho thanh/donut — Giai đoạn
// 11d: trước đây PDF cố tình dùng màu phẳng "cho đơn giản", nay thêm gradient nhẹ để gần với phong cách Soft SaaS
// của bản web hơn, cùng lúc mở rộng đủ 8 báo cáo thay vì chỉ 4+1 như trước).
const MAU = { navy: "#14468A", teal: "#0D9488", green: "#16A34A", blue: "#2563EB", neutral: "#A1A1AA", danger: "#DC2626", nen: "#F3F4F1", vien: "#E4E4E7", chuPhu: "#71717A", chuChinh: "#18181B" };
type MauKey = "navy" | "teal" | "green" | "blue" | "neutral";
const GRAD: Record<MauKey, [string, string]> = {
  navy: ["#166A8C", "#14468A"],
  teal: ["#5EEAD4", "#0D9488"],
  green: ["#86EFAC", "#16A34A"],
  blue: ["#93C5FD", "#2563EB"],
  neutral: ["#D4D4D8", "#A1A1AA"],
};

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 46, paddingHorizontal: 40, fontFamily: "PJS", fontSize: 9.5, color: MAU.chuChinh },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 2 },
  h3: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  nhoXam: { fontSize: 9, color: MAU.chuPhu },
  doanVan: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 6, color: MAU.chuChinh },
  the: { borderWidth: 1, borderColor: MAU.vien, borderRadius: 8, padding: 10, backgroundColor: "#FFFFFF" },
  hangThe: { flexDirection: "row", gap: 10, marginBottom: 12 },
  soTo: { fontSize: 20, fontWeight: 700 },
  nhanTo: { fontSize: 8.5, color: MAU.chuPhu, marginBottom: 2 },
  bang: { borderWidth: 1, borderColor: MAU.vien, borderRadius: 6, overflow: "hidden", marginBottom: 12 },
  hangBang: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: MAU.vien },
  hangBangCuoi: { flexDirection: "row" },
  oHeader: { backgroundColor: MAU.navy, color: "#FFFFFF", fontWeight: 700, fontSize: 8.5, padding: 5 },
  o: { fontSize: 8.5, padding: 5 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MAU.chuPhu, borderTopWidth: 1, borderTopColor: MAU.vien, paddingTop: 6 },
});

function Chan({ trang }: { trang: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Báo cáo tổng hợp — Tổ đào tạo</Text>
      <Text>{trang}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
    </View>
  );
}

function TieuDeTrang({ so, ten, ghiChu }: { so: number; ten: string; ghiChu?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.h2}>{`${so}. ${ten}`}</Text>
      {ghiChu && <Text style={s.nhoXam}>{ghiChu}</Text>}
    </View>
  );
}

function TheSo({ nhan, so, mau }: { nhan: string; so: string | number; mau?: string }) {
  return (
    <View style={[s.the, { flex: 1 }, mau ? { borderLeftWidth: 3, borderLeftColor: mau } : undefined]}>
      <Text style={s.nhanTo}>{nhan}</Text>
      <Text style={[s.soTo, mau ? { color: mau } : undefined]}>{so}</Text>
    </View>
  );
}

// Thanh ngang: nhãn bên trái, thanh gradient (nhạt→đậm cùng 1 hue) + số bên phải — dùng chung cho mọi bảng xếp hạng
function ThanhXepHang({ items, mau = "navy" }: { items: { nhan: string; phu?: string; giaTri: number; hienThi: string }[]; mau?: MauKey }) {
  const toiDa = Math.max(...items.map((i) => i.giaTri), 0.0001);
  const [tu, den] = GRAD[mau];
  return (
    <View>
      {items.map((it, i) => {
        const pct = Math.max(2, (it.giaTri / toiDa) * 100);
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
            <View style={{ width: 130 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 600 }}>{it.nhan}</Text>
              {it.phu && <Text style={{ fontSize: 7.5, color: MAU.chuPhu }}>{it.phu}</Text>}
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Svg width="100%" height={9} viewBox="0 0 100 9">
                <Defs>
                  <LinearGradient id="thanh-g" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={tu} />
                    <Stop offset="100%" stopColor={den} />
                  </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={100} height={9} rx={4} fill={MAU.nen} />
                <Rect x={0} y={0} width={pct} height={9} rx={4} fill="url(#thanh-g)" />
              </Svg>
            </View>
            <Text style={{ width: 48, textAlign: "right", fontSize: 8.5, fontWeight: 700 }}>{it.hienThi}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Donut đơn giản (2-3 lát) vẽ bằng Svg Circle strokeDasharray — MÀU PHẲNG (không gradient): đã thử tô gradient qua
// url(#id) kết hợp transform="rotate()" như ThanhXepHang nhưng react-pdf/pdfkit render ra nét đen thay vì màu (kiểm
// chứng bằng cách rasterize PDF thật), nên giữ nguyên cách làm màu phẳng ban đầu cho riêng component này.
const MAU_SOLID: Record<MauKey, string> = { navy: MAU.navy, teal: MAU.teal, green: MAU.green, blue: MAU.blue, neutral: MAU.neutral };
function DonutPdf({ lat, giua }: { lat: { so: number; mau: MauKey }[]; giua: string }) {
  const R = 32;
  const C = 2 * Math.PI * R;
  const tong = lat.reduce((s2, l) => s2 + l.so, 0);
  let lui = 0;
  return (
    <Svg width={90} height={90} viewBox="0 0 90 90">
      <Circle cx={45} cy={45} r={R} stroke={MAU.nen} strokeWidth={11} fill="none" />
      {/* react-pdf chưa hỗ trợ strokeDashoffset — dùng transform rotate thêm theo độ dài cung trước đó để thay thế */}
      {tong > 0 &&
        lat
          .filter((l) => l.so > 0)
          .map((l, i) => {
            const dai = (l.so / tong) * C;
            const goc = -90 + (lui / C) * 360;
            lui += dai;
            return <Circle key={i} cx={45} cy={45} r={R} stroke={MAU_SOLID[l.mau]} strokeWidth={11} fill="none" strokeDasharray={`${Math.max(0.5, dai - 2)} ${C}`} transform={`rotate(${goc} 45 45)`} />;
          })}
      <Text x={45} y={49} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700 }}>
        {giua}
      </Text>
    </Svg>
  );
}

// Chart đường + vùng gradient dưới đường (kiểu AreaXuHuong bên web) — dùng riêng cho #2 Xu hướng KPI
function DuongXuHuongPdf({ diem, mau = "navy" }: { diem: { nhan: string; gia_tri: number }[]; mau?: MauKey }) {
  const W = 480;
  const H = 130;
  const P = 4;
  const PB = 16;
  const vals = diem.map((d) => d.gia_tri);
  const max = Math.max(...vals, 1);
  const min = Math.min(0, ...vals);
  const doCao = Math.max(1, max - min);
  const x = (i: number) => P + ((W - 2 * P) * i) / Math.max(1, diem.length - 1);
  const y = (v: number) => H - PB - ((v - min) / doCao) * (H - PB - P);
  const duong = diem.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.gia_tri).toFixed(1)}`).join(" ");
  const vung = `${duong} L${x(diem.length - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z`;
  const [tu, den] = GRAD[mau];
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="xh-net" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={tu} />
          <Stop offset="100%" stopColor={den} />
        </LinearGradient>
        <LinearGradient id="xh-nen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={den} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={den} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={vung} fill="url(#xh-nen)" />
      <Path d={duong} stroke="url(#xh-net)" strokeWidth={2.2} fill="none" />
      {diem.map((d, i) => (
        <Circle key={i} cx={x(i)} cy={y(d.gia_tri)} r={2.6} fill={den} />
      ))}
      {diem.map((d, i) => (
        <Text key={`t-${i}`} x={x(i)} y={H - 3} textAnchor="middle" fill={MAU.chuPhu} style={{ fontSize: 7.5 }}>
          {d.nhan}
        </Text>
      ))}
    </Svg>
  );
}

function BangDon({ cot, dong }: { cot: { nhan: string; rong?: number; phai?: boolean }[]; dong: (string | number)[][] }) {
  return (
    <View style={s.bang}>
      <View style={s.hangBang}>
        {cot.map((c, i) => (
          <Text key={i} style={[s.oHeader, { flex: c.rong ?? 1, textAlign: c.phai ? "right" : "left" }]}>
            {c.nhan}
          </Text>
        ))}
      </View>
      {dong.map((r, ri) => (
        <View key={ri} wrap={false} style={ri === dong.length - 1 ? s.hangBangCuoi : s.hangBang}>
          {r.map((v, ci) => (
            <Text key={ci} style={[s.o, { flex: cot[ci].rong ?? 1, textAlign: cot[ci].phai ? "right" : "left" }]}>
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const so1 = (n: number, toiDa = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: toiDa });
const pt = (v: number | null) => (v === null ? "–" : `${so1(v, 1)}%`);
function tenNgan(ten: string) {
  const m = /Quý\s*(\d)\s*\/\s*(\d{4})/i.exec(ten);
  return m ? `Q${m[1]}/${m[2]}` : ten.length > 10 ? `${ten.slice(0, 9)}…` : ten;
}
function thoiGianLap(gio: number | null): string {
  if (gio === null) return "–";
  if (gio < 1) return `${Math.max(1, Math.round(gio * 60))} phút`;
  if (gio < 48) return `${so1(gio, 1)} giờ`;
  return `${so1(gio / 24, 1)} ngày`;
}

export interface DuLieuBaoCaoPdf {
  xuatLuc: Date;
  ky: KyDanhGia;
  khoang: KhoangBaoCao;
  kpiRows: KpiKyRow[];
  kpiTheoKy: KpiTheoKyRow[];
  sanLuong: TongHopSanLuong;
  tyLe: TongHopTyLe;
  vanHanh: VanHanhDangKy;
  canhBao: CanhBaoPool[];
  nguongPool: number;
  a4Rows: A4Row[];
  deXuat: ReturnType<typeof chuanHoaDeXuat>;
  lopTong: TongHopLop;
}

export async function taoFileBaoCaoPdf(d: DuLieuBaoCaoPdf): Promise<Buffer> {
  dangKyFontNeuCanThiet();

  const kpiTb = d.kpiRows.length ? d.kpiRows.reduce((s2, r) => s2 + r.kpi, 0) / d.kpiRows.length : null;
  const top15Kpi = d.kpiRows.slice(0, 15);
  const top15Gio = [...d.sanLuong.nguoi].sort((a, b) => b.gio_thuc - a.gio_thuc).slice(0, 15);
  const top15A4 = d.a4Rows.filter((r) => r.a4_luy_ke > 0).slice(0, 15);
  const layDaySlot = d.lopTong.slotTong > 0 ? (d.lopTong.slotDaPhanCong / d.lopTong.slotTong) * 100 : null;

  // #2 — chỉ những kỳ đã có kết quả KPI mới đưa vào chart/thẻ số (kỳ Chờ duyệt/chưa đóng chưa công bố có thể null)
  const kyCoDuLieu = d.kpiTheoKy.filter((k) => k.kpi_tb !== null);
  const kyHienTai = kyCoDuLieu.at(-1) ?? null;

  // #4 — xếp theo A2 rồi A3 giống màn hình web, top 15 để vừa 1 trang
  const top15TyLe = [...d.tyLe.dong].sort((a, b) => (b.a2 ?? -1) - (a.a2 ?? -1) || (b.a3 ?? -1) - (a.a3 ?? -1)).slice(0, 15);

  // #5 — tỷ lệ lấp đầy + phần còn thiếu, cảnh báo pool nhỏ hiện tại (không theo khoảng, giống báo cáo #5 trên web)
  const layDay5 = d.vanHanh.slot_tong > 0 ? (d.vanHanh.slot_da_phan_cong / d.vanHanh.slot_tong) * 100 : null;
  const thieu5 = Math.max(0, d.vanHanh.slot_tong - d.vanHanh.slot_da_phan_cong);
  const top15CanhBao = d.canhBao.slice(0, 15);

  const doc = (
    <Document title={`Báo cáo tổng hợp — ${d.ky.ten}`} author="Hệ thống QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY">
      {/* ===== Trang bìa ===== */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 140, alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 10 }}>Báo cáo tổng hợp</Text>
          <Text style={{ fontSize: 13, color: MAU.chuPhu, textAlign: "center", marginBottom: 30 }}>Tổ đào tạo — QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY</Text>
          <View style={{ borderWidth: 1, borderColor: MAU.vien, borderRadius: 10, padding: 16, width: 320 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Kỳ đánh giá (báo cáo #1, #2, #6, #7)</Text>
              <Text style={{ fontWeight: 700 }}>{d.ky.ten}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Trạng thái kỳ</Text>
              <Text style={{ fontWeight: 700 }}>{TRANG_THAI_KY_LABEL[d.ky.trang_thai]}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Khung thời gian (báo cáo #3, #4, #5, #8)</Text>
              <Text style={{ fontWeight: 700 }}>{d.khoang.nhan}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.nhoXam}>Ngày xuất</Text>
              <Text style={{ fontWeight: 700 }}>{fmtDate(d.xuatLuc.toISOString())}</Text>
            </View>
          </View>
          <Text style={{ marginTop: 30, fontSize: 8.5, color: MAU.chuPhu, textAlign: "center", maxWidth: 340 }}>
            Gồm đủ 8 báo cáo của module Báo cáo: KPI tổng hợp, Xu hướng KPI, Sản lượng giảng dạy, Tự đăng ký & nhận lời mời, Vận hành đăng ký, A4 — Lớp không kinh phí, Đề xuất nhân sự, Vận hành lớp học. Phần giải thích chỉ số ở phụ lục cuối tài liệu.
          </Text>
        </View>
      </Page>

      {/* ===== #1 KPI tổng hợp ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={1} ten="KPI tổng hợp toàn đơn vị" ghiChu={`${d.ky.ten} · ${fmtDate(d.ky.tu)} – ${fmtDate(d.ky.den)} · ${TRANG_THAI_KY_LABEL[d.ky.trang_thai]}`} />
        <View style={s.hangThe}>
          <TheSo nhan="KPI trung bình" so={kpiTb === null ? "–" : so1(kpiTb)} mau={MAU.navy} />
          <TheSo nhan="Số người có KPI" so={d.kpiRows.length} />
          <TheSo nhan="Cao nhất" so={d.kpiRows[0] ? so1(d.kpiRows[0].kpi) : "–"} />
        </View>
        {top15Kpi.length > 0 && (
          <>
            <Text style={s.h3}>Top {top15Kpi.length} theo KPI</Text>
            <ThanhXepHang mau="navy" items={top15Kpi.map((r) => ({ nhan: r.ho_ten, phu: r.nhom ? NHOM_LABEL[r.nhom] : VAI_TRO_LABEL[r.vai_tro ?? "giang_vien"], giaTri: r.kpi, hienThi: so1(r.kpi) }))} />
          </>
        )}
        <Text style={s.h3}>Bảng chi tiết</Text>
        {top15Kpi.length === 0 ? (
          <Text style={s.doanVan}>Chưa có ai dạy Bài nào đã kết thúc trong kỳ này.</Text>
        ) : (
          <BangDon
            cot={[{ nhan: "Hạng", rong: 0.5 }, { nhan: "Họ tên", rong: 2 }, { nhan: "Vai trò", rong: 1.4 }, { nhan: "KPI", rong: 0.7, phai: true }, { nhan: "A", rong: 0.6, phai: true }, { nhan: "B", rong: 0.6, phai: true }, { nhan: "C", rong: 0.6, phai: true }, { nhan: "Giờ dạy", rong: 0.8, phai: true }]}
            dong={top15Kpi.map((r) => [r.hang, r.ho_ten, r.nhom ? NHOM_LABEL[r.nhom] : VAI_TRO_LABEL[r.vai_tro ?? "giang_vien"], so1(r.kpi), so1(r.diem_nhom.A ?? 0), so1(r.diem_nhom.B ?? 0), so1(r.diem_nhom.C ?? 0), so1(r.gio_thuc)])}
          />
        )}
        {d.kpiRows.length > top15Kpi.length && <Text style={s.nhoXam}>Còn {d.kpiRows.length - top15Kpi.length} người khác — xem đầy đủ trong file Excel hoặc trang Báo cáo.</Text>}
        <Chan trang="1. KPI tổng hợp" />
      </Page>

      {/* ===== #2 Xu hướng KPI ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={2} ten="Xu hướng KPI theo thời gian" ghiChu={`${d.kpiTheoKy.length} kỳ gần nhất, từ cũ đến mới`} />
        {kyCoDuLieu.length === 0 ? (
          <Text style={s.doanVan}>Chưa có kỳ nào có kết quả KPI để vẽ xu hướng.</Text>
        ) : (
          <>
            <View style={s.hangThe}>
              <TheSo nhan={`KPI TB ${kyHienTai ? tenNgan(kyHienTai.ten) : ""}`} so={kyHienTai?.kpi_tb == null ? "–" : so1(kyHienTai.kpi_tb)} mau={MAU.navy} />
              <TheSo nhan="Số người có KPI" so={kyHienTai?.so_nguoi ?? 0} />
              <TheSo nhan="Số kỳ hiển thị" so={kyCoDuLieu.length} />
            </View>
            {kyCoDuLieu.length >= 2 ? (
              <View style={{ marginBottom: 12 }}>
                <DuongXuHuongPdf mau="navy" diem={kyCoDuLieu.map((k) => ({ nhan: tenNgan(k.ten), gia_tri: k.kpi_tb ?? 0 }))} />
              </View>
            ) : (
              <Text style={s.doanVan}>Cần ít nhất 2 kỳ có kết quả để vẽ xu hướng.</Text>
            )}
            <Text style={s.h3}>Chi tiết theo kỳ</Text>
            <BangDon
              cot={[{ nhan: "Kỳ", rong: 1.6 }, { nhan: "KPI TB", rong: 1, phai: true }, { nhan: "Giảng viên", rong: 1, phai: true }, { nhan: "Trợ giảng", rong: 1, phai: true }, { nhan: "Số người", rong: 1, phai: true }]}
              dong={[...d.kpiTheoKy].reverse().map((k) => [k.ten, k.kpi_tb == null ? "–" : so1(k.kpi_tb), k.kpi_tb_gv == null ? "–" : so1(k.kpi_tb_gv), k.kpi_tb_tg == null ? "–" : so1(k.kpi_tb_tg), k.so_nguoi])}
            />
          </>
        )}
        <Chan trang="2. Xu hướng KPI" />
      </Page>

      {/* ===== #3 Sản lượng giảng dạy ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={3} ten="Sản lượng giảng dạy" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Tổng giờ đã dạy" so={`${so1(d.sanLuong.tongGio)} giờ`} mau={MAU.teal} />
          <TheSo nhan="Giờ TB / người" so={`${so1(d.sanLuong.gioTB)} giờ`} />
          <TheSo nhan="Chưa dạy giờ nào" so={`${d.sanLuong.soNguoiKhongDay}/${d.sanLuong.soNguoi}`} />
        </View>
        {top15Gio.length > 0 && (
          <>
            <Text style={s.h3}>Top {top15Gio.length} theo giờ dạy</Text>
            <ThanhXepHang mau="teal" items={top15Gio.map((r) => ({ nhan: r.ho_ten, phu: `${VAI_TRO_LABEL[r.vai_tro]} · ${r.so_bai} Bài`, giaTri: r.gio_thuc, hienThi: `${so1(r.gio_thuc)}h` }))} />
          </>
        )}
        <Text style={s.doanVan}>
          {d.sanLuong.chiSoDongDeu === null
            ? "Chưa đủ dữ liệu để tính chỉ số đồng đều."
            : `Chỉ số đồng đều: ${d.sanLuong.chiSoDongDeu}/100 (100 = mọi người dạy bằng nhau).${d.sanLuong.top20 !== null ? ` 20% người dạy nhiều nhất đang đảm nhiệm ${d.sanLuong.top20}% tổng giờ.` : ""}`}
        </Text>
        {top15Gio.length === 0 && <Text style={s.doanVan}>Chưa có ai dạy trong khoảng thời gian này.</Text>}
        <Chan trang="3. Sản lượng giảng dạy" />
      </Page>

      {/* ===== #4 Tự đăng ký & nhận lời mời ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={4} ten="Tự đăng ký & nhận lời mời" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Tự đăng ký (A2)" so={pt(d.tyLe.a2)} mau={MAU.teal} />
          <TheSo nhan="Nhận lời mời (A3)" so={pt(d.tyLe.a3)} />
          <TheSo nhan="Có dữ liệu" so={d.tyLe.soNguoi} />
        </View>
        {top15TyLe.length === 0 ? (
          <Text style={s.doanVan}>Chưa có ai dạy xong Bài hoặc phản hồi lời mời trong khoảng thời gian này.</Text>
        ) : (
          <>
            <Text style={s.h3}>Top {top15TyLe.length} theo A2 (tự đăng ký)</Text>
            <ThanhXepHang mau="teal" items={top15TyLe.map((r) => ({ nhan: r.ho_ten, phu: VAI_TRO_LABEL[r.vai_tro], giaTri: r.a2 ?? 0, hienThi: pt(r.a2) }))} />
            <Text style={s.h3}>Bảng chi tiết</Text>
            <BangDon
              cot={[{ nhan: "Họ tên", rong: 2 }, { nhan: "Vai trò", rong: 1.2 }, { nhan: "Bài đã dạy", rong: 0.9, phai: true }, { nhan: "A2", rong: 0.7, phai: true }, { nhan: "Lời mời", rong: 0.9, phai: true }, { nhan: "A3", rong: 0.7, phai: true }]}
              dong={top15TyLe.map((r) => [r.ho_ten, VAI_TRO_LABEL[r.vai_tro], r.so_bai_da_day, pt(r.a2), r.soMoi, pt(r.a3)])}
            />
          </>
        )}
        <Text style={s.doanVan}>A2: Bài tự đăng ký và được duyệt ÷ tổng Bài đã dạy. A3: lời mời được đồng ý ÷ lời mời đã phản hồi (đồng ý + từ chối) — lời mời còn chờ chưa tính.</Text>
        <Chan trang="4. Tự đăng ký & nhận lời mời" />
      </Page>

      {/* ===== #5 Vận hành đăng ký ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={5} ten="Vận hành đăng ký & phân công" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Tỷ lệ lấp đầy" so={layDay5 === null ? "–" : pt(layDay5)} mau={MAU.green} />
          <TheSo nhan="TB lấp 1 slot" so={thoiGianLap(d.vanHanh.gio_lap_tb)} />
          <TheSo nhan="Đang chờ xử lý" so={d.vanHanh.dang_ky_cho + d.vanHanh.loi_moi_cho} />
        </View>
        {layDay5 !== null && (
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 14, alignItems: "center" }}>
            <DonutPdf
              giua={String(d.vanHanh.slot_tong)}
              lat={[
                { so: d.vanHanh.slot_da_phan_cong, mau: "green" },
                { so: thieu5, mau: "neutral" },
              ]}
            />
            <View>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={{ color: MAU.green, fontWeight: 700 }}>■ </Text>Đã phân công: {d.vanHanh.slot_da_phan_cong}
              </Text>
              <Text style={{ fontSize: 8.5, marginTop: 3 }}>
                <Text style={{ color: MAU.neutral, fontWeight: 700 }}>■ </Text>Còn thiếu: {thieu5}
              </Text>
              <Text style={{ fontSize: 8.5, marginTop: 3, color: MAU.chuPhu }}>{d.vanHanh.dang_ky_moi} lượt tự đăng ký · {d.vanHanh.loi_moi_gui} lời mời gửi đi trong khoảng này</Text>
            </View>
          </View>
        )}
        <Text style={s.h3}>Bài cảnh báo ít người đủ điều kiện (hiện tại, không theo khoảng)</Text>
        {top15CanhBao.length === 0 ? (
          <Text style={s.doanVan}>Mọi Bài còn slot trống đều có đủ ứng viên (ngưỡng dưới {d.nguongPool} người).</Text>
        ) : (
          <BangDon
            cot={[{ nhan: "Lớp", rong: 1.6 }, { nhan: "Bài", rong: 1.6 }, { nhan: "Vai trò", rong: 1 }, { nhan: "Slot trống", rong: 0.8, phai: true }, { nhan: "Ứng viên", rong: 0.8, phai: true }]}
            dong={top15CanhBao.map((c) => [c.lop_ten, c.bai_ten, VAI_TRO_LABEL[c.vai_tro], c.slot_trong, c.so_ung_vien === 0 ? "Không có ai" : c.so_ung_vien])}
          />
        )}
        {d.canhBao.length > top15CanhBao.length && <Text style={s.nhoXam}>Còn {d.canhBao.length - top15CanhBao.length} Bài khác — xem đầy đủ trong file Excel hoặc trang Báo cáo.</Text>}
        <Chan trang="5. Vận hành đăng ký" />
      </Page>

      {/* ===== #6 A4 ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={6} ten="A4 — Đóng góp lớp không kinh phí" ghiChu={`Lũy kế tính đến hiện tại · Trong kỳ: ${d.ky.ten}`} />
        <View style={s.hangThe}>
          <TheSo nhan="Tổng lớp không KP (lũy kế)" so={d.a4Rows.reduce((s2, r) => s2 + r.a4_luy_ke, 0)} mau={MAU.green} />
          <TheSo nhan={`Trong ${d.ky.ten}`} so={d.a4Rows.reduce((s2, r) => s2 + r.a4_ky, 0)} />
          <TheSo nhan="Người có đóng góp" so={d.a4Rows.filter((r) => r.a4_luy_ke > 0).length} />
        </View>
        {top15A4.length > 0 ? (
          <>
            <Text style={s.h3}>Bảng xếp hạng lũy kế</Text>
            <ThanhXepHang mau="green" items={top15A4.map((r) => ({ nhan: r.ho_ten, phu: r.vai_tro ? VAI_TRO_LABEL[r.vai_tro] : undefined, giaTri: r.a4_luy_ke, hienThi: `${r.a4_luy_ke}` }))} />
          </>
        ) : (
          <Text style={s.doanVan}>Chưa có ai tham gia dạy lớp không kinh phí.</Text>
        )}
        <Text style={s.doanVan}>Mỗi lớp không kinh phí chỉ tính 1 lần cho mỗi người, dù dạy bao nhiêu Bài trong lớp đó. Lũy kế dùng để xét vinh danh cuối năm và tie-break khi xét khen thưởng (KPI bằng nhau).</Text>
        <Chan trang="6. A4 — Lớp không kinh phí" />
      </Page>

      {/* ===== #7 Đề xuất nhân sự ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={7} ten="Đề xuất nhân sự" ghiChu={d.ky.ten} />
        <View style={s.hangThe}>
          <TheSo nhan="Chờ duyệt" so={d.deXuat.cho_duyet} mau={MAU.navy} />
          <TheSo nhan="Đã duyệt" so={d.deXuat.da_duyet} />
          <TheSo nhan="Tỷ lệ duyệt" so={pt(d.deXuat.tyLeDuyet)} />
        </View>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 14, alignItems: "center" }}>
          {d.deXuat.da_duyet + d.deXuat.bo_qua > 0 ? (
            <DonutPdf
              giua={pt(d.deXuat.tyLeDuyet)}
              lat={[
                { so: d.deXuat.da_duyet, mau: "green" },
                { so: d.deXuat.bo_qua, mau: "neutral" },
              ]}
            />
          ) : (
            <Text style={s.doanVan}>Chưa có đề xuất nào được xử lý xong.</Text>
          )}
          <View>
            <Text style={{ fontSize: 8.5 }}>
              <Text style={{ color: MAU.green, fontWeight: 700 }}>■ </Text>Đã duyệt: {d.deXuat.da_duyet}
            </Text>
            <Text style={{ fontSize: 8.5, marginTop: 3 }}>
              <Text style={{ color: MAU.neutral, fontWeight: 700 }}>■ </Text>Đã bỏ qua: {d.deXuat.bo_qua}
            </Text>
          </View>
        </View>
        <Text style={s.h3}>Theo loại đề xuất</Text>
        <BangDon
          cot={[{ nhan: "Loại đề xuất", rong: 2 }, { nhan: "Chờ duyệt", rong: 1, phai: true }, { nhan: "Đã duyệt", rong: 1, phai: true }, { nhan: "Đã bỏ qua", rong: 1, phai: true }, { nhan: "Tổng", rong: 1, phai: true }]}
          dong={d.deXuat.theo_loai.map((l) => [LOAI_DE_XUAT_LABEL[l.loai], l.cho_duyet || "–", l.da_duyet || "–", l.bo_qua || "–", l.cho_duyet + l.da_duyet + l.bo_qua || "–"])}
        />
        <Text style={s.doanVan}>Chỉ hiển thị số liệu thống kê theo loại và trạng thái — không nêu ai được đề xuất gì (mức chi tiết đó thuộc Nhật ký hệ thống, chỉ Admin/Quản lý lớp).</Text>
        <Chan trang="7. Đề xuất nhân sự" />
      </Page>

      {/* ===== #8 Vận hành lớp học ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={8} ten="Vận hành lớp học" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Số lớp" so={d.lopTong.tong} mau={MAU.blue} />
          <TheSo nhan="Lấp đầy slot" so={layDaySlot === null ? "–" : pt(layDaySlot)} />
          <TheSo nhan="Đã hoàn thành" so={d.lopTong.theoTrangThai.find((x) => x.khoa === "da_hoan_thanh")?.so ?? 0} />
        </View>
        {d.lopTong.theoTrangThai.length > 0 && (
          <>
            <Text style={s.h3}>Theo trạng thái</Text>
            <BangDon cot={[{ nhan: "Trạng thái", rong: 2 }, { nhan: "Số lớp", rong: 1, phai: true }]} dong={d.lopTong.theoTrangThai.map((x) => [TRANG_THAI_LOP_LABEL[x.khoa as keyof typeof TRANG_THAI_LOP_LABEL] ?? x.khoa, x.so])} />
          </>
        )}
        {d.lopTong.theoNhomLop.length > 0 && (
          <>
            <Text style={s.h3}>Theo nhóm lớp</Text>
            <ThanhXepHang mau="blue" items={d.lopTong.theoNhomLop.map((n) => ({ nhan: n.nhan, giaTri: n.so, hienThi: `${n.so}` }))} />
          </>
        )}
        <Chan trang="8. Vận hành lớp học" />
      </Page>

      {/* ===== Phụ lục hướng dẫn ===== */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Phụ lục — Định nghĩa chỉ số và cách đọc số liệu</Text>
        <Text style={s.h3}>Nhóm A — Sản lượng giảng dạy</Text>
        <Text style={s.doanVan}>A1: tổng giờ/buổi đã dạy trong kỳ (từ điểm danh), nhân hệ số độ khó rồi xếp hạng phần trăm (percentile) theo nhóm nhân sự. A2: tỷ lệ Bài tự đăng ký và được duyệt trên tổng Bài đã dạy. A3: tỷ lệ lời mời được đồng ý trên tổng lời mời đã phản hồi (đồng ý + từ chối). A4: số lớp không kinh phí đã tham gia dạy, đếm 1 lần cho mỗi lớp dù dạy bao nhiêu Bài — không tính vào công thức KPI, dùng riêng để xét vinh danh và tie-break khen thưởng.</Text>
        <Text style={s.h3}>Nhóm B — Chuyên cần</Text>
        <Text style={s.doanVan}>B1: điểm danh có mặt đúng giờ, giảm tuyến tính theo số phút trễ tới một ngưỡng tối đa (cấu hình được); vắng không check-in mặc định 0%.</Text>
        <Text style={s.h3}>Nhóm C — Chất lượng chuyên môn</Text>
        <Text style={s.doanVan}>C1: điểm khảo sát hài lòng học viên, tính theo lớp. C2: điểm dự giờ do người giữ Quyền Quản lý lớp chấm theo rubric 4 mức (100/80/60/0). C3: tỷ lệ học viên đạt chuẩn đầu ra, nhập tay theo lớp. Thiếu tiêu chí nào thì trọng số được chia lại cho các tiêu chí còn dữ liệu trong cùng nhóm.</Text>
        <Text style={s.h3}>Công thức KPI</Text>
        <Text style={s.doanVan}>KPI = 30% × B1 (chuyên cần) + 45% × C (chất lượng, gộp từ C1/C2/C3) + 25% × A (sản lượng, gộp từ A1/A2/A3). Kỳ đã đóng dùng đúng số liệu đã khóa tại thời điểm đóng kỳ (snapshot), không tính lại theo cấu hình mới; kỳ đang mở tính trực tiếp theo dữ liệu và cấu hình hiện tại nên có thể còn thay đổi.</Text>
        <Text style={s.h3}>Cách đọc các mốc thời gian</Text>
        <Text style={s.doanVan}>“Lũy kế” (báo cáo A4): tính từ trước tới thời điểm xuất báo cáo, không đổi theo kỳ đang xem. “Trong kỳ”: chỉ tính hoạt động trong khoảng ngày của kỳ đánh giá đang chọn. Báo cáo #3/#4/#5/#8 lọc theo khung thời gian (tuần / tháng / quý / năm) độc lập với kỳ đánh giá; “hiện tại” ở báo cáo #5 (cảnh báo pool nhỏ, việc đang chờ) là trạng thái ngay lúc xuất file, không theo khoảng đã chọn.</Text>
        <Text style={s.h3}>Trạng thái đề xuất nhân sự</Text>
        <Text style={s.doanVan}>Chờ duyệt: chưa xử lý. Đã duyệt: Admin/Quản lý lớp đồng ý áp dụng. Đã bỏ qua: xem xét nhưng không áp dụng. Báo cáo chỉ hiển thị số liệu thống kê, không nêu tên người được đề xuất.</Text>
        <Text style={s.h3}>Vì sao một số báo cáo không hiện nhãn “nhóm”</Text>
        <Text style={s.doanVan}>Nhãn nhóm (5 nhóm theo cấp bậc năng lực) chỉ hiển thị cho Admin/Quản lý lớp để tránh cảm giác bị xếp hạng/phân biệt khi Giảng viên/Trợ giảng xem báo cáo — nhóm vẫn được dùng ngầm cho các phép tính (percentile, matching-score) nhưng không in tên nhóm ra màn hình hay báo cáo của họ.</Text>
        <Text style={s.h3}>Phạm vi báo cáo này</Text>
        <Text style={s.doanVan}>Tài liệu gồm đủ 8 báo cáo của module Báo cáo (#1–#8). Trang Tổng quan xem trực tiếp trên hệ thống, chưa đưa vào bản PDF này.</Text>
        <Chan trang="Phụ lục" />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
