// Endpoint chẩn đoán hiệu năng TẠM THỜI: đo độ trễ từ Vercel Function tới Supabase. Sẽ xóa sau khi tối ưu xong.
export const dynamic = "force-dynamic";

async function time(url: string, headers: Record<string, string>) {
  const t = performance.now();
  await fetch(url, { headers, cache: "no-store" }).then((r) => r.arrayBuffer());
  return Math.round(performance.now() - t);
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  const auth: number[] = [];
  const db: number[] = [];
  for (let i = 0; i < 4; i++) {
    auth.push(await time(`${base}/auth/v1/settings`, h));
    db.push(await time(`${base}/rest/v1/danh_muc_chuyen_mon?select=id&limit=1`, h));
  }
  return Response.json({
    vercelRegion: process.env.VERCEL_REGION ?? null,
    authMs: auth,
    dbMs: db,
  });
}
