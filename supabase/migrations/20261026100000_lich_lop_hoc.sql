-- Lịch lớp toàn đơn vị (mục 4.2/4.3 — "công khai cả lớp đang mở lẫn lớp sắp mở để GV/TG chủ động sắp xếp lịch")
--
--   1. "Công khai sớm" mặc định BẬT cho lớp mới (kể cả nhập CSV) — lớp Dự kiến hiện ngay trên lịch, Admin bỏ tick nếu chưa muốn lộ.
--   2. lich_lop_hoc(p_tu, p_den): mọi Bài (lớp chưa hủy, người xem nhìn thấy được) bắt đầu trong khoảng, kèm tiến độ slot
--      theo vai trò và 3 cờ riêng của người xem: đủ điều kiện lớp / đang dạy Bài này / trùng giờ với Bài mình đã phân công.
--      Cờ "đủ điều kiện" chỉ nói CÓ/KHÔNG cho chính người xem, không trả tên nhóm (ẩn nhãn nhóm, mục 4.7).
--   3. Thông báo "Lớp sắp mở đăng ký" (loại bai_trong_moi — người dùng tắt được như "Lớp/Bài mới") cho người đủ điều kiện
--      khi lớp Dự kiến công khai sớm có Bài đầu tiên, hoặc khi lớp Dự kiến đã có Bài được bật công khai sớm. Mỗi lớp 1 lần/người.

-- ============ 1. Mặc định công khai sớm ============
alter table public.lop_hoc alter column cong_khai_som set default true;

-- ============ 2. Lịch lớp ============
create function public.lich_lop_hoc(p_tu timestamptz, p_den timestamptz)
returns table (
  bai_id uuid,
  bai_ten text,
  bat_dau timestamptz,
  ket_thuc timestamptz,
  lop_id uuid,
  lop_ten text,
  nhom_lop_id uuid,
  nhom_lop_ten text,
  doi_tuong public.doi_tuong_lop,
  loai_kinh_phi public.loai_kinh_phi,
  dia_diem text,
  trang_thai_hien_thi text,
  gv_tong int,
  gv_da int,
  tg_tong int,
  tg_da int,
  toi_du_dieu_kien boolean,
  toi_day boolean,
  toi_trung_lich boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_quan_tri boolean := public.is_quan_tri();
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_tu is null or p_den is null or p_den <= p_tu or p_den - p_tu > interval '62 days' then
    raise exception 'Khoảng thời gian không hợp lệ (tối đa 62 ngày)' using errcode = '22023';
  end if;

  return query
  with lop as (
    -- Cùng quy tắc nhìn thấy với RLS lop_hoc: GV/TG không thấy lớp Dự kiến chưa công khai sớm
    select v.* from public.lop_hoc_tong_hop v
    where v.trang_thai <> 'da_huy'
      and (v_quan_tri or v.trang_thai <> 'nhap' or v.cong_khai_som)
  ),
  toi as (
    select p.trang_thai_tham_gia = 'dang_tham_gia' and p.vai_tro_giang_day is not null as dang_day
    from public.profiles p where p.id = v_uid
  )
  select
    b.id, b.ten, b.bat_dau, b.ket_thuc,
    l.id, l.ten, l.nhom_lop_id, l.nhom_lop_ten, l.doi_tuong, l.loai_kinh_phi, l.dia_diem, l.trang_thai_hien_thi,
    s.gv_tong, s.gv_da, s.tg_tong, s.tg_da,
    coalesce((select t.dang_day from toi t), false)
      and exists (
        select 1 from public.nhan_su_nhom n
        join public.lop_hoc_nhom_du_dieu_kien d on d.nhom = n.nhom and d.lop_id = l.id
        where n.user_id = v_uid
      )
      and not exists (
        select 1 from public.lop_hoc_chung_chi_yeu_cau r
        where r.lop_id = l.id
          and not exists (select 1 from public.chung_chi c where c.user_id = v_uid and c.loai_id = r.loai_id)
      ),
    s.toi_day,
    not s.toi_day and exists (
      select 1 from public.slot_giang_day s2
      join public.bai_hoc b2 on b2.id = s2.bai_id and b2.id <> b.id
      join public.lop_hoc l2 on l2.id = b2.lop_id and l2.trang_thai <> 'da_huy'
      where s2.nguoi_phan_cong = v_uid and s2.trang_thai = 'da_phan_cong'
        and b2.bat_dau < b.ket_thuc and b2.ket_thuc > b.bat_dau
    )
  from public.bai_hoc b
  join lop l on l.id = b.lop_id
  cross join lateral (
    select
      count(*) filter (where x.vai_tro = 'giang_vien')::int as gv_tong,
      count(*) filter (where x.vai_tro = 'giang_vien' and x.trang_thai = 'da_phan_cong')::int as gv_da,
      count(*) filter (where x.vai_tro = 'tro_giang')::int as tg_tong,
      count(*) filter (where x.vai_tro = 'tro_giang' and x.trang_thai = 'da_phan_cong')::int as tg_da,
      coalesce(bool_or(x.nguoi_phan_cong = v_uid), false) as toi_day
    from public.slot_giang_day x where x.bai_id = b.id
  ) s
  where b.bat_dau >= p_tu and b.bat_dau < p_den
  order by b.bat_dau, l.ten;
end;
$$;

revoke execute on function public.lich_lop_hoc(timestamptz, timestamptz) from public, anon;
grant execute on function public.lich_lop_hoc(timestamptz, timestamptz) to authenticated;

-- ============ 3. Thông báo "Lớp sắp mở đăng ký" ============
create function public.bao_lop_sap_mo(p_lop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop public.lop_hoc%rowtype;
  a record;
begin
  select * into v_lop from public.lop_hoc where id = p_lop;
  if not found or v_lop.trang_thai <> 'nhap' or not v_lop.cong_khai_som then
    return;
  end if;
  for a in select q.id from public.nguoi_du_dieu_kien_lop(p_lop) q loop
    perform public.tao_thong_bao(
      a.id, 'bai_trong_moi', 'thong_tin', 'Lớp sắp mở đăng ký',
      format('Lớp %s (%s – %s) phù hợp với bạn, dự kiến sớm mở đăng ký. Xem trước lịch để sắp xếp thời gian.', v_lop.ten,
             to_char(v_lop.ngay_bat_dau, 'DD/MM/YYYY'), to_char(v_lop.ngay_ket_thuc, 'DD/MM/YYYY')),
      '/lop-hoc/' || p_lop, 'sap_mo:' || p_lop
    );
  end loop;
end;
$$;

-- Giữ nguyên nhánh "lớp đang mở có Bài mới" của Giai đoạn 8, thêm nhánh lớp Dự kiến công khai sớm
create or replace function public.tb_slot_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  a record;
begin
  for r in
    select distinct l.id as lop_id, l.ten as lop_ten, l.trang_thai, l.cong_khai_som
    from moi s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where l.trang_thai = 'dang_mo' or (l.trang_thai = 'nhap' and l.cong_khai_som)
  loop
    if r.trang_thai = 'nhap' then
      perform public.bao_lop_sap_mo(r.lop_id);
      continue;
    end if;
    for a in select q.id from public.nguoi_du_dieu_kien_lop(r.lop_id) q loop
      perform public.tao_thong_bao(
        a.id, 'bai_trong_moi', 'thong_tin', 'Lớp có Bài mới còn trống',
        format('Lớp %s vừa có thêm Bài cần người dạy phù hợp với bạn.', r.lop_ten),
        '/lop-hoc/' || r.lop_id, 'bai_moi:' || r.lop_id, true
      );
    end loop;
  end loop;
  return null;
end;
$$;

create function public.tb_lop_cong_khai_som()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.bao_lop_sap_mo(new.id);
  return null;
end;
$$;
create trigger lop_hoc_tb_cong_khai_som
  after update of cong_khai_som on public.lop_hoc
  for each row
  when (new.cong_khai_som and not old.cong_khai_som and new.trang_thai = 'nhap')
  execute function public.tb_lop_cong_khai_som();

revoke execute on function public.bao_lop_sap_mo(uuid) from public, anon, authenticated;
revoke execute on function public.tb_slot_moi() from public, anon, authenticated;
revoke execute on function public.tb_lop_cong_khai_som() from public, anon, authenticated;
