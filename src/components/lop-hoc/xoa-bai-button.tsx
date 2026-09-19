"use client";

import { Trash2 } from "lucide-react";
import { XacNhanDialog } from "@/components/lop-hoc/xac-nhan-dialog";
import { Button } from "@/components/ui/button";
import { xoaBaiHoc } from "@/lib/lop-hoc/actions";

export function XoaBaiButton({ id, lopId, ten }: { id: string; lopId: string; ten: string }) {
  return (
    <XacNhanDialog
      trigger={
        <Button variant="outline" size="sm" className="hover:text-danger">
          <Trash2 /> Xóa Bài
        </Button>
      }
      title="Xóa Bài?"
      description={`Bài “${ten}” và các slot của Bài sẽ bị xóa. Chỉ xóa được khi chưa có ai đăng ký hoặc được phân công.`}
      confirmLabel="Xác nhận xóa"
      pendingLabel="Đang xóa..."
      destructive
      onConfirm={() => xoaBaiHoc(id, lopId)}
    />
  );
}
