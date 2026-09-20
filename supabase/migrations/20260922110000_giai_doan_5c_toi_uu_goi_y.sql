-- Giai đoạn 5 (tối ưu): matching-score tính 1 lần cho cả lớp + giới hạn tần suất khảo sát công khai.
--
-- Trước đây goi_y_lop gọi ung_vien_bai cho TỪNG cặp (Bài, vai trò): mỗi lần lại tính lại khối lượng/percentile của toàn bộ
-- nhân sự và gọi hàm lọc cứng cho từng người (~5 truy vấn/người). Đo với ~130 nhân sự: ~65ms/cặp => lớp 10 Bài x 2 vai trò ~2 giây.
-- Nay: 1 hàm lõi goi_y_core tính dân số + percentile 1 LẦN rồi lọc cứng bằng truy vấn tập hợp cho mọi cặp cùng lúc.
-- Ngữ nghĩa giữ nguyên (đúng các lọc cứng của ly_do_khong_du_dieu_kien); ung_vien_bai / goi_y_lop chỉ còn là vỏ gọi hàm lõi.

create function public.goi_y_core(
  p_lop uuid,
  p_bai uuid,
  p_vai public.vai_tro_giang_day,
  p_chi_con_trong boolean
)
returns table (
  bai_id uuid,
  vai_tro public.vai_tro_giang_day,
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
  select l.* into v_lop from public.lop_hoc l where l.id = p_lop;
  if not found then
    return;
  end if;
  -- Chỉ người nhìn thấy được lớp mới xem được gợi ý (lớp Nháp chưa công khai sớm bị ẩn với GV/TG)
  if not (v_quan_tri or v_lop.trang_thai <> 'nhap' or v_lop.cong_khai_som) then
    return;
  end if;
  select k.tu, k.den into v_tu, v_den from public.ky_hien_tai() k;

  return query
  with cap as (
    -- Các cặp (Bài, vai trò) cần gợi ý
    select distinct s.bai_id as bid, s.vai_tro as vt, b.bat_dau as b_bd, b.ket_thuc as b_kt
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    where b.lop_id = p_lop
      and (p_bai is null or b.id = p_bai)
      and (p_vai is null or s.vai_tro = p_vai)
      and (not p_chi_con_trong or exists (
        select 1 from public.slot_giang_day s2
        where s2.bai_id = s.bai_id and s2.vai_tro = s.vai_tro and s2.nguoi_phan_cong is null))
  ),
  dan_so as (
    -- Mọi người đang tham gia, kèm nhóm, số giờ trong kỳ và A4 — tập so sánh percentile theo nhóm (tính 1 lần)
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
      ) as a4,
      (
        select count(*)::int from public.slot_giang_day s3
        join public.bai_hoc b3 on b3.id = s3.bai_id
        where b3.lop_id = p_lop and s3.nguoi_phan_cong = p.id
      ) as so_cung_lop
    from public.profiles p
    join public.nhan_su_nhom n on n.user_id = p.id
    where p.trang_thai_tham_gia = 'dang_tham_gia'
  ),
  chi_so as (
    select d.uid, d.nhom_nv, d.gio, d.a4, d.so_cung_lop,
      case when v_lop.loai_kinh_phi = 'khong_kinh_phi' then d.a4::numeric else d.gio end as cs
    from dan_so d
  ),
  pr as (
    select c.uid, c.nhom_nv, c.gio, c.a4, c.so_cung_lop,
      count(*) over (partition by c.nhom_nv) as n_nhom,
      rank() over (partition by c.nhom_nv order by c.cs) as rk,
      (cume_dist() over (partition by c.nhom_nv order by c.cs))::numeric as cd
    from chi_so c
  ),
  ung as (
    -- Lọc cứng bằng truy vấn tập hợp (tương đương ly_do_khong_du_dieu_kien):
    -- vai trò khớp, nhóm nằm trong nhóm đủ điều kiện của lớp, đủ chứng chỉ yêu cầu, chưa giữ slot trong Bài, không trùng lịch
    select cap.bid, cap.vt, pf.id as uid, pf.ho_ten as ten, pf.avatar_url as anh, pr.gio, pr.a4, pr.so_cung_lop,
      round(
        v_w * (1 - (((pr.rk - 1)::numeric / pr.n_nhom) + pr.cd) / 2)
        + (1 - v_w) * coalesce(public.kpi_gan_nhat(pf.id) / 100.0, 0.5)
        - case when pr.so_cung_lop > 0 then v_phat else 0 end
      , 4) as diem_tinh
    from cap
    join pr on true
    join public.profiles pf on pf.id = pr.uid and pf.vai_tro_giang_day = cap.vt
    where pr.nhom_nv in (select d.nhom from public.lop_hoc_nhom_du_dieu_kien d where d.lop_id = p_lop)
      and not exists (
        select 1 from public.lop_hoc_chung_chi_yeu_cau r
        where r.lop_id = p_lop
          and not exists (select 1 from public.chung_chi c where c.user_id = pr.uid and c.loai_id = r.loai_id)
      )
      and not exists (
        select 1 from public.slot_giang_day sx where sx.bai_id = cap.bid and sx.nguoi_phan_cong = pr.uid
      )
      and not exists (
        select 1
        from public.slot_giang_day s2
        join public.bai_hoc b2 on b2.id = s2.bai_id and b2.id <> cap.bid
        join public.lop_hoc l2 on l2.id = b2.lop_id and l2.trang_thai <> 'da_huy'
        where s2.nguoi_phan_cong = pr.uid and s2.trang_thai = 'da_phan_cong'
          and b2.bat_dau < cap.b_kt and b2.ket_thuc > cap.b_bd
      )
  )
  select u.bid, u.vt, u.uid, u.ten, u.anh, u.diem_tinh,
    (row_number() over (partition by u.bid, u.vt order by u.diem_tinh desc, u.gio asc, u.ten))::int,
    round(u.gio, 2),
    u.a4,
    u.so_cung_lop,
    case when v_quan_tri or u.uid = v_me then (case dk.loai when 'duoc_moi' then 'duoc_moi' else 'dang_ky' end) end,
    case when v_quan_tri or u.uid = v_me then dk.id end
  from ung u
  left join public.dang_ky_giang_day dk
    on dk.bai_id = u.bid and dk.user_id = u.uid and dk.trang_thai = 'cho_xu_ly' and (v_quan_tri or u.uid = v_me)
  order by u.bid, u.vt, 7;
end;
$$;

-- Vỏ: gợi ý cho 1 (Bài, vai trò)
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
  v_lop uuid;
begin
  select b.lop_id into v_lop from public.bai_hoc b where b.id = p_bai;
  if v_lop is null then
    return;
  end if;
  return query
  select g.user_id, g.ho_ten, g.avatar_url, g.diem, g.hang, g.gio_ky, g.so_lop_khong_kinh_phi, g.cung_lop,
         g.trang_thai_hien_co, g.dang_ky_id
  from public.goi_y_core(v_lop, p_bai, p_vai_tro, false) g
  order by g.hang;
end;
$$;

-- Vỏ: gợi ý cho mọi (Bài, vai trò) còn slot trống của 1 lớp đang Nháp/Đang mở — 1 lần gọi cho cả trang chi tiết lớp
create or replace function public.goi_y_lop(p_lop uuid)
returns table (
  bai_id uuid,
  vai_tro public.vai_tro_giang_day,
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
begin
  if not exists (select 1 from public.lop_hoc l where l.id = p_lop and l.trang_thai in ('nhap', 'dang_mo')) then
    return;
  end if;
  return query
  select g.bai_id, g.vai_tro, g.user_id, g.ho_ten, g.avatar_url, g.diem, g.hang, g.gio_ky, g.so_lop_khong_kinh_phi,
         g.cung_lop, g.trang_thai_hien_co, g.dang_ky_id
  from public.goi_y_core(p_lop, null, null, true) g;
end;
$$;

revoke execute on function public.goi_y_core(uuid, uuid, public.vai_tro_giang_day, boolean) from public, anon, authenticated;

-- ============ Khảo sát công khai: giới hạn tần suất (chống spam thô) ============
-- Trang khảo sát không cần đăng nhập nên ai có link cũng gửi được; chặn bơm phản hồi hàng loạt làm lệch C1.
create or replace function public.gui_khao_sat(p_token uuid, p_diem_tong_the int, p_diem_giang_day int, p_nhan_xet text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop uuid;
  v_nhan_xet text := nullif(btrim(coalesce(p_nhan_xet, '')), '');
begin
  select l.id into v_lop
  from public.lop_hoc_khao_sat k
  join public.lop_hoc l on l.id = k.lop_id
  where k.token = p_token and k.mo and l.trang_thai = 'da_hoan_thanh';
  if not found then
    raise exception 'Khảo sát không tồn tại hoặc đã đóng' using errcode = 'P0002';
  end if;
  if p_diem_tong_the is null or p_diem_giang_day is null
     or p_diem_tong_the not between 1 and 5 or p_diem_giang_day not between 1 and 5 then
    raise exception 'Điểm đánh giá phải từ 1 đến 5' using errcode = '23514';
  end if;
  if char_length(v_nhan_xet) > 1000 then
    raise exception 'Nhận xét tối đa 1000 ký tự' using errcode = '23514';
  end if;
  if (select count(*) from public.khao_sat_phan_hoi where lop_id = v_lop and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Đang có quá nhiều phản hồi cùng lúc, vui lòng thử lại sau ít phút' using errcode = '54000';
  end if;

  insert into public.khao_sat_phan_hoi (lop_id, diem_tong_the, diem_giang_day, nhan_xet)
  values (v_lop, p_diem_tong_the, p_diem_giang_day, v_nhan_xet);

  update public.lop_hoc
  set c1_phan_tram = (
        select round(avg((diem_tong_the + diem_giang_day) / 2.0) / 5.0 * 100, 2)
        from public.khao_sat_phan_hoi where lop_id = v_lop
      ),
      c1_nguon = 'khao_sat'
  where id = v_lop;
end;
$$;
