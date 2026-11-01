-- Xóa lớp: thêm lớp ĐÃ HỦY, và báo cho người liên quan khi xóa lớp Dự kiến (theo yêu cầu người dùng)
--
--   1. Xóa được lớp "Dự kiến" (như cũ) và lớp "Đã hủy" (mới). Lớp Đang mở phải hủy trước; lớp Đã hoàn thành không xóa được
--      (gắn với KPI, C1/C3, A4). Lớp đã hủy không ảnh hưởng KPI (engine bỏ qua lớp hủy) nên xóa không đổi điểm của ai.
--   2. Lớp Dự kiến công khai sớm vẫn mời dạy được, nên có thể đã có lời mời đang chờ / người được phân công. Trước khi xóa,
--      gửi "Lớp đã bị hủy" cho những người này (giống khi hủy lớp) và cho thông báo "Bạn được mời dạy" của lớp hết hiệu lực.
--      Lớp đã hủy thì người liên quan đã được báo lúc hủy, không báo lại.
--   3. Thông báo cũ trỏ tới trang lớp được chuyển về danh sách Lớp học để không dẫn vào trang không còn tồn tại.
--   Nhật ký hệ thống vẫn ghi "Xóa lớp" bằng trigger sẵn có (Giai đoạn 9c).
--
-- Chạy lại được.

create or replace function public.xoa_lop_hoc(p_lop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop public.lop_hoc%rowtype;
  r record;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  select * into v_lop from public.lop_hoc where id = p_lop for update;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_lop.trang_thai not in ('nhap', 'da_huy') then
    raise exception 'Chỉ xóa được lớp Dự kiến hoặc lớp đã hủy; lớp đang mở hãy hủy lớp trước, lớp đã hoàn thành không xóa được'
      using errcode = '55000';
  end if;

  if v_lop.trang_thai = 'nhap' then
    -- Người đã được phân công hoặc đang có lời mời/đăng ký chờ xử lý trong lớp
    for r in
      select s.nguoi_phan_cong as uid from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = p_lop and s.nguoi_phan_cong is not null
      union
      select d.user_id from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
      where b.lop_id = p_lop and d.trang_thai = 'cho_xu_ly'
    loop
      perform public.tao_thong_bao(
        r.uid, 'huy_lop', 'thong_tin', 'Lớp đã bị hủy',
        format('Lớp %s đã bị hủy và xóa khỏi hệ thống; các phân công/lời mời của bạn trong lớp này không còn hiệu lực.', v_lop.ten),
        '/lop-hoc'
      );
    end loop;
    -- Lời mời của lớp không còn để trả lời -> thông báo "cần hành động" hết hiệu lực ngay (không chờ job 5 phút)
    update public.thong_bao t set da_doc = true
    where t.loai = 'duoc_moi' and not t.da_doc and t.khoa in (
      select 'loi_moi:' || d.id from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id where b.lop_id = p_lop
    );
  end if;

  update public.thong_bao set lien_ket = '/lop-hoc' where lien_ket = '/lop-hoc/' || p_lop;
  delete from public.lop_hoc where id = p_lop;
end;
$$;

revoke execute on function public.xoa_lop_hoc(uuid) from public, anon, authenticated;
grant execute on function public.xoa_lop_hoc(uuid) to authenticated;
