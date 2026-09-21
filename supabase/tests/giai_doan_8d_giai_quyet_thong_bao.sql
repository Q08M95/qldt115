-- Test tự kiểm tra bản 8d: thông báo "cần hành động" hết hạn xử lý thì tự chuyển đã đọc; chưa hết hạn thì giữ nguyên.
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260928110000 (và các migration trước).
-- Script tự tạo 3 user giả (@qldt.test) + lớp "ZZ Test8d..." rồi xóa sạch, kể cả thông báo phát sinh cho Admin thật.
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
  nl uuid; lq uuid; lt uuid; bq uuid; bt uuid; iq uuid; it uuid;
  n int; n2 int; ok boolean; ok2 boolean;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  -- Lớp QK: chỉ có Bài đã bắt đầu; lớp TL: chỉ có Bài trong tương lai
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8d Lớp quá khứ', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date - 2, current_date + 5, 'dang_mo') returning id into lq;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8d Lớp tương lai', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'dang_mo') returning id into lt;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (lq, 'gv_bac_si'), (lt, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lq, 1, 'Bài đã bắt đầu', now() - interval '1 hour', now() + interval '1 hour') returning id into bq;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lt, 1, 'Bài sắp tới', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into bt;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (bq, 'giang_vien', 1), (bt, 'giang_vien', 1);

  -- Lời mời dạy (chèn trực tiếp: trigger tạo thông báo "cần hành động" cho người được mời)
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi) values (bq, 'giang_vien', a2, 'duoc_moi', a1) returning id into iq;
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi) values (bt, 'giang_vien', a3, 'duoc_moi', a1) returning id into it;
  select count(*) into n from public.thong_bao where khoa in ('loi_moi:' || iq, 'loi_moi:' || it) and not da_doc;
  res := res || jsonb_build_object('t', '01 Dữ liệu thử: 2 lời mời tạo 2 thông báo "cần hành động" chưa đọc', 'ok', n = 2);

  -- Đăng ký cần duyệt (chèn trực tiếp)
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai) values (bq, 'giang_vien', a3, 'tu_dang_ky'), (bt, 'giang_vien', a2, 'tu_dang_ky');
  select count(*) into n from public.thong_bao where user_id = a1 and khoa in ('dang_ky:' || lq, 'dang_ky:' || lt) and not da_doc;
  res := res || jsonb_build_object('t', '02 Dữ liệu thử: 2 lớp có đăng ký chờ => 2 thông báo gộp "cần duyệt" chưa đọc cho Admin', 'ok', n = 2);

  n := public.giai_quyet_thong_bao_het_han();
  select da_doc into ok from public.thong_bao where khoa = 'loi_moi:' || iq;
  select da_doc into ok2 from public.thong_bao where khoa = 'loi_moi:' || it;
  res := res || jsonb_build_object('t', '03 Lời mời cho Bài ĐÃ bắt đầu tự đã đọc; lời mời cho Bài sắp tới giữ nguyên chưa đọc', 'ok', ok and not ok2);

  select bool_and(da_doc) filter (where khoa = 'dang_ky:' || lq), bool_and(not da_doc) filter (where khoa = 'dang_ky:' || lt)
  into ok, ok2 from public.thong_bao where user_id = a1;
  res := res || jsonb_build_object('t', '04 Đăng ký chờ của lớp chỉ có Bài đã bắt đầu tự đã đọc; lớp có Bài sắp tới giữ nguyên', 'ok', ok and ok2);

  n2 := public.giai_quyet_thong_bao_het_han();
  res := res || jsonb_build_object('t', '05 Chạy lại ngay: không còn gì để giải quyết thêm', 'ok', n2 = 0);

  insert into public.cau_hinh_push select * from pg_temp.webhook;
  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
