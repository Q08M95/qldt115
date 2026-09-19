"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { batTatDanhMuc, suaDanhMuc, themDanhMuc } from "@/lib/nhan-su/actions";
import type { DanhMuc, DanhMucBang } from "@/types/database";

// Trình sửa 1 danh mục: thêm, đổi tên, bật/tắt. Không xóa vì mục đang được hồ sơ dùng — tắt để ẩn khỏi lựa chọn mới.
export function DanhMucEditor({
  bang,
  tieuDe,
  moTa,
  items,
}: {
  bang: DanhMucBang;
  tieuDe: string;
  moTa: string;
  items: DanhMuc[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moi, setMoi] = useState("");
  const [dangSua, setDangSua] = useState<{ id: string; ten: string } | null>(null);

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
          {tieuDe} <Badge variant="teal">{items.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{moTa}</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="divide-y rounded-xl border">
          {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">Chưa có mục nào.</li>}
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              {dangSua?.id === d.id ? (
                <>
                  <Input
                    value={dangSua.ten}
                    onChange={(e) => setDangSua({ id: d.id, ten: e.target.value })}
                    aria-label={`Tên mới của ${d.ten}`}
                    autoFocus
                  />
                  <Button
                    size="icon-sm"
                    disabled={pending}
                    aria-label="Lưu tên"
                    onClick={() => run(() => suaDanhMuc(bang, d.id, dangSua.ten), () => setDangSua(null))}
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
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.dang_dung}
                      disabled={pending}
                      onChange={(e) => run(() => batTatDanhMuc(bang, d.id, e.target.checked))}
                      className="size-4 accent-primary"
                    />
                    Đang dùng
                  </label>
                  <Button size="icon-sm" variant="ghost" aria-label={`Sửa ${d.ten}`} onClick={() => setDangSua({ id: d.id, ten: d.ten })}>
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
            run(() => themDanhMuc(bang, moi), () => setMoi(""));
          }}
        >
          <Input value={moi} onChange={(e) => setMoi(e.target.value)} placeholder="Thêm mục mới..." aria-label={`Thêm vào ${tieuDe}`} />
          <Button type="submit" variant="outline" disabled={pending || !moi.trim()}>
            <Plus /> Thêm
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
