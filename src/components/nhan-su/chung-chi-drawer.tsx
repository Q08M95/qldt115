"use client";

import { useState } from "react";
import { ImagePlus, Pencil, Plus, X } from "lucide-react";
import { Field } from "@/components/field";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { luuChungChi } from "@/lib/nhan-su/actions";
import { createClient } from "@/lib/supabase/client";
import type { ChungChi, DanhMuc } from "@/types/database";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Ảnh tải thẳng từ trình duyệt lên Supabase Storage (tránh giới hạn kích thước body của Server Action),
// đường dẫn `<user_id>/<uuid>.<đuôi>` — chính sách Storage chỉ cho chủ hồ sơ hoặc người quản trị ghi.
function ImageUploader({
  userId,
  initialPath,
  initialUrl,
  onBusyChange,
}: {
  userId: string;
  initialPath: string | null;
  initialUrl: string | null;
  onBusyChange: (busy: boolean) => void;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (file.size > MAX_BYTES) return setError("Ảnh tối đa 5MB.");

    setBusy(true);
    onBusyChange(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const newPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("chung-chi").upload(newPath, file, { contentType: file.type });
    setBusy(false);
    onBusyChange(false);
    if (upErr) return setError(`Không tải được ảnh: ${upErr.message}`);

    setPath(newPath);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="hinh_anh_path" value={path ?? ""} />
      <input type="hidden" name="hinh_anh_path_cu" value={initialPath ?? ""} />
      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Ảnh minh chứng" className="max-h-48 rounded-lg border object-contain" />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-2 right-2"
            aria-label="Gỡ ảnh"
            onClick={() => {
              setPath(null);
              setPreview(null);
            }}
          >
            <X />
          </Button>
        </div>
      ) : (
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-background">
          <ImagePlus className="size-6" aria-hidden />
          {busy ? "Đang tải ảnh..." : "Chọn ảnh minh chứng (JPG, PNG, WebP — tối đa 5MB)"}
          <input type="file" accept={ALLOWED.join(",")} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ChungChiDrawer({
  userId,
  loai,
  chungChi,
}: {
  userId: string;
  loai: DanhMuc[];
  // Có giá trị = sửa, không có = thêm mới
  chungChi?: ChungChi;
}) {
  const [uploading, setUploading] = useState(false);
  // Loại đang gán nhưng đã bị tắt vẫn hiển thị để không mất dữ liệu khi sửa
  const options = loai.filter((l) => l.dang_dung || l.id === chungChi?.loai_id);

  return (
    <FormDrawer
      trigger={
        chungChi ? (
          <Button variant="ghost" size="icon-sm" aria-label="Sửa chứng chỉ">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus /> Thêm chứng chỉ
          </Button>
        )
      }
      title={chungChi ? "Sửa chứng chỉ" : "Thêm chứng chỉ"}
      action={luuChungChi}
      submitDisabled={uploading}
    >
      <input type="hidden" name="user_id" value={userId} />
      {chungChi && <input type="hidden" name="id" value={chungChi.id} />}

      <Field label="Loại chứng chỉ" htmlFor="loai_id">
        <NativeSelect id="loai_id" name="loai_id" defaultValue={chungChi?.loai_id ?? ""} required>
          <option value="" disabled>
            — Chọn loại —
          </option>
          {options.map((l) => (
            <option key={l.id} value={l.id}>
              {l.ten}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Số chứng chỉ" htmlFor="so_chung_chi">
        <Input id="so_chung_chi" name="so_chung_chi" defaultValue={chungChi?.so_chung_chi ?? ""} />
      </Field>
      <Field label="Nội dung" htmlFor="noi_dung">
        <Textarea id="noi_dung" name="noi_dung" defaultValue={chungChi?.noi_dung ?? ""} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ngày cấp" htmlFor="ngay_cap">
          <Input id="ngay_cap" name="ngay_cap" type="date" defaultValue={chungChi?.ngay_cap ?? ""} />
        </Field>
        <Field label="Nơi cấp" htmlFor="noi_cap">
          <Input id="noi_cap" name="noi_cap" defaultValue={chungChi?.noi_cap ?? ""} />
        </Field>
      </div>
      <Field label="Hình ảnh minh chứng">
        <ImageUploader
          userId={userId}
          initialPath={chungChi?.hinh_anh_path ?? null}
          initialUrl={chungChi?.hinh_anh_url ?? null}
          onBusyChange={setUploading}
        />
      </Field>
    </FormDrawer>
  );
}
