// Dựng "huong dan su dung.pdf" từ các file Markdown trong nguon/ (mỗi file = 1 chương/phụ lục).
// Chạy: node docs/huong-dan/build.mjs        (cần Chrome đã cài; pdftotext để điền số trang vào mục lục)
//
// Ảnh minh họa: đặt file vào docs/huong-dan/anh/ theo MÃ ẢNH (vd 3.2.png, 3.2.jpg, 3.2.webp). Trong file .md, chỗ cần ảnh
// viết:   ![Ảnh 3.2 — Mô tả ngắn](3.2)
// Chưa có file ảnh thì PDF hiện khung trống ghi mã ảnh; thả ảnh vào rồi chạy lại lệnh là tự thay.
// Ký hiệu khác: dòng `<!--PB-->` = ngắt trang; khối trích dẫn bắt đầu bằng **Lưu ý:** / **Mẹo:** / **Quan trọng:** / **Ví dụ:** /
// **Chưa có:** được tô màu riêng.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NGUON = path.join(ROOT, "nguon");
const ANH = path.join(ROOT, "anh");
const BUILD = path.join(ROOT, "build");
const RA = path.join(ROOT, "..", "..", "huong dan su dung.pdf");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FONT_DIR = path.join(ROOT, "..", "..", "node_modules", "@fontsource", "plus-jakarta-sans", "files");

const PHIEN_BAN = "1.0";
const NGAY = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const DON_VI = "Trung tâm Cấp cứu 115 TP.HCM — Tổ đào tạo";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t;
}

const anhCoSan = (ma) => ["png", "jpg", "jpeg", "webp"].map((e) => path.join(ANH, `${ma}.${e}`)).find((p) => fs.existsSync(p));

function figure(alt, ma) {
  const f = anhCoSan(ma);
  if (f) return `<figure><img src="${pathToFileURL(f).href}" alt="${esc(alt)}"><figcaption>${inline(alt)}</figcaption></figure>`;
  return `<figure class="thieu"><div class="khung"><span class="ma">ẢNH ${esc(ma)}</span><span class="mo">${inline(alt.replace(/^Ảnh\s*[\d.A-Za-z]+\s*[—-]\s*/, ""))}</span><span class="ghi">(ảnh chụp sẽ bổ sung sau)</span></div><figcaption>${inline(alt)}</figcaption></figure>`;
}

const CALLOUT = { "lưu ý": "note", "mẹo": "tip", "quan trọng": "warn", "ví dụ": "example", "chưa có": "todo" };

function mdToHtml(md, muc) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isBlank = (l) => l.trim() === "";
  function list(start) {
    // trả về [html, chỉ số dòng kế tiếp]; hỗ trợ lồng theo thụt lề 2 khoảng trắng
    const re = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    const m0 = re.exec(lines[start]);
    const base = m0[1].length;
    const ordered = /\d/.test(m0[2]);
    let html = ordered ? "<ol>" : "<ul>";
    let k = start;
    while (k < lines.length) {
      const m = re.exec(lines[k]);
      if (!m) {
        // dòng tiếp nối (thụt lề) của mục trước
        if (!isBlank(lines[k]) && /^\s{2,}\S/.test(lines[k]) && !re.test(lines[k])) {
          html = html.replace(/<\/li>$/, ` ${inline(lines[k].trim())}</li>`);
          k++;
          continue;
        }
        break;
      }
      const ind = m[1].length;
      if (ind < base) break;
      if (ind > base) {
        const [sub, next] = list(k);
        html = html.replace(/<\/li>$/, `${sub}</li>`);
        k = next;
        continue;
      }
      html += `<li>${inline(m[3])}</li>`;
      k++;
    }
    html += ordered ? "</ol>" : "</ul>";
    return [html, k];
  }
  while (i < lines.length) {
    const l = lines[i];
    if (isBlank(l)) { i++; continue; }
    if (l.trim() === "<!--PB-->") { out.push('<div class="pb"></div>'); i++; continue; }
    if (l.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(buf.join("\n"))}</pre>`);
      continue;
    }
    let m;
    if ((m = /^# (Chương \d+|Phụ lục [A-Z]) — (.+)$/.exec(l))) {
      const id = slug(m[1]);
      muc.push({ cap: 1, nhan: `${m[1]} — ${m[2]}`, ma: m[1], id });
      out.push(`<h1 id="${id}"><span class="ch">${esc(m[1].toUpperCase())}</span>${inline(m[2])}</h1>`);
      i++; continue;
    }
    if ((m = /^## (.+)$/.exec(l))) {
      const id = slug(m[1]);
      muc.push({ cap: 2, nhan: m[1], id });
      out.push(`<h2 id="${id}">${inline(m[1])}</h2>`);
      i++; continue;
    }
    if ((m = /^### (.+)$/.exec(l))) { out.push(`<h3>${inline(m[1])}</h3>`); i++; continue; }
    if ((m = /^!\[(.*)\]\((.*)\)\s*$/.exec(l))) { out.push(figure(m[1], m[2])); i++; continue; }
    if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (l.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      const kw = /^\*\*([^*:]+):?\*\*/.exec(buf[0] ?? "");
      const cls = (kw && CALLOUT[kw[1].toLowerCase().trim()]) || "note";
      // các dòng bắt đầu bằng "- " trong callout thành danh sách
      const parts = [];
      let para = [];
      const flush = () => { if (para.length) { parts.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
      for (let j = 0; j < buf.length; j++) {
        if (/^\s*([-*]|\d+\.)\s+/.test(buf[j])) {
          flush();
          const sub = [];
          while (j < buf.length && /^\s*([-*]|\d+\.)\s+/.test(buf[j])) sub.push(buf[j++]);
          j--;
          parts.push(`<ul>${sub.map((s) => `<li>${inline(s.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>`).join("")}</ul>`);
        } else if (buf[j].trim() === "") flush();
        else para.push(buf[j]);
      }
      flush();
      out.push(`<div class="callout ${cls}">${parts.join("")}</div>`);
      continue;
    }
    if (/^(\s*)([-*]|\d+\.)\s+/.test(l)) {
      const [h, next] = list(i);
      out.push(h);
      i = next;
      continue;
    }
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^(#|\||>|```|!\[|<!--PB-->)/.test(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

const CSS = `
${[400,600,700,800].map((w)=>["latin","vietnamese"].map((ss)=>`@font-face{font-family:"PJS";font-weight:${w};src:url("${pathToFileURL(path.join(FONT_DIR, `plus-jakarta-sans-${ss}-${w}-normal.woff`)).href}");unicode-range:${ss==="latin"?"U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD":"U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"}}`).join(" ")).join(" ")}
@page{size:A4;margin:18mm 17mm 22mm}
@page bia{size:A4;margin:0}
*{box-sizing:border-box}
html{font-family:"PJS","Segoe UI",Arial,sans-serif;color:#18181b;font-size:10.5pt;line-height:1.6;word-spacing:.1em}
body{margin:0}
.trang{padding:0}
h1{font-size:24pt;line-height:1.2;color:#14468a;margin:0 0 14pt;font-weight:800;break-before:page}
h1 .ch{display:block;font-size:10pt;letter-spacing:.14em;color:#0d9488;font-weight:700;margin-bottom:6pt}
h2{font-size:15pt;color:#14468a;margin:22pt 0 8pt;font-weight:700;break-after:avoid;padding-bottom:4pt;border-bottom:1.5pt solid #c6dcfa}
h3{font-size:11.5pt;color:#0f5a55;margin:14pt 0 5pt;font-weight:700;break-after:avoid}
p{margin:0 0 8pt;text-align:justify;text-justify:inter-word}
ul,ol{margin:0 0 9pt;padding-left:18pt}
li{margin:0 0 3pt;text-align:justify;text-justify:inter-word}
h1,h2,h3,th,td,figcaption,.toc li,.bia *{text-align:left}
figure{text-align:center}
strong{font-weight:700}
code{font-family:"PJS",Consolas,monospace;background:#eef2f7;border-radius:3pt;padding:0 3pt;font-size:.95em;color:#14468a;font-weight:600}
pre{font-family:"PJS",Consolas,monospace;background:#f3f4f1;border:1pt solid #e4e4e7;border-radius:6pt;padding:9pt 11pt;font-size:9.5pt;line-height:1.55;white-space:pre-wrap;margin:0 0 10pt;break-inside:avoid}
table{width:100%;border-collapse:collapse;margin:4pt 0 12pt;font-size:9.5pt;break-inside:auto}
thead{display:table-header-group}
tr{break-inside:avoid}
th{background:#14468a;color:#fff;text-align:left;font-weight:600;padding:5pt 7pt}
td{padding:5pt 7pt;border-bottom:.75pt solid #e4e4e7;vertical-align:top}
tbody tr:nth-child(even) td{background:#f7f8f6}
.callout{border-radius:7pt;padding:8pt 11pt 3pt;margin:4pt 0 11pt;break-inside:avoid;border-left:4pt solid}
.callout p{margin:0 0 5pt}.callout ul{margin:0 0 6pt}
.callout.note{background:#eef4fd;border-color:#5b8def}
.callout.tip{background:#eafaf1;border-color:#16a34a}
.callout.warn{background:#fef2f2;border-color:#dc2626}
.callout.example{background:#f4f9e6;border-color:#84b21a}
.callout.todo{background:#f4f4f5;border-color:#a1a1aa;color:#52525b}
figure{margin:8pt 0 12pt;break-inside:avoid;text-align:center}
figure img{max-width:100%;max-height:150mm;border:1pt solid #e4e4e7;border-radius:6pt}
figcaption{font-size:8.5pt;color:#71717a;margin-top:4pt}
figure.thieu .khung{border:1.5pt dashed #a9c4f2;background:#f5f8fd;border-radius:8pt;min-height:52mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4pt;padding:10pt}
.khung .ma{font-weight:800;color:#14468a;letter-spacing:.08em;font-size:11pt}
.khung .mo{color:#3f3f46;font-size:9.5pt}
.khung .ghi{color:#a1a1aa;font-size:8.5pt}
.pb{break-after:page}
.bia{page:bia;height:297mm;padding:0;display:flex;flex-direction:column;justify-content:center;padding:0 22mm;background:linear-gradient(160deg,#166a8c 0%,#14468a 70%);color:#fff;break-after:page;position:relative}
.bia .nhan{letter-spacing:.2em;font-size:10pt;font-weight:700;color:#a2efc3;margin-bottom:12pt}
.bia h1.tt{font-size:36pt;color:#fff;margin:0 0 10pt;break-before:auto;line-height:1.15}
.bia .ph{font-size:15pt;font-weight:600;color:#c6dcfa;margin-bottom:10pt}
.bia .dv{font-size:12.5pt;font-weight:700;color:#a2efc3;letter-spacing:.02em;margin-bottom:34pt}
.bia .dt{font-size:11pt;line-height:1.7;color:#e3edfb}
.bia .ft{position:absolute;left:22mm;bottom:20mm;font-size:9.5pt;color:#a9c4f2}
.muc-luc h1{break-before:auto}
.toc{list-style:none;padding:0;margin:0}
.toc li{display:flex;align-items:baseline;gap:6pt;margin:0}
.toc .c1{font-weight:700;color:#14468a;margin-top:9pt;font-size:11pt}
.toc .c2{padding-left:14pt;font-size:10pt;color:#3f3f46}
.toc .cham{flex:1;border-bottom:1pt dotted #b4b4b8;transform:translateY(-3pt)}
.toc .so{font-variant-numeric:tabular-nums;color:#52525b}
`;

function docHtml({ body, mucLuc, soTrang }) {
  const toc = mucLuc
    .map((m) => `<li class="c${m.cap}"><span>${esc(m.nhan)}</span><span class="cham"></span><span class="so">${soTrang?.get(m.id) ?? ""}</span></li>`)
    .join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hướng dẫn sử dụng</title><style>${CSS}</style></head><body>
<section class="bia">
  <div class="nhan">TÀI LIỆU HƯỚNG DẪN</div>
  <h1 class="tt">Hướng dẫn sử dụng</h1>
  <div class="ph">Hệ thống QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY</div>
  <div class="dv">${esc(DON_VI)}</div>
  <div class="dt">Dành cho: giảng viên, trợ giảng, người giữ Quyền Quản lý lớp và Admin<br>Phiên bản ${PHIEN_BAN} · cập nhật ngày ${NGAY}</div>
  <div class="ft">Nội dung ghi theo giao diện và quy định đang áp dụng của hệ thống.</div>
</section>
<section class="muc-luc"><h1 style="break-before:auto"><span class="ch">MỤC LỤC</span>Bạn cần tìm gì?</h1><ul class="toc">${toc}</ul></section>
${body}
</body></html>`;
}

// ---- in PDF qua Chrome DevTools (có chân trang đánh số) ----
async function inPdf(htmlPath, pdfPath) {
  const port = 9400 + Math.floor(Math.random() * 300);
  const profile = path.join(BUILD, "chrome-profile");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let target;
    for (let n = 0; n < 60 && !target; n++) {
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
      if (!target) await sleep(500);
    }
    if (!target) throw new Error("Không mở được Chrome (kiểm tra đường dẫn CHROME_PATH).");
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pend = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Page.enable");
    await send("Page.navigate", { url: pathToFileURL(htmlPath).href });
    await sleep(2500);
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>document.fonts.size)", awaitPromise: true });
    await sleep(500);
    const r = await send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      paperWidth: 8.27,
      paperHeight: 11.69,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font-size:8px;color:#8a8a92;font-family:Arial,sans-serif;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span> &nbsp;·&nbsp; Hướng dẫn sử dụng hệ thống QUẢN LÝ ĐĂNG KÝ GIẢNG DẠY &nbsp;·&nbsp; ${esc(DON_VI)}</div>`,
    });
    if (r.error) throw new Error(JSON.stringify(r.error));
    fs.writeFileSync(pdfPath, Buffer.from(r.result.data, "base64"));
    ws.close();
  } finally {
    chrome.kill();
    await sleep(300);
  }
}

// Tìm trang chứa từng mục để điền số trang vào mục lục (pdftotext)
function tinhSoTrang(pdfPath, mucLuc) {
  const r = spawnSync("pdftotext", ["-enc", "UTF-8", "-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.error || r.status !== 0) return null;
  const trang = r.stdout.split("\f").map((t) => t.replace(/\s+/g, " "));
  const chuan = (s) => s.replace(/\s+/g, " ").trim();
  const kq = new Map();
  let con = 0; // trang bắt đầu tìm cho mục kế tiếp (không quay lại)
  for (const m of mucLuc) {
    const khoa = m.cap === 1 ? m.ma.toUpperCase() : chuan(m.nhan);
    let tim = -1;
    for (let p = con; p < trang.length; p++) {
      // bỏ các trang mục lục: chúng chứa "Bạn cần tìm gì?" hoặc là trang liền sau đó chưa có tiêu đề chương
      if (m.cap === 1 ? trang[p].includes(khoa) && !trang[p].includes("Bạn cần tìm gì?") : trang[p].includes(khoa) && !trang[p].includes("Bạn cần tìm gì?")) { tim = p; break; }
    }
    if (tim >= 0) { kq.set(m.id, tim + 1); con = tim; }
  }
  return kq;
}

async function main() {
  fs.mkdirSync(BUILD, { recursive: true });
  const files = fs.readdirSync(NGUON).filter((f) => f.endsWith(".md")).sort();
  const mucLuc = [];
  const body = files.map((f) => mdToHtml(fs.readFileSync(path.join(NGUON, f), "utf8"), mucLuc)).join("\n");
  const htmlPath = path.join(BUILD, "huong-dan.html");
  const pdfTam = path.join(BUILD, "tam.pdf");

  fs.writeFileSync(htmlPath, docHtml({ body, mucLuc }));
  await inPdf(htmlPath, pdfTam);
  let so = tinhSoTrang(pdfTam, mucLuc);
  if (so) {
    fs.writeFileSync(htmlPath, docHtml({ body, mucLuc, soTrang: so }));
    await inPdf(htmlPath, pdfTam);
    const so2 = tinhSoTrang(pdfTam, mucLuc); // mục lục có số có thể đổi độ dài trang: kiểm lại
    if (so2 && [...so2].some(([k, v]) => so.get(k) !== v)) {
      fs.writeFileSync(htmlPath, docHtml({ body, mucLuc, soTrang: so2 }));
      await inPdf(htmlPath, pdfTam);
    }
  } else console.warn("Không có pdftotext: mục lục sẽ không có số trang.");
  fs.copyFileSync(pdfTam, RA);
  const kb = Math.round(fs.statSync(RA).size / 1024);
  const thieu = (body.match(/class="thieu"/g) ?? []).length;
  console.log(`Đã tạo: ${path.resolve(RA)} (${kb} KB) — ${files.length} file nguồn, ${mucLuc.length} mục, ${thieu} khung ảnh chờ bổ sung.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
