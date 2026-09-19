import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Fallback avatar (mục 8.5): hình vuông bo góc, nền gradient 1 trong 4 màu gốc chọn theo hash tên,
// chữ cái đầu màu trắng. Gradient đậm (khác gradient nhạt của badge) để chữ trắng đọc được ở cả light/dark.
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #3b82f6, #2563eb)", // Blue
  "linear-gradient(135deg, #1e3a5f, #14283f)", // Navy
  "linear-gradient(135deg, #14b8a6, #0d9488)", // Teal
  "linear-gradient(135deg, #22c55e, #16a34a)", // Green
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
      <AvatarFallback
        className="font-medium text-white"
        style={{ backgroundImage: FALLBACK_GRADIENTS[hash(name) % FALLBACK_GRADIENTS.length] }}
      >
        {initial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
