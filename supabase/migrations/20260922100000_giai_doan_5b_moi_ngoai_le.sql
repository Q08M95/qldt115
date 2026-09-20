-- Giai đoạn 5 (bổ sung): Mời NGOẠI LỆ vượt lọc cứng của matching-score.
-- Admin/Quản lý lớp được mời 1 người không nằm trong danh sách gợi ý (sai nhóm, thiếu chứng chỉ, chưa xếp nhóm/vai trò
-- không khớp, không ở trạng thái "Đang tham gia") nếu nhập lý do. Người được mời VẪN phải đồng ý (Luồng B).
-- Vẫn chặn cứng: trùng lịch, đã được phân công / đang chờ ở cùng Bài, lớp không nhận, Bài đã bắt đầu, slot đã đủ.
-- Lý do + phần lọc cứng bị bỏ qua được lưu trên bản ghi lời mời (phục vụ Nhật ký hệ thống, Giai đoạn 9).

alter table public.dang_ky_giang_day
  add column ngoai_le boolean not null default false,
  add column ly_do_ngoai_le text,
  add column vuot_loc text;

-- Phần lọc cứng KHÔNG được bỏ qua: đã giữ slot trong Bài hoặc trùng lịch với Bài khác đã phân công
create function public.ly_do_xung_dot(p_user uuid, p_bai uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.slot_giang_day where bai_id = p_bai and nguoi_phan_cong = p_user)
      then 'Đã được phân công ở Bài này'
    else public.bai_trung_lich(p_user, p_bai)
  end;
$$;

-- Thêm tham số p_ngoai_le: bỏ qua lọc cứng theo nhóm/chứng chỉ/vai trò/trạng thái, chỉ giữ chặn xung đột
drop function public.ly_do_dang_ky(uuid, uuid, public.vai_tro_giang_day, boolean);

create function public.ly_do_dang_ky(
  p_user uuid,
  p_bai uuid,
  p_vai_tro public.vai_tro_giang_day,
  p_moi boolean,
  p_ngoai_le boolean default false
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lop public.lop_hoc%rowtype;
  v_bat_dau timestamptz;
begin
  select l.* into v_lop
  from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id
  where b.id = p_bai;
  if not found then
    return 'Không tìm thấy Bài';
  end if;
  select bat_dau into v_bat_dau from public.bai_hoc where id = p_bai;

  if p_moi then
    if not (v_lop.trang_thai = 'dang_mo' or (v_lop.trang_thai = 'nhap' and v_lop.cong_khai_som)) then
      return 'Lớp không ở trạng thái có thể mời (cần đang mở đăng ký hoặc công khai sớm)';
    end if;
  elsif v_lop.trang_thai <> 'dang_mo' then
    return 'Lớp chưa mở đăng ký hoặc đã đóng';
  end if;

  if v_bat_dau <= now() then
    return 'Bài đã bắt đầu';
  end if;
  if exists (select 1 from public.slot_giang_day where bai_id = p_bai and nguoi_phan_cong = p_user) then
    return 'Đã được phân công ở Bài này';
  end if;
  if exists (select 1 from public.dang_ky_giang_day where bai_id = p_bai and user_id = p_user and trang_thai = 'cho_xu_ly') then
    return 'Đã có đăng ký hoặc lời mời đang chờ ở Bài này';
  end if;
  if not exists (select 1 from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro) then
    return 'Bài này không cần vai trò này';
  end if;
  if not exists (select 1 from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro and nguoi_phan_cong is null) then
    return 'Slot đã đủ người';
  end if;

  if coalesce(p_ngoai_le, false) then
    return public.ly_do_xung_dot(p_user, p_bai);
  end if;
  return public.ly_do_khong_du_dieu_kien(p_user, p_bai, p_vai_tro);
end;
$$;

-- Danh sách mọi nhân sự cho hộp thoại "Mời người ngoài đề xuất": kèm lý do không nằm trong đề xuất (null = đủ điều kiện)
-- và chan_cung (true = không thể mời kể cả ngoại lệ: trùng lịch / đã có đăng ký hoặc lời mời ở Bài này)
create function public.nhan_su_cho_moi(p_bai uuid, p_vai public.vai_tro_giang_day)
returns table (user_id uuid, ho_ten text, ly_do text, chan_cung boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền' using errcode = '42501';
  end if;
  return query
  select pf.id, pf.ho_ten,
         public.ly_do_khong_du_dieu_kien(pf.id, p_bai, p_vai),
         (public.ly_do_xung_dot(pf.id, p_bai) is not null
          or exists (select 1 from public.dang_ky_giang_day d where d.bai_id = p_bai and d.user_id = pf.id and d.trang_thai = 'cho_xu_ly'))
  from public.profiles pf
  order by (public.ly_do_khong_du_dieu_kien(pf.id, p_bai, p_vai) is not null), pf.ho_ten;
end;
$$;

-- Mời (Luồng B). p_ngoai_le = true: cho phép người ngoài danh sách đủ điều kiện, bắt buộc có lý do.
drop function public.moi_giang_day(uuid, public.vai_tro_giang_day, uuid);

create function public.moi_giang_day(
  p_bai uuid,
  p_vai public.vai_tro_giang_day,
  p_user uuid,
  p_ngoai_le boolean default false,
  p_ly_do text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ly text;
  v_vuot text;
  v_id uuid;
  v_trong int;
  v_dang_moi int;
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
begin
  -- TODO Giai đoạn 8: thông báo "Được mời dạy". TODO Giai đoạn 9: ghi audit_log (mời ngoại lệ là hành động cần log rõ).
  if not public.is_quan_tri() then
    raise exception 'Không có quyền gửi lời mời' using errcode = '42501';
  end if;
  if coalesce(p_ngoai_le, false) then
    if v_ly_do is null then
      raise exception 'Hãy nhập lý do khi mời ngoại lệ' using errcode = '23514';
    end if;
    -- Phần lọc cứng thực sự bị bỏ qua (null nếu người này vốn đã đủ điều kiện)
    v_vuot := public.ly_do_khong_du_dieu_kien(p_user, p_bai, p_vai);
  end if;

  v_ly := public.ly_do_dang_ky(p_user, p_bai, p_vai, true, coalesce(p_ngoai_le, false));
  if v_ly is not null then
    raise exception 'Không mời được: %', v_ly using errcode = '55000';
  end if;

  select count(*) into v_trong from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai and nguoi_phan_cong is null;
  select count(*) into v_dang_moi from public.dang_ky_giang_day
  where bai_id = p_bai and vai_tro = p_vai and loai = 'duoc_moi' and trang_thai = 'cho_xu_ly';
  if v_dang_moi >= v_trong then
    raise exception 'Đã mời đủ số người cho các slot còn trống; hãy chờ phản hồi hoặc thu hồi lời mời trước' using errcode = '55000';
  end if;

  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi, ngoai_le, ly_do_ngoai_le, vuot_loc)
  values (p_bai, p_vai, p_user, 'duoc_moi', (select auth.uid()), v_vuot is not null, case when v_vuot is not null then v_ly_do end, v_vuot)
  returning id into v_id;
  perform public.dong_bo_cho_duyet(p_bai, p_vai);
  return v_id;
end;
$$;

-- Người được mời đồng ý: lời mời ngoại lệ chỉ kiểm tra xung đột (đã giữ slot/trùng lịch), không kiểm tra lại nhóm/chứng chỉ
create or replace function public.phan_hoi_loi_moi(p_id uuid, p_dong_y boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.dang_ky_giang_day%rowtype;
  v_ly text;
  v_slot uuid;
  v_tt public.trang_thai_lop;
begin
  -- TODO Giai đoạn 8: thông báo cho Admin khi lời mời bị từ chối (slot mở lại). TODO Giai đoạn 9: ghi audit_log.
  select * into r from public.dang_ky_giang_day where id = p_id for update;
  if not found or r.user_id is distinct from (select auth.uid()) or r.loai <> 'duoc_moi' or r.trang_thai <> 'cho_xu_ly' then
    raise exception 'Không tìm thấy lời mời đang chờ của bạn' using errcode = 'P0002';
  end if;

  if p_dong_y then
    select l.trang_thai into v_tt from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = r.bai_id;
    if v_tt not in ('nhap', 'dang_mo') then
      raise exception 'Lớp không còn nhận phân công' using errcode = '55000';
    end if;
    if (select bat_dau from public.bai_hoc where id = r.bai_id) <= now() then
      raise exception 'Bài đã bắt đầu' using errcode = '55000';
    end if;
    if r.ngoai_le then
      v_ly := public.ly_do_xung_dot(r.user_id, r.bai_id);
    else
      v_ly := public.ly_do_khong_du_dieu_kien(r.user_id, r.bai_id, r.vai_tro);
    end if;
    if v_ly is not null then
      raise exception 'Không nhận được lời mời: %', v_ly using errcode = '55000';
    end if;
    v_slot := public.gan_slot(r.bai_id, r.vai_tro, r.user_id);
    update public.dang_ky_giang_day
    set trang_thai = 'da_duyet', slot_id = v_slot, xu_ly_luc = now(), nguoi_xu_ly = (select auth.uid())
    where id = p_id;
  else
    update public.dang_ky_giang_day
    set trang_thai = 'tu_choi', xu_ly_luc = now(), nguoi_xu_ly = (select auth.uid())
    where id = p_id;
  end if;
  perform public.dong_bo_sau_thay_doi(r.bai_id, r.vai_tro);
end;
$$;

-- ============ Phân quyền thực thi ============
revoke execute on function public.ly_do_xung_dot(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ly_do_dang_ky(uuid, uuid, public.vai_tro_giang_day, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.nhan_su_cho_moi(uuid, public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.moi_giang_day(uuid, public.vai_tro_giang_day, uuid, boolean, text) from public, anon, authenticated;

grant execute on function public.nhan_su_cho_moi(uuid, public.vai_tro_giang_day) to authenticated;
grant execute on function public.moi_giang_day(uuid, public.vai_tro_giang_day, uuid, boolean, text) to authenticated;
