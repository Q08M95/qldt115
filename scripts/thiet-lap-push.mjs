// Thiết lập Web Push (Giai đoạn 8, mục 4.5) — chạy trên máy bạn, không bao giờ in khóa bí mật ra màn hình.
//   node scripts/thiet-lap-push.mjs tao-khoa            Sinh khóa VAPID + khóa webhook, ghi vào .env.local (bỏ qua nếu đã có)
//   node scripts/thiet-lap-push.mjs webhook <url-goc>   Lưu địa chỉ webhook vào database, vd: https://qldt115.vercel.app
//   node scripts/thiet-lap-push.mjs kiemtra             Kiểm tra cấu hình webhook trong database và số thiết bị đã đăng ký
// Sau "tao-khoa": thêm ĐÚNG 4 biến (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET) vào Vercel
// (Settings > Environment Variables) rồi deploy lại; sau đó mới chạy "webhook" với địa chỉ production.
import crypto from "node:crypto";
import fs from "node:fs";
import webpush from "web-push";

const envFile = new URL("../.env.local", import.meta.url);
const doc = () =>
  Object.fromEntries(
    fs
      .readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim()];
      }),
  );

const [lenh, doiSo] = process.argv.slice(2);

if (lenh === "tao-khoa") {
  const env = doc();
  const them = [];
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    const k = webpush.generateVAPIDKeys();
    them.push(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${k.publicKey}`, `VAPID_PRIVATE_KEY=${k.privateKey}`);
  }
  if (!env.VAPID_SUBJECT) them.push("VAPID_SUBJECT=https://qldt115.vercel.app");
  if (!env.PUSH_WEBHOOK_SECRET) them.push(`PUSH_WEBHOOK_SECRET=${crypto.randomBytes(32).toString("hex")}`);
  if (them.length === 0) {
    console.log("Đã có đủ 4 biến trong .env.local, không thay đổi.");
  } else {
    const cu = fs.readFileSync(envFile, "utf8");
    fs.appendFileSync(envFile, (cu.endsWith("\n") ? "" : "\n") + them.join("\n") + "\n");
    console.log("Đã ghi vào .env.local các biến:", them.map((t) => t.split("=")[0]).join(", "));
  }
  console.log("Nhớ thêm 4 biến này (cùng giá trị) vào Vercel > Settings > Environment Variables rồi deploy lại:");
  console.log("  NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET");
} else if (lenh === "webhook" || lenh === "kiemtra") {
  const env = doc();
  const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL_ || !KEY) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

  if (lenh === "webhook") {
    if (!doiSo || !/^https:\/\/[^/\s]+\/?$/.test(doiSo)) throw new Error("Cần địa chỉ gốc dạng https://ten-mien (không kèm đường dẫn)");
    if (!env.PUSH_WEBHOOK_SECRET) throw new Error('Chưa có PUSH_WEBHOOK_SECRET — hãy chạy "tao-khoa" trước');
    const r = await fetch(`${URL_}/rest/v1/cau_hinh_push?on_conflict=id`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: true, url: doiSo.replace(/\/$/, "") + "/api/push/gui", secret: env.PUSH_WEBHOOK_SECRET, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`Không lưu được (${r.status}): ${await r.text()}`);
    console.log(`Đã lưu webhook: ${doiSo.replace(/\/$/, "")}/api/push/gui`);
  } else {
    const c = await fetch(`${URL_}/rest/v1/cau_hinh_push?select=url,updated_at`, { headers: H });
    const s = await fetch(`${URL_}/rest/v1/push_subscription?select=id`, { headers: { ...H, Prefer: "count=exact" } });
    const cj = await c.json();
    console.log("Webhook:", Array.isArray(cj) && cj[0] ? `${cj[0].url} (cập nhật ${cj[0].updated_at})` : "CHƯA cấu hình");
    console.log("Thiết bị đã đăng ký push:", (s.headers.get("content-range") ?? "").split("/")[1] ?? "?");
    console.log("Biến môi trường cục bộ:", ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "PUSH_WEBHOOK_SECRET"].map((k) => `${k}=${env[k] ? "có" : "THIẾU"}`).join(", "));
  }
} else {
  console.log("Dùng: node scripts/thiet-lap-push.mjs tao-khoa | webhook <https://ten-mien> | kiemtra");
}
