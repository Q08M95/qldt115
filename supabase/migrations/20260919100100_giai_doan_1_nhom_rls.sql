-- Giai đoạn 1 / File 2: nhóm nhân sự (ẩn với GV/TG bằng RLS), hàm phân quyền, RLS profiles
-- Tham chiếu CLAUDE.md mục 3, mục 4.7 (nguyên tắc ẩn nhãn nhóm)

-- ============ Hàm kiểm tra quyền (security definer để tránh đệ quy RLS) ============
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and phan_quyen = 'admin'
  );
$$;

-- "Quản trị" = Admin hoặc người giữ Quyền Quản lý lớp (toàn quyền Admin trừ build web)
create function public.is_quan_tri()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (phan_quyen = 'admin' or co_quyen_quan_ly_lop)
  );
$$;

-- Dùng ở Giai đoạn 5: đánh dấu tự duyệt (người duyệt = người được duyệt)
create function public.la_tu_duyet(p_nguoi_duyet uuid, p_nguoi_duoc_duyet uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_nguoi_duyet is not null and p_nguoi_duyet = p_nguoi_duoc_duyet;
$$;

-- ============ Bảng nhóm: tách riêng khỏi profiles để ẩn ở tầng database ============
-- RLS chỉ lọc theo hàng, không lọc theo cột, nên nhãn nhóm nằm ở bảng riêng
-- mà chỉ người quản trị đọc được. Logic hệ thống (percentile, matching) đọc qua hàm security definer.
create table public.nhan_su_nhom (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  nhom public.nhom_nhan_su not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

-- Đồng bộ vai trò (Giảng viên/Trợ giảng) sang profiles — công khai vì hiển nhiên
create function public.sync_vai_tro_giang_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set vai_tro_giang_day = null where id = old.user_id;
    return old;
  end if;

  update public.profiles
  set vai_tro_giang_day = case
    when new.nhom in ('ban_giam_doc', 'gv_bac_si', 'gv_khong_bac_si')
      then 'giang_vien'::public.vai_tro_giang_day
    else 'tro_giang'::public.vai_tro_giang_day
  end
  where id = new.user_id;
  return new;
end;
$$;

create trigger nhan_su_nhom_sync_vai_tro
  after insert or update of nhom or delete on public.nhan_su_nhom
  for each row execute function public.sync_vai_tro_giang_day();

revoke execute on function public.sync_vai_tro_giang_day() from public, anon, authenticated;

-- ============ Quyền truy cập bảng (mặc định Supabase cấp rộng, thu hồi rồi cấp lại tối thiểu) ============
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.nhan_su_nhom from anon, authenticated;

grant select on public.profiles to authenticated;
-- Chỉ được sửa các cột thông tin cá nhân; phan_quyen / co_quyen_quan_ly_lop / vai_tro
-- chỉ đổi được qua các hàm bên dưới (chặn tự nâng quyền)
grant update (ho_ten, so_dien_thoai, avatar_url) on public.profiles to authenticated;
grant select on public.nhan_su_nhom to authenticated;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.nhan_su_nhom enable row level security;

-- Hồ sơ công khai toàn bộ trong nội bộ
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

-- Sửa được hồ sơ của chính mình; người quản trị sửa được hồ sơ người khác
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_quan_tri())
  with check (id = (select auth.uid()) or public.is_quan_tri());

-- Nhãn nhóm: chỉ Admin/Quản lý lớp đọc được. GV/TG không thấy kể cả của chính mình.
create policy nhan_su_nhom_select on public.nhan_su_nhom
  for select to authenticated
  using (public.is_quan_tri());

-- ============ Hàm thay đổi dữ liệu nhạy cảm ============
-- TODO Giai đoạn 9: ghi audit_log (giá trị trước/sau) trong từng hàm dưới đây
-- TODO Giai đoạn 8: gửi thông báo cho người được gán/thu hồi Quyền Quản lý lớp

create function public.dat_nhom(p_user uuid, p_nhom public.nhom_nhan_su)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền đặt nhóm' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;

  insert into public.nhan_su_nhom (user_id, nhom, updated_by)
  values (p_user, p_nhom, (select auth.uid()))
  on conflict (user_id) do update
    set nhom = excluded.nhom, updated_at = now(), updated_by = excluded.updated_by;
end;
$$;

create function public.gan_quyen_quan_ly_lop(p_user uuid, p_co boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Chỉ Admin gốc được gán/thu hồi (không cho người giữ Quyền Quản lý lớp tự gán tiếp)
  if not public.is_admin() then
    raise exception 'Chỉ Admin được gán/thu hồi Quyền Quản lý lớp' using errcode = '42501';
  end if;

  update public.profiles set co_quyen_quan_ly_lop = p_co where id = p_user;
  if not found then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;
end;
$$;

create function public.dat_phan_quyen(p_user uuid, p_phan_quyen public.phan_quyen_he_thong)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được đổi phân quyền' using errcode = '42501';
  end if;

  -- Không để hệ thống mất Admin cuối cùng
  if p_phan_quyen <> 'admin'
     and exists (select 1 from public.profiles where id = p_user and phan_quyen = 'admin')
     and (select count(*) from public.profiles where phan_quyen = 'admin') <= 1 then
    raise exception 'Không thể hạ quyền Admin cuối cùng' using errcode = '23514';
  end if;

  update public.profiles set phan_quyen = p_phan_quyen where id = p_user;
  if not found then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;
end;
$$;

-- Chỉ user đã đăng nhập mới gọi được các hàm này
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_quan_tri() from public, anon;
revoke execute on function public.la_tu_duyet(uuid, uuid) from public, anon;
revoke execute on function public.dat_nhom(uuid, public.nhom_nhan_su) from public, anon;
revoke execute on function public.gan_quyen_quan_ly_lop(uuid, boolean) from public, anon;
revoke execute on function public.dat_phan_quyen(uuid, public.phan_quyen_he_thong) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_quan_tri() to authenticated;
grant execute on function public.la_tu_duyet(uuid, uuid) to authenticated;
grant execute on function public.dat_nhom(uuid, public.nhom_nhan_su) to authenticated;
grant execute on function public.gan_quyen_quan_ly_lop(uuid, boolean) to authenticated;
grant execute on function public.dat_phan_quyen(uuid, public.phan_quyen_he_thong) to authenticated;
