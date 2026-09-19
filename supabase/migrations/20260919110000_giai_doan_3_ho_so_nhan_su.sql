-- Giai đoạn 3: Module Nhân sự — hồ sơ mở rộng, danh mục, chứng chỉ, lịch sử đổi nhóm, đề xuất nhân sự
-- Tham chiếu CLAUDE.md mục 3, 4.1, 4.8, 4.7 (ẩn nhãn nhóm)

-- ============ Enum ============
create type public.trang_thai_tham_gia as enum ('dang_tham_gia', 'tam_ngung', 'khong_con_tham_gia');
create type public.loai_de_xuat as enum ('phan_cong', 'dao_tao', 'khen_thuong_nhac_nho', 'doi_nhom');
create type public.trang_thai_de_xuat as enum ('cho_duyet', 'da_duyet', 'bo_qua');

-- ============ Hồ sơ: trạng thái tham gia + kinh nghiệm ============
-- Trạng thái tham gia giảng dạy KHÔNG phải trạng thái lao động/hợp đồng (mục 4.1).
-- Khi khác "dang_tham_gia": ẩn khỏi đăng ký slot mới + matching-score (áp dụng ở Giai đoạn 5),
-- nhưng giữ nguyên lịch sử KPI/hồ sơ.
alter table public.profiles
  add column trang_thai_tham_gia public.trang_thai_tham_gia not null default 'dang_tham_gia',
  add column kinh_nghiem text;

-- Người dùng tự sửa được kinh nghiệm của mình; trạng thái tham gia chỉ đổi qua hàm (chỉ người quản trị)
grant update (kinh_nghiem) on public.profiles to authenticated;

-- ============ Danh mục cấu hình (mục 4.8) ============
create table public.danh_muc_chuyen_mon (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  thu_tu int not null default 0,
  dang_dung boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index danh_muc_chuyen_mon_ten_uq on public.danh_muc_chuyen_mon (lower(ten));

create table public.danh_muc_loai_chung_chi (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  thu_tu int not null default 0,
  dang_dung boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index danh_muc_loai_chung_chi_ten_uq on public.danh_muc_loai_chung_chi (lower(ten));

-- Dữ liệu khởi điểm MẪU — Admin sửa/thêm/tắt được trong Cấu hình hệ thống > Danh mục
insert into public.danh_muc_chuyen_mon (ten, thu_tu) values
  ('Bác sĩ', 1), ('Điều dưỡng', 2), ('Kỹ thuật viên', 3),
  ('Cử nhân', 4), ('Thạc sĩ', 5), ('Tiến sĩ', 6)
on conflict do nothing;

insert into public.danh_muc_loai_chung_chi (ten, thu_tu) values
  ('Chứng chỉ hành nghề', 1), ('ACLS', 2), ('BLS', 3), ('Chứng chỉ giảng viên', 4)
on conflict do nothing;

-- ============ Chuyên môn của từng người (nhiều-nhiều) ============
create table public.profile_chuyen_mon (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chuyen_mon_id uuid not null references public.danh_muc_chuyen_mon (id) on delete restrict,
  chi_tiet text,
  primary key (user_id, chuyen_mon_id)
);

-- ============ Chứng chỉ ============
-- Không đưa vào công thức KPI; dùng làm điều kiện đăng ký lớp + ưu tiên matching (mục 4.1)
create table public.chung_chi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  loai_id uuid not null references public.danh_muc_loai_chung_chi (id) on delete restrict,
  so_chung_chi text,
  noi_dung text,
  ngay_cap date,
  noi_cap text,
  hinh_anh_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chung_chi_user_id_idx on public.chung_chi (user_id);

create trigger chung_chi_set_updated_at
  before update on public.chung_chi
  for each row execute function public.set_updated_at();

-- ============ Lịch sử đổi nhóm (mục 3) — chứa nhãn nhóm nên chỉ người quản trị đọc ============
create table public.lich_su_doi_nhom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nhom_cu public.nhom_nhan_su,
  nhom_moi public.nhom_nhan_su not null,
  ngay_hieu_luc date not null default current_date,
  nguoi_duyet uuid references auth.users (id) on delete set null,
  ly_do text,
  created_at timestamptz not null default now()
);
create index lich_su_doi_nhom_user_id_idx on public.lich_su_doi_nhom (user_id);

-- ============ Đề xuất nhân sự (mục 4.1) ============
-- Khung dữ liệu: nội dung được sinh dần ở các giai đoạn sau (đổi nhóm theo KPI ở Giai đoạn 6...).
create table public.de_xuat_nhan_su (
  id uuid primary key default gen_random_uuid(),
  loai public.loai_de_xuat not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  noi_dung text not null,
  trang_thai public.trang_thai_de_xuat not null default 'cho_duyet',
  nguoi_xu_ly uuid references auth.users (id) on delete set null,
  xu_ly_luc timestamptz,
  created_at timestamptz not null default now()
);
create index de_xuat_nhan_su_trang_thai_idx on public.de_xuat_nhan_su (trang_thai);

-- ============ Quyền truy cập bảng ============
revoke all on table public.danh_muc_chuyen_mon from anon, authenticated;
revoke all on table public.danh_muc_loai_chung_chi from anon, authenticated;
revoke all on table public.profile_chuyen_mon from anon, authenticated;
revoke all on table public.chung_chi from anon, authenticated;
revoke all on table public.lich_su_doi_nhom from anon, authenticated;
revoke all on table public.de_xuat_nhan_su from anon, authenticated;

grant select, insert, update on public.danh_muc_chuyen_mon to authenticated;
grant select, insert, update on public.danh_muc_loai_chung_chi to authenticated;
grant select, insert, update, delete on public.profile_chuyen_mon to authenticated;
grant select, insert, update, delete on public.chung_chi to authenticated;
grant select on public.lich_su_doi_nhom to authenticated;
grant select on public.de_xuat_nhan_su to authenticated;

-- ============ RLS ============
alter table public.danh_muc_chuyen_mon enable row level security;
alter table public.danh_muc_loai_chung_chi enable row level security;
alter table public.profile_chuyen_mon enable row level security;
alter table public.chung_chi enable row level security;
alter table public.lich_su_doi_nhom enable row level security;
alter table public.de_xuat_nhan_su enable row level security;

-- Danh mục: ai đăng nhập cũng đọc; chỉ người quản trị sửa
create policy dm_chuyen_mon_select on public.danh_muc_chuyen_mon for select to authenticated using (true);
create policy dm_chuyen_mon_insert on public.danh_muc_chuyen_mon for insert to authenticated with check (public.is_quan_tri());
create policy dm_chuyen_mon_update on public.danh_muc_chuyen_mon for update to authenticated
  using (public.is_quan_tri()) with check (public.is_quan_tri());

create policy dm_loai_cc_select on public.danh_muc_loai_chung_chi for select to authenticated using (true);
create policy dm_loai_cc_insert on public.danh_muc_loai_chung_chi for insert to authenticated with check (public.is_quan_tri());
create policy dm_loai_cc_update on public.danh_muc_loai_chung_chi for update to authenticated
  using (public.is_quan_tri()) with check (public.is_quan_tri());

-- Chuyên môn + chứng chỉ: công khai nội bộ; tự quản lý của mình, người quản trị quản lý của người khác
create policy pcm_select on public.profile_chuyen_mon for select to authenticated using (true);
create policy pcm_insert on public.profile_chuyen_mon for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_quan_tri());
create policy pcm_update on public.profile_chuyen_mon for update to authenticated
  using (user_id = (select auth.uid()) or public.is_quan_tri())
  with check (user_id = (select auth.uid()) or public.is_quan_tri());
create policy pcm_delete on public.profile_chuyen_mon for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_quan_tri());

create policy cc_select on public.chung_chi for select to authenticated using (true);
create policy cc_insert on public.chung_chi for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_quan_tri());
create policy cc_update on public.chung_chi for update to authenticated
  using (user_id = (select auth.uid()) or public.is_quan_tri())
  with check (user_id = (select auth.uid()) or public.is_quan_tri());
create policy cc_delete on public.chung_chi for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_quan_tri());

-- Lịch sử đổi nhóm + đề xuất nhân sự: chỉ người quản trị đọc
create policy lsdn_select on public.lich_su_doi_nhom for select to authenticated using (public.is_quan_tri());
create policy dxns_select on public.de_xuat_nhan_su for select to authenticated using (public.is_quan_tri());

-- ============ Storage: ảnh minh chứng chứng chỉ (bucket riêng tư) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chung-chi', 'chung-chi', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Đường dẫn file: <user_id>/<tên file> — chỉ chủ hồ sơ hoặc người quản trị ghi/xóa được
create policy chung_chi_files_select on storage.objects for select to authenticated
  using (bucket_id = 'chung-chi');
create policy chung_chi_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chung-chi'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_quan_tri())
  );
create policy chung_chi_files_update on storage.objects for update to authenticated
  using (
    bucket_id = 'chung-chi'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_quan_tri())
  );
create policy chung_chi_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chung-chi'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_quan_tri())
  );

-- ============ Hàm ============
-- TODO Giai đoạn 9: ghi audit_log trong các hàm dưới đây (đổi trạng thái tham gia, đổi nhóm, xử lý đề xuất)
-- TODO Giai đoạn 8: thông báo cho người liên quan

create function public.dat_trang_thai_tham_gia(p_user uuid, p_trang_thai public.trang_thai_tham_gia)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền đổi trạng thái tham gia' using errcode = '42501';
  end if;

  update public.profiles set trang_thai_tham_gia = p_trang_thai where id = p_user;
  if not found then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;
end;
$$;

-- Thay thế dat_nhom (Giai đoạn 1): ghi thêm lịch sử khi nhóm thực sự thay đổi.
-- Hiệu lực "từ kỳ đánh giá tiếp theo" sẽ xử lý ở Giai đoạn 6; hiện ngay_hieu_luc = hôm nay.
create or replace function public.dat_nhom(p_user uuid, p_nhom public.nhom_nhan_su)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cu public.nhom_nhan_su;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền đặt nhóm' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;

  select nhom into v_cu from public.nhan_su_nhom where user_id = p_user;
  if v_cu is not distinct from p_nhom then
    return; -- không đổi thì không ghi lịch sử
  end if;

  insert into public.nhan_su_nhom (user_id, nhom, updated_by)
  values (p_user, p_nhom, (select auth.uid()))
  on conflict (user_id) do update
    set nhom = excluded.nhom, updated_at = now(), updated_by = excluded.updated_by;

  insert into public.lich_su_doi_nhom (user_id, nhom_cu, nhom_moi, nguoi_duyet)
  values (p_user, v_cu, p_nhom, (select auth.uid()));
end;
$$;

-- Ghi nhận đề xuất thủ công (đề xuất tự động từ KPI sẽ do hệ thống sinh ở Giai đoạn 6)
create function public.tao_de_xuat(p_loai public.loai_de_xuat, p_user uuid, p_noi_dung text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền tạo đề xuất' using errcode = '42501';
  end if;
  if nullif(btrim(p_noi_dung), '') is null then
    raise exception 'Nội dung đề xuất không được để trống' using errcode = '23514';
  end if;

  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung)
  values (p_loai, p_user, btrim(p_noi_dung))
  returning id into v_id;
  return v_id;
end;
$$;

-- Duyệt / bỏ qua đề xuất. TODO Giai đoạn 6: nếu loai = 'doi_nhom' và duyệt thì áp dụng đổi nhóm (hiệu lực kỳ sau)
create function public.xu_ly_de_xuat(p_id uuid, p_duyet boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền xử lý đề xuất' using errcode = '42501';
  end if;

  update public.de_xuat_nhan_su
  set trang_thai = case when p_duyet then 'da_duyet'::public.trang_thai_de_xuat else 'bo_qua'::public.trang_thai_de_xuat end,
      nguoi_xu_ly = (select auth.uid()),
      xu_ly_luc = now()
  where id = p_id and trang_thai = 'cho_duyet';
  if not found then
    raise exception 'Đề xuất không tồn tại hoặc đã được xử lý' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.dat_trang_thai_tham_gia(uuid, public.trang_thai_tham_gia) from public, anon;
revoke execute on function public.dat_nhom(uuid, public.nhom_nhan_su) from public, anon;
revoke execute on function public.tao_de_xuat(public.loai_de_xuat, uuid, text) from public, anon;
revoke execute on function public.xu_ly_de_xuat(uuid, boolean) from public, anon;

grant execute on function public.dat_trang_thai_tham_gia(uuid, public.trang_thai_tham_gia) to authenticated;
grant execute on function public.dat_nhom(uuid, public.nhom_nhan_su) to authenticated;
grant execute on function public.tao_de_xuat(public.loai_de_xuat, uuid, text) to authenticated;
grant execute on function public.xu_ly_de_xuat(uuid, boolean) to authenticated;
