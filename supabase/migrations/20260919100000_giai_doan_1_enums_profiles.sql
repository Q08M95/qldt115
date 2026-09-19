-- Giai đoạn 1 / File 1: enum + bảng profiles + trigger tạo profile khi có user mới
-- Tham chiếu CLAUDE.md mục 3 (Người dùng & vai trò)

-- Phân quyền hệ thống. "Quyền Quản lý lớp" là cờ riêng (co_quyen_quan_ly_lop), không phải giá trị enum.
create type public.phan_quyen_he_thong as enum ('admin', 'giang_day');

-- 5 nhóm nhân sự (cố định, mỗi người đúng 1 nhóm)
create type public.nhom_nhan_su as enum (
  'ban_giam_doc',
  'gv_bac_si',
  'gv_khong_bac_si',
  'tg_bac_si',
  'tg_khong_bac_si'
);

-- Vai trò trong lớp — công khai vì hiển nhiên (khác với nhãn nhóm)
create type public.vai_tro_giang_day as enum ('giang_vien', 'tro_giang');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  ho_ten text not null,
  so_dien_thoai text,
  avatar_url text,
  phan_quyen public.phan_quyen_he_thong not null default 'giang_day',
  co_quyen_quan_ly_lop boolean not null default false,
  -- Suy ra từ nhóm bởi trigger (nhan_su_nhom), không sửa tay
  vai_tro_giang_day public.vai_tro_giang_day,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Tự tạo profile khi có user mới trong Supabase Auth
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, ho_ten)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'ho_ten', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tạo profile cho các user đã tồn tại trước migration này (vd tài khoản test)
insert into public.profiles (id, email, ho_ten)
select id, coalesce(email, ''), split_part(coalesce(email, ''), '@', 1)
from auth.users
on conflict (id) do nothing;
