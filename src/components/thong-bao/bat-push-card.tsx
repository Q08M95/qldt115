"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { batPush, tatPush, trangThaiPush, type TrangThaiPush } from "@/lib/push/client";

const MO_TA: Record<TrangThaiPush, string> = {
  "khong-ho-tro":
    "Trình duyệt này chưa hỗ trợ thông báo đẩy. Trên iPhone/iPad: mở web bằng Safari, chọn Chia sẻ › Thêm vào Màn hình chính, rồi mở từ biểu tượng mới.",
  "thieu-cau-hinh": "Hệ thống chưa được cấu hình thông báo đẩy. Hãy báo Admin.",
  "bi-chan": "Bạn đã chặn thông báo cho trang này. Hãy cho phép lại trong cài đặt của trình duyệt (biểu tượng ổ khóa cạnh địa chỉ).",
  "chua-bat": "Bật để nhận nhắc check-in, lời mời dạy và kết quả duyệt ngay trên thiết bị này, kể cả khi không mở web.",
  "da-bat": "Thiết bị này sẽ nhận thông báo đẩy ngay cả khi không mở web.",
};

// Bật/tắt Web Push cho thiết bị đang dùng (mỗi thiết bị bật riêng). Nhắc check-in trước giờ học cần bật mục này để đến kịp lúc.
export function BatPushCard() {
  const [tt, setTt] = useState<TrangThaiPush | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  useEffect(() => {
    let huy = false;
    void trangThaiPush().then((v) => {
      if (!huy) setTt(v);
    });
    return () => {
      huy = true;
    };
  }, []);

  function doi() {
    setLoi(null);
    batDau(async () => {
      const kq = tt === "da-bat" ? await tatPush() : await batPush();
      if ("error" in kq) setLoi(kq.error);
      setTt(await trangThaiPush());
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5 text-muted-foreground" aria-hidden /> Thông báo đẩy trên thiết bị này
          {tt === "da-bat" && <Badge variant="success">Đang bật</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">{tt ? MO_TA[tt] : "Đang kiểm tra..."}</p>
        {loi && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {loi}
          </p>
        )}
        {(tt === "chua-bat" || tt === "da-bat") && (
          <div>
            <Button variant={tt === "da-bat" ? "outline" : "default"} onClick={doi} disabled={dang}>
              <BellRing /> {dang ? "Đang xử lý..." : tt === "da-bat" ? "Tắt thông báo đẩy" : "Bật thông báo đẩy"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
