"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { batTatNhomLop, suaNhomLop, themNhomLop } from "@/lib/lop-hoc/actions";
import type { NhomLop } from "@/types/database";

const fmtD1 = (n: number) => n.toFixed(2).replace(".", ",");

// Danh mục nhóm lớp kèm hệ số độ khó D1 gắn sẵn (mục 4.8). Không xóa vì lớp đang dùng — tắt để ẩn khỏi lựa chọn mới.
export function NhomLopEditor({ items }: { items: NhomLop[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moi, setMoi] = useState({ ten: "", d1: "1,00" });
  const [dangSua, setDangSua] = useState<{ id: string; ten: string; d1: string } | null>(null);

  function run(fn: () => Promise<{ error?: string; ok?: boolean } | null>, onOk?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onOk?.();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Nhóm lớp <Badge variant="teal">{items.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Loại khóa học (ABCDE, ACLS, BLS...). Mỗi nhóm lớp gắn sẵn hệ số độ khó D1 dùng khi tính KPI — không dùng cho tính lương.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="divide-y rounded-xl border">
          {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">Chưa có nhóm lớp nào.</li>}
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              {dangSua?.id === d.id ? (
                <>
                  <Input
                    value={dangSua.ten}
                    onChange={(e) => setDangSua({ ...dangSua, ten: e.target.value })}
                    aria-label={`Tên mới của ${d.ten}`}
                    autoFocus
                  />
                  <Input
                    value={dangSua.d1}
                    onChange={(e) => setDangSua({ ...dangSua, d1: e.target.value })}
                    inputMode="decimal"
                    aria-label={`Hệ số D1 của ${d.ten}`}
                    className="w-20 shrink-0"
                  />
                  <Button
                    size="icon-sm"
                    disabled={pending}
                    aria-label="Lưu"
                    onClick={() => run(() => suaNhomLop(d.id, dangSua.ten, dangSua.d1), () => setDangSua(null))}
                  >
                    <Check />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Hủy sửa" onClick={() => setDangSua(null)}>
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <span className={d.dang_dung ? "flex-1 text-sm font-medium" : "flex-1 text-sm text-muted-foreground line-through"}>
                    {d.ten}
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    D1 ×{fmtD1(d.he_so_d1)}
                  </Badge>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.dang_dung}
                      disabled={pending}
                      onChange={(e) => run(() => batTatNhomLop(d.id, e.target.checked))}
                      className="size-4 accent-primary"
                    />
                    Đang dùng
                  </label>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Sửa ${d.ten}`}
                    onClick={() => setDangSua({ id: d.id, ten: d.ten, d1: fmtD1(d.he_so_d1) })}
                  >
                    <Pencil />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => themNhomLop(moi.ten, moi.d1), () => setMoi({ ten: "", d1: "1,00" }));
          }}
        >
          <Input value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} placeholder="Thêm nhóm lớp mới..." aria-label="Tên nhóm lớp mới" />
          <Input
            value={moi.d1}
            onChange={(e) => setMoi({ ...moi, d1: e.target.value })}
            inputMode="decimal"
            aria-label="Hệ số D1 của nhóm lớp mới"
            className="w-20 shrink-0"
          />
          <Button type="submit" variant="outline" disabled={pending || !moi.ten.trim()}>
            <Plus /> Thêm
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
