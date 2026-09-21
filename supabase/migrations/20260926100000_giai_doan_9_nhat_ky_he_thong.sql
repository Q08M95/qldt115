-- Giai đoạn 9: Nhật ký hệ thống (CLAUDE.md mục 4.6)
--
-- Nguyên tắc:
--   * Ghi log bằng TRIGGER trên bảng nghiệp vụ/cấu hình (không sửa lại các hàm Giai đoạn 4-8) nên mọi đường thay đổi dữ liệu đều được phủ.
--     Chỉ ghi khi có người đăng nhập thực hiện (auth.uid() khác null): job nền, seed, script quản trị không tạo log.
--   * Bảng audit_log chỉ-thêm: không ai (kể cả Admin, service_role) sửa/xóa qua API; ghi chỉ qua hàm/trigger.
--   * Mỗi dòng: người thực hiện (kèm tên tại thời điểm đó), loại hành động, đối tượng, thời gian, giá trị TRƯỚC/SAU (chỉ các trường thay đổi),
--     lý do, nhãn "tự duyệt". Cấu hình lưu đầy đủ giá trị cũ/mới.
--   * Quyền xem: người giữ Quyền Quản lý lớp/Admin xem toàn bộ; GV/TG chỉ xem dòng có tên mình trong nguoi_lien_quan.
--     Dòng liên quan tới NHÃN NHÓM (đổi nhóm) để nguoi_lien_quan rỗng => GV/TG không thấy (mục 4.7). Log xử lý đề xuất đổi nhóm không kèm tên nhóm.
--   * Tạo tài khoản / đặt lại mật khẩu / sửa email (dùng service_role ở server) ghi qua hàm ghi_nhat_ky_ngoai(); tuyệt đối không ghi mật khẩu.

-- ============ Kiểu + bảng ============
create type public.loai_nhat_ky as enum (
  'duyet_dang_ky',
  'tu_choi_dang_ky',
  'moi_giang_day',
  'phan_hoi_loi_moi',
  'thu_hoi_loi_moi',
  'huy_phan_cong',
  'xu_ly_de_xuat',
  'sua_lop',
  'huy_lop',
  'doi_lich_bai',
  'nhap_ket_qua_lop',
  'doi_trang_thai_tham_gia',
  'doi_cau_hinh',
  'doi_ky_danh_gia',
  'doi_phan_quyen',
  'gan_quyen_quan_ly_lop',
  'sua_diem_danh',
  'nhap_du_gio',
  'sua_ho_so',
  'doi_nhom',
  'tai_khoan'
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Không khóa ngoại: log phải còn nguyên kể cả khi tài khoản bị xóa; tên lưu kèm tại thời điểm thực hiện
  nguoi_thuc_hien uuid,
  nguoi_thuc_hien_ten text,
  loai public.loai_nhat_ky not null,
  doi_tuong text,
  mo_ta text not null,
  lien_ket text,
  -- Những người mà dòng log liên quan trực tiếp (được phép xem dòng này dù không phải quản trị)
  nguoi_lien_quan uuid[] not null default '{}',
  tu_duyet boolean not null default false,
  ly_do text,
  truoc jsonb,
  sau jsonb
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_loai_idx on public.audit_log (loai, created_at desc);
create index audit_log_lien_quan_idx on public.audit_log using gin (nguoi_lien_quan);

revoke all on table public.audit_log from anon, authenticated, service_role;
grant select on public.audit_log to authenticated;
alter table public.audit_log enable row level security;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_quan_tri() or (select auth.uid()) = any (nguoi_lien_quan));

-- ============ Hàm tiện ích nội bộ ============
-- Các trường thay đổi giữa 2 đối tượng jsonb (p_lay_cu = true: giá trị cũ; false: giá trị mới)
create function public.jsonb_khac(p_cu jsonb, p_moi jsonb, p_lay_cu boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, case when p_lay_cu then p_cu -> k else p_moi -> k end), '{}'::jsonb)
  from (
    select k from jsonb_object_keys(coalesce(p_cu, '{}'::jsonb) || coalesce(p_moi, '{}'::jsonb)) as k
    where (p_cu -> k) is distinct from (p_moi -> k)
  ) d;
$$;

-- Ghi 1 dòng nhật ký cho người đang thao tác (bỏ qua khi không có người đăng nhập)
create function public.ghi_nhat_ky(
  p_loai public.loai_nhat_ky,
  p_doi_tuong text,
  p_mo_ta text,
  p_lien_ket text default null,
  p_lien_quan uuid[] default null,
  p_truoc jsonb default null,
  p_sau jsonb default null,
  p_ly_do text default null,
  p_tu_duyet boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  insert into public.audit_log (nguoi_thuc_hien, nguoi_thuc_hien_ten, loai, doi_tuong, mo_ta, lien_ket, nguoi_lien_quan, tu_duyet, ly_do, truoc, sau)
  values (v_uid, (select p.ho_ten from public.profiles p where p.id = v_uid), p_loai, p_doi_tuong, p_mo_ta, p_lien_ket,
          coalesce(p_lien_quan, '{}'), coalesce(p_tu_duyet, false), nullif(btrim(coalesce(p_ly_do, '')), ''), p_truoc, p_sau);
end;
$$;

-- Ghi log từ phía server dùng service_role (tạo tài khoản, đặt lại mật khẩu, sửa email) — chỉ service_role gọi được.
create function public.ghi_nhat_ky_ngoai(
  p_nguoi uuid,
  p_loai public.loai_nhat_ky,
  p_doi_tuong text,
  p_mo_ta text,
  p_lien_quan uuid[] default null,
  p_truoc jsonb default null,
  p_sau jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (nguoi_thuc_hien, nguoi_thuc_hien_ten, loai, doi_tuong, mo_ta, nguoi_lien_quan, truoc, sau)
  values (p_nguoi, (select p.ho_ten from public.profiles p where p.id = p_nguoi), p_loai, p_doi_tuong, p_mo_ta, coalesce(p_lien_quan, '{}'), p_truoc, p_sau);
end;
$$;

-- ============ Đăng ký / lời mời ============
-- Thêm lời mời (Admin mời dạy)
create function public.nk_dang_ky_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select m.user_id, m.vai_tro, p.ho_ten, b.ten as bai_ten, b.bat_dau, l.id as lop_id, l.ten as lop_ten
    from moi m
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    join public.profiles p on p.id = m.user_id
    where m.loai = 'duoc_moi'
  loop
    perform public.ghi_nhat_ky(
      'moi_giang_day', format('Lớp %s — %s', r.lop_ten, r.bai_ten),
      format('Mời %s dạy %s (%s), %s', r.ho_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro), public.dinh_dang_gio(r.bat_dau)),
      '/lop-hoc/' || r.lop_id, array[r.user_id]
    );
  end loop;
  return null;
end;
$$;
create trigger dang_ky_giang_day_nk_moi
  after insert on public.dang_ky_giang_day
  referencing new table as moi
  for each statement execute function public.nk_dang_ky_moi();

-- Duyệt/từ chối đăng ký (gắn nhãn tự duyệt), người được mời trả lời, Admin thu hồi lời mời
create function public.nk_dang_ky_cap_nhat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_dt text;
begin
  for r in
    select m.loai, m.trang_thai, m.user_id, m.vai_tro, m.ly_do, m.tu_duyet, p.ho_ten,
           b.ten as bai_ten, l.id as lop_id, l.ten as lop_ten
    from moi m
    join cu on cu.id = m.id
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    join public.profiles p on p.id = m.user_id
    where cu.trang_thai = 'cho_xu_ly' and m.trang_thai <> 'cho_xu_ly'
  loop
    v_dt := format('Lớp %s — %s', r.lop_ten, r.bai_ten);
    if r.loai = 'tu_dang_ky' and r.trang_thai = 'da_duyet' then
      perform public.ghi_nhat_ky(
        'duyet_dang_ky', v_dt, format('Duyệt đăng ký của %s (%s)%s', r.ho_ten, public.ten_vai_tro(r.vai_tro), case when r.tu_duyet then ' — tự duyệt' else '' end),
        '/lop-hoc/' || r.lop_id, array[r.user_id], jsonb_build_object('trang_thai', 'cho_xu_ly'), jsonb_build_object('trang_thai', 'da_duyet'), null, r.tu_duyet
      );
    elsif r.loai = 'tu_dang_ky' and r.trang_thai = 'tu_choi' then
      perform public.ghi_nhat_ky(
        'tu_choi_dang_ky', v_dt, format('Từ chối đăng ký của %s (%s)%s', r.ho_ten, public.ten_vai_tro(r.vai_tro), case when r.tu_duyet then ' — tự từ chối' else '' end),
        '/lop-hoc/' || r.lop_id, array[r.user_id], jsonb_build_object('trang_thai', 'cho_xu_ly'), jsonb_build_object('trang_thai', 'tu_choi'), r.ly_do, r.tu_duyet
      );
    elsif r.loai = 'duoc_moi' and r.trang_thai in ('da_duyet', 'tu_choi') then
      perform public.ghi_nhat_ky(
        'phan_hoi_loi_moi', v_dt, format('%s %s lời mời dạy (%s)', r.ho_ten, case when r.trang_thai = 'da_duyet' then 'đồng ý' else 'từ chối' end, public.ten_vai_tro(r.vai_tro)),
        '/lop-hoc/' || r.lop_id, array[r.user_id], jsonb_build_object('trang_thai', 'cho_xu_ly'),
        jsonb_build_object('trang_thai', case when r.trang_thai = 'da_duyet' then 'dong_y' else 'tu_choi' end)
      );
    elsif r.loai = 'duoc_moi' and r.trang_thai = 'da_huy' and r.ly_do = 'Admin thu hồi lời mời' then
      perform public.ghi_nhat_ky(
        'thu_hoi_loi_moi', v_dt, format('Thu hồi lời mời dạy của %s (%s)', r.ho_ten, public.ten_vai_tro(r.vai_tro)),
        '/lop-hoc/' || r.lop_id, array[r.user_id], jsonb_build_object('trang_thai', 'cho_xu_ly'), jsonb_build_object('trang_thai', 'da_huy')
      );
    end if;
  end loop;
  return null;
end;
$$;
create trigger dang_ky_giang_day_nk_cap_nhat
  after update on public.dang_ky_giang_day
  referencing old table as cu new table as moi
  for each statement execute function public.nk_dang_ky_cap_nhat();

-- Hủy phân công 1 slot đã có người
create function public.nk_slot_huy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bai text;
  v_lop_id uuid;
  v_lop text;
  v_ten text;
  v_ly text;
begin
  select b.ten, l.id, l.ten into v_bai, v_lop_id, v_lop from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = old.bai_id;
  select p.ho_ten into v_ten from public.profiles p where p.id = old.nguoi_phan_cong;
  select d.ly_do into v_ly from public.dang_ky_giang_day d
  where d.slot_id = old.id and d.user_id = old.nguoi_phan_cong and d.trang_thai = 'da_huy' order by d.updated_at desc limit 1;
  perform public.ghi_nhat_ky(
    'huy_phan_cong', format('Lớp %s — %s', v_lop, v_bai), format('Hủy phân công %s (%s)', v_ten, public.ten_vai_tro(old.vai_tro)),
    '/lop-hoc/' || v_lop_id, array[old.nguoi_phan_cong], jsonb_build_object('nguoi_phan_cong', v_ten), jsonb_build_object('nguoi_phan_cong', null), v_ly
  );
  return null;
end;
$$;
create trigger slot_giang_day_nk_huy
  after update of nguoi_phan_cong on public.slot_giang_day
  for each row
  when (old.nguoi_phan_cong is not null and new.nguoi_phan_cong is distinct from old.nguoi_phan_cong)
  execute function public.nk_slot_huy();

-- ============ Đề xuất nhân sự ============
-- Không đưa tên nhóm vào log (GV/TG có thể xem dòng này của chính mình)
create function public.nk_de_xuat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ten text;
  v_loai text := case new.loai
    when 'phan_cong' then 'phân công'
    when 'dao_tao' then 'đào tạo bồi dưỡng'
    when 'khen_thuong_nhac_nho' then 'khen thưởng/nhắc nhở'
    else 'đổi nhóm' end;
begin
  select p.ho_ten into v_ten from public.profiles p where p.id = new.user_id;
  perform public.ghi_nhat_ky(
    'xu_ly_de_xuat', 'Đề xuất ' || v_loai || ' — ' || v_ten,
    format('%s đề xuất %s cho %s', case when new.trang_thai = 'da_duyet' then 'Duyệt' else 'Bỏ qua' end, v_loai, v_ten),
    '/nhan-su/de-xuat', array[new.user_id], jsonb_build_object('trang_thai', old.trang_thai), jsonb_build_object('trang_thai', new.trang_thai)
  );
  return null;
end;
$$;
create trigger de_xuat_nhan_su_nk
  after update of trang_thai on public.de_xuat_nhan_su
  for each row
  when (old.trang_thai = 'cho_duyet' and new.trang_thai <> 'cho_duyet')
  execute function public.nk_de_xuat();

-- ============ Lớp / Bài ============
create function public.nk_lop_hoc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lq uuid[];
  v_cu jsonb;
  v_moi jsonb;
  v_ttcu text;
  v_ttmoi text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;

  select coalesce(array_agg(distinct q.uid), '{}') into v_lq from (
    select s.nguoi_phan_cong as uid from public.slot_giang_day s join public.bai_hoc b on b.id = s.bai_id
    where b.lop_id = new.id and s.nguoi_phan_cong is not null
    union
    select d.user_id from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
    where b.lop_id = new.id and d.trang_thai = 'cho_xu_ly'
  ) q;

  if new.trang_thai is distinct from old.trang_thai then
    v_ttcu := case old.trang_thai when 'nhap' then 'Nháp' when 'dang_mo' then 'Đang mở đăng ký' when 'da_hoan_thanh' then 'Đã hoàn thành' else 'Đã hủy' end;
    v_ttmoi := case new.trang_thai when 'nhap' then 'Nháp' when 'dang_mo' then 'Đang mở đăng ký' when 'da_hoan_thanh' then 'Đã hoàn thành' else 'Đã hủy' end;
    perform public.ghi_nhat_ky(
      (case when new.trang_thai = 'da_huy' then 'huy_lop' else 'sua_lop' end)::public.loai_nhat_ky,
      'Lớp ' || new.ten,
      case when new.trang_thai = 'da_huy' then format('Hủy lớp %s', new.ten) else format('Đổi trạng thái lớp %s: %s → %s', new.ten, v_ttcu, v_ttmoi) end,
      '/lop-hoc/' || new.id, v_lq, jsonb_build_object('trang_thai', old.trang_thai), jsonb_build_object('trang_thai', new.trang_thai)
    );
  end if;

  -- Sửa thông tin lớp đã mở
  v_cu := jsonb_build_object('ten', old.ten, 'nhom_lop', (select n.ten from public.danh_muc_nhom_lop n where n.id = old.nhom_lop_id),
    'doi_tuong', old.doi_tuong, 'loai_kinh_phi', old.loai_kinh_phi, 'ngay_bat_dau', old.ngay_bat_dau, 'ngay_ket_thuc', old.ngay_ket_thuc, 'dia_diem', old.dia_diem);
  v_moi := jsonb_build_object('ten', new.ten, 'nhom_lop', (select n.ten from public.danh_muc_nhom_lop n where n.id = new.nhom_lop_id),
    'doi_tuong', new.doi_tuong, 'loai_kinh_phi', new.loai_kinh_phi, 'ngay_bat_dau', new.ngay_bat_dau, 'ngay_ket_thuc', new.ngay_ket_thuc, 'dia_diem', new.dia_diem);
  if new.trang_thai <> 'nhap' and v_cu is distinct from v_moi then
    perform public.ghi_nhat_ky(
      'sua_lop', 'Lớp ' || new.ten, format('Sửa thông tin lớp %s', new.ten), '/lop-hoc/' || new.id, v_lq,
      public.jsonb_khac(v_cu, v_moi, true), public.jsonb_khac(v_cu, v_moi, false)
    );
  end if;

  -- Nhập kết quả sau khi hoàn thành (C1 nhập tay/C3); C1 do khảo sát công khai gửi không có người đăng nhập nên không vào đây
  v_cu := jsonb_build_object('c1_phan_tram', old.c1_phan_tram, 'c3_phan_tram', old.c3_phan_tram);
  v_moi := jsonb_build_object('c1_phan_tram', new.c1_phan_tram, 'c3_phan_tram', new.c3_phan_tram);
  if v_cu is distinct from v_moi then
    perform public.ghi_nhat_ky(
      'nhap_ket_qua_lop', 'Lớp ' || new.ten, format('Nhập kết quả lớp %s (C1/C3)', new.ten), '/lop-hoc/' || new.id, null,
      public.jsonb_khac(v_cu, v_moi, true), public.jsonb_khac(v_cu, v_moi, false)
    );
  end if;
  return null;
end;
$$;
create trigger lop_hoc_nk
  after update on public.lop_hoc
  for each row execute function public.nk_lop_hoc();

-- Đổi giờ Bài đã có người được phân công
create function public.nk_bai_doi_lich()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lq uuid[];
  v_lop text;
begin
  select coalesce(array_agg(distinct s.nguoi_phan_cong), '{}') into v_lq
  from public.slot_giang_day s where s.bai_id = new.id and s.nguoi_phan_cong is not null;
  if coalesce(array_length(v_lq, 1), 0) = 0 then
    return null;
  end if;
  select l.ten into v_lop from public.lop_hoc l where l.id = new.lop_id;
  perform public.ghi_nhat_ky(
    'doi_lich_bai', format('Lớp %s — %s', v_lop, new.ten), format('Đổi lịch %s (lớp %s)', new.ten, v_lop), '/lop-hoc/' || new.lop_id, v_lq,
    jsonb_build_object('bat_dau', old.bat_dau, 'ket_thuc', old.ket_thuc), jsonb_build_object('bat_dau', new.bat_dau, 'ket_thuc', new.ket_thuc)
  );
  return null;
end;
$$;
create trigger bai_hoc_nk_doi_lich
  after update of bat_dau, ket_thuc on public.bai_hoc
  for each row
  when (old.bat_dau is distinct from new.bat_dau or old.ket_thuc is distinct from new.ket_thuc)
  execute function public.nk_bai_doi_lich();

-- ============ Hồ sơ nhân sự ============
create function public.nk_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cu jsonb;
  v_moi jsonb;
begin
  if v_uid is null then
    return null;
  end if;

  if new.trang_thai_tham_gia is distinct from old.trang_thai_tham_gia then
    perform public.ghi_nhat_ky(
      'doi_trang_thai_tham_gia', new.ho_ten, format('Đổi trạng thái tham gia giảng dạy của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('trang_thai_tham_gia', old.trang_thai_tham_gia), jsonb_build_object('trang_thai_tham_gia', new.trang_thai_tham_gia)
    );
  end if;

  if new.co_quyen_quan_ly_lop is distinct from old.co_quyen_quan_ly_lop then
    perform public.ghi_nhat_ky(
      'gan_quyen_quan_ly_lop', new.ho_ten,
      format('%s Quyền Quản lý lớp %s %s', case when new.co_quyen_quan_ly_lop then 'Gán' else 'Thu hồi' end, case when new.co_quyen_quan_ly_lop then 'cho' else 'của' end, new.ho_ten),
      '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('co_quyen_quan_ly_lop', old.co_quyen_quan_ly_lop), jsonb_build_object('co_quyen_quan_ly_lop', new.co_quyen_quan_ly_lop)
    );
  end if;

  if new.phan_quyen is distinct from old.phan_quyen then
    perform public.ghi_nhat_ky(
      'doi_phan_quyen', new.ho_ten, format('Đổi phân quyền của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('phan_quyen', old.phan_quyen), jsonb_build_object('phan_quyen', new.phan_quyen)
    );
  end if;

  -- Người khác sửa hồ sơ của mình (tự sửa hồ sơ của chính mình không ghi)
  if v_uid <> new.id then
    v_cu := jsonb_build_object('ho_ten', old.ho_ten, 'so_dien_thoai', old.so_dien_thoai, 'avatar_url', old.avatar_url, 'email', old.email);
    v_moi := jsonb_build_object('ho_ten', new.ho_ten, 'so_dien_thoai', new.so_dien_thoai, 'avatar_url', new.avatar_url, 'email', new.email);
    if v_cu is distinct from v_moi then
      perform public.ghi_nhat_ky(
        'sua_ho_so', new.ho_ten, format('Sửa hồ sơ của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
        public.jsonb_khac(v_cu, v_moi, true), public.jsonb_khac(v_cu, v_moi, false)
      );
    end if;
  end if;
  return null;
end;
$$;
create trigger profiles_nk
  after update on public.profiles
  for each row execute function public.nk_profiles();

-- Đổi nhóm (chứa nhãn nhóm nên chỉ người quản trị xem: nguoi_lien_quan để trống)
create function public.nk_nhan_su_nhom()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_ten text;
begin
  select p.ho_ten into v_ten from public.profiles p where p.id = v_id;
  if tg_op = 'UPDATE' then
    if new.nhom is not distinct from old.nhom then
      return null;
    end if;
  end if;
  perform public.ghi_nhat_ky(
    'doi_nhom', v_ten,
    case tg_op when 'INSERT' then format('Xếp nhóm cho %s', v_ten) when 'DELETE' then format('Gỡ nhóm của %s', v_ten) else format('Đổi nhóm của %s', v_ten) end,
    '/nhan-su/' || v_id, null,
    case when tg_op = 'INSERT' then null else jsonb_build_object('nhom', old.nhom) end,
    case when tg_op = 'DELETE' then null else jsonb_build_object('nhom', new.nhom) end
  );
  return null;
end;
$$;
create trigger nhan_su_nhom_nk
  after insert or update or delete on public.nhan_su_nhom
  for each row execute function public.nk_nhan_su_nhom();

-- Chứng chỉ / chuyên môn của người khác do Admin sửa
create function public.nk_chung_chi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_ten text;
  v_cu jsonb;
  v_moi jsonb;
begin
  if v_uid is null or v_uid = v_id then
    return null;
  end if;
  select p.ho_ten into v_ten from public.profiles p where p.id = v_id;
  if tg_op <> 'INSERT' then
    v_cu := jsonb_build_object('loai', (select m.ten from public.danh_muc_loai_chung_chi m where m.id = old.loai_id), 'so_chung_chi', old.so_chung_chi,
      'noi_dung', old.noi_dung, 'ngay_cap', old.ngay_cap, 'noi_cap', old.noi_cap, 'co_hinh_anh', old.hinh_anh_path is not null);
  end if;
  if tg_op <> 'DELETE' then
    v_moi := jsonb_build_object('loai', (select m.ten from public.danh_muc_loai_chung_chi m where m.id = new.loai_id), 'so_chung_chi', new.so_chung_chi,
      'noi_dung', new.noi_dung, 'ngay_cap', new.ngay_cap, 'noi_cap', new.noi_cap, 'co_hinh_anh', new.hinh_anh_path is not null);
  end if;
  if tg_op = 'UPDATE' then
    if v_cu is not distinct from v_moi then
      return null;
    end if;
  end if;
  perform public.ghi_nhat_ky(
    'sua_ho_so', v_ten,
    format('%s chứng chỉ của %s', case tg_op when 'INSERT' then 'Thêm' when 'DELETE' then 'Xóa' else 'Sửa' end, v_ten),
    '/nhan-su/' || v_id, array[v_id],
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, true) else v_cu end,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, false) else v_moi end
  );
  return null;
end;
$$;
create trigger chung_chi_nk
  after insert or update or delete on public.chung_chi
  for each row execute function public.nk_chung_chi();

create function public.nk_profile_chuyen_mon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_ten text;
  v_cm text;
  v_cu jsonb;
  v_moi jsonb;
begin
  if v_uid is null or v_uid = v_id then
    return null;
  end if;
  select p.ho_ten into v_ten from public.profiles p where p.id = v_id;
  select m.ten into v_cm from public.danh_muc_chuyen_mon m
  where m.id = case when tg_op = 'DELETE' then old.chuyen_mon_id else new.chuyen_mon_id end;
  if tg_op <> 'INSERT' then
    v_cu := jsonb_build_object('chuyen_mon', v_cm, 'chi_tiet', old.chi_tiet);
  end if;
  if tg_op <> 'DELETE' then
    v_moi := jsonb_build_object('chuyen_mon', v_cm, 'chi_tiet', new.chi_tiet);
  end if;
  if tg_op = 'UPDATE' then
    if v_cu is not distinct from v_moi then
      return null;
    end if;
  end if;
  perform public.ghi_nhat_ky(
    'sua_ho_so', v_ten,
    format('%s chuyên môn "%s" của %s', case tg_op when 'INSERT' then 'Thêm' when 'DELETE' then 'Xóa' else 'Sửa' end, v_cm, v_ten),
    '/nhan-su/' || v_id, array[v_id],
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, true) else v_cu end,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, false) else v_moi end
  );
  return null;
end;
$$;
create trigger profile_chuyen_mon_nk
  after insert or update or delete on public.profile_chuyen_mon
  for each row execute function public.nk_profile_chuyen_mon();

-- ============ Điểm danh (B1) chỉnh tay + dự giờ (C2) ============
create function public.nk_diem_danh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ten text;
  v_bai text;
  v_lop text;
  v_lop_id uuid;
begin
  if new.chinh_luc is null or new.chinh_boi is not distinct from new.user_id then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if old.chinh_luc is not distinct from new.chinh_luc then
      return null;
    end if;
  end if;
  select p.ho_ten into v_ten from public.profiles p where p.id = new.user_id;
  select b.ten, l.ten, l.id into v_bai, v_lop, v_lop_id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = new.bai_id;
  perform public.ghi_nhat_ky(
    'sua_diem_danh', format('Lớp %s — %s', v_lop, v_bai), format('Chỉnh điểm danh (B1) của %s', v_ten), '/lop-hoc/' || v_lop_id, array[new.user_id],
    case when tg_op = 'UPDATE' then jsonb_build_object('b1_phan_tram', old.b1_phan_tram, 'chinh_tay', old.chinh_tay, 'check_in_luc', old.check_in_luc)
         else jsonb_build_object('b1_phan_tram', null, 'chinh_tay', false, 'check_in_luc', null) end,
    jsonb_build_object('b1_phan_tram', new.b1_phan_tram, 'chinh_tay', true, 'check_in_luc', new.check_in_luc),
    new.ly_do_chinh
  );
  return null;
end;
$$;
create trigger diem_danh_bai_nk
  after insert or update on public.diem_danh_bai
  for each row execute function public.nk_diem_danh();

create function public.nk_du_gio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := coalesce(new.user_id, old.user_id);
  v_bai uuid := case when tg_op = 'DELETE' then old.bai_id else new.bai_id end;
  v_ten text;
  v_tb text;
  v_lop text;
  v_lop_id uuid;
begin
  select p.ho_ten into v_ten from public.profiles p where p.id = v_uid;
  select b.ten, l.ten, l.id into v_tb, v_lop, v_lop_id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = v_bai;
  perform public.ghi_nhat_ky(
    'nhap_du_gio', format('Lớp %s — %s', v_lop, v_tb),
    format('%s điểm dự giờ (C2) của %s', case tg_op when 'INSERT' then 'Nhập' when 'DELETE' then 'Xóa' else 'Sửa' end, v_ten),
    '/nhan-su/' || v_uid, array[v_uid],
    case when tg_op = 'INSERT' then null else jsonb_build_object('muc_diem', old.muc_diem) end,
    case when tg_op = 'DELETE' then null else jsonb_build_object('muc_diem', new.muc_diem) end
  );
  return null;
end;
$$;
create trigger danh_gia_du_gio_nk
  after insert or update or delete on public.danh_gia_du_gio
  for each row execute function public.nk_du_gio();

-- ============ Cấu hình hệ thống (giá trị cũ/mới) ============
-- Dùng chung cho các bảng cấu hình; tham số trigger = nhãn hiển thị. Chỉ ghi khi có thay đổi thật (bỏ qua updated_at).
create function public.nk_cau_hinh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nhan text := tg_argv[0];
  v_cu jsonb;
  v_moi jsonb;
  v_ref jsonb;
  v_ten text;
  v_hd text := case tg_op when 'INSERT' then 'Thêm' when 'DELETE' then 'Xóa' else 'Sửa' end;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  if tg_op <> 'INSERT' then
    v_cu := to_jsonb(old) - 'updated_at' - 'updated_by' - 'created_at';
  end if;
  if tg_op <> 'DELETE' then
    v_moi := to_jsonb(new) - 'updated_at' - 'updated_by' - 'created_at';
  end if;
  if tg_op = 'UPDATE' then
    if v_cu = v_moi then
      return null;
    end if;
  end if;
  v_ref := coalesce(v_moi, v_cu);
  v_ten := coalesce(v_ref ->> 'ten', v_ref ->> 'khoa', v_ref ->> 'ma', v_ref ->> 'muc');
  perform public.ghi_nhat_ky(
    'doi_cau_hinh',
    v_nhan || ': ' || coalesce(v_ten, ''),
    case when v_ref ? 'khoa' and v_ref ? 'mo_ta' then format('%s cấu hình: %s', lower(v_hd), v_ref ->> 'mo_ta') else format('%s %s "%s"', v_hd, lower(v_nhan), coalesce(v_ten, '')) end,
    null, null,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, true) else v_cu end,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, false) else v_moi end
  );
  return null;
end;
$$;

create trigger cau_hinh_he_thong_nk after insert or update or delete on public.cau_hinh_he_thong
  for each row execute function public.nk_cau_hinh('Cấu hình hệ thống');
create trigger nhom_tieu_chi_nk after insert or update or delete on public.nhom_tieu_chi
  for each row execute function public.nk_cau_hinh('Nhóm tiêu chí KPI');
create trigger tieu_chi_con_nk after insert or update or delete on public.tieu_chi_con
  for each row execute function public.nk_cau_hinh('Tiêu chí KPI');
create trigger he_so_do_kho_nk after insert or update or delete on public.he_so_do_kho
  for each row execute function public.nk_cau_hinh('Hệ số độ khó');
create trigger rubric_du_gio_nk after insert or update or delete on public.rubric_du_gio
  for each row execute function public.nk_cau_hinh('Rubric dự giờ (mức)');
create trigger danh_muc_nhom_lop_nk after insert or update or delete on public.danh_muc_nhom_lop
  for each row execute function public.nk_cau_hinh('Nhóm lớp');
create trigger danh_muc_chuyen_mon_nk after insert or update or delete on public.danh_muc_chuyen_mon
  for each row execute function public.nk_cau_hinh('Chuyên môn');
create trigger danh_muc_loai_chung_chi_nk after insert or update or delete on public.danh_muc_loai_chung_chi
  for each row execute function public.nk_cau_hinh('Loại chứng chỉ');

-- Kỳ đánh giá: tạo/sửa/xóa kỳ và chuyển Đang mở ⇄ Chờ duyệt. Đóng kỳ / mở lại kỳ ghi ở ky_danh_gia_nhat_ky (kèm lý do) để không trùng dòng.
create function public.nk_ky_danh_gia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cu jsonb;
  v_moi jsonb;
  v_ten text := case when tg_op = 'DELETE' then old.ten else new.ten end;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if (new.trang_thai = 'da_dong' or old.trang_thai = 'da_dong') and new.ten = old.ten and new.tu = old.tu and new.den = old.den then
      return null;
    end if;
  end if;
  if tg_op <> 'INSERT' then
    v_cu := jsonb_build_object('ten', old.ten, 'tu', old.tu, 'den', old.den, 'trang_thai', old.trang_thai);
  end if;
  if tg_op <> 'DELETE' then
    v_moi := jsonb_build_object('ten', new.ten, 'tu', new.tu, 'den', new.den, 'trang_thai', new.trang_thai);
  end if;
  if tg_op = 'UPDATE' then
    if v_cu = v_moi then
      return null;
    end if;
  end if;
  perform public.ghi_nhat_ky(
    'doi_ky_danh_gia', 'Kỳ ' || v_ten,
    format('%s kỳ đánh giá %s', case tg_op when 'INSERT' then 'Tạo' when 'DELETE' then 'Xóa' else 'Sửa' end, v_ten),
    '/cau-hinh/ky-danh-gia/' || (case when tg_op = 'DELETE' then old.id else new.id end), null,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, true) else v_cu end,
    case when tg_op = 'UPDATE' then public.jsonb_khac(v_cu, v_moi, false) else v_moi end
  );
  return null;
end;
$$;
create trigger ky_danh_gia_nk after insert or update or delete on public.ky_danh_gia
  for each row execute function public.nk_ky_danh_gia();

create function public.nk_ky_nhat_ky()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ten text;
begin
  select k.ten into v_ten from public.ky_danh_gia k where k.id = new.ky_id;
  perform public.ghi_nhat_ky(
    'doi_ky_danh_gia', 'Kỳ ' || v_ten, format('%s kỳ đánh giá %s', case new.hanh_dong when 'dong' then 'Đóng (công bố KPI)' else 'Mở lại' end, v_ten),
    '/cau-hinh/ky-danh-gia/' || new.ky_id, null,
    jsonb_build_object('trang_thai', case new.hanh_dong when 'dong' then 'cho_duyet' else 'da_dong' end),
    jsonb_build_object('trang_thai', case new.hanh_dong when 'dong' then 'da_dong' else 'cho_duyet' end),
    new.ly_do
  );
  return null;
end;
$$;
create trigger ky_danh_gia_nhat_ky_nk after insert on public.ky_danh_gia_nhat_ky
  for each row execute function public.nk_ky_nhat_ky();

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.jsonb_khac(jsonb, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.ghi_nhat_ky(public.loai_nhat_ky, text, text, text, uuid[], jsonb, jsonb, text, boolean) from public, anon, authenticated;
revoke execute on function public.ghi_nhat_ky_ngoai(uuid, public.loai_nhat_ky, text, text, uuid[], jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ghi_nhat_ky_ngoai(uuid, public.loai_nhat_ky, text, text, uuid[], jsonb, jsonb) to service_role;
revoke execute on function public.nk_dang_ky_moi() from public, anon, authenticated;
revoke execute on function public.nk_dang_ky_cap_nhat() from public, anon, authenticated;
revoke execute on function public.nk_slot_huy() from public, anon, authenticated;
revoke execute on function public.nk_de_xuat() from public, anon, authenticated;
revoke execute on function public.nk_lop_hoc() from public, anon, authenticated;
revoke execute on function public.nk_bai_doi_lich() from public, anon, authenticated;
revoke execute on function public.nk_profiles() from public, anon, authenticated;
revoke execute on function public.nk_nhan_su_nhom() from public, anon, authenticated;
revoke execute on function public.nk_chung_chi() from public, anon, authenticated;
revoke execute on function public.nk_profile_chuyen_mon() from public, anon, authenticated;
revoke execute on function public.nk_diem_danh() from public, anon, authenticated;
revoke execute on function public.nk_du_gio() from public, anon, authenticated;
revoke execute on function public.nk_cau_hinh() from public, anon, authenticated;
revoke execute on function public.nk_ky_danh_gia() from public, anon, authenticated;
revoke execute on function public.nk_ky_nhat_ky() from public, anon, authenticated;
