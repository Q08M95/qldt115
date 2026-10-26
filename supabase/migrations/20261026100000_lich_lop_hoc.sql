-- Lịch lớp toàn đơn vị (mục 4.2/4.3 — "công khai cả lớp đang mở lẫn lớp sắp mở để GV/TG chủ động sắp xếp lịch")
--
--   1. "Công khai sớm" mặc định BẬT cho lớp mới (kể cả nhập CSV) — lớp Dự kiến hiện ngay trên lịch, Admin bỏ tick nếu chưa muốn lộ.
--   2. lich_lop_hoc(p_tu, p_den): mọi LỚP (chưa hủy, người xem nhìn thấy được) có thời gian giao khoảng ngày [p_tu, p_den],
--      kèm cờ "còn thiếu người" (có slot trống ở Bài chưa diễn ra) và cờ "tôi dạy" (người xem được phân công ít nhất 1 Bài).
--      Lịch hiển thị ở mức LỚP (không theo Bài) cho gọn; buổi dạy của chính mình lấy riêng ở phía app.
--   3. Thông báo "Lớp sắp mở đăng ký" (loại bai_trong_moi — người dùng tắt được như "Lớp/Bài mới") cho người đủ điều kiện
--      khi lớp Dự kiến công khai sớm có Bài đầu tiên, hoặc khi lớp Dự kiến đã có Bài được bật công khai sớm. Mỗi lớp chỉ báo
--      1 lần/người (bảng thong_bao_lop_sap_mo) và GỘP: mỗi người chỉ 1 thông báo chưa đọc "N lớp sắp mở đăng ký" — lớp mới chỉ
--      cập nhật con số (không tạo dòng mới nên không đẩy push thêm), tránh dồn dập khi nhập cả kế hoạch năm bằng CSV.
--      Đã đọc rồi mà có lớp mới thì tạo thông báo mới.
--
-- Chạy lại được (drop/create or replace) — bản đầu của file này (trả về theo Bài) đã chạy trên project dev.

-- ============ 1. Mặc định công khai sớm ============
alter table public.lop_hoc alter column cong_khai_som set default true;

-- ============ 2. Lịch lớp ============
drop function if exists public.lich_lop_hoc(timestamptz, timestamptz);
drop function if exists public.lich_lop_hoc(date, date);
create function public.lich_lop_hoc(p_tu date, p_den date)
returns table (
  lop_id uuid,
  ten text,
  nhom_lop_id uuid,
  nhom_lop_ten text,
  ngay_bat_dau date,
  ngay_ket_thuc date,
  dia_diem text,
  trang_thai_hien_thi text,
  con_thieu boolean,
  toi_day boolean
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
  if p_tu is null or p_den is null or p_den < p_tu or p_den - p_tu > 62 then
    raise exception 'Khoảng thời gian không hợp lệ (tối đa 62 ngày)' using errcode = '22023';
  end if;

  return query
  select
    v.id, v.ten, v.nhom_lop_id, v.nhom_lop_ten, v.ngay_bat_dau, v.ngay_ket_thuc, v.dia_diem, v.trang_thai_hien_thi,
    exists (
      select 1 from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = v.id and s.nguoi_phan_cong is null and b.bat_dau > now()
    ),
    exists (
      select 1 from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = v.id and s.nguoi_phan_cong = v_uid
    )
  from public.lop_hoc_tong_hop v
  -- Cùng quy tắc nhìn thấy với RLS lop_hoc: GV/TG không thấy lớp Dự kiến chưa công khai sớm
  where v.trang_thai <> 'da_huy'
    and (v_quan_tri or v.trang_thai <> 'nhap' or v.cong_khai_som)
    and v.ngay_bat_dau <= p_den and v.ngay_ket_thuc >= p_tu
  order by v.ngay_bat_dau, v.ten;
end;
$$;

revoke execute on function public.lich_lop_hoc(date, date) from public, anon;
grant execute on function public.lich_lop_hoc(date, date) to authenticated;

-- ============ 3. Thông báo "Lớp sắp mở đăng ký" (gộp) ============
-- Lớp nào đã báo cho ai (chống báo lặp) + thuộc thông báo gộp nào (để đếm N). Bảng nội bộ, không ai đọc qua API.
create table if not exists public.thong_bao_lop_sap_mo (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lop_id uuid not null references public.lop_hoc (id) on delete cascade,
  thong_bao_id uuid references public.thong_bao (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, lop_id)
);
create index if not exists thong_bao_lop_sap_mo_tb_idx on public.thong_bao_lop_sap_mo (thong_bao_id);
revoke all on table public.thong_bao_lop_sap_mo from anon, authenticated;
alter table public.thong_bao_lop_sap_mo enable row level security;

create or replace function public.bao_lop_sap_mo(p_lop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop public.lop_hoc%rowtype;
  v_khoang text;
  a record;
  v_tb uuid;
  v_n int;
begin
  select * into v_lop from public.lop_hoc where id = p_lop;
  if not found or v_lop.trang_thai <> 'nhap' or not v_lop.cong_khai_som then
    return;
  end if;
  v_khoang := to_char(v_lop.ngay_bat_dau, 'DD/MM/YYYY') || ' – ' || to_char(v_lop.ngay_ket_thuc, 'DD/MM/YYYY');
  for a in select q.id from public.nguoi_du_dieu_kien_lop(p_lop) q loop
    -- Người thao tác không nhận thông báo về chính hành động của mình (cùng quy tắc tao_thong_bao)
    continue when a.id is not distinct from (select auth.uid());
    -- Lớp này đã báo cho người này rồi -> bỏ qua
    insert into public.thong_bao_lop_sap_mo (user_id, lop_id) values (a.id, p_lop) on conflict do nothing;
    continue when not found;

    v_tb := null;
    select t.id into v_tb from public.thong_bao t
    where t.user_id = a.id and t.khoa = 'sap_mo' and not t.da_doc
    order by t.created_at desc limit 1;
    if v_tb is not null then
      -- Đã có thông báo gộp chưa đọc: chỉ cập nhật con số (UPDATE không gọi webhook push -> không rung thêm)
      update public.thong_bao_lop_sap_mo set thong_bao_id = v_tb where user_id = a.id and lop_id = p_lop;
      select count(*)::int into v_n from public.thong_bao_lop_sap_mo where thong_bao_id = v_tb;
      update public.thong_bao
      set tieu_de = format('%s lớp sắp mở đăng ký', v_n),
          noi_dung = format('Có %s lớp phù hợp với bạn sắp mở đăng ký (mới nhất: %s, %s). Xem Lịch để sắp xếp thời gian.', v_n, v_lop.ten, v_khoang),
          lien_ket = '/lop-hoc?xem=lich',
          created_at = now()
      where id = v_tb;
    elsif public.tao_thong_bao(
      a.id, 'bai_trong_moi', 'thong_tin', 'Lớp sắp mở đăng ký',
      format('Lớp %s (%s) phù hợp với bạn, dự kiến sớm mở đăng ký. Xem trước lịch để sắp xếp thời gian.', v_lop.ten, v_khoang),
      '/lop-hoc/' || p_lop, 'sap_mo', true
    ) then
      update public.thong_bao_lop_sap_mo
      set thong_bao_id = (select t.id from public.thong_bao t where t.user_id = a.id and t.khoa = 'sap_mo' and not t.da_doc
                          order by t.created_at desc limit 1)
      where user_id = a.id and lop_id = p_lop;
    end if;
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

create or replace function public.tb_lop_cong_khai_som()
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
drop trigger if exists lop_hoc_tb_cong_khai_som on public.lop_hoc;
create trigger lop_hoc_tb_cong_khai_som
  after update of cong_khai_som on public.lop_hoc
  for each row
  when (new.cong_khai_som and not old.cong_khai_som and new.trang_thai = 'nhap')
  execute function public.tb_lop_cong_khai_som();

revoke execute on function public.bao_lop_sap_mo(uuid) from public, anon, authenticated;
revoke execute on function public.tb_slot_moi() from public, anon, authenticated;
revoke execute on function public.tb_lop_cong_khai_som() from public, anon, authenticated;
