"use client";

import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { NHOM_OPTIONS, TRANG_THAI_OPTIONS, VAI_TRO_LABEL } from "@/lib/nhan-su/labels";

export interface NhanSuFilterValues {
  q: string;
  trang_thai: string;
  vai_tro: string;
  chuyen_mon: string;
  nhom: string;
}

// Bộ lọc dùng GET form (next/form): đổi ô chọn là tự gửi, URL giữ nguyên trạng thái lọc để chia sẻ/quay lại.
// Ô lọc Nhóm chỉ render với Admin/Quản lý lớp (mục 4.7: ẩn nhãn nhóm với GV/TG).
export function NhanSuFilters({
  values,
  chuyenMon,
  isQuanTri,
}: {
  values: NhanSuFilterValues;
  chuyenMon: { id: string; ten: string }[];
  isQuanTri: boolean;
}) {
  const submitOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const dangLoc = Object.values(values).some(Boolean);

  return (
    <Form action="/nhan-su" className="flex flex-col gap-3 px-5 pb-4 md:flex-row md:flex-wrap md:items-center">
      <div className="relative md:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input name="q" defaultValue={values.q} placeholder="Tìm theo tên, email..." className="pl-9" aria-label="Tìm nhân sự" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap">
        <NativeSelect name="trang_thai" defaultValue={values.trang_thai} onChange={submitOnChange} aria-label="Trạng thái tham gia" className="md:w-44">
          <option value="">Mọi trạng thái</option>
          {TRANG_THAI_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="vai_tro" defaultValue={values.vai_tro} onChange={submitOnChange} aria-label="Vai trò" className="md:w-36">
          <option value="">Mọi vai trò</option>
          {Object.entries(VAI_TRO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="chuyen_mon" defaultValue={values.chuyen_mon} onChange={submitOnChange} aria-label="Chuyên môn" className="md:w-40">
          <option value="">Mọi chuyên môn</option>
          {chuyenMon.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ten}
            </option>
          ))}
        </NativeSelect>
        {isQuanTri && (
          <NativeSelect name="nhom" defaultValue={values.nhom} onChange={submitOnChange} aria-label="Nhóm" className="md:w-56">
            <option value="">Mọi nhóm</option>
            {NHOM_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="max-md:flex-1">
          Tìm
        </Button>
        {dangLoc && (
          <Button asChild variant="ghost">
            <Link href="/nhan-su">
              <X /> Xóa lọc
            </Link>
          </Button>
        )}
      </div>
    </Form>
  );
}
