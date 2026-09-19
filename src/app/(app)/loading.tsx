import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Hiển thị NGAY khi bấm chuyển trang (khung sidebar/topbar giữ nguyên, chỉ vùng nội dung thay bằng khung chờ),
// thay vì đứng yên vài giây chờ server. Cũng giúp Next tải trước khung này khi rê/hiện liên kết.
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Đang tải">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
