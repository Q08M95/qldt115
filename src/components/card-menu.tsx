"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CardMenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
}

// Menu "..." dùng chung cho mọi card có hành động phụ (mục 8.5): Xem chi tiết / Xuất / Chỉnh sửa / Ẩn...
export function CardMenu({ items, label = "Tùy chọn" }: { items: CardMenuItem[]; label?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onSelect={item.onSelect}
            className={item.destructive ? "text-danger focus:text-danger" : undefined}
            asChild={!!item.href}
          >
            {item.href ? <a href={item.href}>{item.label}</a> : item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
