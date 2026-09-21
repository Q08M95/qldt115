-- Giai đoạn 8: Thông báo (CLAUDE.md mục 4.5)
--
-- Nguyên tắc:
--   * Thông báo sinh ra bằng TRIGGER trên các bảng nghiệp vụ (đăng ký, slot, Bài, lớp, đề xuất, kỳ, điểm danh, hồ sơ) — không sửa lại các hàm
--     của Giai đoạn 4-7, nên mọi đường thay đổi dữ liệu đều được phủ. Người thực hiện hành động KHÔNG nhận thông báo về chính hành động đó.
--   * Ghi thông báo chỉ qua hàm/trigger (không có quyền INSERT cho người dùng). Người dùng chỉ đọc thông báo của mình và đánh dấu đã đọc.
--   * Nội dung thông báo gửi GV/TG không được lộ nhãn "nhóm" (mục 4.7): đề xuất đổi nhóm chỉ nói theo VAI TRÒ (Giảng viên/Trợ giảng).
--   * Nhắc check-in là job định kỳ (pg_cron, mỗi phút) — hàm nhac_check_in(); mỗi (Bài, người) chỉ nhắc 1 lần.
--   * Web Push: mỗi thông báo mới có người đã đăng ký push sẽ gọi webhook của app (pg_net) -> app gửi push bằng khóa VAPID.
--     Cần bật pg_cron/pg_net và điền bảng cau_hinh_push (xem scripts/thiet-lap-push.mjs). Thiếu các phần này thì chỉ mất push/nhắc giờ,
--     thông báo trong app vẫn hoạt động.

-- ============ Kiểu dữ liệu + bảng ============
create type public.muc_do_thong_bao as enum ('can_hanh_dong', 'thong_tin');
create type public.loai_thong_bao as enum (
  'bai_trong_moi',      -- lớp/Bài trống mới phù hợp nhóm đủ điều kiện
  'duoc_moi',           -- được mời dạy (Luồng B)
  'dang_ky_can_duyet',  -- (Admin) có đăng ký cần duyệt
  'dang_ky_ket_qua',    -- đăng ký được duyệt / bị từ chối / đã đóng
  'loi_moi_ket_qua',    -- (Admin) lời mời bị từ chối; (GV/TG) lời mời bị thu hồi
  'doi_lich',           -- Bài đã phân công bị đổi lịch
  'huy_lop',            -- lớp đã phân công/đăng ký bị hủy
  'huy_phan_cong',      -- bị hủy phân công 1 Bài
  'nhac_check_in',      -- nhắc check-in trước giờ học
  'cong_bo_kpi',        -- kỳ đánh giá công bố KPI
  'ket_qua_doi_nhom',   -- kết quả đề xuất đổi nhóm của bản thân
  'sua_diem_danh',      -- điểm danh (B1) bị Admin chỉnh tay
  'quyen_quan_ly_lop',  -- được gán / bị thu hồi Quyền Quản lý lớp
  'de_xuat_can_duyet'   -- (Admin) đề xuất nhân sự mới cần duyệt
);

create table public.thong_bao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  loai public.loai_thong_bao not null,
  muc_do public.muc_do_thong_bao not null,
  tieu_de text not null,
  noi_dung text,
  -- Đường dẫn trong app (click thông báo dẫn thẳng tới màn hình liên quan)
  lien_ket text,
  -- Chống trùng: cùng (người nhận, khóa) chỉ tạo 1 lần (hoặc chỉ khi thông báo cũ đã đọc — xem tao_thong_bao)
  khoa text,
  da_doc boolean not null default false,
  doc_luc timestamptz,
  created_at timestamptz not null default now()
);
create index thong_bao_user_idx on public.thong_bao (user_id, created_at desc);
create index thong_bao_chua_doc_idx on public.thong_bao (user_id) where not da_doc;
create index thong_bao_khoa_idx on public.thong_bao (user_id, khoa) where khoa is not null;
-- Nhắc check-in tuyệt đối không trùng dù job chạy chồng nhau
create unique index thong_bao_nhac_check_in_uq on public.thong_bao (user_id, khoa) where loai = 'nhac_check_in';

-- doc_luc do hệ thống đặt, người dùng chỉ đổi da_doc
create function public.thong_bao_doc_luc()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.doc_luc := case when new.da_doc then coalesce(old.doc_luc, now()) else null end;
  return new;
end;
$$;
create trigger thong_bao_doc_luc_tg
  before update of da_doc on public.thong_bao
  for each row execute function public.thong_bao_doc_luc();

revoke all on table public.thong_bao from anon, authenticated;
grant select on public.thong_bao to authenticated;
grant update (da_doc) on public.thong_bao to authenticated;
alter table public.thong_bao enable row level security;
create policy thong_bao_select on public.thong_bao for select to authenticated
  using (user_id = (select auth.uid()));
create policy thong_bao_update on public.thong_bao for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Cập nhật tức thời cho chuông thông báo (Supabase Realtime; RLS vẫn áp dụng cho từng người)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.thong_bao;
  end if;
end;
$$;

-- ============ Web Push: đăng ký thiết bị + cấu hình webhook ============
create table public.push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscription_user_idx on public.push_subscription (user_id);

revoke all on table public.push_subscription from anon, authenticated;
grant select on public.push_subscription to authenticated;
alter table public.push_subscription enable row level security;
create policy push_subscription_select on public.push_subscription for select to authenticated
  using (user_id = (select auth.uid()));

-- Địa chỉ webhook của app + khóa bí mật dùng chung (không ai đọc được qua API; chỉ service_role/hàm SECURITY DEFINER)
create table public.cau_hinh_push (
  id boolean primary key default true check (id),
  url text not null,
  secret text not null,
  updated_at timestamptz not null default now()
);
revoke all on table public.cau_hinh_push from anon, authenticated;
alter table public.cau_hinh_push enable row level security;

-- Đăng ký / cập nhật thiết bị nhận push của chính mình (1 thiết bị chỉ thuộc 1 tài khoản: đăng nhập tài khoản khác thì chuyển sang tài khoản đó)
create function public.luu_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if coalesce(btrim(p_endpoint), '') = '' or coalesce(btrim(p_p256dh), '') = '' or coalesce(btrim(p_auth), '') = '' then
    raise exception 'Thiếu thông tin đăng ký thông báo đẩy' using errcode = '23514';
  end if;
  insert into public.push_subscription (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;

create function public.xoa_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscription where endpoint = p_endpoint and user_id = (select auth.uid());
$$;

-- ============ Hàm tiện ích nội bộ ============
create function public.dinh_dang_gio(p timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY');
$$;

create function public.ten_vai_tro(p public.vai_tro_giang_day)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'giang_vien' then 'Giảng viên' else 'Trợ giảng' end;
$$;

create function public.nguoi_quan_tri()
returns table (id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.phan_quyen = 'admin' or p.co_quyen_quan_ly_lop;
$$;

-- Tạo 1 thông báo. Trả về true nếu thực sự tạo.
--   * Mặc định bỏ qua khi người nhận chính là người đang thao tác.
--   * p_khoa: chống trùng. p_gop = false: mỗi khóa chỉ 1 lần duy nhất; p_gop = true: chỉ bỏ qua khi thông báo cùng khóa còn CHƯA ĐỌC (gộp nhiều sự kiện dồn dập).
create function public.tao_thong_bao(
  p_user uuid,
  p_loai public.loai_thong_bao,
  p_muc public.muc_do_thong_bao,
  p_tieu_de text,
  p_noi_dung text,
  p_lien_ket text,
  p_khoa text default null,
  p_gop boolean default false,
  p_ke_ca_nguoi_thao_tac boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return false;
  end if;
  if not p_ke_ca_nguoi_thao_tac and p_user is not distinct from (select auth.uid()) then
    return false;
  end if;
  if p_khoa is not null and exists (
    select 1 from public.thong_bao t
    where t.user_id = p_user and t.khoa = p_khoa and (not p_gop or not t.da_doc)
  ) then
    return false;
  end if;
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, noi_dung, lien_ket, khoa)
  values (p_user, p_loai, p_muc, p_tieu_de, p_noi_dung, p_lien_ket, p_khoa);
  return true;
end;
$$;

-- Nhân sự đủ điều kiện đăng ký ít nhất 1 slot còn trống của lớp (nhóm đủ điều kiện, chứng chỉ, đang tham gia, đúng vai trò)
create function public.nguoi_du_dieu_kien_lop(p_lop uuid)
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
      where r.lop_id = p_lop
        and not exists (select 1 from public.chung_chi c where c.user_id = p.id and c.loai_id = r.loai_id)
    )
    and exists (
      select 1 from public.slot_giang_day s
      join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = p_lop and s.vai_tro = p.vai_tro_giang_day and s.nguoi_phan_cong is null and b.bat_dau > now()
    );
$$;

-- ============ Trigger: đăng ký / lời mời ============
-- Thêm mới: lời mời -> người được mời (cần hành động); đăng ký tự nguyện -> Admin (cần hành động, gộp theo lớp)
create function public.tb_dang_ky_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  a record;
  v_so int;
  v_nd text;
  v_khoa text;
begin
  for r in
    select m.id, m.user_id, m.vai_tro, b.ten as bai_ten, b.bat_dau, l.id as lop_id, l.ten as lop_ten
    from moi m
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where m.loai = 'duoc_moi' and m.trang_thai = 'cho_xu_ly'
  loop
    perform public.tao_thong_bao(
      r.user_id, 'duoc_moi', 'can_hanh_dong', 'Bạn được mời dạy',
      format('Lớp %s — %s (%s), %s. Hãy xác nhận hoặc từ chối.', r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro), public.dinh_dang_gio(r.bat_dau)),
      '/lop-hoc/' || r.lop_id, 'loi_moi:' || r.id
    );
  end loop;

  -- Đăng ký tự nguyện: gộp theo (lớp, người đăng ký) — đăng ký thêm Bài khi thông báo cũ chưa đọc thì cập nhật số Bài chứ không tạo thêm
  for r in
    select distinct l.id as lop_id, l.ten as lop_ten, p.ho_ten, m.user_id
    from moi m
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    join public.profiles p on p.id = m.user_id
    where m.loai = 'tu_dang_ky' and m.trang_thai = 'cho_xu_ly'
  loop
    select count(*)::int into v_so
    from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
    where b.lop_id = r.lop_id and d.user_id = r.user_id and d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly';
    v_nd := format('%s đăng ký %s Bài — lớp %s.', r.ho_ten, v_so, r.lop_ten);
    for a in select q.id from public.nguoi_quan_tri() q loop
      v_khoa := 'dang_ky:' || r.lop_id || ':' || r.user_id;
      update public.thong_bao set noi_dung = v_nd, created_at = now()
      where user_id = a.id and khoa = v_khoa and not da_doc;
      if not found then
        perform public.tao_thong_bao(
          a.id, 'dang_ky_can_duyet', 'can_hanh_dong', 'Đăng ký cần duyệt', v_nd, '/lop-hoc/' || r.lop_id, v_khoa
        );
      end if;
    end loop;
  end loop;
  return null;
end;
$$;
create trigger dang_ky_giang_day_tb_moi
  after insert on public.dang_ky_giang_day
  referencing new table as moi
  for each statement execute function public.tb_dang_ky_moi();

-- Đổi trạng thái: kết quả duyệt/từ chối, lời mời bị từ chối/thu hồi, đăng ký bị đóng vì slot đã đủ người
create function public.tb_dang_ky_cap_nhat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  a record;
  v_ly text;
begin
  for r in
    select m.id, m.loai, m.trang_thai, m.user_id, m.vai_tro, m.ly_do, b.ten as bai_ten, b.bat_dau,
           l.id as lop_id, l.ten as lop_ten, p.ho_ten
    from moi m
    join cu on cu.id = m.id
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    join public.profiles p on p.id = m.user_id
    where cu.trang_thai = 'cho_xu_ly' and m.trang_thai <> 'cho_xu_ly'
  loop
    -- Lời mời đã được xử lý -> thông báo "cần hành động" của nó hết hiệu lực
    if r.loai = 'duoc_moi' then
      update public.thong_bao set da_doc = true where khoa = 'loi_moi:' || r.id and not da_doc;
    end if;

    v_ly := case when coalesce(r.ly_do, '') <> '' then ' Lý do: ' || r.ly_do || '.' else '' end;

    if r.loai = 'tu_dang_ky' and r.trang_thai = 'da_duyet' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký được duyệt',
        format('Lớp %s — %s (%s), %s.', r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro), public.dinh_dang_gio(r.bat_dau)),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'tu_dang_ky' and r.trang_thai = 'tu_choi' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký bị từ chối',
        format('Lớp %s — %s, %s.%s', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau), v_ly),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'tu_dang_ky' and r.trang_thai = 'da_huy' and r.ly_do = 'Slot đã đủ người' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký đã đóng',
        format('Lớp %s — %s: slot đã đủ người.', r.lop_ten, r.bai_ten),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'duoc_moi' and r.trang_thai = 'tu_choi' then
      for a in select q.id from public.nguoi_quan_tri() q loop
        perform public.tao_thong_bao(
          a.id, 'loi_moi_ket_qua', 'thong_tin', 'Lời mời bị từ chối',
          format('%s từ chối lời mời dạy lớp %s — %s (%s). Slot đã mở lại, hãy mời người khác.', r.ho_ten, r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro)),
          '/lop-hoc/' || r.lop_id, 'loi_moi_tu_choi:' || r.id
        );
      end loop;
    elsif r.loai = 'duoc_moi' and r.trang_thai = 'da_huy' and r.ly_do = 'Admin thu hồi lời mời' then
      perform public.tao_thong_bao(
        r.user_id, 'loi_moi_ket_qua', 'thong_tin', 'Lời mời dạy đã được thu hồi',
        format('Lớp %s — %s, %s.', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau)),
        '/lop-hoc/' || r.lop_id
      );
    end if;
  end loop;
  return null;
end;
$$;
create trigger dang_ky_giang_day_tb_cap_nhat
  after update on public.dang_ky_giang_day
  referencing old table as cu new table as moi
  for each statement execute function public.tb_dang_ky_cap_nhat();

-- ============ Trigger: phân công / đổi lịch / hủy lớp / lớp mới mở ============
-- Người đang được phân công bị gỡ khỏi slot (Admin hủy phân công)
create function public.tb_slot_thay_doi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bai text;
  v_lop_id uuid;
  v_lop text;
  v_gio timestamptz;
  v_ly text;
begin
  select b.ten, b.bat_dau, l.id, l.ten into v_bai, v_gio, v_lop_id, v_lop
  from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = old.bai_id;
  select d.ly_do into v_ly from public.dang_ky_giang_day d
  where d.slot_id = old.id and d.user_id = old.nguoi_phan_cong and d.trang_thai = 'da_huy'
  order by d.updated_at desc limit 1;

  perform public.tao_thong_bao(
    old.nguoi_phan_cong, 'huy_phan_cong', 'thong_tin', 'Phân công đã bị hủy',
    format('Lớp %s — %s, %s không còn phân công cho bạn.%s', v_lop, v_bai, public.dinh_dang_gio(v_gio),
           case when coalesce(v_ly, '') <> '' then ' Lý do: ' || v_ly || '.' else '' end),
    '/lop-hoc/' || v_lop_id
  );
  return null;
end;
$$;
create trigger slot_giang_day_tb_thay_doi
  after update of nguoi_phan_cong on public.slot_giang_day
  for each row
  when (old.nguoi_phan_cong is not null and new.nguoi_phan_cong is distinct from old.nguoi_phan_cong)
  execute function public.tb_slot_thay_doi();

-- Bài đã phân công bị đổi giờ
create function public.tb_bai_doi_lich()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_lop text;
begin
  select l.ten into v_lop from public.lop_hoc l where l.id = new.lop_id;
  for r in
    select distinct s.nguoi_phan_cong as uid from public.slot_giang_day s
    where s.bai_id = new.id and s.nguoi_phan_cong is not null
  loop
    perform public.tao_thong_bao(
      r.uid, 'doi_lich', 'thong_tin', 'Bài đã đổi lịch',
      format('Lớp %s — %s: từ %s sang %s.', v_lop, new.ten, public.dinh_dang_gio(old.bat_dau), public.dinh_dang_gio(new.bat_dau)),
      '/lop-hoc/' || new.lop_id
    );
  end loop;
  return null;
end;
$$;
create trigger bai_hoc_tb_doi_lich
  after update of bat_dau, ket_thuc on public.bai_hoc
  for each row
  when (old.bat_dau is distinct from new.bat_dau or old.ket_thuc is distinct from new.ket_thuc)
  execute function public.tb_bai_doi_lich();

-- Lớp bị hủy -> người đã phân công + người đang chờ; lớp Nháp -> Đang mở -> người đủ điều kiện có slot trống
create function public.tb_lop_thay_doi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.trang_thai = 'da_huy' then
    for r in
      select s.nguoi_phan_cong as uid from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
      where b.lop_id = new.id and s.nguoi_phan_cong is not null
      union
      select d.user_id from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
      where b.lop_id = new.id and d.trang_thai = 'cho_xu_ly'
    loop
      perform public.tao_thong_bao(
        r.uid, 'huy_lop', 'thong_tin', 'Lớp đã bị hủy',
        format('Lớp %s đã bị hủy; các phân công/đăng ký của bạn trong lớp này không còn hiệu lực.', new.ten),
        '/lop-hoc/' || new.id
      );
    end loop;
  elsif new.trang_thai = 'dang_mo' and old.trang_thai = 'nhap' then
    for r in select q.id from public.nguoi_du_dieu_kien_lop(new.id) q loop
      perform public.tao_thong_bao(
        r.id, 'bai_trong_moi', 'thong_tin', 'Lớp mới mở đăng ký',
        format('Lớp %s (%s – %s) đang cần người dạy phù hợp với bạn.', new.ten,
               to_char(new.ngay_bat_dau, 'DD/MM/YYYY'), to_char(new.ngay_ket_thuc, 'DD/MM/YYYY')),
        '/lop-hoc/' || new.id
      );
    end loop;
  end if;
  return null;
end;
$$;
create trigger lop_hoc_tb_thay_doi
  after update of trang_thai on public.lop_hoc
  for each row
  when (old.trang_thai is distinct from new.trang_thai)
  execute function public.tb_lop_thay_doi();

-- Thêm Bài mới vào lớp ĐANG MỞ (slot được tạo ngay sau khi tạo Bài) -> người đủ điều kiện; gộp theo lớp để không dồn dập
create function public.tb_slot_moi()
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
    select distinct l.id as lop_id, l.ten as lop_ten
    from moi s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where l.trang_thai = 'dang_mo'
  loop
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
create trigger slot_giang_day_tb_moi
  after insert on public.slot_giang_day
  referencing new table as moi
  for each statement execute function public.tb_slot_moi();

-- ============ Trigger: đề xuất nhân sự, KPI, điểm danh, quyền ============
create function public.tb_de_xuat_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so int;
  a record;
begin
  select count(*)::int into v_so from moi where trang_thai = 'cho_duyet';
  if v_so = 0 then
    return null;
  end if;
  for a in select q.id from public.nguoi_quan_tri() q loop
    perform public.tao_thong_bao(
      a.id, 'de_xuat_can_duyet', 'can_hanh_dong', 'Đề xuất nhân sự cần duyệt',
      format('Có %s đề xuất nhân sự mới đang chờ bạn xử lý.', v_so),
      '/nhan-su/de-xuat', 'de_xuat', true
    );
  end loop;
  return null;
end;
$$;
create trigger de_xuat_nhan_su_tb_moi
  after insert on public.de_xuat_nhan_su
  referencing new table as moi
  for each statement execute function public.tb_de_xuat_moi();

-- Kết quả đề xuất đổi nhóm của bản thân. Chỉ nói theo VAI TRÒ, không lộ nhãn nhóm (mục 4.7)
create function public.tb_de_xuat_ket_qua()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro_giang_day;
begin
  select p.vai_tro_giang_day into v_vai from public.profiles p where p.id = new.user_id;
  if new.trang_thai = 'da_duyet' then
    perform public.tao_thong_bao(
      new.user_id, 'ket_qua_doi_nhom', 'thong_tin', 'Đề xuất đổi vai trò được duyệt',
      case when v_vai is null then 'Đề xuất thay đổi vai trò giảng dạy của bạn đã được duyệt, hiệu lực từ kỳ đánh giá tiếp theo.'
           else format('Bạn được chuyển sang vai trò %s, hiệu lực từ kỳ đánh giá tiếp theo.', public.ten_vai_tro(v_vai)) end,
      '/danh-gia'
    );
  else
    perform public.tao_thong_bao(
      new.user_id, 'ket_qua_doi_nhom', 'thong_tin', 'Đề xuất đổi vai trò không được duyệt',
      'Đề xuất thay đổi vai trò giảng dạy của bạn đã được xem xét và không áp dụng.',
      '/danh-gia'
    );
  end if;
  return null;
end;
$$;
create trigger de_xuat_nhan_su_tb_ket_qua
  after update of trang_thai on public.de_xuat_nhan_su
  for each row
  when (old.trang_thai = 'cho_duyet' and new.trang_thai <> 'cho_duyet' and new.loai = 'doi_nhom')
  execute function public.tb_de_xuat_ket_qua();

-- Đóng kỳ = công bố KPI: báo cho mọi người có kết quả trong kỳ (kết quả được ghi trước khi kỳ đổi trạng thái)
create function public.tb_ky_cong_bo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select k.user_id, k.kpi from public.ket_qua_kpi k where k.ky_id = new.id loop
    perform public.tao_thong_bao(
      r.user_id, 'cong_bo_kpi', 'thong_tin', 'Đã công bố KPI ' || new.ten,
      format('KPI của bạn trong %s: %s điểm.', new.ten, trim(to_char(r.kpi, 'FM990.0'))),
      '/danh-gia', 'cong_bo_kpi:' || new.id
    );
  end loop;
  return null;
end;
$$;
create trigger ky_danh_gia_tb_cong_bo
  after update of trang_thai on public.ky_danh_gia
  for each row
  when (old.trang_thai is distinct from new.trang_thai and new.trang_thai = 'da_dong')
  execute function public.tb_ky_cong_bo();

-- Điểm danh: (1) bị Admin chỉnh tay -> báo người bị sửa; (2) đã check-in -> nhắc check-in của Bài đó hết hiệu lực
create function public.tb_diem_danh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bai text;
  v_lop_id uuid;
  v_lop text;
begin
  if tg_op = 'INSERT' and new.check_in_luc is not null then
    update public.thong_bao set da_doc = true
    where user_id = new.user_id and khoa = 'nhac_check_in:' || new.bai_id || ':' || new.user_id and not da_doc;
  end if;

  if new.chinh_luc is not null and new.chinh_boi is distinct from new.user_id
     and (tg_op = 'INSERT' or old.chinh_luc is distinct from new.chinh_luc) then
    select b.ten, l.id, l.ten into v_bai, v_lop_id, v_lop
    from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = new.bai_id;
    perform public.tao_thong_bao(
      new.user_id, 'sua_diem_danh', 'thong_tin', 'Điểm danh của bạn đã được chỉnh sửa',
      format('Lớp %s — %s: B1 = %s%%. Lý do: %s.', v_lop, v_bai, trim(to_char(new.b1_phan_tram, 'FM990.##')), coalesce(new.ly_do_chinh, '—')),
      '/lop-hoc/' || v_lop_id
    );
  end if;
  return null;
end;
$$;
create trigger diem_danh_bai_tb
  after insert or update on public.diem_danh_bai
  for each row execute function public.tb_diem_danh();

-- Được gán / bị thu hồi Quyền Quản lý lớp — hành động nhạy cảm, báo ngay
create function public.tb_quyen_quan_ly_lop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.tao_thong_bao(
    new.id, 'quyen_quan_ly_lop', 'thong_tin',
    case when new.co_quyen_quan_ly_lop then 'Bạn được gán Quyền Quản lý lớp' else 'Quyền Quản lý lớp của bạn đã bị thu hồi' end,
    case when new.co_quyen_quan_ly_lop then 'Bạn có thêm toàn quyền quản lý lớp, đăng ký, đề xuất nhân sự và đánh giá (trừ chỉnh sửa hệ thống).'
         else 'Bạn không còn các quyền quản trị thêm này; hồ sơ giảng viên/trợ giảng của bạn giữ nguyên.' end,
    '/ho-so'
  );
  return null;
end;
$$;
create trigger profiles_tb_quyen_quan_ly_lop
  after update of co_quyen_quan_ly_lop on public.profiles
  for each row
  when (old.co_quyen_quan_ly_lop is distinct from new.co_quyen_quan_ly_lop)
  execute function public.tb_quyen_quan_ly_lop();

-- ============ Web Push: gọi webhook của app khi có thông báo mới ============
create function public.tb_gui_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  if to_regnamespace('net') is null then
    return null;
  end if;
  if not exists (select 1 from public.push_subscription s where s.user_id = new.user_id) then
    return null;
  end if;
  select h.url, h.secret into c from public.cau_hinh_push h;
  if not found then
    return null;
  end if;
  begin
    perform net.http_post(
      url := c.url,
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', c.secret)
    );
  exception when others then
    -- Push hỏng không được làm hỏng nghiệp vụ gốc
    raise warning 'Không gọi được webhook push: %', sqlerrm;
  end;
  return null;
end;
$$;
create trigger thong_bao_tb_gui_push
  after insert on public.thong_bao
  for each row execute function public.tb_gui_push();

-- ============ Job định kỳ ============
-- Tham số: nhắc trước giờ học bao nhiêu phút (không vượt quá khung check-in vì nhắc lúc chưa bấm được là vô nghĩa)
insert into public.cau_hinh_he_thong (khoa, gia_tri, mo_ta) values
  ('nhac_check_in_truoc_phut', 30, 'Gửi thông báo nhắc check-in khi còn bao nhiêu phút trước giờ bắt đầu Bài (không vượt quá khung check-in)')
on conflict (khoa) do nothing;

-- Nhắc check-in: mỗi (Bài, người được phân công) chỉ 1 lần, chỉ khi chưa check-in, Bài chưa bắt đầu, lớp chưa hủy.
-- Trả về số thông báo đã tạo. Gọi từ pg_cron mỗi phút (không có người dùng nên không cần auth.uid()).
create function public.nhac_check_in()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phut int := least(
    greatest(public.cau_hinh_so('nhac_check_in_truoc_phut', 30)::int, 1),
    greatest(public.cau_hinh_so('checkin_truoc_phut', 45)::int, 1)
  );
  r record;
  v_n int := 0;
begin
  for r in
    select s.nguoi_phan_cong as uid, b.id as bai_id, b.ten as bai_ten, b.bat_dau, l.id as lop_id, l.ten as lop_ten
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong'
      and l.trang_thai <> 'da_huy'
      and b.bat_dau > now()
      and b.bat_dau <= now() + make_interval(mins => v_phut)
      and not exists (select 1 from public.diem_danh_bai d where d.bai_id = b.id and d.user_id = s.nguoi_phan_cong)
  loop
    if public.tao_thong_bao(
      r.uid, 'nhac_check_in', 'can_hanh_dong', 'Sắp đến giờ dạy — nhớ check-in',
      format('Lớp %s — %s bắt đầu lúc %s. Bấm "Tôi đã có mặt" để không bị tính 0%% chuyên cần.', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau)),
      '/lop-hoc/' || r.lop_id, 'nhac_check_in:' || r.bai_id || ':' || r.uid
    ) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- Dọn thông báo đã đọc quá 180 ngày (giữ bảng gọn)
create function public.don_thong_bao_cu()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  delete from public.thong_bao where da_doc and created_at < now() - interval '180 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Bật pg_cron / pg_net nếu môi trường cho phép (Supabase: được). Không được thì migration vẫn qua, chỉ báo để bật tay ở Dashboard > Database > Extensions.
do $$
begin
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice 'Chưa bật được pg_net (%). Hãy bật ở Database > Extensions để gửi Web Push.', sqlerrm;
  end;
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'Chưa bật được pg_cron (%). Hãy bật ở Database > Extensions rồi chạy lại phần cron.schedule cuối file.', sqlerrm;
  end;
  if to_regnamespace('cron') is not null then
    perform cron.schedule('nhac-check-in', '* * * * *', 'select public.nhac_check_in()');
    perform cron.schedule('don-thong-bao-cu', '17 3 * * *', 'select public.don_thong_bao_cu()');
  end if;
end;
$$;

-- ============ Cấu hình điểm danh: thêm "nhắc check-in trước bao nhiêu phút" ============
create or replace function public.luu_cau_hinh_diem_danh(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_truoc numeric := coalesce((p ->> 'checkin_truoc_phut')::numeric, public.cau_hinh_so('checkin_truoc_phut', 45));
  v_max numeric := coalesce((p ->> 'b1_tre_toi_da_phut')::numeric, public.cau_hinh_so('b1_tre_toi_da_phut', 30));
  v_nhac numeric := coalesce((p ->> 'nhac_check_in_truoc_phut')::numeric, public.cau_hinh_so('nhac_check_in_truoc_phut', 30));
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
  if v_nhac < 1 or v_nhac > 240 or v_nhac <> trunc(v_nhac) then
    raise exception 'Số phút nhắc check-in trước giờ học phải là số nguyên từ 1 đến 240' using errcode = '23514';
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
  update public.cau_hinh_he_thong set gia_tri = v_nhac, updated_at = now(), updated_by = v_uid where khoa = 'nhac_check_in_truoc_phut';
  -- TODO Giai đoạn 9: ghi Nhật ký hệ thống (giá trị trước/sau)
end;
$$;

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.thong_bao_doc_luc() from public, anon, authenticated;
revoke execute on function public.luu_push_subscription(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.xoa_push_subscription(text) from public, anon, authenticated;
revoke execute on function public.dinh_dang_gio(timestamptz) from public, anon, authenticated;
revoke execute on function public.ten_vai_tro(public.vai_tro_giang_day) from public, anon, authenticated;
revoke execute on function public.nguoi_quan_tri() from public, anon, authenticated;
revoke execute on function public.tao_thong_bao(uuid, public.loai_thong_bao, public.muc_do_thong_bao, text, text, text, text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.nguoi_du_dieu_kien_lop(uuid) from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_moi() from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_cap_nhat() from public, anon, authenticated;
revoke execute on function public.tb_slot_thay_doi() from public, anon, authenticated;
revoke execute on function public.tb_bai_doi_lich() from public, anon, authenticated;
revoke execute on function public.tb_lop_thay_doi() from public, anon, authenticated;
revoke execute on function public.tb_slot_moi() from public, anon, authenticated;
revoke execute on function public.tb_de_xuat_moi() from public, anon, authenticated;
revoke execute on function public.tb_de_xuat_ket_qua() from public, anon, authenticated;
revoke execute on function public.tb_ky_cong_bo() from public, anon, authenticated;
revoke execute on function public.tb_diem_danh() from public, anon, authenticated;
revoke execute on function public.tb_quyen_quan_ly_lop() from public, anon, authenticated;
revoke execute on function public.tb_gui_push() from public, anon, authenticated;
revoke execute on function public.nhac_check_in() from public, anon, authenticated;
revoke execute on function public.don_thong_bao_cu() from public, anon, authenticated;
revoke execute on function public.luu_cau_hinh_diem_danh(jsonb) from public, anon, authenticated;

grant execute on function public.luu_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.xoa_push_subscription(text) to authenticated;
grant execute on function public.luu_cau_hinh_diem_danh(jsonb) to authenticated;
