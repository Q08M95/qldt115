-- Giai đoạn 5: Đăng ký giảng dạy — Luồng A (tự đăng ký), Luồng B (được mời), matching-score,
-- kiểm tra trùng lịch, cảnh báo pool nhỏ / dồn tải, phân công & hủy phân công.
-- Tham chiếu CLAUDE.md mục 4.2, 4.3, 3 (tự duyệt), 4.7 (ẩn nhãn nhóm)
--
-- Quyết định thiết kế:
--  * Đăng ký / lời mời gắn ở cấp (Bài + vai trò), KHÔNG gắn vào từng slot: các slot cùng vai trò trong 1 Bài là
--    tương đương nhau. Khi duyệt/đồng ý, hệ thống gán vào slot trống đầu tiên. Trạng thái "Đang chờ duyệt" của slot
--    là trạng thái suy ra (số đăng ký/lời mời chờ xử lý được đánh dấu lên các slot trống) — xem dong_bo_cho_duyet.
--  * Ghi dữ liệu chỉ qua hàm SECURITY DEFINER; bảng không cấp INSERT/UPDATE/DELETE.
--  * Kỳ hiện tại = quý dương lịch (Giai đoạn 6 sẽ thay bằng bảng Kỳ đánh giá). KPI kỳ gần nhất chưa có nên tie-break
--    dùng giá trị trung lập (Giai đoạn 6 thay hàm kpi_gan_nhat).
--  * Cấu hình (tỷ trọng 80/20, ngưỡng pool nhỏ, ngưỡng dồn tải, mức hạ điểm cùng lớp) lưu ở cau_hinh_he_thong;
--    màn hình sửa gom về Giai đoạn 11.

-- ============ Enum ============
create type public.loai_dang_ky as enum ('tu_dang_ky', 'duoc_moi');  -- Luồng A / Luồng B
-- cho_xu_ly: đăng ký chờ Admin duyệt / lời mời chờ người được mời phản hồi
-- da_duyet: đã phân công | tu_choi: Admin từ chối đăng ký / người được mời từ chối (tính A3)
-- da_huy: người đăng ký rút, Admin thu hồi lời mời / hủy phân công, hoặc hệ thống đóng vì slot đã đủ, lớp hủy/hoàn thành
create type public.trang_thai_dang_ky as enum ('cho_xu_ly', 'da_duyet', 'tu_choi', 'da_huy');

-- ============ Cấu hình hệ thống (khóa - giá trị) ============
create table public.cau_hinh_he_thong (
  khoa text primary key,
  gia_tri numeric not null,
  mo_ta text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.cau_hinh_he_thong (khoa, gia_tri, mo_ta) values
  ('matching_ty_trong_cong_bang', 0.80, 'Tỷ trọng công bằng khối lượng trong matching-score (phần còn lại là KPI tie-break)'),
  ('matching_phat_cung_lop', 0.10, 'Mức hạ điểm gợi ý khi ứng viên đã được duyệt ở Bài khác trong cùng lớp'),
  ('canh_bao_pool_nho', 3, 'Cảnh báo khi số ứng viên đủ điều kiện của 1 Bài dưới ngưỡng này'),
  ('canh_bao_don_tai_ty_le', 0.70, 'Cảnh báo mềm khi 1 người đảm nhiệm quá tỷ lệ này số slot của 1 vai trò trong cùng lớp')
on conflict (khoa) do nothing;

revoke all on table public.cau_hinh_he_thong from anon, authenticated;
grant select, update on public.cau_hinh_he_thong to authenticated;
alter table public.cau_hinh_he_thong enable row level security;
create policy cau_hinh_select on public.cau_hinh_he_thong for select to authenticated using (true);
create policy cau_hinh_update on public.cau_hinh_he_thong for update to authenticated
  using (public.is_quan_tri()) with check (public.is_quan_tri());

-- ============ Đăng ký / lời mời ============
create table public.dang_ky_giang_day (
  id uuid primary key default gen_random_uuid(),
  bai_id uuid not null references public.bai_hoc (id) on delete cascade,
  vai_tro public.vai_tro_giang_day not null,
  -- restrict: giữ nguyên lịch sử (phục vụ A2/A3); đổi trạng thái tham gia thay vì xóa người
  user_id uuid not null references public.profiles (id) on delete restrict,
  loai public.loai_dang_ky not null,
  trang_thai public.trang_thai_dang_ky not null default 'cho_xu_ly',
  slot_id uuid references public.slot_giang_day (id) on delete set null,
  -- Người gửi lời mời (Luồng B)
  nguoi_moi uuid references auth.users (id) on delete set null,
  nguoi_xu_ly uuid references auth.users (id) on delete set null,
  xu_ly_luc timestamptz,
  -- Đánh dấu tự duyệt (người duyệt = người được duyệt) cho Nhật ký hệ thống (mục 3, Giai đoạn 9)
  tu_duyet boolean not null default false,
  ly_do text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dang_ky_giang_day_bai_idx on public.dang_ky_giang_day (bai_id, vai_tro);
create index dang_ky_giang_day_user_idx on public.dang_ky_giang_day (user_id);
-- Mỗi người chỉ có 1 đăng ký/lời mời đang chờ trong 1 Bài
create unique index dang_ky_giang_day_cho_uq on public.dang_ky_giang_day (bai_id, user_id) where trang_thai = 'cho_xu_ly';

create trigger dang_ky_giang_day_set_updated_at
  before update on public.dang_ky_giang_day
  for each row execute function public.set_updated_at();

revoke all on table public.dang_ky_giang_day from anon, authenticated;
grant select on public.dang_ky_giang_day to authenticated;
alter table public.dang_ky_giang_day enable row level security;
-- Người quản trị thấy tất cả; GV/TG chỉ thấy đăng ký/lời mời của chính mình
create policy dang_ky_select on public.dang_ky_giang_day for select to authenticated
  using (public.is_quan_tri() or user_id = (select auth.uid()));

-- ============ Hàm tiện ích nội bộ ============
create function public.cau_hinh_so(p_khoa text, p_mac_dinh numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select gia_tri from public.cau_hinh_he_thong where khoa = p_khoa), p_mac_dinh);
$$;

-- Kỳ hiện tại = quý dương lịch theo giờ Việt Nam. TODO Giai đoạn 6: đọc từ bảng Kỳ đánh giá.
create function public.ky_hien_tai()
returns table (tu date, den date)
language sql
stable
set search_path = ''
as $$
  select date_trunc('quarter', d)::date,
         (date_trunc('quarter', d) + interval '3 months' - interval '1 day')::date
  from (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d) x;
$$;

-- KPI kỳ gần nhất (0-100) dùng cho tie-break matching-score. TODO Giai đoạn 6: trả điểm thật; null = chưa có dữ liệu.
create function public.kpi_gan_nhat(p_user uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select null::numeric;
$$;

-- Bài này có trùng giờ với Bài khác đã được phân công của người đó không (không phân biệt cùng/khác lớp,
-- bỏ qua lớp đã hủy). Trả mô tả trùng, hoặc null nếu không trùng.
create function public.bai_trung_lich(p_user uuid, p_bai uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select format('Trùng lịch với Bài "%s" (lớp %s)', b2.ten, l2.ten)
  from public.bai_hoc b1
  join public.slot_giang_day s on s.nguoi_phan_cong = p_user and s.trang_thai = 'da_phan_cong'
  join public.bai_hoc b2 on b2.id = s.bai_id and b2.id <> b1.id
  join public.lop_hoc l2 on l2.id = b2.lop_id and l2.trang_thai <> 'da_huy'
  where b1.id = p_bai
    and b2.bat_dau < b1.ket_thuc
    and b2.ket_thuc > b1.bat_dau
  limit 1;
$$;

-- Lọc cứng (Giai đoạn 1 của matching-score, mục 4.3): trạng thái tham gia, vai trò, nhóm đủ điều kiện của lớp,
-- chứng chỉ yêu cầu, chưa giữ slot trong Bài, không trùng lịch. Trả lý do (không nêu tên nhóm — ẩn nhãn nhóm) hoặc null nếu đủ.
create function public.ly_do_khong_du_dieu_kien(p_user uuid, p_bai uuid, p_vai_tro public.vai_tro_giang_day)
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
  where r.lop_id = v_lop
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

-- Điều kiện để đăng ký (p_moi = false) hoặc để được mời (p_moi = true) vào 1 Bài, gồm cả lọc cứng. Trả lý do hoặc null.
create function public.ly_do_dang_ky(p_user uuid, p_bai uuid, p_vai_tro public.vai_tro_giang_day, p_moi boolean)
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
    -- Mời được khi lớp đang mở, hoặc còn Nháp nhưng đã công khai sớm (để người được mời nhìn thấy lớp)
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
  return public.ly_do_khong_du_dieu_kien(p_user, p_bai, p_vai_tro);
end;
$$;

-- Đánh dấu "Đang chờ duyệt" lên các slot trống theo số đăng ký/lời mời đang chờ: N chờ xử lý -> N slot trống đầu tiên
create function public.dong_bo_cho_duyet(p_bai uuid, p_vai public.vai_tro_giang_day)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cho int;
begin
  select count(*) into v_cho from public.dang_ky_giang_day
  where bai_id = p_bai and vai_tro = p_vai and trang_thai = 'cho_xu_ly';

  update public.slot_giang_day s
  set trang_thai = case when x.rn <= v_cho then 'cho_duyet'::public.trang_thai_slot else 'trong'::public.trang_thai_slot end
  from (
    select id, row_number() over (order by vi_tri) as rn
    from public.slot_giang_day
    where bai_id = p_bai and vai_tro = p_vai and nguoi_phan_cong is null
  ) x
  where s.id = x.id;
end;
$$;

-- Sau khi slot thay đổi: nếu không còn slot trống thì đóng các đăng ký/lời mời còn chờ (slot đóng theo số ĐÃ DUYỆT), rồi đồng bộ
create function public.dong_bo_sau_thay_doi(p_bai uuid, p_vai public.vai_tro_giang_day)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai and nguoi_phan_cong is null
  ) then
    update public.dang_ky_giang_day
    set trang_thai = 'da_huy', ly_do = 'Slot đã đủ người', xu_ly_luc = now()
    where bai_id = p_bai and vai_tro = p_vai and trang_thai = 'cho_xu_ly';
  end if;
  perform public.dong_bo_cho_duyet(p_bai, p_vai);
end;
$$;

-- Gán người vào slot trống đầu tiên của (Bài, vai trò); báo lỗi nếu đã đủ
create function public.gan_slot(p_bai uuid, p_vai public.vai_tro_giang_day, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot uuid;
begin
  select id into v_slot from public.slot_giang_day
  where bai_id = p_bai and vai_tro = p_vai and nguoi_phan_cong is null
  order by vi_tri limit 1
  for update;
  if v_slot is null then
    raise exception 'Slot đã đủ người' using errcode = '55000';
  end if;
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = p_user where id = v_slot;
  return v_slot;
end;
$$;

-- ============ Matching-score (mục 4.3) ============
-- Ứng viên đã qua lọc cứng của 1 slot (Bài + vai trò), xếp hạng theo công bằng khối lượng:
--   diem = w * (1 - percentile khối lượng trong NHÓM) + (1 - w) * KPI chuẩn hóa - phạt cùng lớp
--   - lớp có kinh phí: khối lượng = số giờ đã phân công trong kỳ hiện tại (live, tính cả Bài sắp diễn ra)
--   - lớp không kinh phí: khối lượng = A4 lũy kế (số lớp không kinh phí đã nhận), thấp hơn được ưu tiên
-- percentile trung bình hạng theo từng nhóm (không trộn nhóm); chỉ số THẤP hơn -> điểm cao hơn.
-- Không trả nhãn nhóm. Công khai cho mọi người đăng nhập xem lớp (mục 4.3); cờ "đã đăng ký/được mời" chỉ cho người quản trị/chính chủ.
create function public.ung_vien_bai(p_bai uuid, p_vai_tro public.vai_tro_giang_day)
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
        select sum(extract(epoch from (b.ket_thuc - b.bat_dau)) / 3600.0)
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
      cume_dist() over (partition by c.nhom_nv order by c.cs) as cd
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

-- Gợi ý cho mọi Bài còn slot trống của 1 lớp (1 lần gọi cho cả trang chi tiết lớp)
create function public.goi_y_lop(p_lop uuid)
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
  r record;
begin
  for r in
    select distinct s.bai_id as bid, s.vai_tro as vt
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where b.lop_id = p_lop and s.nguoi_phan_cong is null and l.trang_thai in ('nhap', 'dang_mo')
  loop
    return query
    select r.bid, r.vt, u.user_id, u.ho_ten, u.avatar_url, u.diem, u.hang, u.gio_ky, u.so_lop_khong_kinh_phi,
           u.cung_lop, u.trang_thai_hien_co, u.dang_ky_id
    from public.ung_vien_bai(r.bid, r.vt) u;
  end loop;
end;
$$;

-- ============ Luồng A: tự đăng ký ============
-- Khả năng đăng ký của CHÍNH người gọi cho từng Bài của lớp (để ẩn/vô hiệu hóa trước Bài không đăng ký được)
create function public.kha_nang_dang_ky_lop(p_lop uuid)
returns table (bai_id uuid, ly_do text, da_dang_ky boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me uuid := (select auth.uid());
  v_vai public.vai_tro_giang_day;
  r record;
begin
  if v_me is null then
    return;
  end if;
  if not exists (
    select 1 from public.lop_hoc l
    where l.id = p_lop and (public.is_quan_tri() or l.trang_thai <> 'nhap' or l.cong_khai_som)
  ) then
    return;
  end if;
  select pf.vai_tro_giang_day into v_vai from public.profiles pf where pf.id = v_me;

  for r in select b.id as bid from public.bai_hoc b where b.lop_id = p_lop order by b.bat_dau, b.thu_tu loop
    bai_id := r.bid;
    da_dang_ky := exists (select 1 from public.dang_ky_giang_day d where d.bai_id = r.bid and d.user_id = v_me and d.trang_thai = 'cho_xu_ly')
               or exists (select 1 from public.slot_giang_day s where s.bai_id = r.bid and s.nguoi_phan_cong = v_me);
    ly_do := case when v_vai is null then 'Chưa được xếp nhóm' else public.ly_do_dang_ky(v_me, r.bid, v_vai, false) end;
    return next;
  end loop;
end;
$$;

-- Đăng ký nhiều Bài 1 lượt: dữ liệu vẫn tách từng lượt theo Bài. Bài không hợp lệ bị bỏ qua kèm lý do.
create function public.dang_ky_bai(p_bai_ids uuid[])
returns table (bai_id uuid, ok boolean, thong_bao text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_me uuid := (select auth.uid());
  v_vai public.vai_tro_giang_day;
  v_id uuid;
  v_ly text;
begin
  if v_me is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_bai_ids), 0) > 50 then
    raise exception 'Đăng ký tối đa 50 Bài mỗi lần' using errcode = '23514';
  end if;
  select pf.vai_tro_giang_day into v_vai from public.profiles pf where pf.id = v_me;

  foreach v_id in array coalesce(p_bai_ids, '{}'::uuid[]) loop
    bai_id := v_id;
    if v_vai is null then
      v_ly := 'Chưa được xếp nhóm';
    else
      v_ly := public.ly_do_dang_ky(v_me, v_id, v_vai, false);
    end if;
    if v_ly is null then
      insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai) values (v_id, v_vai, v_me, 'tu_dang_ky');
      perform public.dong_bo_cho_duyet(v_id, v_vai);
      ok := true;
      thong_bao := 'Đã gửi đăng ký, chờ duyệt';
    else
      ok := false;
      thong_bao := v_ly;
    end if;
    return next;
  end loop;
end;
$$;

create function public.rut_dang_ky(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.dang_ky_giang_day%rowtype;
begin
  select * into r from public.dang_ky_giang_day where id = p_id for update;
  if not found or r.user_id is distinct from (select auth.uid()) or r.loai <> 'tu_dang_ky' or r.trang_thai <> 'cho_xu_ly' then
    raise exception 'Không tìm thấy đăng ký đang chờ của bạn' using errcode = 'P0002';
  end if;
  update public.dang_ky_giang_day set trang_thai = 'da_huy', ly_do = 'Người đăng ký rút', xu_ly_luc = now() where id = p_id;
  perform public.dong_bo_cho_duyet(r.bai_id, r.vai_tro);
end;
$$;

-- Duyệt đăng ký (người quản trị). Nếu việc duyệt khiến 1 người vượt ngưỡng đảm nhiệm slot của 1 vai trò trong cùng lớp
-- thì trả cảnh báo mềm (không chặn) — gọi lại với p_xac_nhan = true để vẫn duyệt (mục 4.2).
create function public.duyet_dang_ky(p_id uuid, p_xac_nhan boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.dang_ky_giang_day%rowtype;
  v_lop uuid;
  v_ly text;
  v_tong int;
  v_da int;
  v_slot uuid;
  v_nguong numeric := public.cau_hinh_so('canh_bao_don_tai_ty_le', 0.7);
begin
  -- TODO Giai đoạn 8: thông báo cho người được duyệt. TODO Giai đoạn 9: ghi audit_log (gắn nhãn tự duyệt).
  if not public.is_quan_tri() then
    raise exception 'Không có quyền duyệt đăng ký' using errcode = '42501';
  end if;
  select * into r from public.dang_ky_giang_day where id = p_id for update;
  if not found or r.loai <> 'tu_dang_ky' or r.trang_thai <> 'cho_xu_ly' then
    raise exception 'Đăng ký không tồn tại hoặc đã được xử lý' using errcode = 'P0002';
  end if;

  v_ly := public.ly_do_khong_du_dieu_kien(r.user_id, r.bai_id, r.vai_tro);
  if v_ly is not null then
    raise exception 'Không duyệt được: %', v_ly using errcode = '55000';
  end if;
  if (select bat_dau from public.bai_hoc where id = r.bai_id) <= now() then
    raise exception 'Không duyệt được: Bài đã bắt đầu' using errcode = '55000';
  end if;

  select lop_id into v_lop from public.bai_hoc where id = r.bai_id;
  select count(*) into v_tong from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
  where b.lop_id = v_lop and s.vai_tro = r.vai_tro;
  select count(*) into v_da from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
  where b.lop_id = v_lop and s.vai_tro = r.vai_tro and s.nguoi_phan_cong = r.user_id;

  if v_tong >= 2 and (v_da + 1)::numeric / v_tong > v_nguong and not coalesce(p_xac_nhan, false) then
    return jsonb_build_object(
      'canh_bao', true,
      'thong_bao', format('Người này sẽ đảm nhiệm %s/%s Bài (%s) trong lớp này — vẫn duyệt?', v_da + 1, v_tong,
                          case r.vai_tro when 'giang_vien' then 'Giảng viên' else 'Trợ giảng' end)
    );
  end if;

  v_slot := public.gan_slot(r.bai_id, r.vai_tro, r.user_id);
  update public.dang_ky_giang_day
  set trang_thai = 'da_duyet', slot_id = v_slot, nguoi_xu_ly = (select auth.uid()), xu_ly_luc = now(),
      tu_duyet = public.la_tu_duyet((select auth.uid()), r.user_id)
  where id = p_id;
  perform public.dong_bo_sau_thay_doi(r.bai_id, r.vai_tro);
  return jsonb_build_object('ok', true);
end;
$$;

create function public.tu_choi_dang_ky(p_id uuid, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.dang_ky_giang_day%rowtype;
begin
  -- TODO Giai đoạn 8: thông báo cho người bị từ chối. TODO Giai đoạn 9: ghi audit_log.
  if not public.is_quan_tri() then
    raise exception 'Không có quyền từ chối đăng ký' using errcode = '42501';
  end if;
  select * into r from public.dang_ky_giang_day where id = p_id for update;
  if not found or r.loai <> 'tu_dang_ky' or r.trang_thai <> 'cho_xu_ly' then
    raise exception 'Đăng ký không tồn tại hoặc đã được xử lý' using errcode = 'P0002';
  end if;
  update public.dang_ky_giang_day
  set trang_thai = 'tu_choi', ly_do = nullif(btrim(coalesce(p_ly_do, '')), ''), nguoi_xu_ly = (select auth.uid()),
      xu_ly_luc = now(), tu_duyet = public.la_tu_duyet((select auth.uid()), r.user_id)
  where id = p_id;
  perform public.dong_bo_cho_duyet(r.bai_id, r.vai_tro);
end;
$$;

-- ============ Luồng B: được mời ============
create function public.moi_giang_day(p_bai uuid, p_vai public.vai_tro_giang_day, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ly text;
  v_id uuid;
  v_trong int;
  v_dang_moi int;
begin
  -- TODO Giai đoạn 8: thông báo "Được mời dạy" cho người được mời
  if not public.is_quan_tri() then
    raise exception 'Không có quyền gửi lời mời' using errcode = '42501';
  end if;
  v_ly := public.ly_do_dang_ky(p_user, p_bai, p_vai, true);
  if v_ly is not null then
    raise exception 'Không mời được: %', v_ly using errcode = '55000';
  end if;

  select count(*) into v_trong from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai and nguoi_phan_cong is null;
  select count(*) into v_dang_moi from public.dang_ky_giang_day
  where bai_id = p_bai and vai_tro = p_vai and loai = 'duoc_moi' and trang_thai = 'cho_xu_ly';
  if v_dang_moi >= v_trong then
    raise exception 'Đã mời đủ số người cho các slot còn trống; hãy chờ phản hồi hoặc thu hồi lời mời trước' using errcode = '55000';
  end if;

  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi)
  values (p_bai, p_vai, p_user, 'duoc_moi', (select auth.uid()))
  returning id into v_id;
  perform public.dong_bo_cho_duyet(p_bai, p_vai);
  return v_id;
end;
$$;

-- Người được mời đồng ý / từ chối (độc lập theo từng Bài). Từ chối được ghi lại đầy đủ (phục vụ A3).
create function public.phan_hoi_loi_moi(p_id uuid, p_dong_y boolean)
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
    v_ly := public.ly_do_khong_du_dieu_kien(r.user_id, r.bai_id, r.vai_tro);
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

create function public.thu_hoi_loi_moi(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.dang_ky_giang_day%rowtype;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền thu hồi lời mời' using errcode = '42501';
  end if;
  select * into r from public.dang_ky_giang_day where id = p_id for update;
  if not found or r.loai <> 'duoc_moi' or r.trang_thai <> 'cho_xu_ly' then
    raise exception 'Lời mời không tồn tại hoặc đã được xử lý' using errcode = 'P0002';
  end if;
  update public.dang_ky_giang_day
  set trang_thai = 'da_huy', ly_do = 'Admin thu hồi lời mời', nguoi_xu_ly = (select auth.uid()), xu_ly_luc = now()
  where id = p_id;
  perform public.dong_bo_cho_duyet(r.bai_id, r.vai_tro);
end;
$$;

-- Hủy phân công 1 slot đã có người -> slot quay lại "Trống" (mục 4.3)
create function public.huy_phan_cong(p_slot uuid, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.slot_giang_day%rowtype;
  v_tt public.trang_thai_lop;
begin
  -- TODO Giai đoạn 8: thông báo cho người bị hủy phân công. TODO Giai đoạn 9: ghi audit_log.
  if not public.is_quan_tri() then
    raise exception 'Không có quyền hủy phân công' using errcode = '42501';
  end if;
  select * into s from public.slot_giang_day where id = p_slot for update;
  if not found or s.trang_thai <> 'da_phan_cong' then
    raise exception 'Slot chưa có người được phân công' using errcode = 'P0002';
  end if;
  select l.trang_thai into v_tt from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = s.bai_id;
  if v_tt in ('da_hoan_thanh', 'da_huy') then
    raise exception 'Lớp đã hoàn thành hoặc đã hủy, không đổi phân công được' using errcode = '55000';
  end if;

  update public.dang_ky_giang_day
  set trang_thai = 'da_huy', ly_do = coalesce(nullif(btrim(coalesce(p_ly_do, '')), ''), 'Admin hủy phân công'),
      nguoi_xu_ly = (select auth.uid()), xu_ly_luc = now()
  where slot_id = p_slot and trang_thai = 'da_duyet';
  update public.slot_giang_day set trang_thai = 'trong', nguoi_phan_cong = null where id = p_slot;
  perform public.dong_bo_cho_duyet(s.bai_id, s.vai_tro);
end;
$$;

-- ============ Cập nhật hàm Giai đoạn 4 cho khớp đăng ký/lời mời ============
-- Giảm số slot: chỉ chặn khi slot bị bỏ đã có người; đồng thời số đăng ký/lời mời đang chờ không được vượt số slot trống còn lại.
create or replace function public.dong_bo_slot_bai(p_bai uuid, p_vai_tro public.vai_tro_giang_day, p_so int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hien_co int;
  v_cho int;
  v_trong int;
begin
  select coalesce(max(vi_tri), 0) into v_hien_co
  from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro;

  if p_so > v_hien_co then
    insert into public.slot_giang_day (bai_id, vai_tro, vi_tri)
    select p_bai, p_vai_tro, g from generate_series(v_hien_co + 1, p_so) as g;
  elsif p_so < v_hien_co then
    if exists (
      select 1 from public.slot_giang_day
      where bai_id = p_bai and vai_tro = p_vai_tro and vi_tri > p_so and trang_thai = 'da_phan_cong'
    ) then
      raise exception 'Không giảm được số slot: có slot đã được phân công người' using errcode = '55000';
    end if;
    delete from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro and vi_tri > p_so;

    select count(*) into v_cho from public.dang_ky_giang_day
    where bai_id = p_bai and vai_tro = p_vai_tro and trang_thai = 'cho_xu_ly';
    select count(*) into v_trong from public.slot_giang_day
    where bai_id = p_bai and vai_tro = p_vai_tro and nguoi_phan_cong is null;
    if v_cho > v_trong then
      raise exception 'Không giảm được số slot: đang có nhiều đăng ký/lời mời chờ xử lý hơn số slot trống còn lại' using errcode = '55000';
    end if;
  end if;
end;
$$;

create or replace function public.luu_bai_hoc(
  p_id uuid,
  p_lop uuid,
  p_ten text,
  p_bat_dau timestamptz,
  p_ket_thuc timestamptz,
  p_so_gv int,
  p_so_tg int
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
  v_tl text;
begin
  -- TODO Giai đoạn 8: đổi giờ Bài đã có người được phân công -> bắt buộc thông báo cho người liên quan
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop for update;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt not in ('nhap', 'dang_mo') then
    raise exception 'Lớp đã hoàn thành hoặc đã hủy, không sửa Bài được' using errcode = '55000';
  end if;
  if v_ten = '' then
    raise exception 'Tên Bài không được để trống' using errcode = '23514';
  end if;
  if p_bat_dau is null or p_ket_thuc is null or p_ket_thuc <= p_bat_dau then
    raise exception 'Giờ kết thúc phải sau giờ bắt đầu' using errcode = '23514';
  end if;
  if p_so_gv is null or p_so_tg is null or p_so_gv < 0 or p_so_tg < 0 or p_so_gv > 20 or p_so_tg > 20 then
    raise exception 'Số slot mỗi vai trò phải từ 0 đến 20' using errcode = '23514';
  end if;
  if p_so_gv + p_so_tg = 0 then
    raise exception 'Mỗi Bài cần ít nhất 1 slot (Giảng viên hoặc Trợ giảng)' using errcode = '23514';
  end if;

  if p_id is null then
    insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
    values (p_lop, (select coalesce(max(thu_tu), 0) + 1 from public.bai_hoc where lop_id = p_lop), v_ten, p_bat_dau, p_ket_thuc)
    returning id into v_id;
  else
    update public.bai_hoc set ten = v_ten, bat_dau = p_bat_dau, ket_thuc = p_ket_thuc
    where id = p_id and lop_id = p_lop;
    if not found then
      raise exception 'Không tìm thấy Bài trong lớp này' using errcode = 'P0002';
    end if;
    v_id := p_id;

    -- Đổi giờ không được làm người đã phân công bị trùng lịch với Bài khác của họ
    select public.bai_trung_lich(s.nguoi_phan_cong, v_id) into v_tl
    from public.slot_giang_day s
    where s.bai_id = v_id and s.nguoi_phan_cong is not null and public.bai_trung_lich(s.nguoi_phan_cong, v_id) is not null
    limit 1;
    if v_tl is not null then
      raise exception 'Đổi giờ khiến 1 người đã được phân công bị trùng lịch: %', v_tl using errcode = '55000';
    end if;
  end if;

  perform public.dong_bo_slot_bai(v_id, 'giang_vien', p_so_gv);
  perform public.dong_bo_slot_bai(v_id, 'tro_giang', p_so_tg);
  perform public.dong_bo_cho_duyet(v_id, 'giang_vien');
  perform public.dong_bo_cho_duyet(v_id, 'tro_giang');
  return v_id;
end;
$$;

-- Khi lớp Đã hoàn thành / Đã hủy: đóng mọi đăng ký/lời mời còn chờ, trả các slot "chờ duyệt" về "trống"
create or replace function public.doi_trang_thai_lop(p_lop uuid, p_trang_thai public.trang_thai_lop)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
begin
  -- TODO Giai đoạn 8: hủy lớp đã có người được phân công -> bắt buộc thông báo cho người liên quan
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop for update;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt = p_trang_thai then
    return;
  end if;

  if p_trang_thai = 'dang_mo' then
    if v_tt <> 'nhap' then
      raise exception 'Chỉ lớp Nháp mới mở đăng ký được' using errcode = '55000';
    end if;
    if not exists (select 1 from public.bai_hoc where lop_id = p_lop) then
      raise exception 'Hãy thêm ít nhất 1 Bài trước khi mở đăng ký' using errcode = '55000';
    end if;
  elsif p_trang_thai = 'nhap' then
    if v_tt <> 'dang_mo' then
      raise exception 'Không thể đưa lớp về Nháp từ trạng thái hiện tại' using errcode = '55000';
    end if;
    if exists (
      select 1 from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = p_lop and s.trang_thai <> 'trong'
    ) then
      raise exception 'Lớp đã có người đăng ký hoặc được phân công, không đưa về Nháp được' using errcode = '55000';
    end if;
  elsif p_trang_thai = 'da_hoan_thanh' then
    if v_tt <> 'dang_mo' then
      raise exception 'Chỉ lớp đang mở mới hoàn thành được' using errcode = '55000';
    end if;
  elsif p_trang_thai = 'da_huy' then
    if v_tt not in ('nhap', 'dang_mo') then
      raise exception 'Lớp đã hoàn thành hoặc đã hủy' using errcode = '55000';
    end if;
  end if;

  update public.lop_hoc set trang_thai = p_trang_thai where id = p_lop;

  if p_trang_thai in ('da_hoan_thanh', 'da_huy') then
    update public.dang_ky_giang_day
    set trang_thai = 'da_huy',
        ly_do = case when p_trang_thai = 'da_huy' then 'Lớp đã hủy' else 'Lớp đã hoàn thành' end,
        xu_ly_luc = now()
    where trang_thai = 'cho_xu_ly' and bai_id in (select id from public.bai_hoc where lop_id = p_lop);
    update public.slot_giang_day set trang_thai = 'trong'
    where trang_thai = 'cho_duyet' and bai_id in (select id from public.bai_hoc where lop_id = p_lop);
  end if;
end;
$$;

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.cau_hinh_so(text, numeric) from public, anon, authenticated;
revoke execute on function public.ky_hien_tai() from public, anon, authenticated;
revoke execute on function public.kpi_gan_nhat(uuid) from public, anon, authenticated;
revoke execute on function public.bai_trung_lich(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ly_do_khong_du_dieu_kien(uuid, uuid, public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.ly_do_dang_ky(uuid, uuid, public.vai_tro_giang_day, boolean) from public, anon, authenticated;
revoke execute on function public.dong_bo_cho_duyet(uuid, public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.dong_bo_sau_thay_doi(uuid, public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.gan_slot(uuid, public.vai_tro_giang_day, uuid) from public, anon, authenticated;
revoke execute on function public.ung_vien_bai(uuid, public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.goi_y_lop(uuid) from public, anon, authenticated;
revoke execute on function public.kha_nang_dang_ky_lop(uuid) from public, anon, authenticated;
revoke execute on function public.dang_ky_bai(uuid[]) from public, anon, authenticated;
revoke execute on function public.rut_dang_ky(uuid) from public, anon, authenticated;
revoke execute on function public.duyet_dang_ky(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.tu_choi_dang_ky(uuid, text) from public, anon, authenticated;
revoke execute on function public.moi_giang_day(uuid, public.vai_tro_giang_day, uuid) from public, anon, authenticated;
revoke execute on function public.phan_hoi_loi_moi(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.thu_hoi_loi_moi(uuid) from public, anon, authenticated;
revoke execute on function public.huy_phan_cong(uuid, text) from public, anon, authenticated;

grant execute on function public.ung_vien_bai(uuid, public.vai_tro_giang_day) to authenticated;
grant execute on function public.goi_y_lop(uuid) to authenticated;
grant execute on function public.kha_nang_dang_ky_lop(uuid) to authenticated;
grant execute on function public.dang_ky_bai(uuid[]) to authenticated;
grant execute on function public.rut_dang_ky(uuid) to authenticated;
grant execute on function public.duyet_dang_ky(uuid, boolean) to authenticated;
grant execute on function public.tu_choi_dang_ky(uuid, text) to authenticated;
grant execute on function public.moi_giang_day(uuid, public.vai_tro_giang_day, uuid) to authenticated;
grant execute on function public.phan_hoi_loi_moi(uuid, boolean) to authenticated;
grant execute on function public.thu_hoi_loi_moi(uuid) to authenticated;
grant execute on function public.huy_phan_cong(uuid, text) to authenticated;
