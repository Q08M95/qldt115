"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, FileUp, Upload, XCircle } from "lucide-react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CSV_HEADER } from "@/lib/lop-hoc/csv";
import { nhapNhieuLopHoc, type KetQuaLopCsv } from "@/lib/lop-hoc/actions";

const MAU = `${CSV_HEADER}
ACLS-Q1-01,ACLS khóa 12,ACLS,Nhân viên y tế,Có kinh phí,Hội trường A,Giảng viên là bác sĩ;Trợ giảng là bác sĩ,,không,Lý thuyết hồi sinh tim phổi,15/03/2026,08:00,11:00,1,0
ACLS-Q1-01,,,,,,,,,Thực hành cấp cứu,15/03/2026,13:00,16:00,1,3
ACLS-Q1-01,,,,,,,,,Thi thực hành,16/03/2026,08:00,11:00,1,3` satisfies string;

function KetQuaBang({ ketQua }: { ketQua: KetQuaLopCsv[] }) {
  const thanhCong = ketQua.filter((k) => k.ok).length;
  const tongBai = ketQua.reduce((s, k) => s + k.soBai, 0);
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Đã tạo <strong className="text-success">{thanhCong}</strong> / {ketQua.length} lớp
        {tongBai > 0 && <> (tổng {tongBai} Bài)</>}.
        {thanhCong < ketQua.length && (
          <span className="text-danger"> {ketQua.length - thanhCong} lớp lỗi — sửa dòng tương ứng rồi nhập lại.</span>
        )}
      </p>
      <ul className="divide-y rounded-xl border text-sm">
        {ketQua.map((k) => (
          <li key={k.maLop} className="flex items-start gap-3 px-3 py-2.5">
            {k.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Thành công" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Lỗi" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {k.ten} <span className="font-normal text-muted-foreground">· mã {k.maLop}</span>
              </p>
              <p className={k.ok ? "text-xs text-muted-foreground" : "text-xs text-danger"}>
                Dòng {k.dong}: {k.thongBao}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NhapForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(nhapNhieuLopHoc, null);
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
              <p className="mb-1 font-medium text-foreground">Mỗi dòng là 1 Bài; các cột của lớp chỉ cần điền ở dòng Bài đầu tiên</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>
                  <strong>Mã lớp</strong> do bạn tự đặt, để gộp các dòng Bài cùng 1 lớp (vd &quot;ACLS-Q1-01&quot;).
                </li>
                <li>Các dòng Bài sau, cùng mã lớp, để trống cột lớp là tự lấy lại giá trị dòng trước — không cần gõ lại.</li>
                <li>Nhóm lớp, đối tượng, loại kinh phí, nhóm đủ điều kiện, chứng chỉ phải đúng tên đã có trong danh mục.</li>
                <li>Dán trực tiếp từ Excel hoặc chọn file .csv. Tải file &quot;mau tao lop.xlsx&quot; ở gốc dự án để xem đầy đủ và có danh mục hiện có kèm theo.</li>
                <li>
                  Tối đa 500 dòng Bài / 50 lớp mỗi lần. Lớp mới ở trạng thái <strong>Dự kiến</strong>, hãy rà lại rồi tự mở đăng ký.
                </li>
              </ul>
              <Button type="button" variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => setText(MAU)}>
                Điền dữ liệu mẫu
              </Button>
            </div>

            <Field label="Danh sách lớp và Bài" htmlFor="csv">
              <Textarea id="csv" name="csv" value={text} onChange={(e) => setText(e.target.value)} rows={12} className="font-mono text-xs" />
            </Field>

            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-background">
              <FileUp className="size-4" aria-hidden /> Chọn file .csv
              <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>

            {state?.error && (
              <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
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
            {pending ? "Đang tạo lớp..." : "Tạo lớp và Bài"}
          </Button>
        )}
      </SheetFooter>
    </form>
  );
}

// Nhập nhanh nhiều lớp + Bài từ CSV theo kế hoạch năm đã có sẵn (mục 4.2) — chỉ Admin/Quản lý lớp (trang cha kiểm tra; RPC kiểm tra lại)
export function NhapCsvLopDrawer() {
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
          <SheetTitle className="text-lg">Nhập nhiều lớp học</SheetTitle>
          <SheetDescription>Tạo hàng loạt lớp kèm Bài từ kế hoạch đào tạo đã có sẵn (Excel/CSV).</SheetDescription>
        </SheetHeader>
        {/* Chỉ mount khi mở → mỗi lần mở là form mới */}
        <NhapForm onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
