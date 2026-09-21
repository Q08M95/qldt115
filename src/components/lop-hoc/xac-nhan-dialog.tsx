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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/nhan-su/actions";

// Modal giữa màn hình chỉ cho xác nhận ngắn (mục 8.5): hủy lớp, xóa Bài, hoàn thành lớp...
// Có thể yêu cầu nhập lý do (nhapLyDo): nút xác nhận chỉ bật khi lý do đủ dài, và lý do được truyền vào onConfirm.
export function XacNhanDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Đang xử lý...",
  destructive,
  onConfirm,
  redirectTo,
  nhapLyDo,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  onConfirm: (lyDo: string) => Promise<ActionState>;
  // Chuyển trang sau khi thành công (vd xóa lớp xong quay về danh sách)
  redirectTo?: string;
  nhapLyDo?: { nhan: string; placeholder?: string; toiThieu?: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [pending, start] = useTransition();
  const toiThieu = nhapLyDo?.toiThieu ?? 5;
  const thieuLyDo = !!nhapLyDo && lyDo.trim().length < toiThieu;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setLyDo("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {nhapLyDo && (
          <div className="grid gap-1.5">
            <Label htmlFor="xac-nhan-ly-do" className="text-sm font-medium">
              {nhapLyDo.nhan}
            </Label>
            <Textarea
              id="xac-nhan-ly-do"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder={nhapLyDo.placeholder}
              maxLength={500}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending || thieuLyDo}
            onClick={() =>
              start(async () => {
                const res = await onConfirm(lyDo.trim());
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
