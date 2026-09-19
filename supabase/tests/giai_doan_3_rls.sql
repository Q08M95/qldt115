-- Test tự kiểm tra Giai đoạn 3 (hồ sơ, chuyên môn, chứng chỉ, trạng thái tham gia, lịch sử đổi nhóm, đề xuất).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260919110000.
-- Script tự tạo 4 user giả (@qldt.test) + dữ liệu thử, kiểm tra rồi xóa sạch.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 = Admin, a2 = Giảng viên, a3 = Trợ giảng, a4 = GV được gán Quyền Quản lý lớp

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  -- Xóa bảng con trước để tránh lỗi kiểm tra khóa ngoại khi cascade trong cùng 1 transaction
  delete from public.de_xuat_nhan_su where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.profile_chuyen_mon where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.danh_muc_chuyen_mon where ten = 'ZZ Test chuyên môn';
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
end;
$$;

call pg_temp.don_dep();
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@qldt.test', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'gv@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'tg@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'qll@qldt.test',   '{}', '{}', now(), now());

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set co_quyen_quan_ly_lop = true where id = '00000000-0000-0000-0000-0000000000a4';

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  res jsonb := '[]';
  n int;
  ok boolean;
  cm uuid;
  lcc uuid;
  dx uuid;
  tt public.trang_thai_tham_gia;
begin
  select id into cm from public.danh_muc_chuyen_mon order by thu_tu limit 1;
  select id into lcc from public.danh_muc_loai_chung_chi order by thu_tu limit 1;

  -- 01: danh mục có dữ liệu khởi điểm
  select count(*) into n from public.danh_muc_chuyen_mon;
  res := res || jsonb_build_object('t', '01 Danh mục chuyên môn có dữ liệu khởi điểm', 'ok', n >= 1);

  -- ===== Đóng vai Giảng viên thường (a2) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := false;
  begin
    update public.profiles set trang_thai_tham_gia = 'khong_con_tham_gia' where id = a2;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '02 GV KHÔNG tự đổi trang_thai_tham_gia', 'ok', ok);

  update public.profiles set kinh_nghiem = '5 năm giảng dạy' where id = a2;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', '03 GV sửa được kinh_nghiem của mình', 'ok', n = 1);

  ok := true;
  begin
    insert into public.profile_chuyen_mon (user_id, chuyen_mon_id) values (a2, cm);
    insert into public.chung_chi (user_id, loai_id, so_chung_chi, noi_dung) values (a2, lcc, 'CC-001', 'Test');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '04 GV thêm được chuyên môn + chứng chỉ cho chính mình', 'ok', ok);

  ok := false;
  begin
    insert into public.chung_chi (user_id, loai_id, so_chung_chi) values (a3, lcc, 'CC-FAKE');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '05 GV KHÔNG thêm chứng chỉ cho người khác', 'ok', ok);

  ok := false;
  begin
    insert into public.profile_chuyen_mon (user_id, chuyen_mon_id) values (a3, cm);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '06 GV KHÔNG thêm chuyên môn cho người khác', 'ok', ok);

  select count(*) into n from public.chung_chi;
  res := res || jsonb_build_object('t', '07 GV xem được chứng chỉ (công khai nội bộ)', 'ok', n >= 1);

  ok := false;
  begin
    insert into public.danh_muc_chuyen_mon (ten) values ('ZZ Test chuyên môn');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '09 GV KHÔNG thêm được danh mục', 'ok', ok);

  ok := false;
  begin
    perform public.dat_trang_thai_tham_gia(a3, 'tam_ngung');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '10 GV KHÔNG gọi được dat_trang_thai_tham_gia', 'ok', ok);

  ok := false;
  begin
    perform public.tao_de_xuat('dao_tao', a3, 'thử');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '11 GV KHÔNG tạo được đề xuất', 'ok', ok);

  execute 'reset role';

  -- ===== Đóng vai Admin (a1) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    perform public.dat_nhom(a2, 'gv_bac_si');
    perform public.dat_nhom(a2, 'gv_bac_si');           -- không đổi: không ghi thêm lịch sử
    perform public.dat_nhom(a2, 'gv_khong_bac_si');     -- đổi: ghi lịch sử
    perform public.dat_trang_thai_tham_gia(a2, 'tam_ngung');
    dx := public.tao_de_xuat('dao_tao', a2, 'Cử đi bồi dưỡng');
    insert into public.danh_muc_chuyen_mon (ten) values ('ZZ Test chuyên môn');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '12 Admin đổi nhóm/trạng thái, tạo đề xuất, thêm danh mục thành công', 'ok', ok);

  select count(*) into n from public.lich_su_doi_nhom where user_id = a2;
  res := res || jsonb_build_object('t', '13 Lịch sử đổi nhóm ghi đúng 2 dòng (gán lần đầu + đổi), lần lặp không ghi', 'ok', n = 2);

  select count(*) into n from public.lich_su_doi_nhom where user_id = a2 and nhom_cu = 'gv_bac_si' and nhom_moi = 'gv_khong_bac_si';
  res := res || jsonb_build_object('t', '14 Dòng lịch sử ghi đúng nhóm cũ -> nhóm mới', 'ok', n = 1);

  select count(*) into n from public.de_xuat_nhan_su;
  res := res || jsonb_build_object('t', '15 Admin thấy đề xuất nhân sự', 'ok', n >= 1);

  ok := true;
  begin
    perform public.xu_ly_de_xuat(dx, true);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '16 Admin duyệt được đề xuất', 'ok', ok);

  ok := false;
  begin
    perform public.xu_ly_de_xuat(dx, false);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '17 Đề xuất đã xử lý KHÔNG xử lý lại được', 'ok', ok);

  execute 'reset role';

  select trang_thai_tham_gia into tt from public.profiles where id = a2;
  res := res || jsonb_build_object('t', '18 Trạng thái tham gia của a2 đã là tam_ngung', 'ok', tt = 'tam_ngung');

  -- ===== Giảng viên (a2) lần 2: sau khi Admin đã tạo lịch sử + đề xuất, GV phải KHÔNG thấy =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lich_su_doi_nhom;
  res := res || jsonb_build_object('t', '18b GV KHÔNG thấy lịch sử đổi nhóm (dù đã có dữ liệu)', 'ok', n = 0);

  select count(*) into n from public.de_xuat_nhan_su;
  res := res || jsonb_build_object('t', '18c GV KHÔNG thấy đề xuất nhân sự (dù đã có dữ liệu)', 'ok', n = 0);

  execute 'reset role';

  -- ===== Đóng vai người giữ Quyền Quản lý lớp (a4) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a4, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lich_su_doi_nhom;
  res := res || jsonb_build_object('t', '19 Người giữ Quyền Quản lý lớp đọc được lịch sử đổi nhóm', 'ok', n >= 2);

  update public.profiles set ho_ten = 'QLL sửa hộ' where id = a3;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', '20 Người giữ Quyền Quản lý lớp sửa được hồ sơ người khác', 'ok', n = 1);

  ok := true;
  begin
    insert into public.chung_chi (user_id, loai_id, so_chung_chi) values (a3, lcc, 'CC-QLL');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '21 Người giữ Quyền Quản lý lớp thêm được chứng chỉ cho người khác', 'ok', ok);

  execute 'reset role';

  -- ===== anon =====
  execute 'set local role anon';
  ok := false;
  begin
    perform 1 from public.chung_chi limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '22 anon KHÔNG đọc được chung_chi', 'ok', ok);
  execute 'reset role';

  -- ===== Storage bucket =====
  select count(*) into n from storage.buckets where id = 'chung-chi' and public = false;
  res := res || jsonb_build_object('t', '23 Bucket chung-chi tồn tại và là riêng tư', 'ok', n = 1);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
