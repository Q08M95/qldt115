import Link from "next/link";

// Các báo cáo cùng nhóm bộ lọc (mục 4.7) nay xếp dọc trên 1 trang thay vì tách tab — mỗi báo cáo 1 mục có neo (id) để
// nhảy nhanh bằng "mục lục" bên dưới, không cần cuộn ngang qua nhiều tab như trước. scroll-mt bù cho topbar (sticky,
// mục 8.5b) CỘNG thanh mục lục sticky (xem trang gọi component này) để tiêu đề không bị 2 lớp đó che khi nhảy neo.
export function MucBaoCao({ id, nhan, children }: { id: string; nhan: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 grid gap-4 md:scroll-mt-36">
      <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-foreground">
        <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-brand-gradient" />
        {nhan}
      </h2>
      {children}
    </section>
  );
}

export function MucLuc({ items }: { items: readonly { khoa: string; nhan: string }[] }) {
  return (
    <nav aria-label="Mục lục báo cáo" className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="mr-0.5 text-muted-foreground/70">Xem nhanh:</span>
      {items.map((m) => (
        <Link
          key={m.khoa}
          href={`#${m.khoa}`}
          className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground"
        >
          {m.nhan}
        </Link>
      ))}
    </nav>
  );
}
