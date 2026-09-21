"use client";

import { useState, useTransition } from "react";
import { Check, Send, Undo2, UserMinus, X } from "lucide-react";
import { XacNhanDialog } from "@/components/lop-hoc/xac-nhan-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  duyetDangKy,
  huyPhanCong,
  moiGiangDay,
  phanHoiLoiMoi,
  rutDangKy,
  thuHoiLoiMoi,
  tuChoiDangKy,
} from "@/lib/dang-ky/actions";
import type { ActionState } from "@/lib/nhan-su/actions";
import type { VaiTroGiangDay } from "@/types/database";

// Chạy 1 thao tác, hiện lỗi ngay bên dưới nút nếu có
function useChay() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function chay(fn: () => Promise<ActionState>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  }
  return { pending, error, chay };
}

function Loi({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-1 max-w-64 text-xs text-danger">
      {error}
    </p>
  ) : null;
}

// Luồng B: gửi lời mời trực tiếp từ danh sách gợi ý
export function NutMoi({ baiId, vaiTro, userId }: { baiId: string; vaiTro: VaiTroGiangDay; userId: string }) {
  const { pending, error, chay } = useChay();
  return (
    <span className="flex flex-col items-end">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => chay(() => moiGiangDay(baiId, vaiTro, userId))}>
        <Send /> {pending ? "Đang mời..." : "Mời"}
      </Button>
      <Loi error={error} />
    </span>
  );
}

export function NutThuHoi({ id }: { id: string }) {
  const { pending, error, chay } = useChay();
  return (
    <span className="flex flex-col items-end">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => chay(() => thuHoiLoiMoi(id))}>
        <Undo2 /> Thu hồi
      </Button>
      <Loi error={error} />
    </span>
  );
}

export function NutRut({ id }: { id: string }) {
  const { pending, error, chay } = useChay();
  return (
    <span className="flex flex-col items-end">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => chay(() => rutDangKy(id))}>
        <Undo2 /> Rút đăng ký
      </Button>
      <Loi error={error} />
    </span>
  );
}

// Người được mời trả lời độc lập theo từng Bài
export function NutPhanHoiMoi({ id }: { id: string }) {
  const { pending, error, chay } = useChay();
  return (
    <span className="flex flex-col items-end">
      <span className="flex gap-1.5">
        <Button type="button" size="sm" disabled={pending} onClick={() => chay(() => phanHoiLoiMoi(id, true))}>
          <Check /> Đồng ý
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => chay(() => phanHoiLoiMoi(id, false))}>
          <X /> Từ chối
        </Button>
      </span>
      <Loi error={error} />
    </span>
  );
}

// Duyệt đăng ký. Nếu vượt ngưỡng dồn tải thì hiện cảnh báo mềm (không chặn cứng) để Admin xác nhận rồi mới duyệt.
export function NutDuyet({ id }: { id: string }) {
  const { pending, error, chay } = useChay();
  const [canhBao, setCanhBao] = useState<string | null>(null);
  const [dangXacNhan, startXacNhan] = useTransition();
  const [loiXacNhan, setLoiXacNhan] = useState<string | null>(null);

  return (
    <>
      <span className="flex flex-col items-end">
        <span className="flex gap-1.5">
          <Button type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              chay(async () => {
                const res = await duyetDangKy(id, false);
                if (res.canhBao) setCanhBao(res.canhBao);
                return res;
              })
            }
          >
            <Check /> Duyệt
          </Button>
          <XacNhanDialog
            trigger={
              <Button type="button" size="sm" variant="outline">
                <X /> Từ chối
              </Button>
            }
            title="Từ chối đăng ký này?"
            description="Đăng ký bị từ chối được ghi lại. Slot vẫn mở cho người khác."
            confirmLabel="Từ chối"
            destructive
            onConfirm={() => tuChoiDangKy(id, "")}
          />
        </span>
        <Loi error={error} />
      </span>

      <Dialog
        open={canhBao !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCanhBao(null);
            setLoiXacNhan(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cảnh báo dồn tải</DialogTitle>
            <DialogDescription>{canhBao}</DialogDescription>
          </DialogHeader>
          {loiXacNhan && (
            <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
              {loiXacNhan}
            </p>
          )}
          <DialogFooter>
            <Button type="button"
              disabled={dangXacNhan}
              onClick={() =>
                startXacNhan(async () => {
                  const res = await duyetDangKy(id, true);
                  if (res.error) setLoiXacNhan(res.error);
                  else setCanhBao(null);
                })
              }
            >
              {dangXacNhan ? "Đang duyệt..." : "Vẫn duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hủy phân công 1 slot đã có người -> slot quay lại "Trống"
export function NutHuyPhanCong({ slotId, ten }: { slotId: string; ten: string }) {
  return (
    <XacNhanDialog
      trigger={
        <Button type="button" size="sm" variant="ghost" className="hover:text-danger">
          <UserMinus /> Hủy phân công
        </Button>
      }
      title="Hủy phân công?"
      description={`${ten} sẽ không còn được phân công ở slot này và slot quay lại trạng thái “Còn trống”.`}
      confirmLabel="Hủy phân công"
      destructive
      onConfirm={() => huyPhanCong(slotId, "")}
    />
  );
}
