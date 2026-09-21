"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { LoaiThongBao } from "@/types/database";

export type TuyChon = Partial<Record<LoaiThongBao, { trong_app: boolean; day_push: boolean }>>;

const LOAI_TAT_DUOC: { loai: LoaiThongBao; nhan: string; mo_ta: string; chiQuanTri?: boolean }[] = [
  { loai: "bai_trong_moi", nhan: "Lớp / Bài mới phù hợp", mo_ta: "Có lớp mở đăng ký hoặc Bài mới còn trống hợp với bạn" },
  { loai: "dang_ky_ket_qua", nhan: "Kết quả đăng ký", mo_ta: "Đăng ký được duyệt, bị từ chối hoặc đã đóng" },
  { loai: "loi_moi_ket_qua", nhan: "Lời mời bị từ chối / thu hồi", mo_ta: "Người được mời từ chối (Admin) hoặc lời mời bị thu hồi" },
  { loai: "cong_bo_kpi", nhan: "Công bố KPI", mo_ta: "Kỳ đánh giá đóng và KPI của bạn được công bố" },
  { loai: "dang_ky_can_duyet", nhan: "Đăng ký cần duyệt", mo_ta: "Có người đăng ký giảng dạy đang chờ bạn duyệt", chiQuanTri: true },
  { loai: "de_xuat_can_duyet", nhan: "Đề xuất nhân sự cần duyệt", mo_ta: "Có đề xuất mới đang chờ bạn xử lý", chiQuanTri: true },
];

function CongTac({ bat, onDoi, nhan, tat }: { bat: boolean; onDoi: () => void; nhan: string; tat?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={bat}
      aria-label={nhan}
      disabled={tat}
      onClick={onDoi}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-40",
        bat ? "bg-brand-gradient" : "bg-border",
      )}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-150", bat && "translate-x-5")} />
    </button>
  );
}

// Tùy chọn thông báo theo loại (mục 4.5): bật/tắt kênh "trong app" và "đẩy". Loại bắt buộc (nhắc check-in, lời mời dạy, đổi lịch...) luôn gửi.
export function TuyChonThongBao({ banDau, isQuanTri }: { banDau: TuyChon; isQuanTri: boolean }) {
  const [tc, setTc] = useState<TuyChon>(banDau);
  const [loi, setLoi] = useState<string | null>(null);

  async function doi(loai: LoaiThongBao, kenh: "trong_app" | "day_push") {
    const cu = tc[loai] ?? { trong_app: true, day_push: true };
    const moi = { ...cu, [kenh]: !cu[kenh] };
    // Tắt trong app thì không có thông báo để đẩy => tắt luôn push; bật lại trong app thì trả push về bật
    if (kenh === "trong_app") moi.day_push = moi.trong_app;
    setTc({ ...tc, [loai]: moi });
    setLoi(null);
    const { error } = await createClient().rpc("luu_tuy_chon_thong_bao", { p_loai: loai, p_trong_app: moi.trong_app, p_day_push: moi.day_push });
    if (error) {
      setTc((t) => ({ ...t, [loai]: cu }));
      setLoi(error.message);
    }
  }

  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden /> Tùy chọn thông báo
      </h3>
        <div>
          <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span />
            <span className="text-center">Trong app</span>
            <span className="text-center">Đẩy</span>
          </div>
          <ul className="divide-y divide-border/60">
            {LOAI_TAT_DUOC.filter((l) => !l.chiQuanTri || isQuanTri).map((l) => {
              const v = tc[l.loai] ?? { trong_app: true, day_push: true };
              return (
                <li key={l.loai} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{l.nhan}</p>
                    <p className="text-xs text-muted-foreground">{l.mo_ta}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground sm:hidden">Trong app</span>
                    <CongTac bat={v.trong_app} onDoi={() => void doi(l.loai, "trong_app")} nhan={`${l.nhan} — trong app`} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] text-muted-foreground sm:hidden">Đẩy</span>
                    <CongTac bat={v.day_push} tat={!v.trong_app} onDoi={() => void doi(l.loai, "day_push")} nhan={`${l.nhan} — thông báo đẩy`} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {loi && (
          <p role="alert" className="rounded-lg bg-grad-danger px-3 py-2 text-sm text-danger">
            {loi}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Luôn nhận (không tắt được): lời mời dạy, đổi lịch, hủy lớp, hủy phân công, <strong>nhắc check-in</strong>, điểm danh bị chỉnh sửa, kết quả đổi vai trò, Quyền Quản lý lớp.
        </p>
    </section>
  );
}
