// Các báo cáo cùng nhóm bộ lọc (mục 4.7) nay xếp dọc trên 1 trang thay vì tách tab — mỗi báo cáo 1 mục có neo (id) để
// nhảy nhanh bằng "mục lục" bên dưới (component MucLuc, file riêng — cần "use client" để theo dõi cuộn), không cần
// cuộn ngang qua nhiều tab như trước. scroll-mt bù cho topbar (sticky, mục 8.5b) CỘNG thanh mục lục sticky để tiêu đề
// không bị 2 lớp đó che khi nhảy neo.
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
