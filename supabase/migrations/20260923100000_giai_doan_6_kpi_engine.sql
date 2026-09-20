-- Giai đoạn 6: Hệ thống KPI — cấu hình + engine tính điểm + kỳ đánh giá + snapshot (CLAUDE.md mục 5/6/7).
--
-- Nguyên tắc: công thức là DỮ LIỆU CẤU HÌNH, không viết cứng:
--   nhom_tieu_chi (A/B/C + trọng số trong công thức tổng) / tieu_chi_con (A1..C3 + trọng số trong nhóm, Bật/Tắt) / he_so_do_kho (D2, D3).
--   D1 nằm ở danh_muc_nhom_lop. Engine tinh_kpi() nhận cấu hình dạng jsonb (cau_hinh_kpi_hien_tai() dựng từ các bảng trên),
--   nên đóng kỳ chỉ cần lưu jsonb đó làm snapshot — kỳ đã đóng không bao giờ tính lại theo cấu hình mới (không hồi tố).
-- Trọng số động: mọi cấp (tiêu chí trong nhóm, nhóm trong KPI) đều chia lại trọng số cho phần có dữ liệu.
-- "Đã dạy" = slot đã phân công của Bài đã kết thúc (ket_thuc <= now), Bài thuộc kỳ theo NGÀY BẮT ĐẦU của Bài (giờ Việt Nam)
--   => lớp dạy xuyên 2 kỳ được tính theo từng buổi, không theo ngày bắt đầu lớp.

-- ============ Cấu hình KPI ============
create table public.nhom_tieu_chi (
  ma text primary key check (ma ~ '^[A-Z]$'),
  ten text not null,
  trong_so numeric(5, 2) not null check (trong_so between 0 and 100),
  thu_tu int not null default 0
);

create table public.tieu_chi_con (
  ma text primary key,
  nhom text not null references public.nhom_tieu_chi (ma) on update cascade on delete restrict,
  ten text not null,
  nguon text not null,
  don_vi text not null,
  trong_so numeric(5, 2) not null default 0 check (trong_so between 0 and 100),
  bat boolean not null default true,
  -- false: chỉ lưu/hiển thị, KHÔNG nằm trong công thức KPI (A4 — mục 6)
  tinh_vao_kpi boolean not null default true,
  thu_tu int not null default 0
);

create table public.he_so_do_kho (
  ma text primary key,
  ten text not null,
  gia_tri numeric(4, 2) not null check (gia_tri > 0 and gia_tri <= 9.99)
);

insert into public.nhom_tieu_chi (ma, ten, trong_so, thu_tu) values
  ('B', 'Chuyên cần', 30, 1),
  ('C', 'Chất lượng chuyên môn', 45, 2),
  ('A', 'Sản lượng giảng dạy', 25, 3);

insert into public.tieu_chi_con (ma, nhom, ten, nguon, don_vi, trong_so, bat, tinh_vao_kpi, thu_tu) values
  ('B1', 'B', 'Điểm danh có mặt đúng giờ', 'Check-in tại Bài (Giai đoạn 7)', '%', 100, true, true, 1),
  ('C2', 'C', 'Dự giờ/đánh giá của Quản lý đào tạo', 'Quản lý đào tạo chấm theo rubric', '%', 40, true, true, 2),
  ('C3', 'C', 'Tỷ lệ học viên đạt chuẩn đầu ra', 'Nhập tay ở hồ sơ lớp', '%', 35, true, true, 3),
  ('C1', 'C', 'Khảo sát hài lòng học viên', 'Link khảo sát hoặc nhập tay ở hồ sơ lớp', '%', 25, true, true, 4),
  ('A1', 'A', 'Số giờ đã dạy trong kỳ', 'Slot đã phân công của các Bài đã kết thúc', 'giờ → percentile', 50, true, true, 5),
  ('A2', 'A', 'Tỷ lệ tự đăng ký slot trống', 'Đăng ký chủ động được duyệt ÷ tổng Bài đã dạy', '%', 25, true, true, 6),
  ('A3', 'A', 'Tỷ lệ nhận khi được mời', 'Lời mời được đồng ý ÷ lời mời đã phản hồi', '%', 25, true, true, 7),
  ('A4', 'A', 'Số lớp không kinh phí đã nhận', 'Đếm lớp không kinh phí (tính 1 lần/lớp)', 'lớp', 0, true, false, 8);

insert into public.he_so_do_kho (ma, ten, gia_tri) values
  ('D2', 'Hệ số bảo vệ lớp không kinh phí (lấy max với D1)', 1.10),
  ('D3_GV', 'Hệ số vai trò — Giảng viên', 1.10),
  ('D3_TG', 'Hệ số vai trò — Trợ giảng', 1.00);

-- Tham số khác của KPI (bảng cấu hình chung của Giai đoạn 5)
insert into public.cau_hinh_he_thong (khoa, gia_tri, mo_ta) values
  ('kpi_min_nhom_percentile', 5, 'Số người tối thiểu trong 1 nhóm để dùng percentile A1; dưới ngưỡng này so với lịch sử của chính người đó'),
  ('kpi_so_ky_fallback', 3, 'Số kỳ đã đóng gần nhất dùng để so sánh A1 khi nhóm quá nhỏ'),
  ('kpi_gop_c', 0, 'Cách gộp C1/C3 khi 1 người dạy nhiều lớp trong kỳ: 0 = trung bình đơn giản, 1 = trung bình có trọng số theo số Bài đã dạy mỗi lớp'),
  ('kpi_doi_nhom_x', 85, 'Ngưỡng KPI (điểm) để đề xuất thăng nhóm Trợ giảng → Giảng viên'),
  ('kpi_doi_nhom_y', 3, 'Số kỳ đã đóng liên tiếp phải đạt ngưỡng KPI để đề xuất thăng nhóm')
on conflict (khoa) do nothing;

-- ============ Kỳ đánh giá (mục 7) ============
create type public.trang_thai_ky as enum ('dang_mo', 'cho_duyet', 'da_dong');

create table public.ky_danh_gia (
  id uuid primary key default gen_random_uuid(),
  ten text not null check (btrim(ten) <> ''),
  tu date not null,
  den date not null,
  trang_thai public.trang_thai_ky not null default 'dang_mo',
  -- Bản chụp cấu hình đã dùng khi đóng kỳ (null khi chưa đóng)
  cau_hinh_snapshot jsonb,
  dong_luc timestamptz,
  dong_boi uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (den >= tu),
  -- Các kỳ không được chồng ngày nhau
  constraint ky_danh_gia_khong_chong exclude using gist (daterange(tu, den, '[]') with &&)
);

-- Kỳ chứa ngày hôm nay (giờ Việt Nam). Chưa cấu hình kỳ nào thì tạm dùng quý dương lịch để matching-score vẫn chạy.
create or replace function public.ky_hien_tai()
returns table (tu date, den date)
language sql
stable
set search_path = ''
as $$
  with h as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d),
  k as (
    select ky.tu as k_tu, ky.den as k_den from public.ky_danh_gia ky, h where h.d between ky.tu and ky.den limit 1
  )
  select k.k_tu, k.k_den from k
  union all
  select date_trunc('quarter', h.d)::date, (date_trunc('quarter', h.d) + interval '3 months' - interval '1 day')::date
  from h where not exists (select 1 from k);
$$;

-- Kỳ ứng với hôm nay (null nếu chưa cấu hình kỳ nào)
create function public.ky_hien_tai_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select ky.id from public.ky_danh_gia ky
  where (now() at time zone 'Asia/Ho_Chi_Minh')::date between ky.tu and ky.den
  limit 1;
$$;

-- Kỳ khởi điểm: quý hiện tại
insert into public.ky_danh_gia (ten, tu, den)
select 'Quý ' || extract(quarter from x.d)::int || '/' || extract(year from x.d)::int,
       date_trunc('quarter', x.d)::date,
       (date_trunc('quarter', x.d) + interval '3 months' - interval '1 day')::date
from (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d) x;

-- ============ Dữ liệu đầu vào B1 / C2 (khung tối thiểu; Giai đoạn 7 bổ sung check-in, màn hình nhập, chỉnh sửa thủ công) ============
create table public.diem_danh_bai (
  bai_id uuid not null references public.bai_hoc (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  check_in_luc timestamptz,
  b1_phan_tram numeric(5, 2) not null check (b1_phan_tram between 0 and 100),
  chinh_tay boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (bai_id, user_id)
);
create index diem_danh_bai_user_idx on public.diem_danh_bai (user_id);

create table public.danh_gia_du_gio (
  id uuid primary key default gen_random_uuid(),
  bai_id uuid not null references public.bai_hoc (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  -- Rubric 4 mức (mục 5): 100 / 80 / 60 / 0
  muc_diem smallint not null check (muc_diem in (100, 80, 60, 0)),
  ghi_chu text,
  nguoi_cham uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bai_id, user_id)
);
create index danh_gia_du_gio_user_idx on public.danh_gia_du_gio (user_id);

-- ============ Kết quả KPI đã khóa (chỉ ghi khi đóng kỳ) ============
-- Không chứa nhãn nhóm nên công khai nội bộ được (mục 3).
create table public.ket_qua_kpi (
  ky_id uuid not null references public.ky_danh_gia (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  kpi numeric(5, 2) not null,
  diem_nhom jsonb not null,           -- {"A": 71.2, "B": 90, "C": 82.5}
  gia_tri jsonb not null,             -- điểm từng tiêu chí có dữ liệu {"A1": 63, "A2": 100, ...}
  trong_so_hieu_luc jsonb not null,   -- trọng số thực dùng sau khi chia lại vì thiếu dữ liệu (% trong KPI)
  gio_thuc numeric(8, 2) not null,
  gio_quy_doi numeric(8, 2) not null, -- giờ đã nhân hệ số D — cũng là đầu vào so sánh lịch sử (fallback A1)
  so_bai int not null,
  so_lop int not null,
  a4_ky int not null,
  a4_luy_ke int not null,
  che_do_a1 text,                     -- 'percentile' | 'lich_su' | null (không đủ dữ liệu)
  percentile numeric(5, 2),
  primary key (ky_id, user_id)
);
create index ket_qua_kpi_user_idx on public.ket_qua_kpi (user_id);

-- ============ Quyền truy cập bảng ============
revoke all on table public.nhom_tieu_chi, public.tieu_chi_con, public.he_so_do_kho, public.ky_danh_gia,
  public.diem_danh_bai, public.danh_gia_du_gio, public.ket_qua_kpi from anon, authenticated;
grant select on public.nhom_tieu_chi, public.tieu_chi_con, public.he_so_do_kho, public.ky_danh_gia,
  public.diem_danh_bai, public.danh_gia_du_gio, public.ket_qua_kpi to authenticated;

alter table public.nhom_tieu_chi enable row level security;
alter table public.tieu_chi_con enable row level security;
alter table public.he_so_do_kho enable row level security;
alter table public.ky_danh_gia enable row level security;
alter table public.diem_danh_bai enable row level security;
alter table public.danh_gia_du_gio enable row level security;
alter table public.ket_qua_kpi enable row level security;

-- Cấu hình và kỳ: mọi người đăng nhập đều đọc (minh bạch); ghi chỉ qua hàm SQL bên dưới
create policy nhom_tieu_chi_select on public.nhom_tieu_chi for select to authenticated using (true);
create policy tieu_chi_con_select on public.tieu_chi_con for select to authenticated using (true);
create policy he_so_do_kho_select on public.he_so_do_kho for select to authenticated using (true);
create policy ky_danh_gia_select on public.ky_danh_gia for select to authenticated using (true);
-- Điểm danh / dự giờ / kết quả kỳ đã đóng: công khai nội bộ; ghi chỉ qua hàm
create policy diem_danh_bai_select on public.diem_danh_bai for select to authenticated using (true);
create policy danh_gia_du_gio_select on public.danh_gia_du_gio for select to authenticated using (true);
create policy ket_qua_kpi_select on public.ket_qua_kpi for select to authenticated using (true);

-- ============ Nhóm nhân sự tại 1 thời điểm (để kỳ đang tính dở vẫn dùng nhóm cũ — mục 3) ============
create function public.nhom_tai_ngay(p_user uuid, p_ngay date)
returns public.nhom_nhan_su
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select h.nhom_moi from public.lich_su_doi_nhom h
      where h.user_id = p_user and h.ngay_hieu_luc <= p_ngay
      order by h.ngay_hieu_luc desc, h.created_at desc limit 1),
    (select h.nhom_cu from public.lich_su_doi_nhom h
      where h.user_id = p_user and h.ngay_hieu_luc > p_ngay
      order by h.ngay_hieu_luc, h.created_at limit 1),
    (select n.nhom from public.nhan_su_nhom n where n.user_id = p_user)
  );
$$;

-- ============ Cấu hình hiện tại dạng jsonb (đầu vào của engine; cũng là nội dung snapshot) ============
create function public.cau_hinh_kpi_hien_tai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nhom', (select coalesce(jsonb_object_agg(ma, trong_so), '{}') from public.nhom_tieu_chi),
    'tieu_chi', (select coalesce(jsonb_agg(jsonb_build_object('ma', ma, 'nhom', nhom, 'trong_so', trong_so, 'bat', bat, 'tinh_vao_kpi', tinh_vao_kpi) order by thu_tu), '[]') from public.tieu_chi_con),
    'he_so', (select coalesce(jsonb_object_agg(ma, gia_tri), '{}') from public.he_so_do_kho),
    'd1', (select coalesce(jsonb_object_agg(id::text, he_so_d1), '{}') from public.danh_muc_nhom_lop),
    'tham_so', jsonb_build_object(
      'min_nhom', public.cau_hinh_so('kpi_min_nhom_percentile', 5),
      'so_ky_fallback', public.cau_hinh_so('kpi_so_ky_fallback', 3),
      'gop_c', public.cau_hinh_so('kpi_gop_c', 0),
      'doi_nhom_x', public.cau_hinh_so('kpi_doi_nhom_x', 85),
      'doi_nhom_y', public.cau_hinh_so('kpi_doi_nhom_y', 3)
    )
  );
$$;

-- ============ ENGINE: tính KPI của 1 kỳ theo cấu hình jsonb ============
-- Chỉ tính cho người CÓ dạy ít nhất 1 Bài (đã kết thúc) trong kỳ. Set-based: 1 lần cho cả đơn vị.
create function public.tinh_kpi(p_ky uuid, p_ch jsonb)
returns table (
  user_id uuid,
  kpi numeric,
  diem_nhom jsonb,
  gia_tri jsonb,
  trong_so_hieu_luc jsonb,
  gio_thuc numeric,
  gio_quy_doi numeric,
  so_bai int,
  so_lop int,
  a4_ky int,
  a4_luy_ke int,
  che_do_a1 text,
  percentile numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ky public.ky_danh_gia%rowtype;
  v_min numeric := coalesce((p_ch #>> '{tham_so,min_nhom}')::numeric, 5);
  v_so_ky int := coalesce((p_ch #>> '{tham_so,so_ky_fallback}')::numeric, 3)::int;
  v_gop numeric := coalesce((p_ch #>> '{tham_so,gop_c}')::numeric, 0);
  v_d2 numeric := coalesce((p_ch #>> '{he_so,D2}')::numeric, 1);
  v_d3gv numeric := coalesce((p_ch #>> '{he_so,D3_GV}')::numeric, 1);
  v_d3tg numeric := coalesce((p_ch #>> '{he_so,D3_TG}')::numeric, 1);
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    return;
  end if;

  return query
  with
  -- Mỗi dòng = 1 Bài đã dạy xong trong kỳ của 1 người, kèm hệ số độ khó: max(D1, D2 nếu lớp không kinh phí) × D3(vai trò)
  bai_ky as (
    select s.nguoi_phan_cong as uid, b.id as bid, l.id as lid, s.id as sid,
      extract(epoch from (b.ket_thuc - b.bat_dau))::numeric / 3600.0 as gio,
      greatest(
        coalesce((p_ch #>> array['d1', l.nhom_lop_id::text])::numeric, 1),
        case when l.loai_kinh_phi = 'khong_kinh_phi' then v_d2 else 0 end
      ) * (case s.vai_tro when 'giang_vien' then v_d3gv else v_d3tg end) as hs,
      exists (
        select 1 from public.dang_ky_giang_day d
        where d.slot_id = s.id and d.user_id = s.nguoi_phan_cong and d.loai = 'tu_dang_ky' and d.trang_thai = 'da_duyet'
      ) as tu_dk
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and s.nguoi_phan_cong is not null
      and l.trang_thai <> 'da_huy'
      and b.ket_thuc <= now()
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den
  ),
  hd as (
    select bk.uid, sum(bk.gio) as gio_thuc, sum(bk.gio * bk.hs) as gio_qd, count(*)::int as so_bai,
      count(distinct bk.lid)::int as so_lop, (count(*) filter (where bk.tu_dk))::int as so_tu_dk
    from bai_ky bk group by bk.uid
  ),
  -- A3: lời mời đã được phản hồi (đồng ý / từ chối) cho Bài thuộc kỳ
  moi as (
    select d.user_id as uid, (count(*) filter (where d.trang_thai = 'da_duyet'))::numeric as dong_y, count(*)::numeric as tong
    from public.dang_ky_giang_day d
    join public.bai_hoc b on b.id = d.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where d.loai = 'duoc_moi' and d.trang_thai in ('da_duyet', 'tu_choi') and l.trang_thai <> 'da_huy'
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den
    group by d.user_id
  ),
  b1 as (
    select bk.uid, avg(dd.b1_phan_tram) as v
    from bai_ky bk join public.diem_danh_bai dd on dd.bai_id = bk.bid and dd.user_id = bk.uid
    group by bk.uid
  ),
  -- C2: điểm dự giờ × hệ số D của Bài đó (tối đa 100), trung bình cộng qua các lần dự giờ trong kỳ
  c2 as (
    select bk.uid, avg(least(100::numeric, g.muc_diem * bk.hs)) as v
    from bai_ky bk join public.danh_gia_du_gio g on g.bai_id = bk.bid and g.user_id = bk.uid
    group by bk.uid
  ),
  -- C1/C3 tính theo LỚP: gộp các lớp người đó dạy trong kỳ (đơn giản hoặc theo số Bài mỗi lớp)
  lop_nguoi as (
    select bk.uid, bk.lid, count(*)::numeric as n, max(l.c1_phan_tram) as c1, max(l.c3_phan_tram) as c3
    from bai_ky bk join public.lop_hoc l on l.id = bk.lid
    group by bk.uid, bk.lid
  ),
  c13 as (
    select ln.uid,
      case when v_gop = 1
        then sum(ln.c1 * ln.n) filter (where ln.c1 is not null) / nullif(sum(ln.n) filter (where ln.c1 is not null), 0)
        else avg(ln.c1) end as c1,
      case when v_gop = 1
        then sum(ln.c3 * ln.n) filter (where ln.c3 is not null) / nullif(sum(ln.n) filter (where ln.c3 is not null), 0)
        else avg(ln.c3) end as c3
    from lop_nguoi ln group by ln.uid
  ),
  -- Tập so sánh percentile A1: người đang tham gia hoặc có dạy trong kỳ, xếp theo NHÓM tại cuối kỳ (không trộn nhóm)
  dan_so as (
    select p.id as uid, public.nhom_tai_ngay(p.id, v_ky.den) as nhom, coalesce(h.gio_qd, 0) as gio_qd
    from public.profiles p
    left join hd h on h.uid = p.id
    where (p.trang_thai_tham_gia = 'dang_tham_gia' or h.uid is not null)
      and exists (select 1 from public.nhan_su_nhom n where n.user_id = p.id)
  ),
  pr as (
    select d.uid, d.gio_qd,
      count(*) over (partition by d.nhom) as n_nhom,
      rank() over (partition by d.nhom order by d.gio_qd) as rk,
      (cume_dist() over (partition by d.nhom order by d.gio_qd))::numeric as cd
    from dan_so d
    where d.nhom is not null
  ),
  -- Lịch sử A1 (giờ quy đổi) của chính người đó ở các kỳ đã đóng trước — dùng cho nhóm nhỏ (fallback)
  ls as (
    select x.user_id as uid, avg(x.gio_quy_doi) as tb
    from (
      select r.user_id, r.gio_quy_doi, row_number() over (partition by r.user_id order by k.tu desc) as rn
      from public.ket_qua_kpi r join public.ky_danh_gia k on k.id = r.ky_id
      where k.trang_thai = 'da_dong' and k.tu < v_ky.tu
    ) x
    where x.rn <= v_so_ky
    group by x.user_id
  ),
  a1 as (
    select h.uid,
      case
        when pr.n_nhom >= v_min
          then round(100 * (((pr.rk - 1)::numeric / pr.n_nhom) + pr.cd) / 2, 2)
        when ls.tb is not null and ls.tb > 0
          then round(greatest(0::numeric, least(100::numeric, 50 + 50 * (pr.gio_qd / ls.tb - 1))), 2)
      end as v,
      case when pr.n_nhom >= v_min then 'percentile' when ls.tb is not null and ls.tb > 0 then 'lich_su' end as che_do,
      case when pr.n_nhom >= v_min then round(100 * (((pr.rk - 1)::numeric / pr.n_nhom) + pr.cd) / 2, 2) end as pct
    from hd h
    left join pr on pr.uid = h.uid
    left join ls on ls.uid = h.uid
  ),
  -- Điểm từng tiêu chí (0-100 hoặc null nếu thiếu dữ liệu)
  gt as (
    select a.uid, 'A1'::text as ma, a.v from a1 a
    union all select h.uid, 'A2'::text, case when h.so_bai > 0 then 100.0 * h.so_tu_dk / h.so_bai end from hd h
    union all select h.uid, 'A3'::text, case when m.tong > 0 then 100.0 * m.dong_y / m.tong end from hd h left join moi m on m.uid = h.uid
    union all select b.uid, 'B1'::text, b.v from b1 b
    union all select c.uid, 'C2'::text, c.v from c2 c
    union all select c.uid, 'C1'::text, c.c1 from c13 c
    union all select c.uid, 'C3'::text, c.c3 from c13 c
  ),
  -- Cấu hình: chỉ tiêu chí đang Bật và nằm trong công thức
  tc as (
    select x ->> 'ma' as ma, x ->> 'nhom' as nhom, (x ->> 'trong_so')::numeric as w
    from jsonb_array_elements(p_ch -> 'tieu_chi') x
    where (x ->> 'bat')::boolean and (x ->> 'tinh_vao_kpi')::boolean
  ),
  nt as (
    select e.key as nhom, e.value::numeric as w from jsonb_each_text(p_ch -> 'nhom') e
  ),
  -- Trọng số động: chia lại trong từng nhóm theo các tiêu chí CÓ dữ liệu, rồi chia lại giữa các nhóm CÓ dữ liệu
  ct as (
    select g.uid, tc.ma, tc.nhom, tc.w as tw, nt.w as gw, g.v,
      sum(tc.w) over (partition by g.uid, tc.nhom) as tsum
    from gt g
    join tc on tc.ma = g.ma
    join nt on nt.nhom = tc.nhom
    where g.v is not null
  ),
  gp as (
    select c.uid, c.nhom, max(c.gw) as gw, max(c.tsum) as tsum from ct c group by c.uid, c.nhom
  ),
  gs as (
    select p.uid, sum(p.gw) as gws from gp p where p.tsum > 0 group by p.uid
  ),
  eff as (
    select c.uid, c.ma, c.v,
      (c.tw / c.tsum) * (c.gw / nullif(s.gws, 0)) as e
    from ct c join gs s on s.uid = c.uid
    where c.tsum > 0
  ),
  tong as (
    select e.uid, round(sum(e.v * e.e), 2) as kpi,
      jsonb_object_agg(e.ma, round(e.v, 2)) as gia_tri,
      jsonb_object_agg(e.ma, round(e.e * 100, 2)) as hieu_luc
    from eff e group by e.uid
  ),
  diem_n as (
    select c.uid, jsonb_object_agg(c.nhom, c.s) as dn
    from (
      select ct.uid, ct.nhom, round(sum(ct.v * ct.tw) / nullif(sum(ct.tw), 0), 2) as s
      from ct group by ct.uid, ct.nhom
    ) c
    where c.s is not null
    group by c.uid
  )
  select h.uid,
    t.kpi,
    coalesce(dn.dn, '{}'::jsonb),
    coalesce(t.gia_tri, '{}'::jsonb),
    coalesce(t.hieu_luc, '{}'::jsonb),
    round(h.gio_thuc, 2),
    round(h.gio_qd, 2),
    h.so_bai,
    h.so_lop,
    (
      select count(distinct l.id)::int
      from public.slot_giang_day s
      join public.bai_hoc b on b.id = s.bai_id
      join public.lop_hoc l on l.id = b.lop_id
      where s.nguoi_phan_cong = h.uid and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
        and l.loai_kinh_phi = 'khong_kinh_phi'
        and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den
    ),
    (
      select count(distinct l.id)::int
      from public.slot_giang_day s
      join public.bai_hoc b on b.id = s.bai_id
      join public.lop_hoc l on l.id = b.lop_id
      where s.nguoi_phan_cong = h.uid and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
        and l.loai_kinh_phi = 'khong_kinh_phi'
    ),
    a.che_do,
    a.pct
  from hd h
  left join tong t on t.uid = h.uid
  left join diem_n dn on dn.uid = h.uid
  left join a1 a on a.uid = h.uid;
end;
$$;

-- ============ Rà soát đổi nhóm theo KPI (mục 3): chạy khi đóng kỳ ============
-- Trợ giảng đạt KPI >= X trong Y kỳ đã đóng gần nhất liên tiếp -> sinh đề xuất thăng lên Giảng viên (cùng nhánh bác sĩ/không bác sĩ).
-- Chỉ sinh đề xuất; Admin duyệt/bỏ qua thủ công. Không sinh trùng nếu đã có đề xuất đổi nhóm đang chờ của người đó.
alter table public.de_xuat_nhan_su
  add column nhom_cu public.nhom_nhan_su,
  add column nhom_moi public.nhom_nhan_su,
  add column ky_id uuid references public.ky_danh_gia (id) on delete set null;

create function public.ra_soat_doi_nhom(p_ky uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_x numeric := public.cau_hinh_so('kpi_doi_nhom_x', 85);
  v_y int := public.cau_hinh_so('kpi_doi_nhom_y', 3)::int;
  v_ky public.ky_danh_gia%rowtype;
  v_kys uuid[];
  v_n int;
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  -- Y kỳ đã đóng gần nhất tính đến kỳ này (không kể kỳ đóng sau)
  select array_agg(x.id) into v_kys
  from (
    select k.id from public.ky_danh_gia k
    where k.trang_thai = 'da_dong' and k.tu <= v_ky.tu
    order by k.tu desc limit v_y
  ) x;
  if coalesce(array_length(v_kys, 1), 0) < v_y then
    return 0;
  end if;

  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi, ky_id)
  select 'doi_nhom'::public.loai_de_xuat, r.user_id,
    'Đạt KPI từ ' || (v_x::float8)::text || ' điểm liên tục ' || v_y || ' kỳ đến ' || v_ky.ten
      || ' — đề xuất thăng từ Trợ giảng lên Giảng viên.',
    n.nhom,
    case n.nhom when 'tg_bac_si' then 'gv_bac_si'::public.nhom_nhan_su else 'gv_khong_bac_si'::public.nhom_nhan_su end,
    v_ky.id
  from public.ket_qua_kpi r
  join public.nhan_su_nhom n on n.user_id = r.user_id
  where r.ky_id = any (v_kys) and r.kpi >= v_x and n.nhom in ('tg_bac_si', 'tg_khong_bac_si')
  group by r.user_id, n.nhom
  having count(*) = v_y
    and not exists (
      select 1 from public.de_xuat_nhan_su d
      where d.user_id = r.user_id and d.loai = 'doi_nhom' and d.trang_thai = 'cho_duyet'
    );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Duyệt / bỏ qua đề xuất. Đề xuất đổi nhóm (sinh từ KPI): duyệt = áp dụng đổi nhóm, lịch sử ghi hiệu lực từ ngày đầu kỳ sau.
create or replace function public.xu_ly_de_xuat(p_id uuid, p_duyet boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dx public.de_xuat_nhan_su%rowtype;
  v_nhom public.nhom_nhan_su;
  v_ngay date;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền xử lý đề xuất' using errcode = '42501';
  end if;

  select d.* into v_dx from public.de_xuat_nhan_su d where d.id = p_id and d.trang_thai = 'cho_duyet' for update;
  if not found then
    raise exception 'Đề xuất không tồn tại hoặc đã được xử lý' using errcode = 'P0002';
  end if;

  if p_duyet and v_dx.loai = 'doi_nhom' and v_dx.nhom_moi is not null then
    select n.nhom into v_nhom from public.nhan_su_nhom n where n.user_id = v_dx.user_id;
    if v_nhom is distinct from v_dx.nhom_cu then
      raise exception 'Nhóm hiện tại của người này đã thay đổi kể từ khi có đề xuất — hãy bỏ qua đề xuất này' using errcode = '23514';
    end if;
    perform public.dat_nhom(v_dx.user_id, v_dx.nhom_moi);
    -- Hiệu lực từ kỳ đánh giá tiếp theo: ngày đầu kỳ sau kỳ đã sinh đề xuất (kỳ đang tính dở vẫn dùng nhóm cũ)
    select k.den + 1 into v_ngay from public.ky_danh_gia k where k.id = v_dx.ky_id;
    update public.lich_su_doi_nhom
    set ngay_hieu_luc = coalesce(v_ngay, current_date), ly_do = 'Đề xuất tự động theo KPI'
    where id = (select h.id from public.lich_su_doi_nhom h where h.user_id = v_dx.user_id order by h.created_at desc limit 1);
  end if;

  update public.de_xuat_nhan_su
  set trang_thai = case when p_duyet then 'da_duyet'::public.trang_thai_de_xuat else 'bo_qua'::public.trang_thai_de_xuat end,
      nguoi_xu_ly = (select auth.uid()),
      xu_ly_luc = now()
  where id = p_id;
end;
$$;

-- ============ Quản lý kỳ ============
create function public.luu_ky(p_id uuid, p_ten text, p_tu date, p_den date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ten text := btrim(coalesce(p_ten, ''));
  v_id uuid;
  v_tt public.trang_thai_ky;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý kỳ đánh giá' using errcode = '42501';
  end if;
  if v_ten = '' then
    raise exception 'Tên kỳ không được để trống' using errcode = '23514';
  end if;
  if p_tu is null or p_den is null or p_den < p_tu then
    raise exception 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu' using errcode = '23514';
  end if;

  if p_id is not null then
    select k.trang_thai into v_tt from public.ky_danh_gia k where k.id = p_id;
    if not found then
      raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
    end if;
    if v_tt <> 'dang_mo' then
      raise exception 'Chỉ sửa được kỳ đang mở' using errcode = '23514';
    end if;
  end if;

  begin
    if p_id is null then
      insert into public.ky_danh_gia (ten, tu, den) values (v_ten, p_tu, p_den) returning id into v_id;
    else
      update public.ky_danh_gia set ten = v_ten, tu = p_tu, den = p_den where id = p_id;
      v_id := p_id;
    end if;
  exception when exclusion_violation then
    raise exception 'Khoảng ngày này trùng với một kỳ khác' using errcode = '23514';
  end;
  return v_id;
end;
$$;

create function public.xoa_ky(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tt public.trang_thai_ky;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý kỳ đánh giá' using errcode = '42501';
  end if;
  select k.trang_thai into v_tt from public.ky_danh_gia k where k.id = p_id;
  if not found then
    raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
  end if;
  if v_tt <> 'dang_mo' then
    raise exception 'Chỉ xóa được kỳ đang mở' using errcode = '23514';
  end if;
  delete from public.ky_danh_gia where id = p_id;
end;
$$;

-- Vòng đời: Đang mở <-> Chờ duyệt -> Đã đóng (khóa cứng). Đóng kỳ: chụp cấu hình + lưu kết quả + rà soát đổi nhóm.
create function public.doi_trang_thai_ky(p_id uuid, p_moi public.trang_thai_ky)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ky public.ky_danh_gia%rowtype;
  v_ch jsonb;
  v_truoc text;
  v_de_xuat int := 0;
  v_so int := 0;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý kỳ đánh giá' using errcode = '42501';
  end if;
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
  end if;
  if v_ky.trang_thai = 'da_dong' then
    raise exception 'Kỳ đã đóng, không thể thay đổi' using errcode = '23514';
  end if;

  if v_ky.trang_thai = 'dang_mo' and p_moi = 'cho_duyet' then
    update public.ky_danh_gia set trang_thai = 'cho_duyet' where id = p_id;

  elsif v_ky.trang_thai = 'cho_duyet' and p_moi = 'dang_mo' then
    update public.ky_danh_gia set trang_thai = 'dang_mo' where id = p_id;

  elsif v_ky.trang_thai = 'cho_duyet' and p_moi = 'da_dong' then
    -- Phải đóng theo thứ tự thời gian để lịch sử A1 (fallback) không bị hổng
    select k.ten into v_truoc from public.ky_danh_gia k where k.tu < v_ky.tu and k.trang_thai <> 'da_dong' order by k.tu limit 1;
    if v_truoc is not null then
      raise exception 'Hãy đóng % trước', v_truoc using errcode = '23514';
    end if;

    v_ch := public.cau_hinh_kpi_hien_tai();
    insert into public.ket_qua_kpi (ky_id, user_id, kpi, diem_nhom, gia_tri, trong_so_hieu_luc, gio_thuc, gio_quy_doi,
                                    so_bai, so_lop, a4_ky, a4_luy_ke, che_do_a1, percentile)
    select p_id, t.user_id, t.kpi, t.diem_nhom, t.gia_tri, t.trong_so_hieu_luc, t.gio_thuc, t.gio_quy_doi,
           t.so_bai, t.so_lop, t.a4_ky, t.a4_luy_ke, t.che_do_a1, t.percentile
    from public.tinh_kpi(p_id, v_ch) t
    where t.kpi is not null;
    get diagnostics v_so = row_count;

    update public.ky_danh_gia
    set trang_thai = 'da_dong', cau_hinh_snapshot = v_ch, dong_luc = now(), dong_boi = (select auth.uid())
    where id = p_id;

    v_de_xuat := public.ra_soat_doi_nhom(p_id);
  else
    raise exception 'Không thể chuyển kỳ từ trạng thái hiện tại sang trạng thái này' using errcode = '23514';
  end if;

  -- TODO Giai đoạn 8: thông báo "Kỳ đánh giá mới công bố KPI" khi đóng kỳ; Giai đoạn 9: ghi Nhật ký hệ thống
  return jsonb_build_object('so_ket_qua', v_so, 'so_de_xuat_doi_nhom', v_de_xuat);
end;
$$;

-- ============ Đọc KPI của 1 kỳ ============
-- Kỳ đã đóng: đọc bản đã khóa. Kỳ đang mở: tính trực tiếp theo cấu hình hiện tại (mọi người xem được — công khai nội bộ).
-- Kỳ chờ duyệt: chỉ người quản trị xem (Admin duyệt trước khi công bố).
create function public.kpi_ky(p_ky uuid)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  vai_tro public.vai_tro_giang_day,
  kpi numeric,
  hang int,
  diem_nhom jsonb,
  gia_tri jsonb,
  trong_so_hieu_luc jsonb,
  gio_thuc numeric,
  gio_quy_doi numeric,
  so_bai int,
  so_lop int,
  a4_ky int,
  a4_luy_ke int,
  che_do_a1 text,
  percentile numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_tt public.trang_thai_ky;
begin
  select k.trang_thai into v_tt from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    return;
  end if;
  if v_tt = 'cho_duyet' and not public.is_quan_tri() then
    return;
  end if;

  if v_tt = 'da_dong' then
    return query
    select r.user_id, p.ho_ten, p.avatar_url, p.vai_tro_giang_day, r.kpi,
      (rank() over (order by r.kpi desc))::int,
      r.diem_nhom, r.gia_tri, r.trong_so_hieu_luc, r.gio_thuc, r.gio_quy_doi, r.so_bai, r.so_lop, r.a4_ky, r.a4_luy_ke,
      r.che_do_a1, r.percentile
    from public.ket_qua_kpi r join public.profiles p on p.id = r.user_id
    where r.ky_id = p_ky
    order by r.kpi desc, p.ho_ten;
  else
    return query
    select t.user_id, p.ho_ten, p.avatar_url, p.vai_tro_giang_day, t.kpi,
      (rank() over (order by t.kpi desc))::int,
      t.diem_nhom, t.gia_tri, t.trong_so_hieu_luc, t.gio_thuc, t.gio_quy_doi, t.so_bai, t.so_lop, t.a4_ky, t.a4_luy_ke,
      t.che_do_a1, t.percentile
    from public.tinh_kpi(p_ky, public.cau_hinh_kpi_hien_tai()) t join public.profiles p on p.id = t.user_id
    where t.kpi is not null
    order by t.kpi desc, p.ho_ten;
  end if;
end;
$$;

-- KPI kỳ đã đóng gần nhất của 1 người (0-100) — dùng cho tie-break matching-score; null = chưa có dữ liệu
create or replace function public.kpi_gan_nhat(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select r.kpi
  from public.ket_qua_kpi r join public.ky_danh_gia k on k.id = r.ky_id
  where r.user_id = p_user and k.trang_thai = 'da_dong'
  order by k.tu desc
  limit 1;
$$;

-- ============ Lưu cấu hình KPI (cả màn hình 1 lần, có kiểm tra tổng trọng số) ============
-- p = {
--   "nhom":     {"A": 25, "B": 30, "C": 45},
--   "tieu_chi": {"A1": {"trong_so": 50, "bat": true}, ...},
--   "he_so":    {"D2": 1.1, "D3_GV": 1.1, "D3_TG": 1},
--   "d1":       {"<id nhóm lớp>": 1.0, ...},
--   "tham_so":  {"min_nhom": 5, "so_ky_fallback": 3, "gop_c": 0, "doi_nhom_x": 85, "doi_nhom_y": 3}
-- }
create function public.luu_cau_hinh_kpi(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_w numeric;
  v_bat boolean;
  v_tong numeric;
  v_min numeric := coalesce((p #>> '{tham_so,min_nhom}')::numeric, 5);
  v_so_ky numeric := coalesce((p #>> '{tham_so,so_ky_fallback}')::numeric, 3);
  v_gop numeric := coalesce((p #>> '{tham_so,gop_c}')::numeric, 0);
  v_x numeric := coalesce((p #>> '{tham_so,doi_nhom_x}')::numeric, 85);
  v_y numeric := coalesce((p #>> '{tham_so,doi_nhom_y}')::numeric, 3);
  v_uid uuid := (select auth.uid());
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền sửa cấu hình KPI' using errcode = '42501';
  end if;

  if v_min < 2 or v_min > 1000 or v_min <> trunc(v_min) then
    raise exception 'Số người tối thiểu của nhóm phải là số nguyên từ 2 trở lên' using errcode = '23514';
  end if;
  if v_so_ky < 1 or v_so_ky > 8 or v_so_ky <> trunc(v_so_ky) then
    raise exception 'Số kỳ so sánh lịch sử phải là số nguyên từ 1 đến 8' using errcode = '23514';
  end if;
  if v_gop not in (0, 1) then
    raise exception 'Cách gộp C1/C3 không hợp lệ' using errcode = '23514';
  end if;
  if v_x < 0 or v_x > 100 then
    raise exception 'Ngưỡng KPI đổi nhóm phải từ 0 đến 100' using errcode = '23514';
  end if;
  if v_y < 1 or v_y > 12 or v_y <> trunc(v_y) then
    raise exception 'Số kỳ liên tiếp phải là số nguyên từ 1 đến 12' using errcode = '23514';
  end if;

  -- Trọng số tiêu chí con + Bật/Tắt
  for r in select t.ma from public.tieu_chi_con t loop
    if (p -> 'tieu_chi') -> r.ma is not null then
      v_w := coalesce((p -> 'tieu_chi' -> r.ma ->> 'trong_so')::numeric, 0);
      v_bat := coalesce((p -> 'tieu_chi' -> r.ma ->> 'bat')::boolean, true);
      if v_w < 0 or v_w > 100 then
        raise exception 'Trọng số của % phải từ 0 đến 100', r.ma using errcode = '23514';
      end if;
      update public.tieu_chi_con set trong_so = v_w, bat = v_bat where ma = r.ma;
    end if;
  end loop;

  -- Trọng số nhóm
  for r in select n.ma from public.nhom_tieu_chi n loop
    if (p -> 'nhom') -> r.ma is not null then
      v_w := (p -> 'nhom' ->> r.ma)::numeric;
      if v_w < 0 or v_w > 100 then
        raise exception 'Trọng số nhóm % phải từ 0 đến 100', r.ma using errcode = '23514';
      end if;
      update public.nhom_tieu_chi set trong_so = v_w where ma = r.ma;
    end if;
  end loop;

  -- Kiểm tra tổng: tiêu chí đang Bật (và nằm trong công thức) của mỗi nhóm = 100; các nhóm có tiêu chí Bật = 100
  for r in
    select n.ma, coalesce(sum(t.trong_so) filter (where t.bat and t.tinh_vao_kpi), 0) as tong,
           count(*) filter (where t.bat and t.tinh_vao_kpi) as so_tc
    from public.nhom_tieu_chi n left join public.tieu_chi_con t on t.nhom = n.ma
    group by n.ma
  loop
    if r.so_tc > 0 and abs(r.tong - 100) > 0.01 then
      raise exception 'Tổng trọng số các tiêu chí đang bật của nhóm % phải bằng 100 (hiện là %)', r.ma, r.tong using errcode = '23514';
    end if;
  end loop;
  select coalesce(sum(n.trong_so), 0) into v_tong
  from public.nhom_tieu_chi n
  where exists (select 1 from public.tieu_chi_con t where t.nhom = n.ma and t.bat and t.tinh_vao_kpi);
  if abs(v_tong - 100) > 0.01 then
    raise exception 'Tổng trọng số các nhóm tiêu chí phải bằng 100 (hiện là %)', v_tong using errcode = '23514';
  end if;

  -- Hệ số độ khó D2, D3
  for r in select h.ma from public.he_so_do_kho h loop
    if (p -> 'he_so') -> r.ma is not null then
      v_w := (p -> 'he_so' ->> r.ma)::numeric;
      if v_w <= 0 or v_w > 9.99 then
        raise exception 'Hệ số % phải lớn hơn 0 và không quá 9,99', r.ma using errcode = '23514';
      end if;
      update public.he_so_do_kho set gia_tri = v_w where ma = r.ma;
    end if;
  end loop;

  -- Hệ số D1 theo nhóm lớp
  for r in select d.id from public.danh_muc_nhom_lop d loop
    if (p -> 'd1') -> (r.id::text) is not null then
      v_w := (p -> 'd1' ->> (r.id::text))::numeric;
      if v_w <= 0 or v_w > 9.99 then
        raise exception 'Hệ số D1 phải lớn hơn 0 và không quá 9,99' using errcode = '23514';
      end if;
      update public.danh_muc_nhom_lop set he_so_d1 = v_w where id = r.id;
    end if;
  end loop;

  -- Tham số khác
  update public.cau_hinh_he_thong set gia_tri = v_min, updated_at = now(), updated_by = v_uid where khoa = 'kpi_min_nhom_percentile';
  update public.cau_hinh_he_thong set gia_tri = v_so_ky, updated_at = now(), updated_by = v_uid where khoa = 'kpi_so_ky_fallback';
  update public.cau_hinh_he_thong set gia_tri = v_gop, updated_at = now(), updated_by = v_uid where khoa = 'kpi_gop_c';
  update public.cau_hinh_he_thong set gia_tri = v_x, updated_at = now(), updated_by = v_uid where khoa = 'kpi_doi_nhom_x';
  update public.cau_hinh_he_thong set gia_tri = v_y, updated_at = now(), updated_by = v_uid where khoa = 'kpi_doi_nhom_y';
  -- TODO Giai đoạn 9: ghi Nhật ký hệ thống (giá trị trước/sau)
end;
$$;

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.ky_hien_tai_id() from public, anon;
revoke execute on function public.nhom_tai_ngay(uuid, date) from public, anon, authenticated;
revoke execute on function public.cau_hinh_kpi_hien_tai() from public, anon, authenticated;
revoke execute on function public.tinh_kpi(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.ra_soat_doi_nhom(uuid) from public, anon, authenticated;
revoke execute on function public.luu_ky(uuid, text, date, date) from public, anon;
revoke execute on function public.xoa_ky(uuid) from public, anon;
revoke execute on function public.doi_trang_thai_ky(uuid, public.trang_thai_ky) from public, anon;
revoke execute on function public.kpi_ky(uuid) from public, anon;
revoke execute on function public.luu_cau_hinh_kpi(jsonb) from public, anon;

grant execute on function public.ky_hien_tai_id() to authenticated;
grant execute on function public.luu_ky(uuid, text, date, date) to authenticated;
grant execute on function public.xoa_ky(uuid) to authenticated;
grant execute on function public.doi_trang_thai_ky(uuid, public.trang_thai_ky) to authenticated;
grant execute on function public.kpi_ky(uuid) to authenticated;
grant execute on function public.luu_cau_hinh_kpi(jsonb) to authenticated;
