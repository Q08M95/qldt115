-- Test tự kiểm tra bản 8e: thông báo "cần hành động" dẫn tới trang Đăng ký giảng dạy (/dang-ky); dọn thông báo đã đọc sau 90 ngày.
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260928120000 (và các migration trước).
-- Script tự tạo 3 user giả (@qldt.test) + lớp "ZZ Test8e..." rồi xóa sạch, kể cả thông báo phát sinh cho Admin thật.
-- Tạm gỡ cấu hình webhook push trong lúc thử và KHÔI PHỤC ở cuối. Kết quả: cột "dat" phải là true hết.
--   a1 Admin | a2, a3 Giảng viên bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.dang_ky_giang_day where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.nhan_su_nhom where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.audit_log where created_at >= (select tu from pg_temp.moc);
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
end;
$$;

drop view if exists pg_temp.nk;
drop table if exists pg_temp.moc;
create temp table moc as select now() as tu;
drop table if exists pg_temp.webhook;
create temp table webhook as select * from public.cau_hinh_push;
delete from public.cau_hinh_push;
call pg_temp.don_dep();
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000a' || i)::uuid, 'authenticated', 'authenticated',
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 3) i;
update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  res jsonb := '[]';
  nl uuid; l1 uuid; b1 uuid; b2 uuid; inv uuid;
  n int; n2 int; ok boolean;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8e Lớp', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'dang_mo') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'Bài 2', now() + interval '3 days', now() + interval '3 days 2 hours') returning id into b2;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b1, 'giang_vien', 2), (b2, 'giang_vien', 1);

  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi) values (b1, 'giang_vien', a2, 'duoc_moi', a1) returning id into inv;
  select count(*) into n from public.thong_bao where khoa = 'loi_moi:' || inv and lien_ket = '/dang-ky' and muc_do = 'can_hanh_dong';
  res := res || jsonb_build_object('t', '01 Lời mời dạy: thông báo dẫn tới /dang-ky (nơi có nút Đồng ý/Từ chối)', 'ok', n = 1);

  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai) values (b1, 'giang_vien', a3, 'tu_dang_ky');
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = 'dang_ky:' || l1 and lien_ket = '/dang-ky';
  res := res || jsonb_build_object('t', '02 Đăng ký cần duyệt (gộp theo lớp): dẫn tới /dang-ky', 'ok', n = 1);

  -- Cập nhật khi thêm đăng ký thứ hai vẫn giữ liên kết
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai) values (b2, 'giang_vien', a2, 'tu_dang_ky');
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = 'dang_ky:' || l1 and lien_ket = '/dang-ky' and noi_dung like '2 người%';
  res := res || jsonb_build_object('t', '03 Thêm đăng ký: thông báo gộp cập nhật (2 người) và vẫn dẫn tới /dang-ky', 'ok', n = 1);

  -- Kết quả duyệt: vẫn dẫn tới lớp
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.duyet_dang_ky((select id from public.dang_ky_giang_day where user_id = a3 and bai_id = b1 and loai = 'tu_dang_ky'), true);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.thong_bao where user_id = a3 and loai = 'dang_ky_ket_qua' and lien_ket = '/lop-hoc/' || l1;
  res := res || jsonb_build_object('t', '04 Thông báo kết quả duyệt (chỉ để biết) vẫn dẫn tới trang lớp', 'ok', n = 1);

  -- Dọn: đã đọc quá 90 ngày bị xóa; đã đọc 60 ngày còn; chưa đọc 100 ngày còn
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, khoa, created_at, da_doc) values
    (a2, 'huy_lop', 'thong_tin', 'ZZ đọc 100 ngày', 'zz-e1', now() - interval '100 days', true),
    (a2, 'huy_lop', 'thong_tin', 'ZZ đọc 60 ngày', 'zz-e2', now() - interval '60 days', true),
    (a2, 'huy_lop', 'thong_tin', 'ZZ chưa đọc 100 ngày', 'zz-e3', now() - interval '100 days', false);
  perform public.don_thong_bao_cu();
  select count(*) into n from public.thong_bao where khoa = 'zz-e1';
  select count(*) into n2 from public.thong_bao where khoa in ('zz-e2', 'zz-e3');
  res := res || jsonb_build_object('t', '05 Dọn: đã đọc quá 90 ngày bị xóa; đã đọc 60 ngày và chưa đọc 100 ngày còn lại', 'ok', n = 0 and n2 = 2);

  insert into public.cau_hinh_push select * from pg_temp.webhook;
  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
