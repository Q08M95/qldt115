import "server-only";

import ExcelJS from "exceljs";

export interface CotExcel {
  tieu_de: string;
  khoa: string;
  // Độ rộng cột (số ký tự); mặc định 18
  rong?: number;
}

export type GiaTriO = string | number | boolean | Date | null | undefined;

// Tên sheet Excel không được chứa \ / ? * [ ] và tối đa 31 ký tự (vd tên kỳ "Quý 3/2026" có dấu "/" phải thay thế,
// nếu không exceljs sẽ ném lỗi ngay khi tạo sheet — chặn đứng toàn bộ luồng xuất file).
function tenSheetHopLe(ten: string): string {
  const s = ten.replace(/[\\/?*[\]]/g, "-").trim().slice(0, 31);
  return s || "Sheet1";
}

// Tạo file .xlsx gọn cho báo cáo/nhật ký: dòng tiêu đề đậm + cố định + bộ lọc, chữ tự xuống dòng, canh trên.
// Dùng chung cho mọi báo cáo cần xuất Excel (mục 4.7) — chỉ truyền cột và dòng dữ liệu.
export async function taoFileExcel(opts: { tenSheet: string; cot: CotExcel[]; dong: Record<string, GiaTriO>[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(tenSheetHopLe(opts.tenSheet), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = opts.cot.map((c) => ({ header: c.tieu_de, key: c.khoa, width: c.rong ?? 18 }));
  opts.dong.forEach((d) => ws.addRow(d));

  const tieuDe = ws.getRow(1);
  tieuDe.font = { bold: true, color: { argb: "FFFFFFFF" } };
  tieuDe.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14468A" } };
  tieuDe.alignment = { vertical: "middle", horizontal: "left" };
  tieuDe.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: opts.cot.length } };
  ws.eachRow((row, i) => {
    if (i > 1) row.alignment = { vertical: "top", wrapText: true };
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
