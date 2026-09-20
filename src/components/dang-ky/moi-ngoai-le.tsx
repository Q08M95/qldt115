"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, UserPlus } from "lucide-react";
import { Field } from "@/components/field";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { moiGiangDay, nhanSuChoMoi } from "@/lib/dang-ky/actions";
import { VAI_TRO_LABEL } from "@/lib/nhan-su/labels";
import type { NhanSuChoMoi, VaiTroGiangDay } from "@/types/database";

// "Mời người ngoài đề xuất": Admin chọn bất kỳ nhân sự nào. Nếu người đó không đủ điều kiện (lọc cứng) thì đây là mời NGOẠI LỆ:
// bắt buộc nhập lý do, người được mời vẫn phải đồng ý. Trùng lịch / đã có đăng ký ở Bài này bị chặn cứng (không chọn được).
export function MoiNgoaiLe({ baiId, vaiTro }: { baiId: string; vaiTro: VaiTroGiangDay }) {
  const [open, setOpen] = useState(false);
  const [ds, setDs] = useState<NhanSuChoMoi[] | null>(null);
  const [chon, setChon] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dangTai, startTai] = useTransition();
  const [dangMoi, startMoi] = useTransition();

  const nguoi = ds?.find((x) => x.user_id === chon);
  const laNgoaiLe = !!nguoi?.ly_do;

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o) return;
    setChon("");
    setLyDo("");
    setError(null);
    startTai(async () => {
      const res = await nhanSuChoMoi(baiId, vaiTro);
      if (res.error) setError(res.error);
      else setDs(res.ds ?? []);
    });
  }

  function moi() {
    if (!nguoi) return;
    setError(null);
    startMoi(async () => {
      const res = await moiGiangDay(baiId, vaiTro, nguoi.user_id, laNgoaiLe, lyDo);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          <UserPlus /> Mời người ngoài đề xuất
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời người ngoài đề xuất · {VAI_TRO_LABEL[vaiTro]}</DialogTitle>
          <DialogDescription>
            Chọn bất kỳ nhân sự nào. Người chưa đủ điều kiện vẫn mời được như 1 ngoại lệ có ghi lý do; họ vẫn phải đồng ý mới được phân công.
          </DialogDescription>
        </DialogHeader>

        <Field label="Nhân sự" htmlFor="ngoai-le-nguoi">
          <NativeSelect id="ngoai-le-nguoi" value={chon} onChange={(e) => setChon(e.target.value)} disabled={dangTai || !ds}>
            <option value="">{dangTai || !ds ? "Đang tải danh sách..." : "— Chọn nhân sự —"}</option>
            {ds?.map((x) => (
              <option key={x.user_id} value={x.user_id} disabled={x.chan_cung}>
                {x.ho_ten}
                {x.chan_cung ? " — không thể mời (trùng lịch / đã có đăng ký ở Bài này)" : x.ly_do ? " — ngoài đề xuất" : " — đủ điều kiện"}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {laNgoaiLe && (
          <>
            <div className="flex gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-medium">{nguoi?.ho_ten}</strong> không nằm trong đề xuất: {nguoi?.ly_do}. Việc mời sẽ được ghi nhận là ngoại lệ.
              </span>
            </div>
            <Field label="Lý do mời ngoại lệ (bắt buộc)" htmlFor="ngoai-le-ly-do">
              <Textarea id="ngoai-le-ly-do" value={lyDo} onChange={(e) => setLyDo(e.target.value)} rows={3} placeholder="Vd: Giảng viên thỉnh giảng, đã thống nhất với Ban giám đốc" />
            </Field>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" disabled={!nguoi || dangMoi || (laNgoaiLe && !lyDo.trim())} onClick={moi}>
            {dangMoi ? "Đang mời..." : laNgoaiLe ? "Mời ngoại lệ" : "Mời"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
