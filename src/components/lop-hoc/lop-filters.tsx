"use client";

import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DOI_TUONG_LABEL, LOAI_KINH_PHI_LABEL, TRANG_THAI_LOP_OPTIONS } from "@/lib/lop-hoc/labels";

export interface LopFilterValues {
  q: string;
  nhom_lop: string;
  trang_thai: string;
  doi_tuong: string;
  kinh_phi: string;
}

// Lọc bằng GET form (next/form), cùng cách với danh sách nhân sự: đổi ô chọn là tự gửi, URL giữ trạng thái lọc.
// Lọc theo nhóm lớp giúp tìm các lớp cùng loại sắp mở (mục 4.3). Bộ lọc dùng chung cho cả chế độ Danh sách lẫn Lịch:
// "giu" là các tham số URL cần giữ nguyên khi lọc (vd xem=lich, thang=...), "xoaHref" là đích của nút "Xóa lọc".
export function LopFilters({
  values,
  nhomLop,
  action = "/lop-hoc",
  giu = {},
  xoaHref = action,
}: {
  values: LopFilterValues;
  nhomLop: { id: string; ten: string }[];
  action?: string;
  giu?: Record<string, string>;
  xoaHref?: string;
}) {
  const submitOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const dangLoc = Object.values(values).some(Boolean);

  return (
    <Form action={action} className="flex flex-col gap-3 px-5 pb-1 md:flex-row md:flex-wrap md:items-center">
      {Object.entries(giu).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="relative md:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input name="q" defaultValue={values.q} placeholder="Tìm theo tên lớp, địa điểm..." className="pl-9" aria-label="Tìm lớp" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap">
        <NativeSelect name="nhom_lop" defaultValue={values.nhom_lop} onChange={submitOnChange} aria-label="Nhóm lớp" className="md:w-40">
          <option value="">Mọi nhóm lớp</option>
          {nhomLop.map((n) => (
            <option key={n.id} value={n.id}>
              {n.ten}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="trang_thai" defaultValue={values.trang_thai} onChange={submitOnChange} aria-label="Trạng thái lớp" className="md:w-44">
          <option value="">Mọi trạng thái</option>
          {/* "Dự kiến" hiện cho cả GV/TG: lớp Dự kiến đã công khai sớm họ vẫn thấy được (RLS lo phần chưa công khai) */}
          {TRANG_THAI_LOP_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="doi_tuong" defaultValue={values.doi_tuong} onChange={submitOnChange} aria-label="Đối tượng" className="md:w-40">
          <option value="">Mọi đối tượng</option>
          {Object.entries(DOI_TUONG_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="kinh_phi" defaultValue={values.kinh_phi} onChange={submitOnChange} aria-label="Loại kinh phí" className="md:w-40">
          <option value="">Mọi loại kinh phí</option>
          {Object.entries(LOAI_KINH_PHI_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="max-md:flex-1">
          Tìm
        </Button>
        {dangLoc && (
          <Button asChild variant="ghost">
            <Link href={xoaHref}>
              <X /> Xóa lọc
            </Link>
          </Button>
        )}
      </div>
    </Form>
  );
}
