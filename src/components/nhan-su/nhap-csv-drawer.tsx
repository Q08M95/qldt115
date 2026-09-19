"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Copy, Download, FileUp, Upload, XCircle } from "lucide-react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { nhapNhieuNhanSu, type KetQuaDong } from "@/lib/nhan-su/tai-khoan-actions";

const MAU = `email,họ tên,nhóm,mật khẩu
an.nguyen@example.com,Nguyễn Văn An,Giảng viên là bác sĩ,
binh.tran@example.com,Trần Thị Bình,tg_khong_bac_si,MatKhau@123`;

function csvCell(s: string) {
  return /[",\n;\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function KetQuaBang({ ketQua }: { ketQua: KetQuaDong[] }) {
  const [copied, setCopied] = useState(false);
  const thanhCong = ketQua.filter((k) => k.ok).length;
  const coMatKhau = ketQua.filter((k) => k.ok && k.mat_khau);

  function taiCsv() {
    // BOM để Excel đọc đúng tiếng Việt
    const dong = ["email,họ tên,kết quả,mật khẩu tạm"].concat(
      ketQua.map((k) => [k.email, k.ho_ten, k.thong_bao, k.mat_khau ?? ""].map(csvCell).join(",")),
    );
    const url = URL.createObjectURL(new Blob(["﻿" + dong.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ket-qua-them-nhan-su.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Đã tạo <strong className="text-success">{thanhCong}</strong> / {ketQua.length} tài khoản.
        {thanhCong < ketQua.length && <span className="text-danger"> {ketQua.length - thanhCong} dòng lỗi — sửa rồi nhập lại các dòng đó.</span>}
      </p>

      {coMatKhau.length > 0 && (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="mb-2 font-medium">Mật khẩu tạm do hệ thống tự sinh — chỉ hiển thị lần này, hãy lưu lại ngay:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(coMatKhau.map((k) => `${k.email}\t${k.mat_khau}`).join("\n"));
                setCopied(true);
              }}
            >
              <Copy /> {copied ? "Đã sao chép" : "Sao chép (email ⇥ mật khẩu)"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={taiCsv}>
              <Download /> Tải kết quả (CSV)
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y rounded-xl border text-sm">
        {ketQua.map((k) => (
          <li key={k.dong} className="flex items-start gap-3 px-3 py-2.5">
            {k.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Thành công" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Lỗi" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {k.ho_ten || "(thiếu họ tên)"} <span className="font-normal text-muted-foreground">· {k.email || "(thiếu email)"}</span>
              </p>
              <p className={k.ok ? "text-xs text-muted-foreground" : "text-xs text-danger"}>
                Dòng {k.dong}: {k.thong_bao}
              </p>
              {k.mat_khau && <p className="mt-0.5 font-mono text-xs">Mật khẩu tạm: {k.mat_khau}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NhapForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(nhapNhieuNhanSu, null);
  const [text, setText] = useState("");

  async function onFile(file: File | undefined) {
    if (file) setText(await file.text());
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {state?.ketQua ? (
          <KetQuaBang ketQua={state.ketQua} />
        ) : (
          <>
            <div className="rounded-lg bg-background p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Định dạng mỗi dòng: email, họ tên, nhóm, mật khẩu</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>Dán trực tiếp từ Excel (các cột cách nhau bằng Tab) hoặc chọn file .csv.</li>
                <li>
                  <strong>Nhóm</strong> và <strong>mật khẩu</strong> có thể để trống. Không có mật khẩu thì hệ thống tự sinh mật khẩu ngẫu nhiên cho từng người.
                </li>
                <li>Nhóm ghi tên đầy đủ (vd “Giảng viên là bác sĩ”) hoặc mã (vd gv_bac_si).</li>
                <li>Tối đa 200 dòng mỗi lần. Dòng tiêu đề (bắt đầu bằng “email”) sẽ được bỏ qua.</li>
              </ul>
              <Button type="button" variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => setText(MAU)}>
                Điền dữ liệu mẫu
              </Button>
            </div>

            <Field label="Danh sách nhân sự" htmlFor="csv">
              <Textarea id="csv" name="csv" value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" />
            </Field>

            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-background">
              <FileUp className="size-4" aria-hidden /> Chọn file .csv
              <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>

            {state?.error && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}
          </>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
        {state?.ketQua ? (
          <Button type="button" onClick={onClose}>
            Xong
          </Button>
        ) : (
          <Button type="submit" disabled={pending || !text.trim()}>
            {pending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        )}
      </SheetFooter>
    </form>
  );
}

// Nhập nhiều nhân sự từ CSV/Excel — chỉ Admin gốc (trang cha kiểm tra; Server Action kiểm tra lại)
export function NhapCsvDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload /> Nhập từ CSV
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-lg">Nhập nhiều nhân sự</SheetTitle>
          <SheetDescription>Tạo hàng loạt tài khoản kèm hồ sơ từ danh sách Excel/CSV.</SheetDescription>
        </SheetHeader>
        {/* Chỉ mount khi mở → mỗi lần mở là form mới */}
        <NhapForm onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
