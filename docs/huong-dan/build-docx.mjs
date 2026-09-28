// Dựng "huong dan su dung.docx" (bản Word có thể chỉnh sửa tay) từ CÙNG nguồn Markdown dùng cho PDF (nguon/).
// Chạy: node docs/huong-dan/build-docx.mjs
// Khác build.mjs (PDF, trình bày cố định): file này ra file .docx thường, người dùng tự mở Word chỉnh sửa lại
// theo ý muốn — không cần layout tuyệt đối giống PDF, chỉ cần đúng nội dung, có mục lục và ảnh minh họa.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  Table, TableRow, TableCell, WidthType, VerticalAlign, ImageRun, TableOfContents, PageBreak,
  Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
} from "docx";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NGUON = path.join(ROOT, "nguon");
const ANH = path.join(ROOT, "anh");
const RA = path.join(ROOT, "..", "..", "huong dan su dung.docx");

const PHIEN_BAN = "1.0";
const NGAY = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const DON_VI = "Trung tâm Cấp cứu 115 TP.HCM — Tổ đào tạo";

const BRAND = "14468A";
const TEAL = "0D9488";
const TEXT = "18181B";
const MUTED = "71717A";
const BORDER = "E4E4E7";
const CALLOUT_BG = { note: "EEF4FD", tip: "EAFAF1", warn: "FEF2F2", example: "F4F9E6", todo: "F4F4F5" };
const CALLOUT_BORDER = { note: "5B8DEF", tip: "16A34A", warn: "DC2626", example: "84B21A", todo: "A1A1AA" };
const CALLOUT_LABEL = { "lưu ý": "note", "mẹo": "tip", "quan trọng": "warn", "ví dụ": "example", "chưa có": "todo" };

const anhCoSan = (ma) => ["png", "jpg", "jpeg", "webp"].map((e) => path.join(ANH, `${ma}.${e}`)).find((p) => fs.existsSync(p));
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return { width: 900, height: 560 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
const MAX_ANH_PX = 620;

// ---------- Inline markdown (bold/italic/code) -> mảng TextRun ----------
function inline(s, extra = {}) {
  const runs = [];
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("**", i)) {
      const j = s.indexOf("**", i + 2);
      if (j >= 0) { runs.push(new TextRun({ text: s.slice(i + 2, j), bold: true, ...extra })); i = j + 2; continue; }
    }
    if (s.startsWith("`", i)) {
      const j = s.indexOf("`", i + 1);
      if (j >= 0) { runs.push(new TextRun({ text: s.slice(i + 1, j), font: "Consolas", color: BRAND, shading: { type: ShadingType.SOLID, color: "EEF2F7", fill: "EEF2F7" }, ...extra })); i = j + 1; continue; }
    }
    if (s[i] === "*" && s[i + 1] !== " " && s[i + 1] !== "*") {
      const j = s.indexOf("*", i + 1);
      if (j >= 0) { runs.push(new TextRun({ text: s.slice(i + 1, j), italics: true, ...extra })); i = j + 1; continue; }
    }
    let j = i;
    while (j < s.length && !s.startsWith("**", j) && s[j] !== "`" && !(s[j] === "*" && s[j + 1] !== " ")) j++;
    if (j === i) j++;
    runs.push(new TextRun({ text: s.slice(i, j), ...extra }));
    i = j;
  }
  return runs;
}
const p = (s, opt = {}) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: inline(s), ...opt });

// ---------- Parse 1 file .md -> mảng phần tử docx ----------
function parseMd(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isBlank = (l) => l.trim() === "";

  function listBlock(start) {
    const re = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    const items = [];
    let k = start;
    const base = re.exec(lines[k])[1].length;
    while (k < lines.length) {
      const m = re.exec(lines[k]);
      if (!m || m[1].length < base) break;
      if (m[1].length > base) { k++; continue; } // bỏ qua lồng sâu hơn 1 cấp (hiếm dùng trong tài liệu này)
      items.push({ ordered: /\d/.test(m[2]), text: m[3] });
      k++;
      while (k < lines.length && !isBlank(lines[k]) && /^\s{2,}\S/.test(lines[k]) && !re.test(lines[k])) {
        items[items.length - 1].text += " " + lines[k].trim();
        k++;
      }
    }
    return [items, k];
  }

  while (i < lines.length) {
    const l = lines[i];
    if (isBlank(l)) { i++; continue; }
    if (l.trim() === "<!--PB-->") { out.push(new Paragraph({ children: [new PageBreak()] })); i++; continue; }

    let m;
    if ((m = /^# (Chương \d+|Phụ lục [A-Z]) — (.+)$/.exec(l))) {
      out.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: `${m[1].toUpperCase()} — `, color: TEAL, bold: true }), new TextRun({ text: m[2], color: BRAND, bold: true, size: 40 })],
      }));
      i++; continue;
    }
    if ((m = /^## (.+)$/.exec(l))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 320, after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "C6DCFA" } }, children: [new TextRun({ text: m[1], color: BRAND, bold: true })] }));
      i++; continue;
    }
    if ((m = /^### (.+)$/.exec(l))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: m[1], color: "0F5A55", bold: true })] }));
      i++; continue;
    }
    if ((m = /^!\[(.*)\]\((.*)\)\s*$/.exec(l))) {
      const alt = m[1], ma = m[2];
      const file = anhCoSan(ma);
      if (file) {
        const buf = fs.readFileSync(file);
        const { width, height } = pngSize(buf);
        const w = Math.min(MAX_ANH_PX, width);
        const h = Math.round(h_from(w, width, height));
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 60 }, children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: path.extname(file).slice(1) === "png" ? "png" : "jpg" })] }));
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: alt, italics: true, color: MUTED, size: 18 })] }));
      } else {
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 120, after: 200 },
          border: { top: { style: BorderStyle.DASHED, size: 8, color: "A9C4F2" }, bottom: { style: BorderStyle.DASHED, size: 8, color: "A9C4F2" }, left: { style: BorderStyle.DASHED, size: 8, color: "A9C4F2" }, right: { style: BorderStyle.DASHED, size: 8, color: "A9C4F2" } },
          shading: { type: ShadingType.SOLID, color: "F5F8FD", fill: "F5F8FD" },
          children: [new TextRun({ text: `ẢNH ${ma} — chưa có, sẽ bổ sung  ·  ${alt.replace(/^Ảnh\s*[\d.A-Za-z]+\s*[—-]\s*/, "")}`, color: BRAND, bold: true, size: 20 })],
        }));
      }
      i++; continue;
    }
    if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: head.map((c) => new TableCell({ shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: inline(c, { color: "FFFFFF", bold: true, size: 19 }) })] })),
          }),
          ...body.map((r, ri) => new TableRow({
            children: r.map((c) => new TableCell({ shading: ri % 2 ? { type: ShadingType.SOLID, color: "F7F8F6", fill: "F7F8F6" } : undefined, verticalAlign: VerticalAlign.TOP, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: inline(c, { size: 19 }) })] })),
          })),
        ],
      }));
      out.push(new Paragraph({ text: "", spacing: { after: 160 } }));
      continue;
    }
    if (l.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      const kw = /^\*\*([^*:]+):?\*\*/.exec(buf[0] ?? "");
      const cls = (kw && CALLOUT_LABEL[kw[1].toLowerCase().trim()]) || "note";
      const bg = CALLOUT_BG[cls], bd = CALLOUT_BORDER[cls];
      const paras = buf.filter((x) => x.trim() !== "").map((line, idx) => new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 60 },
        shading: { type: ShadingType.SOLID, color: bg, fill: bg },
        border: idx === 0 ? { left: { style: BorderStyle.SINGLE, size: 24, color: bd } } : { left: { style: BorderStyle.SINGLE, size: 24, color: bd } },
        indent: { left: 120 },
        children: inline(line),
      }));
      out.push(...paras, new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }
    if (/^(\s*)([-*]|\d+\.)\s+/.test(l)) {
      const [items, next] = listBlock(i);
      for (const [idx, it] of items.entries()) {
        out.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 40 },
          ...(it.ordered ? { indent: { left: 400 } } : { bullet: { level: 0 } }),
          children: it.ordered ? [new TextRun({ text: `${idx + 1}. ` }), ...inline(it.text)] : inline(it.text),
        }));
      }
      out.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      i = next;
      continue;
    }
    if (l.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.SOLID, color: "F3F4F1", fill: "F3F4F1" },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, left: { style: BorderStyle.SINGLE, size: 4, color: BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
        children: buf.flatMap((x, idx) => (idx ? [new TextRun({ break: 1, text: x, font: "Consolas", size: 18 })] : [new TextRun({ text: x, font: "Consolas", size: 18 })])),
      }));
      continue;
    }
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^(#|\||>|```|!\[|<!--PB-->)/.test(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++]);
    out.push(p(buf.join(" ")));
  }
  return out;
}
function h_from(w, natW, natH) { return (w * natH) / natW; }

function main() {
  const files = fs.readdirSync(NGUON).filter((f) => f.endsWith(".md")).sort();
  const body = files.flatMap((f) => parseMd(fs.readFileSync(path.join(NGUON, f), "utf8")));

  const doc = new Document({
    creator: DON_VI,
    title: "Hướng dẫn sử dụng — Hệ thống QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY",
    styles: {
      default: { document: { run: { font: "Calibri", size: 21, color: TEXT }, paragraph: { spacing: { line: 300 } } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: convertInchesToTwip(0.9), bottom: convertInchesToTwip(1), left: convertInchesToTwip(0.9), right: convertInchesToTwip(0.9) } } },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Hướng dẫn sử dụng — QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY", size: 15, color: MUTED })] })] }) },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Trang ", size: 15, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: MUTED }), new TextRun({ text: " / ", size: 15, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: MUTED }), new TextRun({ text: `  ·  ${DON_VI}`, size: 15, color: MUTED })],
            })],
          }),
        },
        children: [
          // ---- Bìa ----
          new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: "TÀI LIỆU HƯỚNG DẪN", bold: true, color: TEAL, size: 20 })] }),
          new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text: "Hướng dẫn sử dụng", bold: true, color: BRAND, size: 64 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Hệ thống QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY", bold: true, size: 28, color: TEXT })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: DON_VI, bold: true, size: 24, color: TEAL })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Dành cho: giảng viên, trợ giảng, người giữ Quyền Quản lý lớp và Admin", size: 20, color: MUTED })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `Phiên bản ${PHIEN_BAN} · cập nhật ngày ${NGAY}`, size: 20, color: MUTED })] }),
          new Paragraph({
            spacing: { before: 600 },
            shading: { type: ShadingType.SOLID, color: "FEF9E7", fill: "FEF9E7" },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: "F59E0B" } },
            indent: { left: 120 },
            children: [new TextRun({ text: "Đây là bản Word có thể CHỈNH SỬA TỰ DO — dùng để tinh chỉnh câu chữ, thêm/bớt nội dung theo ý đơn vị. Bản trình bày chính thức (căn PDF cố định, có mục lục số trang) nằm ở file \"huong dan su dung.pdf\" cùng thư mục.", italics: true, size: 19, color: "92400E" })],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          // ---- Mục lục (Word tự tính khi mở file, bấm phải > Update Field nếu chưa thấy số trang) ----
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "MỤC LỤC", color: BRAND, bold: true })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "(Mở bằng Word: nếu mục lục chưa hiện số trang, bấm chuột phải vào mục lục → Update Field / Cập nhật trường)", italics: true, color: MUTED, size: 18 })] }),
          new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" }),
          new Paragraph({ children: [new PageBreak()] }),
          ...body,
        ],
      },
    ],
  });

  Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(RA, buf);
    console.log(`Đã tạo: ${path.resolve(RA)} (${Math.round(buf.length / 1024)} KB) — ${files.length} file nguồn.`);
  });
}

main();
