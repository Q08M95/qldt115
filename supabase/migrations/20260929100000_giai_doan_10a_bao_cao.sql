-- Giai đoạn 10, lượt 1: Báo cáo #3 (sản lượng giảng dạy), #4 (tỷ lệ tự đăng ký/nhận lời mời A2/A3),
-- #5 (vận hành đăng ký & phân công) — mục 4.7. Báo cáo #8 (vận hành lớp học) đọc thẳng view lop_hoc_tong_hop nên không cần hàm mới.
--
-- Nguyên tắc chung:
--   * Khoảng thời gian tính theo NGÀY GIỜ VIỆT NAM của giờ bắt đầu Bài (p_tu..p_den, gồm cả hai đầu) — cùng cách gán Bài vào kỳ ở KPI (Giai đoạn 6).
--     App tính khoảng tuần/tháng/quý/năm rồi truyền vào, DB không quy định khung nên dùng lại được cho báo cáo khác.
--   * "Đã dạy" = slot đã phân công của Bài đã kết thúc, lớp không bị hủy (giống engine KPI).
--   * Công khai cho mọi người đăng nhập (mục 4.7) nhưng KHÔNG trả nhãn nhóm — chỉ vai trò Giảng viên/Trợ giảng.
--   * Chỉ đọc (stable), SECURITY DEFINER để tổng hợp toàn đơn vị bất kể RLS từng dòng.

-- ============ Kiểm tra khoảng thời gian ============
create function public.bc_kiem_tra_khoang(p_tu date, p_den date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_tu is null or p_den is null or p_den < p_tu then
    raise exception 'Khoảng thời gian báo cáo không hợp lệ' using errcode = '22023';
  end if;
  if p_den - p_tu > 400 then
    raise exception 'Khoảng thời gian báo cáo tối đa 400 ngày' using errcode = '22023';
  end if;
end;
$$;

-- ============ Báo cáo #3: sản lượng giảng dạy theo người ============
-- Mỗi dòng = 1 người đang tham gia (kể cả người 0 giờ — để thấy ai đang ít việc) hoặc người có dạy trong khoảng dù nay đã nghỉ.
--   so_bai/so_lop/gio_thuc: đã dạy xong; so_bai_sap/gio_sap: đã phân công nhưng chưa diễn ra (thấy mất cân bằng sớm khi xem tuần này).
create function public.bc_san_luong(p_tu date, p_den date)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  vai_tro public.vai_tro_giang_day,
  dang_tham_gia boolean,
  so_bai int,
  so_lop int,
  gio_thuc numeric,
  so_bai_sap int,
  gio_sap numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.bc_kiem_tra_khoang(p_tu, p_den);
  return query
  with bai_nguoi as (
    select s.nguoi_phan_cong as uid, l.id as lid,
      extract(epoch from (b.ket_thuc - b.bat_dau))::numeric / 3600.0 as gio,
      (b.ket_thuc <= now()) as xong
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and s.nguoi_phan_cong is not null
      and l.trang_thai <> 'da_huy'
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
  ),
  tong as (
    select bn.uid,
      (count(*) filter (where bn.xong))::int as so_bai,
      (count(distinct bn.lid) filter (where bn.xong))::int as so_lop,
      coalesce(sum(bn.gio) filter (where bn.xong), 0) as gio_thuc,
      (count(*) filter (where not bn.xong))::int as so_bai_sap,
      coalesce(sum(bn.gio) filter (where not bn.xong), 0) as gio_sap
    from bai_nguoi bn
    group by bn.uid
  )
  select p.id, p.ho_ten, p.avatar_url, p.vai_tro_giang_day,
    (p.trang_thai_tham_gia = 'dang_tham_gia'),
    coalesce(t.so_bai, 0), coalesce(t.so_lop, 0), round(coalesce(t.gio_thuc, 0), 2),
    coalesce(t.so_bai_sap, 0), round(coalesce(t.gio_sap, 0), 2)
  from public.profiles p
  left join tong t on t.uid = p.id
  where p.vai_tro_giang_day is not null
    and (p.trang_thai_tham_gia = 'dang_tham_gia' or t.uid is not null)
  order by 8 desc, 10 desc, p.ho_ten;
end;
$$;

-- ============ Báo cáo #4: tỷ lệ tự đăng ký (A2) và nhận lời mời (A3) theo người ============
-- Cùng định nghĩa với engine KPI: A2 = Bài tự đăng ký được duyệt ÷ Bài đã dạy; A3 = lời mời đồng ý ÷ (đồng ý + từ chối).
-- Chỉ trả người có phát sinh (đã dạy hoặc đã phản hồi lời mời) trong khoảng — tỷ lệ tính ở app (mẫu số 0 = không có dữ liệu).
create function public.bc_ty_le_dang_ky(p_tu date, p_den date)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  vai_tro public.vai_tro_giang_day,
  so_bai_da_day int,
  so_tu_dang_ky int,
  so_moi_dong_y int,
  so_moi_tu_choi int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.bc_kiem_tra_khoang(p_tu, p_den);
  return query
  with da_day as (
    select s.nguoi_phan_cong as uid,
      count(*)::int as so_bai,
      (count(*) filter (where exists (
        select 1 from public.dang_ky_giang_day d
        where d.slot_id = s.id and d.user_id = s.nguoi_phan_cong and d.loai = 'tu_dang_ky' and d.trang_thai = 'da_duyet'
      )))::int as so_tu_dk
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and s.nguoi_phan_cong is not null
      and l.trang_thai <> 'da_huy' and b.ket_thuc <= now()
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
    group by s.nguoi_phan_cong
  ),
  moi as (
    select d.user_id as uid,
      (count(*) filter (where d.trang_thai = 'da_duyet'))::int as dong_y,
      (count(*) filter (where d.trang_thai = 'tu_choi'))::int as tu_choi
    from public.dang_ky_giang_day d
    join public.bai_hoc b on b.id = d.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where d.loai = 'duoc_moi' and d.trang_thai in ('da_duyet', 'tu_choi') and l.trang_thai <> 'da_huy'
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
    group by d.user_id
  )
  select p.id, p.ho_ten, p.avatar_url, p.vai_tro_giang_day,
    coalesce(dd.so_bai, 0), coalesce(dd.so_tu_dk, 0), coalesce(m.dong_y, 0), coalesce(m.tu_choi, 0)
  from public.profiles p
  left join da_day dd on dd.uid = p.id
  left join moi m on m.uid = p.id
  where p.vai_tro_giang_day is not null and (dd.uid is not null or m.uid is not null)
  order by p.ho_ten;
end;
$$;

-- ============ Báo cáo #5: vận hành đăng ký & phân công ============
-- Trả 1 đối tượng JSON:
--   slot_tong / slot_da_phan_cong : slot của Bài bắt đầu trong khoảng (lớp Đang mở hoặc Đã hoàn thành; bỏ Nháp/Đã hủy) → tỷ lệ lấp đầy
--   gio_lap_tb / so_slot_do_duyet : thời gian trung bình (giờ) từ lúc slot được tạo tới lúc có người được phân công, trên các slot đã có người
--   dang_ky_moi / loi_moi_gui     : số lượt tự đăng ký / lời mời tạo trong khoảng
--   dang_ky_cho / loi_moi_cho     : đang chờ ngay lúc này (realtime, không theo khoảng)
--   serie                         : theo ngày trong khoảng: lượt tự đăng ký mới + slot được phân công (vẽ sparkline)
create function public.bc_van_hanh_dang_ky(p_tu date, p_den date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slot int;
  v_pc int;
  v_gio numeric;
  v_n_gio int;
  v_dk int;
  v_moi int;
  v_dk_cho int;
  v_moi_cho int;
  v_serie jsonb;
begin
  perform public.bc_kiem_tra_khoang(p_tu, p_den);

  select count(*)::int, (count(*) filter (where s.trang_thai = 'da_phan_cong'))::int into v_slot, v_pc
  from public.slot_giang_day s
  join public.bai_hoc b on b.id = s.bai_id
  join public.lop_hoc l on l.id = b.lop_id
  where l.trang_thai in ('dang_mo', 'da_hoan_thanh')
    and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den;

  -- Thời gian lấp slot: từ lúc tạo slot tới lần duyệt/đồng ý gần nhất của slot đang có người
  select round(avg(greatest(0, extract(epoch from (x.xu_ly_luc - x.tao_luc)) / 3600.0)), 1), count(*)::int into v_gio, v_n_gio
  from (
    select s.created_at as tao_luc, (
      select max(d.xu_ly_luc) from public.dang_ky_giang_day d
      where d.slot_id = s.id and d.trang_thai = 'da_duyet' and d.xu_ly_luc is not null
    ) as xu_ly_luc
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and l.trang_thai in ('dang_mo', 'da_hoan_thanh')
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
  ) x
  where x.xu_ly_luc is not null;

  select (count(*) filter (where d.loai = 'tu_dang_ky'))::int, (count(*) filter (where d.loai = 'duoc_moi'))::int into v_dk, v_moi
  from public.dang_ky_giang_day d
  where (d.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den;

  select (count(*) filter (where d.loai = 'tu_dang_ky'))::int, (count(*) filter (where d.loai = 'duoc_moi'))::int into v_dk_cho, v_moi_cho
  from public.dang_ky_giang_day d
  where d.trang_thai = 'cho_xu_ly';

  select coalesce(jsonb_agg(jsonb_build_object('ngay', g.ngay, 'dang_ky', coalesce(a.n, 0), 'phan_cong', coalesce(c.n, 0)) order by g.ngay), '[]'::jsonb) into v_serie
  from generate_series(p_tu, p_den, interval '1 day') as gs(ngay_ts)
  cross join lateral (select gs.ngay_ts::date as ngay) g
  left join (
    select (d.created_at at time zone 'Asia/Ho_Chi_Minh')::date as ngay, count(*)::int as n
    from public.dang_ky_giang_day d where d.loai = 'tu_dang_ky' group by 1
  ) a on a.ngay = g.ngay
  left join (
    select (d.xu_ly_luc at time zone 'Asia/Ho_Chi_Minh')::date as ngay, count(*)::int as n
    from public.dang_ky_giang_day d where d.trang_thai = 'da_duyet' and d.xu_ly_luc is not null group by 1
  ) c on c.ngay = g.ngay;

  return jsonb_build_object(
    'slot_tong', v_slot, 'slot_da_phan_cong', v_pc,
    'gio_lap_tb', v_gio, 'so_slot_do_duyet', coalesce(v_n_gio, 0),
    'dang_ky_moi', v_dk, 'loi_moi_gui', v_moi,
    'dang_ky_cho', v_dk_cho, 'loi_moi_cho', v_moi_cho,
    'serie', v_serie
  );
end;
$$;

-- Cảnh báo pool ứng viên nhỏ đang có ngay lúc này (realtime, không theo khoảng): mỗi (Bài, vai trò) còn slot trống của lớp Đang mở,
-- Bài chưa bắt đầu, mà số người đủ điều kiện (theo lọc cứng của gợi ý) dưới ngưỡng cảnh báo (mục 4.3/4.8). 0 người cũng tính.
create function public.bc_canh_bao_pool()
returns table (
  bai_id uuid,
  bai_ten text,
  lop_id uuid,
  lop_ten text,
  bat_dau timestamptz,
  vai_tro public.vai_tro_giang_day,
  slot_trong int,
  so_ung_vien int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_nguong numeric := public.cau_hinh_so('canh_bao_pool_nho', 3);
begin
  return query
  with cap as (
    select b.id as bid, b.ten as bten, l.id as lid, l.ten as lten, b.bat_dau as bd, s.vai_tro as vt,
      count(*)::int as trong
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where l.trang_thai = 'dang_mo' and s.nguoi_phan_cong is null and b.bat_dau > now()
    group by b.id, b.ten, l.id, l.ten, b.bat_dau, s.vai_tro
  ),
  pool as (
    select g.bai_id as bid, g.vai_tro as vt, count(*)::int as n
    from (select distinct c.lid from cap c) x
    cross join lateral public.goi_y_core(x.lid, null, null, true) g
    group by g.bai_id, g.vai_tro
  )
  select cap.bid, cap.bten, cap.lid, cap.lten, cap.bd, cap.vt, cap.trong, coalesce(pool.n, 0)
  from cap
  left join pool on pool.bid = cap.bid and pool.vt = cap.vt
  where coalesce(pool.n, 0) < v_nguong
  order by cap.bd, cap.lten, cap.bten, cap.vt;
end;
$$;

revoke execute on function public.bc_kiem_tra_khoang(date, date) from public, anon, authenticated;
revoke execute on function public.bc_san_luong(date, date) from public, anon;
revoke execute on function public.bc_ty_le_dang_ky(date, date) from public, anon;
revoke execute on function public.bc_van_hanh_dang_ky(date, date) from public, anon;
revoke execute on function public.bc_canh_bao_pool() from public, anon;
grant execute on function public.bc_san_luong(date, date) to authenticated;
grant execute on function public.bc_ty_le_dang_ky(date, date) to authenticated;
grant execute on function public.bc_van_hanh_dang_ky(date, date) to authenticated;
grant execute on function public.bc_canh_bao_pool() to authenticated;
