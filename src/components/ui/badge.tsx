import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Badge/Pill (CLAUDE.md 8.5): nền nhạt + chữ đậm cùng tông semantic, bo full-round, chữ 12px medium.
// Dùng cho trạng thái: success (đã duyệt/đạt), warning (chờ duyệt/cảnh báo), danger (từ chối/vi phạm),
// neutral (nháp/vô hiệu hóa), và 4 màu gốc (blue/navy/teal/green) cho phân loại như nhóm lớp.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        neutral: "bg-neutral-bg text-neutral",
        blue: "bg-grad-blue text-hue-blue",
        navy: "bg-grad-navy text-hue-navy",
        teal: "bg-grad-teal text-hue-teal",
        green: "bg-grad-green text-hue-green",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
