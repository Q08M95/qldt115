import type { Metadata } from "next";
import { Lock, SearchX } from "lucide-react";
import { KhaoSatForm } from "@/components/lop-hoc/khao-sat-form";
import { createClient } from "@/lib/supabase/server";

// Trang công khai (không cần đăng nhập, không lập chỉ mục): học viên điền khảo sát hài lòng của lớp
export const metadata: Metadata = {
  title: "Khảo sát hài lòng",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Thong({ icon: Icon, title, text }: { icon: typeof Lock; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Icon className="size-14 text-muted-foreground/40" strokeWidth={1.25} aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default async function KhaoSatPage(props: PageProps<"/khao-sat/[token]">) {
  const { token } = await props.params;

  let lop: { ten_lop: string; dang_mo: boolean } | null = null;
  if (UUID.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("lay_khao_sat", { p_token: token });
    lop = (data as { ten_lop: string; dang_mo: boolean }[] | null)?.[0] ?? null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-card dark:border">
        {!lop ? (
          <Thong icon={SearchX} title="Không tìm thấy khảo sát" text="Đường dẫn không đúng hoặc khảo sát không còn tồn tại." />
        ) : !lop.dang_mo ? (
          <Thong icon={Lock} title="Khảo sát đã đóng" text={`Khảo sát lớp “${lop.ten_lop}” hiện không nhận phản hồi nữa.`} />
        ) : (
          <>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Khảo sát hài lòng · ẩn danh</p>
            <h1 className="mt-1 mb-6 text-xl font-semibold">{lop.ten_lop}</h1>
            <KhaoSatForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
