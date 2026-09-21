"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ActionState } from "@/lib/nhan-su/actions";

// Drawer chứa form (mục 8.5: Drawer trượt từ phải cho xem/sửa nhanh, toàn màn hình trên mobile).
// Nội dung chỉ mount khi mở -> mỗi lần mở là form mới, trạng thái lỗi/thành công của lần trước không còn.
export function FormDrawer({
  trigger,
  title,
  description,
  action,
  submitLabel = "Lưu",
  submitDisabled,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription className={description ? undefined : "sr-only"}>{description ?? title}</SheetDescription>
        </SheetHeader>
        <DrawerForm action={action} submitLabel={submitLabel} submitDisabled={submitDisabled} onDone={() => setOpen(false)}>
          {children}
        </DrawerForm>
      </SheetContent>
    </Sheet>
  );
}

function DrawerForm({
  action,
  submitLabel,
  submitDisabled,
  onDone,
  children,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  submitDisabled?: boolean;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {children}
        {state?.error && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
        <Button type="submit" disabled={pending || submitDisabled}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </SheetFooter>
    </form>
  );
}
