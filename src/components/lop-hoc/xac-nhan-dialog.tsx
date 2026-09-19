"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/nhan-su/actions";

// Modal giữa màn hình chỉ cho xác nhận ngắn (mục 8.5): hủy lớp, xóa Bài, hoàn thành lớp...
export function XacNhanDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Đang xử lý...",
  destructive,
  onConfirm,
  redirectTo,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<ActionState>;
  // Chuyển trang sau khi thành công (vd xóa lớp xong quay về danh sách)
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await onConfirm();
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                setOpen(false);
                if (redirectTo) router.push(redirectTo);
              })
            }
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
