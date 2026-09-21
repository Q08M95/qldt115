import {
  AlarmClock,
  ArrowLeftRight,
  Bell,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ListChecks,
  MailPlus,
  MailX,
  Pencil,
  ShieldCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import type { LoaiThongBao } from "@/types/database";

// Icon theo loại sự kiện (mục 8.7) — dùng chung cho chuông và trang Thông báo
export const ICON_THONG_BAO: Record<LoaiThongBao, LucideIcon> = {
  bai_trong_moi: CalendarPlus,
  duoc_moi: MailPlus,
  dang_ky_can_duyet: ClipboardCheck,
  dang_ky_ket_qua: CheckCircle2,
  loi_moi_ket_qua: MailX,
  doi_lich: CalendarClock,
  huy_lop: CalendarX,
  huy_phan_cong: UserMinus,
  nhac_check_in: AlarmClock,
  cong_bo_kpi: Gauge,
  ket_qua_doi_nhom: ArrowLeftRight,
  sua_diem_danh: Pencil,
  quyen_quan_ly_lop: ShieldCheck,
  de_xuat_can_duyet: ListChecks,
};

export const ICON_MAC_DINH = Bell;

// Sự kiện để các nơi cùng làm mới số chưa đọc ngay sau khi đánh dấu đã đọc (không phụ thuộc Realtime)
export const SU_KIEN_THONG_BAO_DOI = "thong-bao:doi";

export const COT_THONG_BAO = "id, user_id, loai, muc_do, tieu_de, noi_dung, lien_ket, da_doc, created_at";
