"use client";

import { Children, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/lib/use-mobile";

// Dùng BÊN TRONG <ul>: trên mobile chỉ hiện `soDau` dòng đầu kèm nút "Xem thêm N", tránh phải cuộn cả trăm px mới hết bảng;
// từ md trở lên hiện đủ. Mục 8.9 — danh sách dài không được chặn nội dung phía dưới.
export function ThuGonDanhSach({ children, soDau = 5 }: { children: React.ReactNode; soDau?: number }) {
  const mobile = useMobile();
  const [moRong, setMoRong] = useState(false);
  const muc = Children.toArray(children);
  const thu = mobile && muc.length > soDau;
  const hien = thu && !moRong ? muc.slice(0, soDau) : muc;
  return (
    <>
      {hien}
      {thu && (
        <li className="list-none">
          <Button type="button" variant="outline" className="w-full" onClick={() => setMoRong(!moRong)} aria-expanded={moRong}>
            {moRong ? "Thu gọn" : `Xem thêm ${muc.length - soDau}`}
          </Button>
        </li>
      )}
    </>
  );
}
