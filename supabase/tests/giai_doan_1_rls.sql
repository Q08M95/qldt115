-- Test tự kiểm tra Giai đoạn 1 (phân quyền + RLS + ẩn nhãn nhóm).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy 3 file migration.
-- Script tự tạo 4 user giả (email @qldt.test), chạy kiểm tra rồi xóa sạch.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 = Admin, a2 = Giảng viên, a3 = Trợ giảng, a4 = GV được gán Quyền Quản lý lớp

-- Dọn (nếu lần chạy trước bị dừng giữa chừng)
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4'
);
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@qldt.test', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'gv@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'tg@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'qll@qldt.test',   '{}', '{}', now(), now());

-- Admin của bộ test (chạy bằng quyền postgres nên không bị chặn grant cột)
update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  res jsonb := '[]';
  n int;
  ok boolean;
  r1 public.vai_tro_giang_day;
  r2 public.vai_tro_giang_day;
begin
  -- 1. Trigger tạo profile cho user mới
  select count(*) into n from public.profiles where id in (a1, a2, a3, a4);
  res := res || jsonb_build_object('t', '01 Trigger tạo profile cho user mới', 'ok', n = 4);

  -- ===== Đóng vai Admin (a1) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    perform public.dat_nhom(a2, 'gv_bac_si');
    perform public.dat_nhom(a3, 'tg_khong_bac_si');
    perform public.dat_nhom(a4, 'gv_khong_bac_si');
    perform public.gan_quyen_quan_ly_lop(a4, true);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '02 Admin đặt nhóm + gán Quyền Quản lý lớp thành công', 'ok', ok);

  select count(*) into n from public.nhan_su_nhom;
  res := res || jsonb_build_object('t', '03 Admin đọc được bảng nhóm (3 hàng)', 'ok', n = 3);

  execute 'reset role';

  -- Vai trò công khai được đồng bộ từ nhóm (kiểm tra bằng quyền postgres)
  select vai_tro_giang_day into r1 from public.profiles where id = a2;
  select vai_tro_giang_day into r2 from public.profiles where id = a3;
  res := res || jsonb_build_object('t', '04 Trigger đồng bộ vai trò: GV bác sĩ -> giang_vien, TG -> tro_giang',
                                   'ok', r1 = 'giang_vien' and r2 = 'tro_giang');

  -- ===== Đóng vai Giảng viên thường (a2) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.nhan_su_nhom;
  res := res || jsonb_build_object('t', '05 GV KHÔNG thấy nhãn nhóm của ai (kể cả bản thân) — 0 hàng', 'ok', n = 0);

  select count(*) into n from public.profiles;
  res := res || jsonb_build_object('t', '06 GV thấy hồ sơ công khai của mọi người (>= 4)', 'ok', n >= 4);

  update public.profiles set ho_ten = 'GV Test' where id = a2;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', '07 GV sửa được ho_ten của chính mình', 'ok', n = 1);

  update public.profiles set ho_ten = 'Bị sửa' where id = a3;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', '08 GV KHÔNG sửa được hồ sơ người khác (0 hàng)', 'ok', n = 0);

  ok := false;
  begin
    update public.profiles set phan_quyen = 'admin' where id = a2;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '09 GV KHÔNG tự nâng phan_quyen thành admin', 'ok', ok);

  ok := false;
  begin
    update public.profiles set co_quyen_quan_ly_lop = true where id = a2;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '10 GV KHÔNG tự bật co_quyen_quan_ly_lop', 'ok', ok);

  ok := false;
  begin
    perform public.dat_nhom(a3, 'tg_bac_si');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '11 GV KHÔNG gọi được dat_nhom', 'ok', ok);

  ok := false;
  begin
    perform public.gan_quyen_quan_ly_lop(a2, true);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '12 GV KHÔNG tự gán Quyền Quản lý lớp', 'ok', ok);

  execute 'reset role';

  -- ===== Đóng vai người giữ Quyền Quản lý lớp (a4, không phải Admin) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a4, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.nhan_su_nhom;
  res := res || jsonb_build_object('t', '13 Người giữ Quyền Quản lý lớp đọc được nhãn nhóm (3 hàng)', 'ok', n = 3);

  ok := true;
  begin
    perform public.dat_nhom(a3, 'tg_bac_si');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '14 Người giữ Quyền Quản lý lớp gọi được dat_nhom', 'ok', ok);

  ok := false;
  begin
    perform public.gan_quyen_quan_ly_lop(a3, true);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '15 Người giữ Quyền Quản lý lớp KHÔNG gán tiếp cho người khác (chỉ Admin)', 'ok', ok);

  execute 'reset role';

  -- ===== Đóng vai người chưa đăng nhập (anon) =====
  execute 'set local role anon';
  ok := false;
  begin
    perform 1 from public.profiles limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '16 anon (chưa đăng nhập) KHÔNG đọc được profiles', 'ok', ok);
  execute 'reset role';

  -- ===== Hàm tự duyệt =====
  res := res || jsonb_build_object('t', '17 la_tu_duyet(a1,a1)=true và la_tu_duyet(a1,a2)=false',
                                   'ok', public.la_tu_duyet(a1, a1) and not public.la_tu_duyet(a1, a2));

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

-- Dọn user giả (cascade xóa profiles + nhan_su_nhom)
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4'
);

select ten, dat from pg_temp.ket_qua order by ts;
