-- Giai đoạn 4: Module Lớp học — nhóm lớp (D1), lớp, Bài, slot theo vai trò, khảo sát C1, kết quả C1/C3
-- Tham chiếu CLAUDE.md mục 4.2, 4.8, 5 (D1), 4.7 (ẩn nhãn nhóm nhân sự)
--
-- Quyết định thiết kế:
--  * Ghi dữ liệu lớp/Bài/slot chỉ qua hàm SECURITY DEFINER (kiểm tra is_quan_tri) — bảng không cấp INSERT/UPDATE/DELETE.
--  * "Nhóm đủ điều kiện đăng ký" tách bảng riêng, chỉ người quản trị đọc (cùng cách ẩn nhãn nhóm như nhan_su_nhom).
--  * Slot = 1 hàng cho mỗi vị trí (Bài + vai trò + vị trí). Việc đăng ký/mời/duyệt để Giai đoạn 5 xử lý;
--    ở đây slot chỉ có trạng thái + người được phân công.
--  * "Đã đủ đăng ký" và "Đang diễn ra" là trạng thái SUY RA trong view lop_hoc_tong_hop, không lưu.
--  * Loại kinh phí là enum (có/không) vì A4, D2 rẽ nhánh theo giá trị này (mục 4.2).

-- ============ Enum ============
create type public.doi_tuong_lop as enum ('nhan_vien_y_te', 'cong_dong');
create type public.loai_kinh_phi as enum ('co_kinh_phi', 'khong_kinh_phi');
-- Nháp -> Đang mở đăng ký -> Đã hoàn thành / Đã hủy (Đã đủ đăng ký, Đang diễn ra: suy ra trong view)
create type public.trang_thai_lop as enum ('nhap', 'dang_mo', 'da_hoan_thanh', 'da_huy');
create type public.trang_thai_slot as enum ('trong', 'cho_duyet', 'da_phan_cong');
create type public.nguon_c1 as enum ('khao_sat', 'nhap_tay');

-- ============ Danh mục nhóm lớp (kèm hệ số D1) ============
create table public.danh_muc_nhom_lop (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  he_so_d1 numeric(4, 2) not null default 1.00 check (he_so_d1 > 0 and he_so_d1 <= 9.99),
  thu_tu int not null default 0,
  dang_dung boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index danh_muc_nhom_lop_ten_uq on public.danh_muc_nhom_lop (lower(ten));

-- Dữ liệu khởi điểm MẪU (hệ số D1 = 1.00, Admin chỉnh trong Cấu hình hệ thống > Danh mục)
insert into public.danh_muc_nhom_lop (ten, thu_tu) values
  ('ABCDE', 1), ('ACLS', 2), ('BLS', 3), ('SCC-LX', 4), ('SCC-CĐ', 5)
on conflict do nothing;

-- ============ Lớp học ============
create table public.lop_hoc (
  id uuid primary key default gen_random_uuid(),
  ten text not null check (btrim(ten) <> ''),
  nhom_lop_id uuid not null references public.danh_muc_nhom_lop (id) on delete restrict,
  doi_tuong public.doi_tuong_lop not null,
  loai_kinh_phi public.loai_kinh_phi not null,
  ngay_bat_dau date not null,
  ngay_ket_thuc date not null,
  dia_diem text,
  trang_thai public.trang_thai_lop not null default 'nhap',
  -- Cho phép GV/TG thấy lớp đang ở trạng thái Nháp để chủ động sắp xếp lịch (mục 4.3)
  cong_khai_som boolean not null default false,
  -- Kết quả sau khi hoàn thành (mục 4.2): C1 ghi bởi khảo sát hoặc nhập tay (cái sau cùng thắng), C3 nhập tay
  c1_phan_tram numeric(5, 2) check (c1_phan_tram between 0 and 100),
  c1_nguon public.nguon_c1,
  c3_phan_tram numeric(5, 2) check (c3_phan_tram between 0 and 100),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ngay_ket_thuc >= ngay_bat_dau),
  check ((c1_phan_tram is null) = (c1_nguon is null))
);
create index lop_hoc_nhom_lop_idx on public.lop_hoc (nhom_lop_id);
create index lop_hoc_trang_thai_idx on public.lop_hoc (trang_thai);

create trigger lop_hoc_set_updated_at
  before update on public.lop_hoc
  for each row execute function public.set_updated_at();

-- Nhóm nhân sự đủ điều kiện đăng ký lớp (mục 4.2) — chứa nhãn nhóm nên chỉ người quản trị đọc
create table public.lop_hoc_nhom_du_dieu_kien (
  lop_id uuid not null references public.lop_hoc (id) on delete cascade,
  nhom public.nhom_nhan_su not null,
  primary key (lop_id, nhom)
);

-- Chứng chỉ yêu cầu thêm (lọc thêm bên trong nhóm đủ điều kiện)
create table public.lop_hoc_chung_chi_yeu_cau (
  lop_id uuid not null references public.lop_hoc (id) on delete cascade,
  loai_id uuid not null references public.danh_muc_loai_chung_chi (id) on delete restrict,
  primary key (lop_id, loai_id)
);

-- ============ Bài (buổi học) và slot ============
create table public.bai_hoc (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop_hoc (id) on delete cascade,
  thu_tu int not null default 1,
  ten text not null check (btrim(ten) <> ''),
  bat_dau timestamptz not null,
  ket_thuc timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ket_thuc > bat_dau)
);
create index bai_hoc_lop_id_idx on public.bai_hoc (lop_id);

create trigger bai_hoc_set_updated_at
  before update on public.bai_hoc
  for each row execute function public.set_updated_at();

-- 1 slot = 1 vị trí cần lấp (1 Bài + 1 vai trò + 1 vị trí thứ mấy). Đăng ký/mời/duyệt: Giai đoạn 5.
create table public.slot_giang_day (
  id uuid primary key default gen_random_uuid(),
  bai_id uuid not null references public.bai_hoc (id) on delete cascade,
  vai_tro public.vai_tro_giang_day not null,
  vi_tri int not null check (vi_tri >= 1),
  trang_thai public.trang_thai_slot not null default 'trong',
  -- restrict: người đang có phân công không bị xóa khỏi hệ thống (đổi trạng thái tham gia thay vì xóa)
  nguoi_phan_cong uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bai_id, vai_tro, vi_tri),
  check ((trang_thai = 'da_phan_cong') = (nguoi_phan_cong is not null))
);
create index slot_giang_day_nguoi_idx on public.slot_giang_day (nguoi_phan_cong);
-- 1 người không giữ 2 slot trong cùng 1 Bài (đồng thời là 2 việc cùng giờ)
create unique index slot_giang_day_bai_nguoi_uq on public.slot_giang_day (bai_id, nguoi_phan_cong)
  where nguoi_phan_cong is not null;

create trigger slot_giang_day_set_updated_at
  before update on public.slot_giang_day
  for each row execute function public.set_updated_at();

-- ============ Khảo sát hài lòng C1 (link công khai, ẩn danh) ============
-- Token chỉ người quản trị đọc; người điền dùng hàm gui_khao_sat bên dưới (không cần đăng nhập)
create table public.lop_hoc_khao_sat (
  lop_id uuid primary key references public.lop_hoc (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  mo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.khao_sat_phan_hoi (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop_hoc (id) on delete cascade,
  diem_tong_the smallint not null check (diem_tong_the between 1 and 5),
  diem_giang_day smallint not null check (diem_giang_day between 1 and 5),
  nhan_xet text check (char_length(nhan_xet) <= 1000),
  created_at timestamptz not null default now()
);
create index khao_sat_phan_hoi_lop_idx on public.khao_sat_phan_hoi (lop_id);

-- ============ Quyền truy cập bảng ============
revoke all on table public.danh_muc_nhom_lop from anon, authenticated;
revoke all on table public.lop_hoc from anon, authenticated;
revoke all on table public.lop_hoc_nhom_du_dieu_kien from anon, authenticated;
revoke all on table public.lop_hoc_chung_chi_yeu_cau from anon, authenticated;
revoke all on table public.bai_hoc from anon, authenticated;
revoke all on table public.slot_giang_day from anon, authenticated;
revoke all on table public.lop_hoc_khao_sat from anon, authenticated;
revoke all on table public.khao_sat_phan_hoi from anon, authenticated;

grant select, insert, update on public.danh_muc_nhom_lop to authenticated;
grant select on public.lop_hoc to authenticated;
grant select on public.lop_hoc_nhom_du_dieu_kien to authenticated;
grant select on public.lop_hoc_chung_chi_yeu_cau to authenticated;
grant select on public.bai_hoc to authenticated;
grant select on public.slot_giang_day to authenticated;
grant select on public.lop_hoc_khao_sat to authenticated;
grant select on public.khao_sat_phan_hoi to authenticated;

-- ============ RLS ============
alter table public.danh_muc_nhom_lop enable row level security;
alter table public.lop_hoc enable row level security;
alter table public.lop_hoc_nhom_du_dieu_kien enable row level security;
alter table public.lop_hoc_chung_chi_yeu_cau enable row level security;
alter table public.bai_hoc enable row level security;
alter table public.slot_giang_day enable row level security;
alter table public.lop_hoc_khao_sat enable row level security;
alter table public.khao_sat_phan_hoi enable row level security;

create policy dm_nhom_lop_select on public.danh_muc_nhom_lop for select to authenticated using (true);
create policy dm_nhom_lop_insert on public.danh_muc_nhom_lop for insert to authenticated with check (public.is_quan_tri());
create policy dm_nhom_lop_update on public.danh_muc_nhom_lop for update to authenticated
  using (public.is_quan_tri()) with check (public.is_quan_tri());

-- Lớp: người quản trị thấy tất cả; GV/TG không thấy lớp Nháp trừ khi được công khai sớm
create policy lop_hoc_select on public.lop_hoc for select to authenticated
  using (public.is_quan_tri() or trang_thai <> 'nhap' or cong_khai_som);

-- Nhãn nhóm đủ điều kiện: chỉ người quản trị
create policy lop_nhom_dk_select on public.lop_hoc_nhom_du_dieu_kien for select to authenticated
  using (public.is_quan_tri());

-- Bảng con theo quyền nhìn thấy lớp cha (RLS của lop_hoc vẫn áp dụng bên trong exists)
create policy lop_cc_yeu_cau_select on public.lop_hoc_chung_chi_yeu_cau for select to authenticated
  using (exists (select 1 from public.lop_hoc l where l.id = lop_id));
create policy bai_hoc_select on public.bai_hoc for select to authenticated
  using (exists (select 1 from public.lop_hoc l where l.id = lop_id));
create policy slot_select on public.slot_giang_day for select to authenticated
  using (exists (select 1 from public.bai_hoc b where b.id = bai_id));

create policy khao_sat_select on public.lop_hoc_khao_sat for select to authenticated using (public.is_quan_tri());
create policy khao_sat_phan_hoi_select on public.khao_sat_phan_hoi for select to authenticated using (public.is_quan_tri());

-- ============ View tổng hợp tiến độ (security_invoker: RLS của người xem vẫn áp dụng) ============
-- gv_* / tg_*: tổng số slot, số slot đã phân công ("X/Y lượt phân công"), số nhân sự khác nhau ("Z nhân sự"),
-- và tên người nếu toàn bộ slot của vai trò do đúng 1 người đảm nhiệm (auto-collapse, mục 4.2).
create view public.lop_hoc_tong_hop with (security_invoker = true) as
select
  l.*,
  n.ten as nhom_lop_ten,
  n.he_so_d1,
  coalesce(t.so_bai, 0) as so_bai,
  coalesce(t.gv_tong, 0) as gv_tong,
  coalesce(t.gv_da_phan_cong, 0) as gv_da_phan_cong,
  coalesce(t.gv_nhan_su, 0) as gv_nhan_su,
  t.gv_ten_duy_nhat,
  coalesce(t.tg_tong, 0) as tg_tong,
  coalesce(t.tg_da_phan_cong, 0) as tg_da_phan_cong,
  coalesce(t.tg_nhan_su, 0) as tg_nhan_su,
  t.tg_ten_duy_nhat,
  case
    when l.trang_thai = 'dang_mo' and (now() at time zone 'Asia/Ho_Chi_Minh')::date >= l.ngay_bat_dau
      then 'dang_dien_ra'
    when l.trang_thai = 'dang_mo' and coalesce(t.tong, 0) > 0 and t.tong = t.da_phan_cong
      then 'da_du_dang_ky'
    else l.trang_thai::text
  end as trang_thai_hien_thi
from public.lop_hoc l
join public.danh_muc_nhom_lop n on n.id = l.nhom_lop_id
left join lateral (
  select
    count(distinct b.id) as so_bai,
    count(s.id) as tong,
    count(s.id) filter (where s.trang_thai = 'da_phan_cong') as da_phan_cong,
    count(s.id) filter (where s.vai_tro = 'giang_vien') as gv_tong,
    count(s.id) filter (where s.vai_tro = 'giang_vien' and s.trang_thai = 'da_phan_cong') as gv_da_phan_cong,
    count(distinct s.nguoi_phan_cong) filter (where s.vai_tro = 'giang_vien') as gv_nhan_su,
    case when count(distinct s.nguoi_phan_cong) filter (where s.vai_tro = 'giang_vien') = 1
         then min(p.ho_ten) filter (where s.vai_tro = 'giang_vien') end as gv_ten_duy_nhat,
    count(s.id) filter (where s.vai_tro = 'tro_giang') as tg_tong,
    count(s.id) filter (where s.vai_tro = 'tro_giang' and s.trang_thai = 'da_phan_cong') as tg_da_phan_cong,
    count(distinct s.nguoi_phan_cong) filter (where s.vai_tro = 'tro_giang') as tg_nhan_su,
    case when count(distinct s.nguoi_phan_cong) filter (where s.vai_tro = 'tro_giang') = 1
         then min(p.ho_ten) filter (where s.vai_tro = 'tro_giang') end as tg_ten_duy_nhat
  from public.bai_hoc b
  left join public.slot_giang_day s on s.bai_id = b.id
  left join public.profiles p on p.id = s.nguoi_phan_cong
  where b.lop_id = l.id
) t on true;

revoke all on table public.lop_hoc_tong_hop from anon, authenticated;
grant select on public.lop_hoc_tong_hop to authenticated;

-- ============ Hàm ghi dữ liệu (chỉ người quản trị) ============
-- TODO Giai đoạn 8: sửa/hủy lớp hoặc đổi giờ Bài đã có người được phân công -> bắt buộc gửi thông báo
-- TODO Giai đoạn 9: ghi audit_log (giá trị trước/sau) trong các hàm dưới đây

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
  p_chung_chi uuid[]
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
  if coalesce(cardinality(p_chung_chi), 0) > 0 then
    insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, loai_id)
    select distinct v_id, c from unnest(p_chung_chi) as c;
  end if;

  return v_id;
end;
$$;

-- Nội bộ: đồng bộ số slot của 1 vai trò trong 1 Bài. Tăng = thêm slot trống; giảm = chỉ xóa được slot còn trống.
create function public.dong_bo_slot_bai(p_bai uuid, p_vai_tro public.vai_tro_giang_day, p_so int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hien_co int;
begin
  select coalesce(max(vi_tri), 0) into v_hien_co
  from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro;

  if p_so > v_hien_co then
    insert into public.slot_giang_day (bai_id, vai_tro, vi_tri)
    select p_bai, p_vai_tro, g from generate_series(v_hien_co + 1, p_so) as g;
  elsif p_so < v_hien_co then
    if exists (
      select 1 from public.slot_giang_day
      where bai_id = p_bai and vai_tro = p_vai_tro and vi_tri > p_so and trang_thai <> 'trong'
    ) then
      raise exception 'Không giảm được số slot: có slot đã được đăng ký hoặc phân công người' using errcode = '55000';
    end if;
    delete from public.slot_giang_day where bai_id = p_bai and vai_tro = p_vai_tro and vi_tri > p_so;
  end if;
end;
$$;

create function public.luu_bai_hoc(
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
begin
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
  end if;

  perform public.dong_bo_slot_bai(v_id, 'giang_vien', p_so_gv);
  perform public.dong_bo_slot_bai(v_id, 'tro_giang', p_so_tg);
  return v_id;
end;
$$;

create function public.xoa_bai_hoc(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop uuid;
  v_tt public.trang_thai_lop;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  select lop_id into v_lop from public.bai_hoc where id = p_id;
  if not found then
    raise exception 'Không tìm thấy Bài' using errcode = 'P0002';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = v_lop;
  if v_tt not in ('nhap', 'dang_mo') then
    raise exception 'Lớp đã hoàn thành hoặc đã hủy, không xóa Bài được' using errcode = '55000';
  end if;
  if exists (select 1 from public.slot_giang_day where bai_id = p_id and trang_thai <> 'trong') then
    raise exception 'Bài đã có người đăng ký hoặc được phân công, không xóa được' using errcode = '55000';
  end if;
  delete from public.bai_hoc where id = p_id;
end;
$$;

-- Chuyển trạng thái lớp. Nháp -> Đang mở (cần >=1 Bài) | Đang mở -> Nháp (chưa slot nào có người) |
-- Đang mở -> Đã hoàn thành | Nháp/Đang mở -> Đã hủy
create function public.doi_trang_thai_lop(p_lop uuid, p_trang_thai public.trang_thai_lop)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
begin
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
end;
$$;

-- Chỉ xóa được lớp còn Nháp (lớp đã mở thì hủy để giữ lịch sử)
create function public.xoa_lop_hoc(p_lop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý lớp học' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt <> 'nhap' then
    raise exception 'Chỉ xóa được lớp đang ở trạng thái Nháp; lớp đã mở thì hãy hủy lớp' using errcode = '55000';
  end if;
  delete from public.lop_hoc where id = p_lop;
end;
$$;

-- C1 nhập tay (hình thức 2) — ghi đè giá trị hiện tại; null = xóa. C1/C3 chỉ nhập sau khi lớp Đã hoàn thành.
create function public.dat_c1_thu_cong(p_lop uuid, p_phan_tram numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền nhập kết quả lớp' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt <> 'da_hoan_thanh' then
    raise exception 'Chỉ nhập C1 sau khi lớp đã hoàn thành' using errcode = '55000';
  end if;
  if p_phan_tram is not null and (p_phan_tram < 0 or p_phan_tram > 100) then
    raise exception 'Giá trị phải từ 0 đến 100' using errcode = '23514';
  end if;

  update public.lop_hoc
  set c1_phan_tram = p_phan_tram,
      c1_nguon = case when p_phan_tram is null then null else 'nhap_tay'::public.nguon_c1 end
  where id = p_lop;
end;
$$;

create function public.dat_c3(p_lop uuid, p_phan_tram numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền nhập kết quả lớp' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt <> 'da_hoan_thanh' then
    raise exception 'Chỉ nhập C3 sau khi lớp đã hoàn thành' using errcode = '55000';
  end if;
  if p_phan_tram is not null and (p_phan_tram < 0 or p_phan_tram > 100) then
    raise exception 'Giá trị phải từ 0 đến 100' using errcode = '23514';
  end if;

  update public.lop_hoc set c3_phan_tram = p_phan_tram where id = p_lop;
end;
$$;

-- Bật/tắt link khảo sát (tạo token lần đầu). Trả về token để dựng URL.
create function public.bat_tat_khao_sat(p_lop uuid, p_mo boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_lop;
  v_token uuid;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý khảo sát' using errcode = '42501';
  end if;
  select trang_thai into v_tt from public.lop_hoc where id = p_lop;
  if not found then
    raise exception 'Không tìm thấy lớp' using errcode = 'P0002';
  end if;
  if v_tt <> 'da_hoan_thanh' then
    raise exception 'Chỉ tạo khảo sát sau khi lớp đã hoàn thành' using errcode = '55000';
  end if;

  insert into public.lop_hoc_khao_sat (lop_id, mo) values (p_lop, coalesce(p_mo, true))
  on conflict (lop_id) do update set mo = excluded.mo
  returning token into v_token;
  return v_token;
end;
$$;

-- ============ Hàm công khai cho trang khảo sát (không cần đăng nhập) ============
create function public.lay_khao_sat(p_token uuid)
returns table (ten_lop text, dang_mo boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.ten, (k.mo and l.trang_thai = 'da_hoan_thanh')
  from public.lop_hoc_khao_sat k
  join public.lop_hoc l on l.id = k.lop_id
  where k.token = p_token;
$$;

-- Ghi 1 phản hồi rồi tính lại C1 = trung bình mọi điểm quy về %. Phản hồi mới ghi đè C1 nhập tay (cái sau cùng thắng).
create function public.gui_khao_sat(p_token uuid, p_diem_tong_the int, p_diem_giang_day int, p_nhan_xet text)
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

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.luu_lop_hoc(uuid, text, uuid, public.doi_tuong_lop, public.loai_kinh_phi, date, date, text, boolean, public.nhom_nhan_su[], uuid[]) from public, anon, authenticated;
revoke execute on function public.dong_bo_slot_bai(uuid, public.vai_tro_giang_day, int) from public, anon, authenticated;
revoke execute on function public.luu_bai_hoc(uuid, uuid, text, timestamptz, timestamptz, int, int) from public, anon, authenticated;
revoke execute on function public.xoa_bai_hoc(uuid) from public, anon, authenticated;
revoke execute on function public.doi_trang_thai_lop(uuid, public.trang_thai_lop) from public, anon, authenticated;
revoke execute on function public.xoa_lop_hoc(uuid) from public, anon, authenticated;
revoke execute on function public.dat_c1_thu_cong(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.dat_c3(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.bat_tat_khao_sat(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.lay_khao_sat(uuid) from public, anon, authenticated;
revoke execute on function public.gui_khao_sat(uuid, int, int, text) from public, anon, authenticated;

grant execute on function public.luu_lop_hoc(uuid, text, uuid, public.doi_tuong_lop, public.loai_kinh_phi, date, date, text, boolean, public.nhom_nhan_su[], uuid[]) to authenticated;
grant execute on function public.luu_bai_hoc(uuid, uuid, text, timestamptz, timestamptz, int, int) to authenticated;
grant execute on function public.xoa_bai_hoc(uuid) to authenticated;
grant execute on function public.doi_trang_thai_lop(uuid, public.trang_thai_lop) to authenticated;
grant execute on function public.xoa_lop_hoc(uuid) to authenticated;
grant execute on function public.dat_c1_thu_cong(uuid, numeric) to authenticated;
grant execute on function public.dat_c3(uuid, numeric) to authenticated;
grant execute on function public.bat_tat_khao_sat(uuid, boolean) to authenticated;
-- Trang khảo sát công khai: người điền không có tài khoản nên anon phải gọi được
grant execute on function public.lay_khao_sat(uuid) to anon, authenticated;
grant execute on function public.gui_khao_sat(uuid, int, int, text) to anon, authenticated;
