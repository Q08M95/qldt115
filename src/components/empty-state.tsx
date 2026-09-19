import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

// Empty state (mục 8.5): icon outline lớn xám nhạt + 1 dòng mô tả + (tùy chọn) nút hành động gợi ý.
export function EmptyState({
  icon: Icon = Inbox,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <Icon className="size-12 text-muted-foreground/40" strokeWidth={1.25} aria-hidden />
      <p className="max-w-xs text-sm text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}
