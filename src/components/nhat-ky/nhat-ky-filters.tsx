"use client";

import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { LOAI_NHAT_KY_OPTIONS } from "@/lib/nhat-ky/labels";

export interface NhatKyFilterValues {
  q: string;
  loai: string;
  tu: string;
  den: string;
}

// Bộ lọc GET form: URL giữ nguyên trạng thái lọc để chia sẻ/quay lại (cùng kiểu với danh sách Nhân sự)
export function NhatKyFilters({ values }: { values: NhatKyFilterValues }) {
  const submitOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const dangLoc = Object.values(values).some(Boolean);

  return (
    <Form action="/nhat-ky" className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:flex-wrap md:items-end">
      <div className="relative md:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input name="q" defaultValue={values.q} placeholder="Tìm theo nội dung, người thực hiện..." className="pl-9" aria-label="Tìm trong nhật ký" />
      </div>
      <NativeSelect name="loai" defaultValue={values.loai} onChange={submitOnChange} aria-label="Loại hành động" className="md:w-52">
        <option value="">Mọi hành động</option>
        {LOAI_NHAT_KY_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </NativeSelect>
      <div className="grid grid-cols-2 gap-3 md:flex">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Từ ngày
          <Input type="date" name="tu" defaultValue={values.tu} className="md:w-40" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Đến ngày
          <Input type="date" name="den" defaultValue={values.den} className="md:w-40" />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="max-md:flex-1">
          Lọc
        </Button>
        {dangLoc && (
          <Button asChild variant="ghost">
            <Link href="/nhat-ky">
              <X /> Xóa lọc
            </Link>
          </Button>
        )}
      </div>
    </Form>
  );
}
