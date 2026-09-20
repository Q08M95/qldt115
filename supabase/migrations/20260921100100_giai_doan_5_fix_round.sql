-- Vá Giai đoạn 5: ung_vien_bai lỗi "function round(double precision, integer) does not exist"
-- (cume_dist() và extract(epoch ...) trả về double precision; ép về numeric trước khi round).
-- Chạy file này nếu đã chạy 20260921100000 bản cũ. Bản mới của 20260921100000 đã có sẵn sửa lỗi này.

create or replace function public.ung_vien_bai(p_bai uuid, p_vai_tro public.vai_tro_giang_day)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  diem numeric,
  hang int,
  gio_ky numeric,
  so_lop_khong_kinh_phi int,
  cung_lop int,
  trang_thai_hien_co text,
  dang_ky_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_lop public.lop_hoc%rowtype;
  v_tu date;
  v_den date;
  v_w numeric := public.cau_hinh_so('matching_ty_trong_cong_bang', 0.8);
  v_phat numeric := public.cau_hinh_so('matching_phat_cung_lop', 0.1);
  v_quan_tri boolean := public.is_quan_tri();
  v_me uuid := (select auth.uid());
begin
  select l.* into v_lop
  from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id
  where b.id = p_bai;
  if not found then
    return;
  end if;
  -- Chỉ người nhìn thấy được lớp mới xem được gợi ý (lớp Nháp chưa công khai sớm bị ẩn với GV/TG)
  if not (v_quan_tri or v_lop.trang_thai <> 'nhap' or v_lop.cong_khai_som) then
    return;
  end if;
  select k.tu, k.den into v_tu, v_den from public.ky_hien_tai() k;

  return query
  with dan_so as (
    -- Mọi người đang tham gia, kèm nhóm, số giờ trong kỳ và A4 — làm tập so sánh percentile theo nhóm
    select p.id as uid, n.nhom as nhom_nv,
      coalesce((
        select sum(extract(epoch from (b.ket_thuc - b.bat_dau))::numeric / 3600.0)
        from public.slot_giang_day s
        join public.bai_hoc b on b.id = s.bai_id
        join public.lop_hoc l on l.id = b.lop_id
        where s.nguoi_phan_cong = p.id and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
          and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_tu and v_den
      ), 0) as gio,
      (
        select count(distinct l.id)::int
        from public.slot_giang_day s
        join public.bai_hoc b on b.id = s.bai_id
        join public.lop_hoc l on l.id = b.lop_id
        where s.nguoi_phan_cong = p.id and s.trang_thai = 'da_phan_cong'
          and l.trang_thai <> 'da_huy' and l.loai_kinh_phi = 'khong_kinh_phi'
      ) as a4
    from public.profiles p
    join public.nhan_su_nhom n on n.user_id = p.id
    where p.trang_thai_tham_gia = 'dang_tham_gia'
  ),
  chi_so as (
    select d.uid, d.nhom_nv, d.gio, d.a4,
      case when v_lop.loai_kinh_phi = 'khong_kinh_phi' then d.a4::numeric else d.gio end as cs
    from dan_so d
  ),
  pr as (
    select c.uid, c.gio, c.a4,
      count(*) over (partition by c.nhom_nv) as n_nhom,
      rank() over (partition by c.nhom_nv order by c.cs) as rk,
      (cume_dist() over (partition by c.nhom_nv order by c.cs))::numeric as cd
    from chi_so c
  ),
  ung as (
    select pf.id as uid, pf.ho_ten as ten, pf.avatar_url as anh, pr.gio, pr.a4,
      round(
        v_w * (1 - (((pr.rk - 1)::numeric / pr.n_nhom) + pr.cd) / 2)
        + (1 - v_w) * coalesce(public.kpi_gan_nhat(pf.id) / 100.0, 0.5)
        - case when exists (
            select 1 from public.slot_giang_day s2
            join public.bai_hoc b2 on b2.id = s2.bai_id
            where b2.lop_id = v_lop.id and s2.nguoi_phan_cong = pf.id
          ) then v_phat else 0 end
      , 4) as diem_tinh,
      (
        select count(*)::int from public.slot_giang_day s3
        join public.bai_hoc b3 on b3.id = s3.bai_id
        where b3.lop_id = v_lop.id and s3.nguoi_phan_cong = pf.id
      ) as so_cung_lop
    from pr
    join public.profiles pf on pf.id = pr.uid
    where pf.vai_tro_giang_day = p_vai_tro
      and public.ly_do_khong_du_dieu_kien(pf.id, p_bai, p_vai_tro) is null
  )
  select u.uid, u.ten, u.anh, u.diem_tinh,
    (row_number() over (order by u.diem_tinh desc, u.gio asc, u.ten))::int,
    round(u.gio, 2),
    u.a4,
    u.so_cung_lop,
    case when v_quan_tri or u.uid = v_me then (
      select case dk.loai when 'duoc_moi' then 'duoc_moi' else 'dang_ky' end
      from public.dang_ky_giang_day dk
      where dk.bai_id = p_bai and dk.user_id = u.uid and dk.trang_thai = 'cho_xu_ly' limit 1
    ) end,
    case when v_quan_tri or u.uid = v_me then (
      select dk.id from public.dang_ky_giang_day dk
      where dk.bai_id = p_bai and dk.user_id = u.uid and dk.trang_thai = 'cho_xu_ly' limit 1
    ) end
  from ung u
  order by 5;
end;
$$;
