-- Giai đoạn 7: Đánh giá chất lượng (CLAUDE.md mục 4.4) — check-in B1, chỉnh điểm danh, nhập C2 (dự giờ), KPI cá nhân.
--
-- Nguyên tắc:
--   * Check-in chỉ ghi qua hàm check_in_bai(): đúng người đã "Đã phân công" ở Bài, trong khung giờ cấu hình
--     (khởi điểm: từ 45 phút trước giờ học đến hết giờ học). B1 = max(0, 100 - phút trễ x 100 / ngưỡng tối đa), ngưỡng khởi điểm 30 phút.
--   * Không check-in => 0%: từ ngày "b1_ap_dung_tu" (mặc định = ngày mai của ngày chạy migration), Bài đã dạy xong mà không có bản ghi
--     điểm danh được engine tính B1 = 0%. Bài trước mốc này (khi chưa có check-in) vẫn coi là thiếu dữ liệu, không phạt oan.
--   * Sửa tay điểm danh (B1) và nhập C2 chỉ qua hàm SQL, chỉ người quản trị; không cho tự chấm C2 cho chính mình
--     (mục 3: luôn "không có dữ liệu"). Không sửa được khi Bài thuộc kỳ đã đóng (mở lại kỳ rồi sửa).
--   * TODO Giai đoạn 8: thông báo khi điểm danh bị chỉnh sửa; nhắc check-in. TODO Giai đoạn 9: Nhật ký hệ thống.

-- ============ Tham số ============
insert into public.cau_hinh_he_thong (khoa, gia_tri, mo_ta) values
  ('checkin_truoc_phut', 45, 'Được bấm "Tôi đã có mặt" từ bao nhiêu phút trước giờ bắt đầu Bài (đến hết giờ kết thúc Bài)'),
  ('b1_tre_toi_da_phut', 30, 'Ngưỡng tối đa chấm B1: trễ từ mức này trở lên = 0%, giảm tuyến tính trước đó'),
  ('b1_ap_dung_tu', to_char((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, 'YYYYMMDD')::numeric,
    'Từ ngày này (yyyymmdd, giờ VN) Bài đã dạy mà không check-in bị tính B1 = 0%; trước đó coi là thiếu dữ liệu')
on conflict (khoa) do nothing;

-- ============ Rubric C2 (4 mức: 100/80/60/0) — mô tả chỉnh được ở Cấu hình ============
create table public.rubric_du_gio (
  muc smallint primary key check (muc in (100, 80, 60, 0)),
  ten text not null check (btrim(ten) <> ''),
  mo_ta text not null default ''
);
insert into public.rubric_du_gio (muc, ten, mo_ta) values
  (100, 'Xuất sắc', 'Vượt yêu cầu: nội dung chính xác, truyền đạt cuốn hút, xử lý tình huống linh hoạt, học viên tham gia tích cực.'),
  (80, 'Tốt', 'Đạt đầy đủ yêu cầu, truyền đạt rõ ràng, còn vài điểm nhỏ có thể cải thiện.'),
  (60, 'Đạt', 'Đạt yêu cầu tối thiểu, có một số hạn chế về nội dung hoặc cách truyền đạt cần cải thiện.'),
  (0, 'Chưa đạt', 'Không đạt yêu cầu: sai sót đáng kể về nội dung, thiếu chuẩn bị hoặc không kiểm soát được lớp.');

revoke all on table public.rubric_du_gio from anon, authenticated;
grant select on public.rubric_du_gio to authenticated;
alter table public.rubric_du_gio enable row level security;
create policy rubric_du_gio_select on public.rubric_du_gio for select to authenticated using (true);

-- ============ Cột nhật ký chỉnh tay điểm danh ============
alter table public.diem_danh_bai
  add column ly_do_chinh text,
  add column chinh_boi uuid references auth.users (id) on delete set null,
  add column chinh_luc timestamptz;

-- ============ Cấu hình hiện tại dạng jsonb: thêm mốc áp dụng "vắng = 0%" (đi vào snapshot khi đóng kỳ) ============
create or replace function public.cau_hinh_kpi_hien_tai()
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
      'doi_nhom_y', public.cau_hinh_so('kpi_doi_nhom_y', 3),
      'giang_nhom_x', public.cau_hinh_so('kpi_giang_nhom_x', 50),
      'giang_nhom_y', public.cau_hinh_so('kpi_giang_nhom_y', 3),
      'b1_ap_dung_tu', public.cau_hinh_so('b1_ap_dung_tu', 99991231)
    )
  );
$$;

-- ============ ENGINE: như Giai đoạn 6, khác ở B1 (Bài đã dạy không có điểm danh từ mốc áp dụng = 0%) ============
create or replace function public.tinh_kpi(p_ky uuid, p_ch jsonb)
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
  -- Từ ngày này (yyyymmdd, giờ VN) Bài đã dạy mà không có điểm danh = B1 0%; snapshot cũ không có khóa -> không bao giờ áp dụng
  v_b1_tu numeric := coalesce((p_ch #>> '{tham_so,b1_ap_dung_tu}')::numeric, 99991231);
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    return;
  end if;

  return query
  with
  -- Mỗi dòng = 1 Bài đã dạy xong trong kỳ của 1 người, kèm hệ số độ khó: max(D1, D2 nếu lớp không kinh phí) × D3(vai trò)
  bai_ky as (
    select s.nguoi_phan_cong as uid, b.id as bid, b.bat_dau as bd, l.id as lid, s.id as sid,
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
    select bk.uid, avg(coalesce(dd.b1_phan_tram, 0)) as v
    from bai_ky bk left join public.diem_danh_bai dd on dd.bai_id = bk.bid and dd.user_id = bk.uid
    where dd.bai_id is not null or to_char(bk.bd at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD')::numeric >= v_b1_tu
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

-- ============ Kỳ của 1 Bài đã đóng chưa? (không sửa điểm danh/dự giờ của kỳ đã đóng — mở lại kỳ rồi sửa) ============
create function public.bai_thuoc_ky_da_dong(p_bai uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bai_hoc b
    join public.ky_danh_gia k on (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between k.tu and k.den
    where b.id = p_bai and k.trang_thai = 'da_dong'
  );
$$;

-- ============ Check-in "Tôi đã có mặt" ============
-- Trả về B1 (%) vừa ghi. Chỉ người đã "Đã phân công" đúng slot của Bài, trong khung giờ cấu hình.
create function public.check_in_bai(p_bai uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bai_hoc%rowtype;
  v_lop public.trang_thai_lop;
  v_truoc int := public.cau_hinh_so('checkin_truoc_phut', 45)::int;
  v_max numeric := greatest(public.cau_hinh_so('b1_tre_toi_da_phut', 30), 1);
  v_tre numeric;
  v_pt numeric;
  v_n int;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  select b.* into v_b from public.bai_hoc b where b.id = p_bai;
  if not found then
    raise exception 'Không tìm thấy Bài' using errcode = 'P0002';
  end if;
  select l.trang_thai into v_lop from public.lop_hoc l where l.id = v_b.lop_id;
  if v_lop = 'da_huy' then
    raise exception 'Lớp đã bị hủy' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.slot_giang_day s
    where s.bai_id = p_bai and s.nguoi_phan_cong = v_uid and s.trang_thai = 'da_phan_cong'
  ) then
    raise exception 'Bạn không được phân công ở Bài này' using errcode = '42501';
  end if;
  if now() < v_b.bat_dau - make_interval(mins => v_truoc) then
    raise exception 'Chưa đến giờ check-in (mở trước giờ học % phút)', v_truoc using errcode = '23514';
  end if;
  if now() > v_b.ket_thuc then
    raise exception 'Bài đã kết thúc, không check-in được. Hãy nhờ Admin/Quản lý lớp chỉnh điểm danh' using errcode = '23514';
  end if;

  -- Phút trễ tính tròn xuống theo phút; đến sớm hoặc đúng giờ = 0 phút trễ = 100%
  v_tre := greatest(0, floor(extract(epoch from (now() - v_b.bat_dau)) / 60));
  v_pt := round(greatest(0::numeric, 100 - v_tre * 100 / v_max), 2);

  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram)
  values (p_bai, v_uid, now(), v_pt)
  on conflict (bai_id, user_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Bạn đã check-in Bài này rồi' using errcode = '23505';
  end if;
  return v_pt;
end;
$$;

-- Các Bài của tôi đang trong khung giờ check-in (dùng cho banner Trang chủ và nút trong chi tiết lớp)
create function public.bai_can_check_in()
returns table (
  bai_id uuid,
  bai_ten text,
  lop_id uuid,
  lop_ten text,
  bat_dau timestamptz,
  ket_thuc timestamptz,
  da_check_in boolean,
  check_in_luc timestamptz,
  b1_phan_tram numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.ten, l.id, l.ten, b.bat_dau, b.ket_thuc, dd.bai_id is not null, dd.check_in_luc, dd.b1_phan_tram
  from public.slot_giang_day s
  join public.bai_hoc b on b.id = s.bai_id
  join public.lop_hoc l on l.id = b.lop_id
  left join public.diem_danh_bai dd on dd.bai_id = b.id and dd.user_id = s.nguoi_phan_cong
  where s.nguoi_phan_cong = (select auth.uid())
    and s.trang_thai = 'da_phan_cong'
    and l.trang_thai <> 'da_huy'
    and now() between b.bat_dau - make_interval(mins => public.cau_hinh_so('checkin_truoc_phut', 45)::int) and b.ket_thuc
  order by b.bat_dau;
$$;

-- ============ Admin/Quản lý lớp chỉnh tay điểm danh (B1) ============
-- Phải có lý do (lưu vết). Nhật ký hệ thống chung ở Giai đoạn 9; thông báo cho người bị sửa ở Giai đoạn 8.
create function public.chinh_diem_danh(p_bai uuid, p_user uuid, p_phan_tram numeric, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ly_do text := btrim(coalesce(p_ly_do, ''));
  v_uid uuid := (select auth.uid());
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền chỉnh điểm danh' using errcode = '42501';
  end if;
  if p_phan_tram is null or p_phan_tram < 0 or p_phan_tram > 100 then
    raise exception 'Điểm B1 phải từ 0 đến 100' using errcode = '23514';
  end if;
  if char_length(v_ly_do) < 5 then
    raise exception 'Hãy nhập lý do chỉnh sửa (tối thiểu 5 ký tự)' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.slot_giang_day s
    where s.bai_id = p_bai and s.nguoi_phan_cong = p_user and s.trang_thai = 'da_phan_cong'
  ) then
    raise exception 'Người này không được phân công ở Bài này' using errcode = '23514';
  end if;
  if public.bai_thuoc_ky_da_dong(p_bai) then
    raise exception 'Bài thuộc kỳ đã đóng — hãy mở lại kỳ trước khi chỉnh điểm danh' using errcode = '23514';
  end if;

  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram, chinh_tay, ly_do_chinh, chinh_boi, chinh_luc)
  values (p_bai, p_user, null, round(p_phan_tram, 2), true, v_ly_do, v_uid, now())
  on conflict (bai_id, user_id) do update
    set b1_phan_tram = excluded.b1_phan_tram, chinh_tay = true, ly_do_chinh = excluded.ly_do_chinh,
        chinh_boi = excluded.chinh_boi, chinh_luc = excluded.chinh_luc;
  -- TODO Giai đoạn 8: thông báo cho người bị chỉnh; Giai đoạn 9: ghi Nhật ký hệ thống (giá trị trước/sau)
end;
$$;

-- ============ Nhập C2 (dự giờ) — rubric 4 mức, gắn theo Bài cụ thể ============
create function public.luu_danh_gia_du_gio(p_bai uuid, p_user uuid, p_muc smallint, p_ghi_chu text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_bat timestamptz;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền nhập điểm dự giờ' using errcode = '42501';
  end if;
  -- Tự chấm cho chính mình: không cho phép, luôn "không có dữ liệu" C2 (CLAUDE.md mục 3)
  if p_user = v_uid then
    raise exception 'Không thể tự chấm dự giờ cho chính mình' using errcode = '23514';
  end if;
  if p_muc is null or p_muc not in (100, 80, 60, 0) then
    raise exception 'Mức điểm dự giờ phải là 100, 80, 60 hoặc 0' using errcode = '23514';
  end if;
  select b.bat_dau into v_bat from public.bai_hoc b where b.id = p_bai;
  if not found then
    raise exception 'Không tìm thấy Bài' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.slot_giang_day s
    where s.bai_id = p_bai and s.nguoi_phan_cong = p_user and s.trang_thai = 'da_phan_cong'
  ) then
    raise exception 'Người này không được phân công ở Bài này' using errcode = '23514';
  end if;
  if v_bat > now() then
    raise exception 'Bài chưa bắt đầu, chưa thể nhập điểm dự giờ' using errcode = '23514';
  end if;
  if public.bai_thuoc_ky_da_dong(p_bai) then
    raise exception 'Bài thuộc kỳ đã đóng — hãy mở lại kỳ trước khi sửa điểm dự giờ' using errcode = '23514';
  end if;

  insert into public.danh_gia_du_gio (bai_id, user_id, muc_diem, ghi_chu, nguoi_cham)
  values (p_bai, p_user, p_muc, nullif(btrim(coalesce(p_ghi_chu, '')), ''), v_uid)
  on conflict (bai_id, user_id) do update
    set muc_diem = excluded.muc_diem, ghi_chu = excluded.ghi_chu, nguoi_cham = excluded.nguoi_cham;
end;
$$;

create function public.xoa_danh_gia_du_gio(p_bai uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền xóa điểm dự giờ' using errcode = '42501';
  end if;
  if public.bai_thuoc_ky_da_dong(p_bai) then
    raise exception 'Bài thuộc kỳ đã đóng — hãy mở lại kỳ trước khi sửa điểm dự giờ' using errcode = '23514';
  end if;
  delete from public.danh_gia_du_gio where bai_id = p_bai and user_id = p_user;
end;
$$;

-- ============ Cấu hình điểm danh + rubric (Cấu hình KPI) ============
-- p = {"checkin_truoc_phut": 45, "b1_tre_toi_da_phut": 30, "rubric": {"100": {"ten": "...", "mo_ta": "..."}, "80": ..., "60": ..., "0": ...}}
create function public.luu_cau_hinh_diem_danh(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_truoc numeric := coalesce((p ->> 'checkin_truoc_phut')::numeric, public.cau_hinh_so('checkin_truoc_phut', 45));
  v_max numeric := coalesce((p ->> 'b1_tre_toi_da_phut')::numeric, public.cau_hinh_so('b1_tre_toi_da_phut', 30));
  v_uid uuid := (select auth.uid());
  r record;
  v_ten text;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền sửa cấu hình điểm danh' using errcode = '42501';
  end if;
  if v_truoc < 0 or v_truoc > 240 or v_truoc <> trunc(v_truoc) then
    raise exception 'Số phút được check-in trước giờ học phải là số nguyên từ 0 đến 240' using errcode = '23514';
  end if;
  if v_max < 1 or v_max > 240 or v_max <> trunc(v_max) then
    raise exception 'Ngưỡng trễ tối đa của B1 phải là số nguyên phút từ 1 đến 240' using errcode = '23514';
  end if;

  for r in select u.muc from public.rubric_du_gio u loop
    if (p -> 'rubric') -> (r.muc::text) is not null then
      v_ten := btrim(coalesce(p -> 'rubric' -> (r.muc::text) ->> 'ten', ''));
      if v_ten = '' then
        raise exception 'Tên mức rubric % không được để trống', r.muc using errcode = '23514';
      end if;
      update public.rubric_du_gio
      set ten = v_ten, mo_ta = btrim(coalesce(p -> 'rubric' -> (r.muc::text) ->> 'mo_ta', ''))
      where muc = r.muc;
    end if;
  end loop;

  update public.cau_hinh_he_thong set gia_tri = v_truoc, updated_at = now(), updated_by = v_uid where khoa = 'checkin_truoc_phut';
  update public.cau_hinh_he_thong set gia_tri = v_max, updated_at = now(), updated_by = v_uid where khoa = 'b1_tre_toi_da_phut';
  -- TODO Giai đoạn 9: ghi Nhật ký hệ thống (giá trị trước/sau)
end;
$$;

-- ============ KPI cá nhân: xu hướng nhiều kỳ + A4 + tiến độ đổi nhóm ============
-- Dữ liệu từng kỳ theo đúng quyền của kpi_ky() (kỳ Chờ duyệt chỉ người quản trị thấy). KHÔNG trả nhãn nhóm.
-- "tien_do": chỉ trả cho chính người đó hoặc người quản trị — hướng đổi nhóm (thang/giang) cho biết nhóm nên không công khai cho người khác.
create function public.kpi_ca_nhan(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ky jsonb;
  v_nhom public.nhom_nhan_su;
  v_x numeric := public.cau_hinh_so('kpi_doi_nhom_x', 85);
  v_y int := public.cau_hinh_so('kpi_doi_nhom_y', 3)::int;
  v_xg numeric := public.cau_hinh_so('kpi_giang_nhom_x', 50);
  v_yg int := public.cau_hinh_so('kpi_giang_nhom_y', 3)::int;
  v_huong text;
  v_can int;
  v_nguong numeric;
  v_dat int := 0;
  v_tien_do jsonb;
  v_a4 int;
  r record;
begin
  select coalesce(jsonb_agg(x.j order by x.tu), '[]'::jsonb) into v_ky
  from (
    select k.tu,
      jsonb_build_object(
        'ky_id', k.id, 'ten', k.ten, 'tu', k.tu, 'den', k.den, 'trang_thai', k.trang_thai,
        'kpi', t.kpi, 'diem_nhom', t.diem_nhom, 'gia_tri', t.gia_tri, 'trong_so_hieu_luc', t.trong_so_hieu_luc,
        'gio_thuc', t.gio_thuc, 'gio_quy_doi', t.gio_quy_doi, 'so_bai', t.so_bai, 'so_lop', t.so_lop,
        'a4_ky', t.a4_ky, 'a4_luy_ke', t.a4_luy_ke, 'che_do_a1', t.che_do_a1, 'percentile', t.percentile
      ) as j
    from public.ky_danh_gia k
    left join lateral (select q.* from public.kpi_ky(k.id) q where q.user_id = p_user) t on true
    where k.trang_thai <> 'cho_duyet' or public.is_quan_tri()
    order by k.tu desc
    limit 8
  ) x;

  select count(distinct l.id)::int into v_a4
  from public.slot_giang_day s
  join public.bai_hoc b on b.id = s.bai_id
  join public.lop_hoc l on l.id = b.lop_id
  where s.nguoi_phan_cong = p_user and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
    and l.loai_kinh_phi = 'khong_kinh_phi';

  if public.is_quan_tri() or p_user = (select auth.uid()) then
    select n.nhom into v_nhom from public.nhan_su_nhom n where n.user_id = p_user;
    if v_nhom in ('tg_bac_si', 'tg_khong_bac_si') then
      v_huong := 'thang'; v_can := v_y; v_nguong := v_x;
    elsif v_nhom in ('gv_bac_si', 'gv_khong_bac_si') then
      v_huong := 'giang'; v_can := v_yg; v_nguong := v_xg;
    end if;
    if v_huong is not null then
      -- Số kỳ đã đóng liên tiếp gần nhất thỏa điều kiện (kỳ không dạy = không có kết quả = ngắt chuỗi, cùng quy tắc ra_soat_doi_nhom)
      for r in
        select q.kpi
        from public.ky_danh_gia k
        left join public.ket_qua_kpi q on q.ky_id = k.id and q.user_id = p_user
        where k.trang_thai = 'da_dong'
        order by k.tu desc
      loop
        exit when r.kpi is null;
        exit when (v_huong = 'thang' and r.kpi < v_nguong) or (v_huong = 'giang' and r.kpi >= v_nguong);
        v_dat := v_dat + 1;
        exit when v_dat >= v_can;
      end loop;
      v_tien_do := jsonb_build_object('huong', v_huong, 'nguong', v_nguong, 'so_ky_can', v_can, 'so_ky_dat', v_dat);
    end if;
  end if;

  return jsonb_build_object(
    'ky', v_ky,
    'a4_tong', coalesce(v_a4, 0),
    'so_ky_fallback', public.cau_hinh_so('kpi_so_ky_fallback', 3)::int,
    'tien_do', v_tien_do
  );
end;
$$;

-- ============ Quyền thực thi ============
revoke execute on function public.bai_thuoc_ky_da_dong(uuid) from public, anon, authenticated;
revoke execute on function public.check_in_bai(uuid) from public, anon;
revoke execute on function public.bai_can_check_in() from public, anon;
revoke execute on function public.chinh_diem_danh(uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.luu_danh_gia_du_gio(uuid, uuid, smallint, text) from public, anon;
revoke execute on function public.xoa_danh_gia_du_gio(uuid, uuid) from public, anon;
revoke execute on function public.luu_cau_hinh_diem_danh(jsonb) from public, anon;
revoke execute on function public.kpi_ca_nhan(uuid) from public, anon;

grant execute on function public.check_in_bai(uuid) to authenticated;
grant execute on function public.bai_can_check_in() to authenticated;
grant execute on function public.chinh_diem_danh(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.luu_danh_gia_du_gio(uuid, uuid, smallint, text) to authenticated;
grant execute on function public.xoa_danh_gia_du_gio(uuid, uuid) to authenticated;
grant execute on function public.luu_cau_hinh_diem_danh(jsonb) to authenticated;
grant execute on function public.kpi_ca_nhan(uuid) to authenticated;
