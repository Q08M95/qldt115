import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do database gọi (pg_net, xem trigger tb_gui_push) mỗi khi có thông báo mới cho người đã đăng ký push (mục 4.5).
// Xác thực bằng khóa chia sẻ PUSH_WEBHOOK_SECRET (header x-push-secret), không dùng phiên đăng nhập. Chỉ nhận mã thông báo; nội dung đọc lại từ DB.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function khopKhoa(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !pub || !priv) return NextResponse.json({ error: "Chưa cấu hình thông báo đẩy" }, { status: 503 });
  if (!khopKhoa(req.headers.get("x-push-secret") ?? "", secret)) return NextResponse.json({ error: "Không được phép" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Mã thông báo không hợp lệ" }, { status: 400 });

  const db = createAdminClient();
  const { data: tb } = await db.from("thong_bao").select("id, user_id, tieu_de, noi_dung, lien_ket, da_doc").eq("id", id).maybeSingle();
  if (!tb || tb.da_doc) return NextResponse.json({ gui: 0 });
  const { data: subs } = await db.from("push_subscription").select("id, endpoint, p256dh, auth").eq("user_id", tb.user_id);
  if (!subs || subs.length === 0) return NextResponse.json({ gui: 0 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  const payload = JSON.stringify({ id: tb.id, tieu_de: tb.tieu_de, noi_dung: tb.noi_dung, lien_ket: tb.lien_ket });

  let gui = 0;
  const hetHan: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        // TTL 1 giờ: nhắc check-in quá giờ thì không còn ý nghĩa
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
        gui++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) hetHan.push(s.id);
      }
    }),
  );
  // Thiết bị đã hủy đăng ký / hết hạn thì dọn đi
  if (hetHan.length > 0) await db.from("push_subscription").delete().in("id", hetHan);
  return NextResponse.json({ gui, het_han: hetHan.length });
}
