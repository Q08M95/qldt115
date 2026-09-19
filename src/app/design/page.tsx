import { notFound } from "next/navigation";
import { BookOpen, ClipboardCheck, GraduationCap, SlidersHorizontal, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { CardMenu } from "@/components/card-menu";
import { DashboardLayout, StatRow } from "@/components/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { TrendPill } from "@/components/trend-pill";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Trang demo Design System — chỉ dùng khi dev để đối chiếu với "tham khao theme.jpeg". Production trả 404.
const ROWS = [
  { name: "Nguyễn Văn An", code: "GV-001", lop: "ACLS-08", so: 24, status: "Đã duyệt", variant: "success" as const },
  { name: "Trần Thị Bình", code: "TG-014", lop: "BLS-21", so: 12, status: "Chờ duyệt", variant: "warning" as const },
  { name: "Lê Minh Châu", code: "GV-007", lop: "SCC-LX-03", so: 18, status: "Từ chối", variant: "danger" as const },
  { name: "Phạm Quốc Dũng", code: "TG-020", lop: "ABCDE-05", so: 6, status: "Nháp", variant: "neutral" as const },
];

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AppShell
      user={{ name: "Nguyễn Hoàng Tú Minh", email: "minh@example.com" }}
      isQuanTri
      period={{ name: "Quý 3/2026", daysLeft: 11 }}
      unreadCount={3}
      activeHref="/"
    >
      <DashboardLayout
        main={
          <>
            <StatRow>
              <StatTile icon={Users} label="Nhân sự" value={62} trend={10} />
              <StatTile icon={GraduationCap} label="Lớp đang mở" value={14} trend={-5} />
              <StatTile icon={ClipboardCheck} label="Slot còn trống" value={37} trend={8} />
            </StatRow>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 whitespace-nowrap">
                  Việc cần duyệt <Badge variant="teal">4 việc</Badge>
                </CardTitle>
                <CardAction className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal /> Lọc
                  </Button>
                  <Button size="sm">Xem thêm</Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead sortable>Nhân sự</TableHead>
                      <TableHead sortable>Lớp</TableHead>
                      <TableHead sortable className="text-right">Số giờ</TableHead>
                      <TableHead sortable>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROWS.map((r) => (
                      <TableRow key={r.code}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar name={r.name} />
                            <div className="leading-tight">
                              <p className="font-semibold">{r.name}</p>
                              <p className="text-xs text-muted-foreground">{r.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{r.lop}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{r.so}</TableCell>
                        <TableCell>
                          <Badge variant={r.variant}>{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nút, form, drawer, modal</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Primary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Danger</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" size="icon" aria-label="Sách">
                    <BookOpen />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ten-lop">Tên lớp</Label>
                    <Input id="ten-lop" placeholder="VD: ACLS-08" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="loi">Ô nhập lỗi</Label>
                    <Input id="loi" aria-invalid defaultValue="abc" />
                    <p className="text-xs text-danger">Giá trị không hợp lệ</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">Mở Drawer</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Chi tiết nhanh</SheetTitle>
                        <SheetDescription>Drawer trượt từ phải (desktop), toàn màn hình trên mobile.</SheetDescription>
                      </SheetHeader>
                    </SheetContent>
                  </Sheet>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Hủy lớp</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Xác nhận hủy lớp?</DialogTitle>
                        <DialogDescription>Người đã được phân công sẽ nhận thông báo.</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="destructive">Xác nhận hủy</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </>
        }
        aside={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Điểm KPI kỳ này</CardTitle>
                <CardAction>
                  <CardMenu items={[{ label: "Xem chi tiết" }]} />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-semibold tabular-nums">86.4</span>
                  <TrendPill value={12} />
                </div>
                <p className="text-sm text-muted-foreground">so với kỳ trước</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bảng màu 4 gradient</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="blue">ACLS</Badge>
                  <Badge variant="navy">BLS</Badge>
                  <Badge variant="teal">SCC-LX</Badge>
                  <Badge variant="green">ABCDE</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                <div className="flex gap-2">
                  <UserAvatar name="An" className="size-10" />
                  <UserAvatar name="Bình" className="size-10" />
                  <UserAvatar name="Châu" className="size-10" />
                  <UserAvatar name="Dũng" className="size-10" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Đã duyệt</Badge>
                  <Badge variant="warning">Chờ duyệt</Badge>
                  <Badge variant="danger">Từ chối</Badge>
                  <Badge variant="neutral">Nháp</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empty state</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState title="Chưa có lớp nào đang mở đăng ký." action={<Button>Tạo lớp mới</Button>} />
              </CardContent>
            </Card>
          </>
        }
      />
    </AppShell>
  );
}
