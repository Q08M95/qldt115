"use client";

import { useState } from "react";
import { Copy, Dices, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { randomPassword } from "@/lib/password";

// Ô mật khẩu: bật/tắt hiện chữ; tùy chọn nút "Tạo ngẫu nhiên" + "Sao chép" (dùng cho mật khẩu tạm Admin đặt cho người khác).
export function PasswordField({
  id,
  name,
  label,
  withGenerate,
  autoComplete = "new-password",
  required,
}: {
  id: string;
  name: string;
  label: string;
  withGenerate?: boolean;
  autoComplete?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState("");
  // Mật khẩu Admin đặt cho người khác hiển thị sẵn để Admin còn biết mà gửi; mật khẩu của chính mình thì ẩn
  const [show, setShow] = useState(!!withGenerate);
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={withGenerate ? "font-mono" : undefined}
        />
        <Button type="button" variant="outline" size="icon" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {withGenerate && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue(randomPassword());
              setShow(true);
              setCopied(false);
            }}
          >
            <Dices /> Tạo ngẫu nhiên
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!value}
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setCopied(true);
            }}
          >
            <Copy /> {copied ? "Đã sao chép" : "Sao chép"}
          </Button>
        </div>
      )}
    </div>
  );
}
