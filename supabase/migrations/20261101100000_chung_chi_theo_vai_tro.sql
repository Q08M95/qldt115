-- Chứng chỉ yêu cầu thêm theo VAI TRÒ thay vì cho cả lớp (theo yêu cầu người dùng, mục 4.2/4.3)
--
-- Vd lớp BLS cần Giảng viên có chứng chỉ BLS nhưng Trợ giảng thì không. Trước đây chứng chỉ yêu cầu áp cho mọi vai trò
-- trong lớp nên Trợ giảng không có BLS bị loại oan khỏi gợi ý/đăng ký/thông báo.
--
--   1. lop_hoc_chung_chi_yeu_cau thêm cột vai_tro; khóa chính (lop_id, vai_tro, loai_id). Dữ liệu cũ nhân đôi cho CẢ 2 vai trò
--      để kết quả lọc của các lớp hiện có giữ nguyên (không lớp nào bị nới/siết ngầm).
--   2. Lọc cứng chỉ xét chứng chỉ của đúng vai trò: ly_do_khong_du_dieu_kien (đăng ký/mời), goi_y_core (gợi ý),
--      nguoi_du_dieu_kien_lop (thông báo lớp/Bài mới, lớp sắp mở).
--   3. luu_lop_hoc nhận 2 mảng p_chung_chi_gv / p_chung_chi_tg. Bản cũ (1 mảng) giữ lại làm lớp tương thích — áp mảng đó cho
--      cả 2 vai trò — để web bản cũ vẫn lưu lớp được trong lúc chờ Vercel triển khai bản mới.
--
-- Chạy lại được.

-- ============ 1. Bảng ============
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lop_hoc_chung_chi_yeu_cau' and column_name = 'vai_tro'
  ) then
    alter table public.lop_hoc_chung_chi_yeu_cau drop constraint lop_hoc_chung_chi_yeu_cau_pkey;
    alter table public.lop_hoc_chung_chi_yeu_cau add column vai_tro public.vai_tro_giang_day;
    update public.lop_hoc_chung_chi_yeu_cau set vai_tro = 'giang_vien';
    insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, loai_id, vai_tro)
    select lop_id, loai_id, 'tro_giang' from public.lop_hoc_chung_chi_yeu_cau;
    alter table public.lop_hoc_chung_chi_yeu_cau alter column vai_tro set not null;
    alter table public.lop_hoc_chung_chi_yeu_cau add primary key (lop_id, vai_tro, loai_id);
  end if;
end;
$$;

-- ============ 2. Lọc cứng theo vai trò ============
-- Đăng ký / mời 1 Bài (giữ nguyên Giai đoạn 5, chỉ thêm "r.vai_tro = p_vai_tro")
create or replace function public.ly_do_khong_du_dieu_kien(p_user uuid, p_bai uuid, p_vai_tro public.vai_tro_giang_day)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_tham_gia;
  v_vai public.vai_tro_giang_day;
  v_lop uuid;
  v_thieu text;
begin
  select trang_thai_tham_gia, vai_tro_giang_day into v_tt, v_vai from public.profiles where id = p_user;
  if not found then
    return 'Không tìm thấy nhân sự';
  end if;
  if v_tt <> 'dang_tham_gia' then
    return 'Không ở trạng thái "Đang tham gia giảng dạy"';
  end if;
  select lop_id into v_lop from public.bai_hoc where id = p_bai;
  if v_lop is null then
    return 'Không tìm thấy Bài';
  end if;
  if v_vai is null then
    return 'Chưa được xếp nhóm';
  end if;
  if v_vai <> p_vai_tro then
    return 'Vai trò không phù hợp với slot này';
  end if;
  if not exists (
    select 1 from public.nhan_su_nhom n
    join public.lop_hoc_nhom_du_dieu_kien d on d.nhom = n.nhom and d.lop_id = v_lop
    where n.user_id = p_user
  ) then
    return 'Chưa đủ điều kiện đăng ký lớp này';
  end if;

  select string_agg(m.ten, ', ' order by m.thu_tu) into v_thieu
  from public.lop_hoc_chung_chi_yeu_cau r
  join public.danh_muc_loai_chung_chi m on m.id = r.loai_id
  where r.lop_id = v_lop and r.vai_tro = p_vai_tro
    and not exists (select 1 from public.chung_chi c where c.user_id = p_user and c.loai_id = r.loai_id);
  if v_thieu is not null then
    return 'Thiếu chứng chỉ yêu cầu: ' || v_thieu;
  end if;

  if exists (select 1 from public.slot_giang_day where bai_id = p_bai and nguoi_phan_cong = p_user) then
    return 'Đã được phân công ở Bài này';
  end if;
  return public.bai_trung_lich(p_user, p_bai);
end;
$$;

-- Gợi ý nhân sự (giữ nguyên Giai đoạn 13, chỉ thêm "r.vai_tro = cap.vt")
create or replace function public.goi_y_core(
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
        where r.lop_id = p_lop and r.vai_tro = cap.vt
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
    case when (v_quan_tri or u.uid = v_me) and dk.id is not null then (case dk.loai when 'duoc_moi' then 'duoc_moi' else 'dang_ky' end) end,
    case when (v_quan_tri or u.uid = v_me) and dk.id is not null then dk.id end
  from ung u
  left join public.dang_ky_giang_day dk
    on dk.bai_id = u.bid and dk.user_id = u.uid and dk.trang_thai = 'cho_xu_ly' and (v_quan_tri or u.uid = v_me)
  order by u.bid, u.vt, 7;
end;
$$;

-- Người nhận thông báo lớp/Bài mới (giữ nguyên Giai đoạn 8, chỉ thêm "r.vai_tro = p.vai_tro_giang_day")
create or replace function public.nguoi_du_dieu_kien_lop(p_lop uuid)
returns table (id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.trang_thai_tham_gia = 'dang_tham_gia'
    and p.vai_tro_giang_day is not null
    and exists (
      select 1 from public.nhan_su_nhom n
      join public.lop_hoc_nhom_du_dieu_kien d on d.nhom = n.nhom and d.lop_id = p_lop
      where n.user_id = p.id
    )
    and not exists (
      select 1 from public.lop_hoc_chung_chi_yeu_cau r
      where r.lop_id = p_lop and r.vai_tro = p.vai_tro_giang_day
        and not exists (select 1 from public.chung_chi c where c.user_id = p.id and c.loai_id = r.loai_id)
    )
    and exists (
      select 1 from public.slot_giang_day s
      join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = p_lop and s.vai_tro = p.vai_tro_giang_day and s.nguoi_phan_cong is null and b.bat_dau > now()
    );
$$;

-- ============ 3. Lưu lớp ============
drop function if exists public.luu_lop_hoc(uuid, text, uuid, public.doi_tuong_lop, public.loai_kinh_phi, date, date, text, boolean, public.nhom_nhan_su[], uuid[], uuid[]);
create function public.luu_lop_hoc(
  p_id uuid,
  p_ten text,
  p_nhom_lop uuid,
  p_doi_tuong public.doi_tuong_lop,
  p_loai_kinh_phi public.loai_kinh_phi,
  p_ngay_bat_dau date,
  p_ngay_ket_thuc date,
  p_dia_diem text,
  p_cong_khai_som boolean,
  p_nhom_du_dieu_kien public.nhom_nhan_su[],
  p_chung_chi_gv uuid[],
  p_chung_chi_tg uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_tt public.trang_thai_lop;
  v_ten text := btrim(coalesce(p_ten, ''));
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  if v_ten = '' then
    raise exception 'Tên lớp không được để trống' using errcode = '23514';
  end if;
  if p_ngay_bat_dau is null or p_ngay_ket_thuc is null then
    raise exception 'Hãy nhập ngày bắt đầu và ngày kết thúc' using errcode = '23514';
  end if;
  if p_ngay_ket_thuc < p_ngay_bat_dau then
    raise exception 'Ngày kết thúc phải sau hoặc cùng ngày bắt đầu' using errcode = '23514';
  end if;
  if coalesce(cardinality(p_nhom_du_dieu_kien), 0) = 0 then
    raise exception 'Hãy chọn ít nhất 1 nhóm đủ điều kiện đăng ký' using errcode = '23514';
  end if;
  if not exists (select 1 from public.danh_muc_nhom_lop where id = p_nhom_lop) then
    raise exception 'Nhóm lớp không hợp lệ' using errcode = '23503';
  end if;

  if p_id is null then
    insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, dia_diem, cong_khai_som, created_by)
    values (v_ten, p_nhom_lop, p_doi_tuong, p_loai_kinh_phi, p_ngay_bat_dau, p_ngay_ket_thuc, nullif(btrim(p_dia_diem), ''),
            coalesce(p_cong_khai_som, false), (select auth.uid()))
    returning id into v_id;
  else
    select trang_thai into v_tt from public.lop_hoc where id = p_id for update;
    if not found then
      raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
    end if;
    if v_tt in ('da_hoan_thanh', 'da_huy') then
      raise exception 'Lớp đã hoàn thành hoặc đã hủy, không sửa được' using errcode = '55000';
    end if;
    update public.lop_hoc
    set ten = v_ten, nhom_lop_id = p_nhom_lop, doi_tuong = p_doi_tuong, loai_kinh_phi = p_loai_kinh_phi,
        ngay_bat_dau = p_ngay_bat_dau, ngay_ket_thuc = p_ngay_ket_thuc, dia_diem = nullif(btrim(p_dia_diem), ''),
        cong_khai_som = coalesce(p_cong_khai_som, false)
    where id = p_id;
    v_id := p_id;
  end if;

  delete from public.lop_hoc_nhom_du_dieu_kien where lop_id = v_id;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom)
  select distinct v_id, n from unnest(p_nhom_du_dieu_kien) as n;

  delete from public.lop_hoc_chung_chi_yeu_cau where lop_id = v_id;
  insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, vai_tro, loai_id)
  select v_id, 'giang_vien'::public.vai_tro_giang_day, c from unnest(coalesce(p_chung_chi_gv, array[]::uuid[])) as c
  union
  select v_id, 'tro_giang'::public.vai_tro_giang_day, c from unnest(coalesce(p_chung_chi_tg, array[]::uuid[])) as c;

  return v_id;
end;
$$;

-- Bản cũ 1 mảng chứng chỉ: tương thích ngược, áp cho cả 2 vai trò
create or replace function public.luu_lop_hoc(
  p_id uuid,
  p_ten text,
  p_nhom_lop uuid,
  p_doi_tuong public.doi_tuong_lop,
  p_loai_kinh_phi public.loai_kinh_phi,
  p_ngay_bat_dau date,
  p_ngay_ket_thuc date,
  p_dia_diem text,
  p_cong_khai_som boolean,
  p_nhom_du_dieu_kien public.nhom_nhan_su[],
  p_chung_chi uuid[]
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.luu_lop_hoc(p_id, p_ten, p_nhom_lop, p_doi_tuong, p_loai_kinh_phi, p_ngay_bat_dau, p_ngay_ket_thuc,
    p_dia_diem, p_cong_khai_som, p_nhom_du_dieu_kien, p_chung_chi, p_chung_chi);
$$;

revoke execute on function public.luu_lop_hoc(uuid, text, uuid, public.doi_tuong_lop, public.loai_kinh_phi, date, date, text, boolean, public.nhom_nhan_su[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.luu_lop_hoc(uuid, text, uuid, public.doi_tuong_lop, public.loai_kinh_phi, date, date, text, boolean, public.nhom_nhan_su[], uuid[], uuid[]) to authenticated;
