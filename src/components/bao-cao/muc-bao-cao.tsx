import Link from "next/link";

// Các báo cáo cùng nhóm bộ lọc (mục 4.7) nay xếp dọc trên 1 trang thay vì tách tab — mỗi báo cáo 1 mục có neo (id) để
// nhảy nhanh bằng "mục lục" bên dưới, không cần cuộn ngang qua nhiều tab như trước.
export function MucBaoCao({ id, so, nhan, children }: { id: string; so: number; nhan: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 grid gap-4">
      <h2 className="flex items-center gap-2.5 text-[17px] font-semibold">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{so}</span>
        {nhan}
      </h2>
      {children}
    </section>
  );
}

export function MucLuc({ items }: { items: readonly { khoa: string; so: number; nhan: string }[] }) {
  return (
    <nav aria-label="Mục lục báo cáo" className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1 pb-1 text-sm">
      {items.map((m) => (
        <Link key={m.khoa} href={`#${m.khoa}`} className="rounded-full border border-transparent px-2.5 py-1 text-muted-foreground transition-colors duration-150 hover:border-border hover:text-foreground">
          {m.so}. {m.nhan}
        </Link>
      ))}
    </nav>
  );
}
