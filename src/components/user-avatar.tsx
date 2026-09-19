import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Fallback avatar (mục 8.5): hình tròn, nền là 1 trong 4 gradient của bảng màu chung (lấy mẫu từ ảnh mẫu),
// chọn theo hash tên; chữ cái đầu dùng màu "-on" tương ứng để đọc được trên từng gradient.
const FALLBACKS = [
  "bg-grad-blue text-hue-blue-on",
  "bg-grad-navy text-hue-navy-on",
  "bg-grad-teal text-hue-teal-on",
  "bg-grad-green text-hue-green-on",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initial(name: string) {
  const parts = name.trim().split(/\s+/);
  // Tên Việt: chữ cái đầu của từ cuối (tên riêng)
  return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className={cn("font-semibold", FALLBACKS[hash(name) % FALLBACKS.length])}>
        {initial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
