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
    <nav aria-label="Mục lục báo cáo" className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="mr-0.5 text-muted-foreground/70">Xem nhanh:</span>
      {items.map((m) => (
        <Link
          key={m.khoa}
          href={`#${m.khoa}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-card text-[10px] font-semibold text-foreground">{m.so}</span>
          {m.nhan}
        </Link>
      ))}
    </nav>
  );
}
