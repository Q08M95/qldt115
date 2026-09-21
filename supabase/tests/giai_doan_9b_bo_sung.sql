-- Test tự kiểm tra bản bổ sung Giai đoạn 8-9 (thông báo "cần hành động" tự hết hiệu lực, nhắc check-in cũ, log kinh nghiệm, chính sách đọc nhật ký).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260926110000 (và các migration trước).
-- Script tự tạo 3 user giả (@qldt.test) + lớp "ZZ Test9b..." rồi xóa sạch, kể cả nhật ký/thông báo phát sinh cho Admin thật.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 Admin | a2, a3 Giảng viên bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.de_xuat_nhan_su where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
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
  v_tu timestamptz := (select tu from pg_temp.moc);
  nl uuid; l1 uuid; b1 uuid; b2 uuid; b3 uuid;
  reg1 uuid; reg2 uuid; dx1 uuid; dx2 uuid;
  n int; n2 int; ok boolean;
  v_k text;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test9b Lớp', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'dang_mo') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'Bài 2', now() + interval '4 days', now() + interval '4 days 2 hours') returning id into b2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 3, 'Bài 3', now() + interval '6 days', now() + interval '6 days 2 hours') returning id into b3;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b2, 'giang_vien', 1), (b3, 'giang_vien', 1);
  v_k := 'dang_ky:' || l1;

  -- ===== Đăng ký cần duyệt: hết hiệu lực khi xử lý xong =====
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b1, b2]);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '01 a2 đăng ký 2 Bài: Admin có 1 thông báo "cần duyệt" chưa đọc', 'ok', n = 1);

  select id into reg1 from public.dang_ky_giang_day where user_id = a2 and bai_id = b1;
  select id into reg2 from public.dang_ky_giang_day where user_id = a2 and bai_id = b2;
  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(reg1, true);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '02 Duyệt 1/2 đăng ký: thông báo "cần duyệt" vẫn còn (còn 1 đăng ký chờ)', 'ok', n = 1);

  perform pg_temp.vao(a2);
  perform public.rut_dang_ky(reg2);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '03 Người đăng ký rút đăng ký còn lại: thông báo "cần duyệt" tự chuyển sang đã đọc', 'ok', n = 0);

  perform pg_temp.vao(a3);
  perform public.dang_ky_bai(array[b3]);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  select id into reg1 from public.dang_ky_giang_day where user_id = a3 and bai_id = b3;
  perform pg_temp.vao(a1);
  perform public.tu_choi_dang_ky(reg1, 'Không phù hợp');
  perform pg_temp.ra();
  select count(*) into n2 from public.thong_bao where user_id = a1 and khoa = v_k and not da_doc;
  res := res || jsonb_build_object('t', '04 Từ chối đăng ký duy nhất: thông báo "cần duyệt" của người đó tự đã đọc', 'ok', n = 1 and n2 = 0);

  -- ===== Đề xuất cần duyệt =====
  perform pg_temp.vao(a1);
  dx1 := public.tao_de_xuat('khen_thuong_nhac_nho', a2, 'Khen thưởng thử');
  dx2 := public.tao_de_xuat('dao_tao', a3, 'Đào tạo thử');
  perform pg_temp.ra();
  -- Tạo thông báo cho Admin (người tạo bị bỏ qua) nên dựng thủ công 1 thông báo chưa đọc để thử
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, khoa) values (a1, 'de_xuat_can_duyet', 'can_hanh_dong', 'Thử', 'de_xuat');
  perform pg_temp.vao(a1);
  perform public.xu_ly_de_xuat(dx1, true);
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a1 and loai = 'de_xuat_can_duyet' and not da_doc;
  perform pg_temp.vao(a1);
  perform public.xu_ly_de_xuat(dx2, false);
  perform pg_temp.ra();
  select count(*) into n2 from public.thong_bao where user_id = a1 and loai = 'de_xuat_can_duyet' and not da_doc;
  res := res || jsonb_build_object('t', '05 Đề xuất: còn đề xuất chờ thì giữ thông báo; xử lý hết thì tự đã đọc', 'ok', n >= 1 and (n2 = 0 or exists (select 1 from public.de_xuat_nhan_su where trang_thai = 'cho_duyet')));

  -- ===== Nhắc check-in quá cũ =====
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, khoa, created_at)
  values (a2, 'nhac_check_in', 'can_hanh_dong', 'Nhắc cũ', 'nhac_check_in:zz-cu:' || a2, now() - interval '7 hours'),
         (a2, 'nhac_check_in', 'can_hanh_dong', 'Nhắc mới', 'nhac_check_in:zz-moi:' || a2, now() - interval '1 hour');
  perform public.nhac_check_in();
  select da_doc into ok from public.thong_bao where khoa = 'nhac_check_in:zz-cu:' || a2;
  select count(*) into n from public.thong_bao where khoa = 'nhac_check_in:zz-moi:' || a2 and not da_doc;
  res := res || jsonb_build_object('t', '06 Nhắc check-in quá 6 giờ tự đã đọc; nhắc mới hơn giữ nguyên', 'ok', ok and n = 1);

  -- ===== Dọn thông báo cũ =====
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, khoa, created_at, da_doc)
  values (a2, 'huy_lop', 'thong_tin', 'ZZ cũ chưa đọc', 'zz1', now() - interval '400 days', false),
         (a2, 'huy_lop', 'thong_tin', 'ZZ cũ đã đọc', 'zz2', now() - interval '200 days', true),
         (a2, 'huy_lop', 'thong_tin', 'ZZ 200 ngày chưa đọc', 'zz3', now() - interval '200 days', false);
  perform public.don_thong_bao_cu();
  select count(*) into n from public.thong_bao where khoa in ('zz1', 'zz2');
  select count(*) into n2 from public.thong_bao where khoa = 'zz3';
  res := res || jsonb_build_object('t', '07 Dọn: xóa thông báo > 365 ngày và đã đọc > 180 ngày; chưa đọc 200 ngày còn lại', 'ok', n = 0 and n2 = 1);

  -- ===== Nhật ký: kinh nghiệm + chính sách đọc =====
  perform pg_temp.vao(a1);
  update public.profiles set kinh_nghiem = '10 năm giảng dạy cấp cứu' where id = a2;
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'sua_ho_so' and nguoi_lien_quan = array[a2] and sau ->> 'kinh_nghiem' = '10 năm giảng dạy cấp cứu' and created_at >= v_tu;
  perform pg_temp.vao(a2);
  update public.profiles set kinh_nghiem = 'Tự sửa của mình' where id = a2;
  perform pg_temp.ra();
  select count(*) into n2 from public.audit_log where loai = 'sua_ho_so' and nguoi_lien_quan = array[a2] and created_at >= v_tu;
  res := res || jsonb_build_object('t', '08 Admin sửa kinh nghiệm hồ sơ người khác: có log; người đó tự sửa: không thêm log', 'ok', n = 1 and n2 = 1);

  perform pg_temp.vao(a2);
  select count(*), bool_and(a2 = any (nguoi_lien_quan)) into n, ok from public.audit_log where created_at >= v_tu;
  perform pg_temp.ra();
  perform pg_temp.vao(a1);
  select count(*) into n2 from public.audit_log where created_at >= v_tu;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '09 Chính sách đọc nhật ký vẫn đúng: GV chỉ thấy dòng của mình, Admin thấy nhiều hơn', 'ok', n >= 1 and ok and n2 > n);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
