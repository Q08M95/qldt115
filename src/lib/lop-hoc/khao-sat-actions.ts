"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/nhan-su/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Gửi khảo sát hài lòng C1 — trang công khai, người điền KHÔNG cần đăng nhập và ẩn danh.
// Toàn bộ kiểm tra thật (token, lớp đã hoàn thành, khảo sát đang mở, điểm 1-5) nằm trong hàm SQL gui_khao_sat.
export async function guiKhaoSat(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Ô bẫy cho bot: người thật không thấy nên không điền; giả vờ thành công để bot không dò được
  if (String(fd.get("hp_url") ?? "").trim() !== "") return { ok: true };

  const token = String(fd.get("token") ?? "");
  const tongThe = Number(fd.get("diem_tong_the"));
  const giangDay = Number(fd.get("diem_giang_day"));
  if (!UUID.test(token)) return { error: "Đường dẫn khảo sát không hợp lệ." };
  if (![tongThe, giangDay].every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return { error: "Hãy chọn mức đánh giá cho cả 2 câu hỏi." };
  }
  const nhanXet = String(fd.get("nhan_xet") ?? "").trim();
  if (nhanXet.length > 1000) return { error: "Nhận xét tối đa 1000 ký tự." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("gui_khao_sat", {
    p_token: token,
    p_diem_tong_the: tongThe,
    p_diem_giang_day: giangDay,
    p_nhan_xet: nhanXet || null,
  });
  if (error) {
    const thongBao =
      error.code === "P0002"
        ? "Khảo sát này không tồn tại hoặc đã đóng."
        : error.code === "54000"
          ? "Đang có quá nhiều phản hồi cùng lúc, vui lòng thử lại sau ít phút."
          : "Không gửi được phản hồi, vui lòng thử lại.";
    return { error: thongBao };
  }
  return { ok: true };
}
