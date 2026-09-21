"use client";

import { createClient } from "@/lib/supabase/client";

// Web Push phía trình duyệt (mục 4.5): đăng ký Service Worker + xin quyền + lưu subscription của thiết bị này cho tài khoản đang đăng nhập.
// Gửi push do máy chủ làm (khóa VAPID) — xem src/app/api/push/gui/route.ts.
export type TrangThaiPush = "khong-ho-tro" | "thieu-cau-hinh" | "bi-chan" | "chua-bat" | "da-bat";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushDuocHoTro(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function trangThaiPush(): Promise<TrangThaiPush> {
  if (!pushDuocHoTro()) return "khong-ho-tro";
  if (!VAPID_PUBLIC) return "thieu-cau-hinh";
  if (Notification.permission === "denied") return "bi-chan";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "da-bat" : "chua-bat";
}

export async function batPush(): Promise<{ ok: true } | { error: string }> {
  if (!pushDuocHoTro()) return { error: "Trình duyệt này không hỗ trợ thông báo đẩy. Trên iPhone: thêm web vào Màn hình chính rồi mở lại từ biểu tượng." };
  if (!VAPID_PUBLIC) return { error: "Hệ thống chưa cấu hình khóa thông báo đẩy (VAPID)." };
  const quyen = await Notification.requestPermission();
  if (quyen !== "granted") return { error: "Bạn chưa cho phép thông báo. Hãy bật quyền Thông báo cho trang web này trong cài đặt trình duyệt." };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) }));
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return { error: "Không lấy được thông tin đăng ký thông báo đẩy." };

  const { error } = await createClient().rpc("luu_push_subscription", {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function tatPush(): Promise<{ ok: true } | { error: string }> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { ok: true };
  const { error } = await createClient().rpc("xoa_push_subscription", { p_endpoint: sub.endpoint });
  if (error) return { error: error.message };
  await sub.unsubscribe();
  return { ok: true };
}
