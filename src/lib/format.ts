const VN_TZ = "Asia/Ho_Chi_Minh";

// Giờ trong ngày kiểu 24h "08:00", theo múi giờ Việt Nam bất kể máy chủ/trình duyệt ở múi giờ nào
export function fmtTime(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { timeZone: VN_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

// Ngày-giờ theo múi giờ Việt Nam: "dd/MM/yyyy HH:mm"
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const ngay = d.toLocaleDateString("en-GB", { timeZone: VN_TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  return `${ngay} ${fmtTime(s)}`;
}

// Chuỗi từ <input type="datetime-local"> ("YYYY-MM-DDTHH:mm", giờ Việt Nam) -> ISO có múi giờ +07:00
export function localInputToIso(v: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+07:00` : null;
}

// ISO -> giá trị cho <input type="datetime-local"> theo giờ Việt Nam
export function isoToLocalInput(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: VN_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Định dạng ngày kiểu Việt Nam. Chuỗi 'YYYY-MM-DD' (cột date) được tách tay để không bị lệch múi giờ.
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && s.length === 10) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Thời gian tương đối kiểu "5 phút trước" (thông báo, mục 8.7); quá 7 ngày thì hiện ngày-giờ đầy đủ.
// Đặt ở lib (không gọi Date.now trực tiếp trong component) để tránh lỗi purity của React.
export function tuongDoi(s: string | null | undefined): string {
  if (!s) return "";
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return "";
  const giay = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (giay < 60) return "vừa xong";
  const phut = Math.floor(giay / 60);
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngay = Math.floor(gio / 24);
  if (ngay < 7) return `${ngay} ngày trước`;
  return fmtDateTime(s);
}

// Nhóm thời gian của thông báo cho tiêu đề trong danh sách dài: Hôm nay / Hôm qua / Tuần này / Tháng này / Cũ hơn (theo ngày giờ Việt Nam).
// Đặt ở lib (không gọi Date.now trực tiếp trong component) để tránh lỗi purity của React.
export function nhomNgay(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const ngayVN = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: VN_TZ });
  const soNgay = Math.round((Date.parse(`${ngayVN(new Date())}T00:00:00Z`) - Date.parse(`${ngayVN(d)}T00:00:00Z`)) / 86400000);
  if (soNgay <= 0) return "Hôm nay";
  if (soNgay === 1) return "Hôm qua";
  if (soNgay <= 6) return "Tuần này";
  if (soNgay <= 30) return "Tháng này";
  return "Cũ hơn";
}
