import { cn } from "@/lib/utils";

// Bố cục dashboard theo ảnh mẫu: cột chính (~64%) chứa hàng thẻ stat nhỏ + các khối lớn,
// cột phụ (~36%) chứa các chart nhỏ xếp dọc và chạy từ trên cùng — KHÔNG để thẻ stat trải hết chiều ngang.
// Dưới lg xếp dọc 1 cột (mobile).
export function DashboardLayout({
  main,
  aside,
  className,
}: {
  main: React.ReactNode;
  aside: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]", className)}>
      <div className="flex min-w-0 flex-col gap-5">{main}</div>
      <div className="flex min-w-0 flex-col gap-5">{aside}</div>
    </div>
  );
}

// Hàng thẻ stat: 3 thẻ nhỏ bằng nhau nằm trong cột chính
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-3">{children}</div>;
}
