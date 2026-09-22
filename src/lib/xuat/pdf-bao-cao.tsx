import "server-only";

import path from "node:path";
import { Circle, Document, Font, Page, Svg, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtDate } from "@/lib/format";
import { TRANG_THAI_KY_LABEL } from "@/lib/kpi/labels";
import type { TongHopLop, TongHopSanLuong, chuanHoaDeXuat } from "@/lib/bao-cao/tinh-toan";
import type { KhoangBaoCao } from "@/lib/bao-cao/khoang";
import { LOAI_DE_XUAT_LABEL, NHOM_LABEL, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import { TRANG_THAI_LOP_LABEL } from "@/lib/lop-hoc/labels";
import type { A4Row, KpiKyRow, KyDanhGia } from "@/types/database";

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

// 4 màu gốc solid (mục 8.1) — PDF không tô gradient (đơn giản hóa cho bản in), dùng bản solid tương ứng
const MAU = { navy: "#14468A", teal: "#0D9488", green: "#16A34A", blue: "#2563EB", neutral: "#A1A1AA", danger: "#DC2626", nen: "#F3F4F1", vien: "#E4E4E7", chuPhu: "#71717A", chuChinh: "#18181B" };

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
    <View style={[s.the, { flex: 1 }]}>
      <Text style={s.nhanTo}>{nhan}</Text>
      <Text style={[s.soTo, mau ? { color: mau } : undefined]}>{so}</Text>
    </View>
  );
}

// Thanh ngang: nhãn bên trái, thanh + số bên phải — dùng chung cho mọi bảng xếp hạng trong PDF
function ThanhXepHang({ items, mau = MAU.navy }: { items: { nhan: string; phu?: string; giaTri: number; hienThi: string }[]; mau?: string }) {
  const toiDa = Math.max(...items.map((i) => i.giaTri), 0.0001);
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
          <View style={{ width: 130 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600 }}>{it.nhan}</Text>
            {it.phu && <Text style={{ fontSize: 7.5, color: MAU.chuPhu }}>{it.phu}</Text>}
          </View>
          <View style={{ flex: 1, height: 9, backgroundColor: MAU.nen, borderRadius: 4, marginHorizontal: 8, overflow: "hidden" }}>
            <View style={{ width: `${Math.max(2, (it.giaTri / toiDa) * 100)}%`, height: "100%", backgroundColor: mau, borderRadius: 4 }} />
          </View>
          <Text style={{ width: 48, textAlign: "right", fontSize: 8.5, fontWeight: 700 }}>{it.hienThi}</Text>
        </View>
      ))}
    </View>
  );
}

// Donut đơn giản (2-3 lát) vẽ bằng Svg Circle strokeDasharray — cùng kỹ thuật với bản web, bỏ gradient cho bản in
function DonutPdf({ lat, giua }: { lat: { so: number; mau: string }[]; giua: string }) {
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
            return <Circle key={i} cx={45} cy={45} r={R} stroke={l.mau} strokeWidth={11} fill="none" strokeDasharray={`${Math.max(0.5, dai - 2)} ${C}`} transform={`rotate(${goc} 45 45)`} />;
          })}
      <Text x={45} y={49} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700 }}>
        {giua}
      </Text>
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

export interface DuLieuBaoCaoPdf {
  xuatLuc: Date;
  ky: KyDanhGia;
  khoang: KhoangBaoCao;
  kpiRows: KpiKyRow[];
  sanLuong: TongHopSanLuong;
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

  const doc = (
    <Document title={`Báo cáo tổng hợp — ${d.ky.ten}`} author="Hệ thống Quản lý Nhân sự Giảng dạy">
      {/* ===== Trang bìa ===== */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 140, alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 10 }}>Báo cáo tổng hợp</Text>
          <Text style={{ fontSize: 13, color: MAU.chuPhu, textAlign: "center", marginBottom: 30 }}>Tổ đào tạo — Quản lý Nhân sự Giảng dạy</Text>
          <View style={{ borderWidth: 1, borderColor: MAU.vien, borderRadius: 10, padding: 16, width: 320 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Kỳ đánh giá (báo cáo #1, #6, #7)</Text>
              <Text style={{ fontWeight: 700 }}>{d.ky.ten}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Trạng thái kỳ</Text>
              <Text style={{ fontWeight: 700 }}>{TRANG_THAI_KY_LABEL[d.ky.trang_thai]}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={s.nhoXam}>Khung thời gian (báo cáo #3)</Text>
              <Text style={{ fontWeight: 700 }}>{d.khoang.nhan}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.nhoXam}>Ngày xuất</Text>
              <Text style={{ fontWeight: 700 }}>{fmtDate(d.xuatLuc.toISOString())}</Text>
            </View>
          </View>
          <Text style={{ marginTop: 30, fontSize: 8.5, color: MAU.chuPhu, textAlign: "center", maxWidth: 340 }}>
            Gồm báo cáo #1 KPI tổng hợp, #3 Sản lượng giảng dạy, #6 A4 — Lớp không kinh phí, #7 Đề xuất nhân sự. Xem đầy đủ tất cả 8 báo cáo (kể cả realtime) tại trang Báo cáo trong hệ thống. Phần giải thích chỉ số ở phụ lục cuối tài liệu.
          </Text>
        </View>
      </Page>

      {/* ===== #1 KPI tổng hợp ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={1} ten="KPI tổng hợp toàn đơn vị" ghiChu={`${d.ky.ten} · ${fmtDate(d.ky.tu)} – ${fmtDate(d.ky.den)} · ${TRANG_THAI_KY_LABEL[d.ky.trang_thai]}`} />
        <View style={s.hangThe}>
          <TheSo nhan="KPI trung bình" so={kpiTb === null ? "–" : so1(kpiTb)} />
          <TheSo nhan="Số người có KPI" so={d.kpiRows.length} />
          <TheSo nhan="Cao nhất" so={d.kpiRows[0] ? so1(d.kpiRows[0].kpi) : "–"} />
        </View>
        {top15Kpi.length > 0 && (
          <>
            <Text style={s.h3}>Top {top15Kpi.length} theo KPI</Text>
            <ThanhXepHang mau={MAU.navy} items={top15Kpi.map((r) => ({ nhan: r.ho_ten, phu: r.nhom ? NHOM_LABEL[r.nhom] : VAI_TRO_LABEL[r.vai_tro ?? "giang_vien"], giaTri: r.kpi, hienThi: so1(r.kpi) }))} />
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

      {/* ===== #3 Sản lượng giảng dạy ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={3} ten="Sản lượng giảng dạy" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Tổng giờ đã dạy" so={`${so1(d.sanLuong.tongGio)} giờ`} />
          <TheSo nhan="Giờ TB / người" so={`${so1(d.sanLuong.gioTB)} giờ`} />
          <TheSo nhan="Chưa dạy giờ nào" so={`${d.sanLuong.soNguoiKhongDay}/${d.sanLuong.soNguoi}`} />
        </View>
        {top15Gio.length > 0 && (
          <>
            <Text style={s.h3}>Top {top15Gio.length} theo giờ dạy</Text>
            <ThanhXepHang mau={MAU.teal} items={top15Gio.map((r) => ({ nhan: r.ho_ten, phu: `${VAI_TRO_LABEL[r.vai_tro]} · ${r.so_bai} Bài`, giaTri: r.gio_thuc, hienThi: `${so1(r.gio_thuc)}h` }))} />
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

      {/* ===== #6 A4 ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={6} ten="A4 — Đóng góp lớp không kinh phí" ghiChu={`Lũy kế tính đến hiện tại · Trong kỳ: ${d.ky.ten}`} />
        <View style={s.hangThe}>
          <TheSo nhan="Tổng lớp không KP (lũy kế)" so={d.a4Rows.reduce((s2, r) => s2 + r.a4_luy_ke, 0)} />
          <TheSo nhan={`Trong ${d.ky.ten}`} so={d.a4Rows.reduce((s2, r) => s2 + r.a4_ky, 0)} />
          <TheSo nhan="Người có đóng góp" so={d.a4Rows.filter((r) => r.a4_luy_ke > 0).length} />
        </View>
        {top15A4.length > 0 ? (
          <>
            <Text style={s.h3}>Bảng xếp hạng lũy kế</Text>
            <ThanhXepHang mau={MAU.green} items={top15A4.map((r) => ({ nhan: r.ho_ten, phu: r.vai_tro ? VAI_TRO_LABEL[r.vai_tro] : undefined, giaTri: r.a4_luy_ke, hienThi: `${r.a4_luy_ke}` }))} />
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
          <TheSo nhan="Chờ duyệt" so={d.deXuat.cho_duyet} />
          <TheSo nhan="Đã duyệt" so={d.deXuat.da_duyet} />
          <TheSo nhan="Tỷ lệ duyệt" so={pt(d.deXuat.tyLeDuyet)} />
        </View>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 14, alignItems: "center" }}>
          {d.deXuat.da_duyet + d.deXuat.bo_qua > 0 ? (
            <DonutPdf
              giua={pt(d.deXuat.tyLeDuyet)}
              lat={[
                { so: d.deXuat.da_duyet, mau: MAU.green },
                { so: d.deXuat.bo_qua, mau: MAU.neutral },
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

      {/* ===== #8 Vận hành lớp học (bổ sung bối cảnh, không thuộc 4 báo cáo bắt buộc xuất) ===== */}
      <Page size="A4" style={s.page}>
        <TieuDeTrang so={8} ten="Vận hành lớp học (bối cảnh bổ sung)" ghiChu={d.khoang.nhan} />
        <View style={s.hangThe}>
          <TheSo nhan="Số lớp" so={d.lopTong.tong} />
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
            <ThanhXepHang mau={MAU.blue} items={d.lopTong.theoNhomLop.map((n) => ({ nhan: n.nhan, giaTri: n.so, hienThi: `${n.so}` }))} />
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
        <Text style={s.doanVan}>“Lũy kế” (báo cáo A4): tính từ trước tới thời điểm xuất báo cáo, không đổi theo kỳ đang xem. “Trong kỳ”: chỉ tính hoạt động trong khoảng ngày của kỳ đánh giá đang chọn. Báo cáo Sản lượng và Vận hành lớp học lọc theo khung thời gian (tuần / tháng / quý / năm) độc lập với kỳ đánh giá.</Text>
        <Text style={s.h3}>Trạng thái đề xuất nhân sự</Text>
        <Text style={s.doanVan}>Chờ duyệt: chưa xử lý. Đã duyệt: Admin/Quản lý lớp đồng ý áp dụng. Đã bỏ qua: xem xét nhưng không áp dụng. Báo cáo chỉ hiển thị số liệu thống kê, không nêu tên người được đề xuất.</Text>
        <Text style={s.h3}>Vì sao một số báo cáo không hiện nhãn “nhóm”</Text>
        <Text style={s.doanVan}>Nhãn nhóm (5 nhóm theo cấp bậc năng lực) chỉ hiển thị cho Admin/Quản lý lớp để tránh cảm giác bị xếp hạng/phân biệt khi Giảng viên/Trợ giảng xem báo cáo — nhóm vẫn được dùng ngầm cho các phép tính (percentile, matching-score) nhưng không in tên nhóm ra màn hình hay báo cáo của họ.</Text>
        <Text style={s.h3}>Phạm vi báo cáo này</Text>
        <Text style={s.doanVan}>Tài liệu gồm 4 báo cáo dùng cho họp xét duyệt định kỳ (#1, #3, #6, #7) và báo cáo #8 làm bối cảnh bổ sung. Báo cáo #2 (xu hướng KPI), #4 (tỷ lệ đăng ký), #5 (vận hành đăng ký) và trang Tổng quan xem trực tiếp trên hệ thống (Tổng quan sẽ được đưa vào bản PDF này khi module đó hoàn thành).</Text>
        <Chan trang="Phụ lục" />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
