// Chụp ảnh minh họa cho "huong dan su dung.pdf" — dùng dữ liệu demo dựng bởi scripts/demo-huong-dan.mjs.
// Chạy: node scripts/chup-anh-huong-dan.mjs
// Lưu file vào docs/huong-dan/anh/<mã ảnh>.png — chạy lại node docs/huong-dan/build.mjs sau đó để chèn vào PDF.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ANH = fileURLToPath(new URL("../docs/huong-dan/anh/", import.meta.url));
fs.mkdirSync(ANH, { recursive: true });
const MAT_KHAU = "HuongDan@2026!";

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function main() {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const ctxCache = new Map(); // persona -> {context, page}

  async function ctxCua(email, viewport) {
    const k = `${email}|${viewport.width}x${viewport.height}`;
    if (ctxCache.has(k)) return ctxCache.get(k);
    const context = await browser.newContext({ viewport, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);
    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await page.waitForTimeout(2000); // chờ hydrate xong, tránh submit form kiểu native trước khi React gắn onClick
    await page.fill("#email", email);
    await page.fill("#password", MAT_KHAU);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 20000 });
    await page.waitForTimeout(1000);
    const rec = { context, page };
    ctxCache.set(k, rec);
    return rec;
  }

  async function toggleDark(page, on) {
    // Menu avatar là nút cuối topbar chứa ảnh đại diện.
    const avatarBtn = page.locator("header").getByRole("button").last();
    await avatarBtn.click();
    const item = page.getByText(on ? "Chế độ tối" : "Chế độ sáng", { exact: true });
    await item.click();
    await page.waitForTimeout(400);
  }

  async function chup(code, { as: email, path: duongDan, viewport = DESKTOP, dark = false, before, fullPage = false, clip } = {}) {
    try {
      const { page } = await ctxCua(email, viewport);
      await page.goto(`${BASE}${duongDan}`, { waitUntil: "load" });
      await page.waitForTimeout(900);
      if (dark) await toggleDark(page, true);
      if (before) await before(page);
      await page.waitForTimeout(300);
      const out = path.join(ANH, `${code}.png`);
      await page.screenshot({ path: out, fullPage, clip });
      if (dark) await toggleDark(page, false); // trả về sáng để không ảnh hưởng context dùng lại
      console.log(`OK   ${code}`);
    } catch (e) {
      console.log(`LỖI  ${code}: ${e.message.slice(0, 200)}`);
    }
  }

  const ADMIN = "quanly@huongdan-demo.test";
  const HERO_GV = "u06@huongdan-demo.test";
  const HERO_TG = "u41@huongdan-demo.test";
  const HERO_BGD = "u01@huongdan-demo.test";

  // ---------- Chương 2 ----------
  {
    const context = await browser.newContext({ viewport: DESKTOP, locale: "vi-VN" });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ANH, "2.1.png") });
    console.log("OK   2.1");
    await context.close();
  }
  await chup("2.2", {
    as: HERO_GV,
    path: "/ho-so",
    before: async (page) => {
      const avatarBtn = page.locator("header").getByRole("button").last();
      await avatarBtn.click();
      await page.waitForTimeout(200);
    },
  });
  await chup("2.3a", { as: HERO_GV, path: "/" });
  await chup("2.3b", { as: HERO_GV, path: "/", viewport: MOBILE });

  // ---------- Chương 3 ----------
  await chup("3.1", { as: HERO_GV, path: "/" });
  await chup("3.2", { as: HERO_GV, path: "/lop-hoc" });
  await chup("3.3", { as: HERO_GV, path: "/lop-hoc/697b91d0-96bd-4d4c-98a1-c38a5aac5cce" }); // ACLS-126 đã hoàn thành
  await chup("3.4a", {
    as: HERO_TG,
    path: "/lop-hoc/09a28f1b-a830-4f39-a92d-0a12a8e78fc5", // ACLS-135 (lPool) — TG có slot trống
    before: async (page) => {
      const boxes = page.getByRole("checkbox");
      const n = await boxes.count();
      for (let i = 0; i < Math.min(n, 2); i++) await boxes.nth(i).check({ force: true }).catch(() => {});
    },
  });
  await chup("3.5", { as: HERO_TG, path: "/dang-ky" });
  await chup("3.6", { as: HERO_GV, path: "/dang-ky#lich" });
  await chup("3.7", { as: HERO_GV, path: "/" });
  await chup("3.8", { as: HERO_GV, path: "/thong-bao" });
  await chup("3.9", {
    as: HERO_GV,
    path: "/ho-so",
    before: async (page) => {
      await page.getByRole("button", { name: "Thêm chứng chỉ" }).first().click();
      await page.waitForTimeout(400);
    },
  });
  await chup("3.11", { as: HERO_GV, path: "/bao-cao" });
  await chup("4.1", { as: HERO_GV, path: "/danh-gia" });
  await chup("4.2-fallback", { as: HERO_BGD, path: "/danh-gia" });

  // ---------- Chương 5 ----------
  await chup("5.1", { as: ADMIN, path: "/" });
  await chup("5.2", {
    as: ADMIN,
    path: "/lop-hoc",
    before: async (page) => {
      await page.getByRole("button", { name: "Tạo lớp" }).first().click();
      await page.waitForTimeout(500);
    },
  });
  await chup("5.3", {
    as: ADMIN,
    path: "/lop-hoc/09a28f1b-a830-4f39-a92d-0a12a8e78fc5",
    before: async (page) => {
      await page.getByRole("button", { name: "Thêm Bài" }).first().click();
      await page.waitForTimeout(500);
    },
  });
  await chup("5.4", { as: ADMIN, path: "/lop-hoc/09a28f1b-a830-4f39-a92d-0a12a8e78fc5" }); // lPool: cảnh báo pool nhỏ + gợi ý
  await chup("5.5", { as: ADMIN, path: "/dang-ky" });
  await chup("5.7", { as: ADMIN, path: "/lop-hoc/697b91d0-96bd-4d4c-98a1-c38a5aac5cce" });
  await chup("5.9", { as: ADMIN, path: `/nhan-su/974d066f-ac25-4454-9cbf-19d439307292` }); // HERO_TG
  await chup("5.13", { as: ADMIN, path: "/cau-hinh" });

  // ---------- Bổ sung ngoài danh sách 25 ảnh gốc ----------
  await chup("5.10-ky", { as: ADMIN, path: "/cau-hinh/ky-danh-gia" });
  await chup("5.11-xuat", { as: ADMIN, path: "/bao-cao" });
  await chup("5.12-nhatky", { as: ADMIN, path: "/nhat-ky" });
  await chup("5.9b-dexuat", { as: ADMIN, path: "/nhan-su/de-xuat" });
  await chup("5.13b-kpi", { as: ADMIN, path: "/cau-hinh/kpi" });
  await chup("5.13c-dangky", { as: ADMIN, path: "/cau-hinh/dang-ky" });
  await chup("1.2-lop-nhansu", { as: ADMIN, path: "/nhan-su" });
  await chup("3.1-dark", { as: HERO_GV, path: "/", dark: true });
  await chup("5.1-dark", { as: ADMIN, path: "/", dark: true });

  for (const [k, { context }] of ctxCache) await context.close();
  await browser.close();
  console.log("\nXong. Xem thư mục docs/huong-dan/anh/ rồi chạy: node docs/huong-dan/build.mjs");
}

main().catch((e) => { console.error(e); process.exit(1); });
