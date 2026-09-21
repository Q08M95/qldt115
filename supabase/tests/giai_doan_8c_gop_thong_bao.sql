-- Test tự kiểm tra bản gộp thông báo 8c: "đăng ký cần duyệt" gộp theo lớp (B) và nhắc check-in gộp các Bài liền nhau (D).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260928100000 (và các migration trước).
-- Script tự tạo 4 user giả (@qldt.test) + lớp "ZZ Test8c..." rồi xóa sạch, kể cả nhật ký/thông báo phát sinh cho Admin thật.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 Admin | a2, a3, a4 Giảng viên bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.diem_danh_bai where user_id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.dang_ky_giang_day where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.nhan_su_nhom where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
  delete from public.audit_log where created_at >= (select tu from pg_temp.moc);
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
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

create or replace function pg_temp.vao(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create or replace function pg_temp.ra() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000a' || i)::uuid, 'authenticated', 'authenticated',
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 4) i;
update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'gv_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  res jsonb := '[]';
  nl uuid; l1 uuid; l2 uuid; b1 uuid; b2 uuid; b3 uuid; b4 uuid;
  r1 uuid; r2 uuid; r3 uuid; r4 uuid;
  bA uuid; bB uuid; bC uuid; bD uuid; bE uuid;
  v_k text; v_id1 uuid; v_id2 uuid;
  n int; n2 int; ok boolean; ok2 boolean; v_nd text; v_td text;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8c Lớp đăng ký', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'dang_mo') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'Bài 2', now() + interval '3 days', now() + interval '3 days 2 hours') returning id into b2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 3, 'Bài 3', now() + interval '4 days', now() + interval '4 days 2 hours') returning id into b3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 4, 'Bài 4', now() + interval '5 days', now() + interval '5 days 2 hours') returning id into b4;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b2, 'giang_vien', 1), (b3, 'giang_vien', 1), (b4, 'giang_vien', 1);
  v_k := 'dang_ky:' || l1;

  -- ===================== B: đăng ký cần duyệt gộp theo lớp =====================
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b1, b2]);
  perform pg_temp.ra();
  perform pg_temp.vao(a3);
  perform public.dang_ky_bai(array[b3]);
  perform pg_temp.ra();
  select count(*), max(noi_dung) into n, v_nd from public.thong_bao where user_id = a1 and loai = 'dang_ky_can_duyet' and khoa = v_k;
  res := res || jsonb_build_object('t', '01 2 người đăng ký 3 lượt Bài trong cùng lớp: Admin chỉ có 1 thông báo cho lớp, ghi 2 người / 3 lượt', 'ok',
    n = 1 and v_nd like '2 người đăng ký (3 lượt Bài)%' and v_nd like '%ZZ Test8c Lớp đăng ký%');

  perform pg_temp.vao(a4);
  perform public.dang_ky_bai(array[b4]);
  perform pg_temp.ra();
  select count(*), max(noi_dung) into n, v_nd from public.thong_bao where user_id = a1 and loai = 'dang_ky_can_duyet' and khoa = v_k;
  res := res || jsonb_build_object('t', '02 Người thứ 3 đăng ký: vẫn 1 thông báo, cập nhật thành 3 người / 4 lượt', 'ok', n = 1 and v_nd like '3 người đăng ký (4 lượt Bài)%');

  select id into r1 from public.dang_ky_giang_day where user_id = a2 and bai_id = b1;
  select id into r2 from public.dang_ky_giang_day where user_id = a2 and bai_id = b2;
  select id into r3 from public.dang_ky_giang_day where user_id = a3 and bai_id = b3;
  select id into r4 from public.dang_ky_giang_day where user_id = a4 and bai_id = b4;
  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(r1, true);
  perform pg_temp.ra();
  select count(*), max(noi_dung), bool_and(not da_doc) into n, v_nd, ok from public.thong_bao where user_id = a1 and khoa = v_k;
  res := res || jsonb_build_object('t', '03 Duyệt 1 lượt: thông báo còn, số cập nhật (3 người / 3 lượt), vẫn chưa đọc', 'ok', n = 1 and ok and v_nd like '3 người đăng ký (3 lượt Bài)%');

  perform pg_temp.vao(a1);
  perform public.tu_choi_dang_ky(r2, 'Trùng lịch');
  perform public.tu_choi_dang_ky(r3, 'Không phù hợp');
  perform pg_temp.ra();
  select max(noi_dung) into v_nd from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '04 Xử lý tiếp: còn 1 người / 1 lượt thì thông báo ghi đúng số còn lại', 'ok', v_nd like '1 người đăng ký (1 lượt Bài)%');

  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(r4, true);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '05 Xử lý hết đăng ký chờ của lớp: thông báo tự chuyển đã đọc', 'ok', n = 0);

  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k;
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b2]);
  perform pg_temp.ra();
  select count(*), bool_or(not da_doc) into n2, ok from public.thong_bao where user_id = a1 and khoa = v_k;
  res := res || jsonb_build_object('t', '06 Đã đọc rồi mà có đăng ký mới: tạo thông báo MỚI (chưa đọc) — không lẫn vào thông báo cũ', 'ok', n2 = n + 1 and ok);

  -- ===================== D: nhắc check-in gộp =====================
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8c Lớp nhắc', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date - 1, current_date + 1, 'dang_mo') returning id into l2;
  -- a2: Bài A (+20 phút, 2 giờ) và Bài B (nghỉ 1 giờ sau đó) liền nhau => gộp; Bài C cách xa (>3 giờ nghỉ) => tách
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 1, 'Bài A', now() + interval '20 minutes', now() + interval '140 minutes') returning id into bA;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 2, 'Bài B', now() + interval '200 minutes', now() + interval '320 minutes') returning id into bB;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 3, 'Bài C', now() + interval '9 hours', now() + interval '11 hours') returning id into bC;
  -- a3: Bài D (+20 phút) một mình; Bài E cách xa lúc đầu
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 4, 'Bài D', now() + interval '20 minutes', now() + interval '140 minutes') returning id into bD;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 5, 'Bài E', now() + interval '10 hours', now() + interval '12 hours') returning id into bE;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (bA, 'giang_vien', 1, 'da_phan_cong', a2), (bB, 'giang_vien', 1, 'da_phan_cong', a2), (bC, 'giang_vien', 1, 'da_phan_cong', a2),
    (bD, 'giang_vien', 1, 'da_phan_cong', a3), (bE, 'giang_vien', 1, 'da_phan_cong', a3);

  perform public.nhac_check_in();
  select count(*), max(tieu_de), max(noi_dung), max(cardinality(bai_ids)) into n, v_td, v_nd, n2
  from public.thong_bao where user_id = a2 and loai = 'nhac_check_in';
  res := res || jsonb_build_object('t', '07 a2 có 2 Bài liền nhau (nghỉ 1 giờ): 1 thông báo nhắc chung, liệt kê cả 2 Bài, phủ 2 Bài', 'ok',
    n = 1 and n2 = 2 and v_td like '%2 Bài liên tiếp%' and v_nd like '%Bài A%' and v_nd like '%Bài B%' and v_nd not like '%Bài C%');

  select count(*), max(tieu_de), max(cardinality(bai_ids)) into n, v_td, n2 from public.thong_bao where user_id = a3 and loai = 'nhac_check_in';
  res := res || jsonb_build_object('t', '08 a3 chỉ có 1 Bài trong chuỗi (Bài kế cách xa): nhắc riêng 1 Bài, tiêu đề như cũ', 'ok', n = 1 and n2 = 1 and v_td = 'Sắp đến giờ dạy — nhớ check-in');

  -- Bài B đến hạn nhắc sau đó nhưng đã được phủ => không nhắc thêm
  update public.bai_hoc set bat_dau = now() + interval '25 minutes', ket_thuc = now() + interval '145 minutes' where id = bB;
  perform public.nhac_check_in();
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'nhac_check_in';
  res := res || jsonb_build_object('t', '09 Bài B đến hạn sau nhưng đã nằm trong thông báo gộp: không nhắc lặp', 'ok', n = 1);

  -- Bài C đến hạn nhưng chưa được phủ => nhắc riêng
  update public.bai_hoc set bat_dau = now() + interval '28 minutes', ket_thuc = now() + interval '100 minutes' where id = bC;
  perform public.nhac_check_in();
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'nhac_check_in';
  res := res || jsonb_build_object('t', '10 Bài C (chưa được phủ) đến hạn: được nhắc riêng', 'ok', n = 2);

  -- Check-in: chỉ đã đọc khi đủ các Bài của thông báo gộp
  select id into v_id1 from public.thong_bao where user_id = a2 and loai = 'nhac_check_in' and cardinality(bai_ids) = 2;
  perform pg_temp.vao(a2);
  perform public.check_in_bai(bA);
  perform pg_temp.ra();
  select da_doc into ok from public.thong_bao where id = v_id1;
  perform pg_temp.vao(a2);
  perform public.check_in_bai(bB);
  perform pg_temp.ra();
  select da_doc into ok2 from public.thong_bao where id = v_id1;
  res := res || jsonb_build_object('t', '11 Check-in Bài A: thông báo gộp còn chưa đọc; check-in nốt Bài B: tự đã đọc', 'ok', not ok and ok2);

  perform pg_temp.vao(a3);
  perform public.check_in_bai(bD);
  perform pg_temp.ra();
  select da_doc into ok from public.thong_bao where user_id = a3 and loai = 'nhac_check_in';
  res := res || jsonb_build_object('t', '12 Nhắc 1 Bài: check-in xong là tự đã đọc (như trước)', 'ok', ok);

  insert into public.cau_hinh_push select * from pg_temp.webhook;
  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
