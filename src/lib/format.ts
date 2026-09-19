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
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
