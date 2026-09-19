"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
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
import { xoaChungChi } from "@/lib/nhan-su/actions";

// Modal giữa màn hình chỉ cho xác nhận ngắn (mục 8.5)
export function XoaChungChiButton({ id, ten }: { id: string; ten: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Xóa chứng chỉ" className="hover:text-danger">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa chứng chỉ?</DialogTitle>
          <DialogDescription>
            Chứng chỉ “{ten}” và ảnh minh chứng đi kèm sẽ bị xóa vĩnh viễn.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await xoaChungChi(id);
                if (res?.error) setError(res.error);
                else setOpen(false);
              })
            }
          >
            {pending ? "Đang xóa..." : "Xác nhận xóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
