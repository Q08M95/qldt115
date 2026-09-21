-- Giai đoạn 8 (bổ sung): thông báo "cần hành động" không bị kẹt vĩnh viễn.
-- Từ bản này, app KHÔNG còn tự đánh dấu đã đọc khi người dùng bấm vào thông báo "cần hành động" (mời dạy, đăng ký/đề xuất cần duyệt, nhắc check-in):
-- chúng chỉ tự hết hiệu lực khi việc đó được xử lý (đã có sẵn ở các trigger). Job này xử lý nốt các trường hợp "không còn xử lý được":
--   * Lời mời dạy: lời mời không còn ở trạng thái chờ (lớp hủy, thu hồi, đủ người...) hoặc Bài đã bắt đầu (không nhận lời được nữa).
--   * Đăng ký cần duyệt: lớp không còn đăng ký chờ nào của Bài chưa bắt đầu (Bài đã bắt đầu thì không duyệt được nữa).
-- Chạy mỗi 5 phút bằng pg_cron.

create function public.giai_quyet_thong_bao_het_han()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a int;
  v_b int;
begin
  update public.thong_bao t set da_doc = true
  where t.loai = 'duoc_moi' and not t.da_doc and t.khoa like 'loi_moi:%'
    and not exists (
      select 1 from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
      where d.id::text = substring(t.khoa from 9) and d.trang_thai = 'cho_xu_ly' and b.bat_dau > now()
    );
  get diagnostics v_a = row_count;

  update public.thong_bao t set da_doc = true
  where t.loai = 'dang_ky_can_duyet' and not t.da_doc and t.khoa ~ '^dang_ky:[0-9a-f-]{36}$'
    and not exists (
      select 1 from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
      where b.lop_id::text = substring(t.khoa from 9) and d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly' and b.bat_dau > now()
    );
  get diagnostics v_b = row_count;
  return v_a + v_b;
end;
$$;

do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.schedule('giai-quyet-thong-bao', '*/5 * * * *', 'select public.giai_quyet_thong_bao_het_han()');
  end if;
end;
$$;

revoke execute on function public.giai_quyet_thong_bao_het_han() from public, anon, authenticated;
