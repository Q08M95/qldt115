// Phân tích danh sách nhân sự dán từ Excel/CSV. Hàm thuần (không import gì) để dễ kiểm thử.
// Cột: email, họ tên, nhóm, mật khẩu (nhóm và mật khẩu có thể bỏ trống). Dòng tiêu đề (nếu có) tự nhận biết và bỏ qua.

export interface CsvRow {
  dong: number; // số dòng trong văn bản gốc (bắt đầu từ 1) để báo lỗi chính xác
  email: string;
  ho_ten: string;
  nhom_tho: string;
  mat_khau: string;
}

// Tách 1 dòng theo dấu phân cách, hỗ trợ ô đặt trong ngoặc kép ("Nguyễn, Văn A")
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Excel dán vào ô văn bản là dấu tab; file CSV tiếng Việt thường dùng dấu chấm phẩy; còn lại là dấu phẩy
function detectSeparator(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (first.includes("\t")) return "\t";
  if (first.split(";").length > first.split(",").length) return ";";
  return ",";
}

export function parseNhanSuCsv(raw: string): CsvRow[] {
  const text = raw.replace(/^﻿/, "");
  const sep = detectSeparator(text);
  const rows: CsvRow[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = splitLine(lines[i], sep);
    // Dòng tiêu đề: ô đầu là chữ "email" (không có @)
    if (rows.length === 0 && /^e-?mail$/i.test(c[0] ?? "")) continue;
    rows.push({ dong: i + 1, email: c[0] ?? "", ho_ten: c[1] ?? "", nhom_tho: c[2] ?? "", mat_khau: c[3] ?? "" });
  }
  return rows;
}
