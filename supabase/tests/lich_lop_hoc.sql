-- Test tự kiểm tra "Lịch lớp toàn đơn vị" (migration 20261026100000_lich_lop_hoc.sql).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20261026100000 (và mọi migration trước).
-- Script tự tạo 5 user giả (@qldt.test) + các lớp "ZZ TestLich..." + 1 loại chứng chỉ "ZZ TestLich CC", kiểm tra rồi xóa sạch,
-- kể cả thông báo phát sinh cho Admin thật trong lúc chạy thử (xóa mọi thông báo tạo từ lúc bắt đầu script).
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   c1 Admin | c2 GV bác sĩ (có chứng chỉ) | c3 GV không bác sĩ | c4 TG bác sĩ | c5 GV bác sĩ (không có chứng chỉ)
--   L1 Dự kiến, công khai sớm theo MẶC ĐỊNH | L2 Dự kiến chưa công khai, cần chứng chỉ (sau đó bật công khai) |
--   L3 Dự kiến không công khai | L4 Đã hủy | L5 Dự kiến công khai sớm (tạo sau khi c2 đã đọc thông báo gộp)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ TestLich%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ TestLich%');
  delete from public.lop_hoc where ten like 'ZZ TestLich%';
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
  delete from public.danh_muc_loai_chung_chi where ten = 'ZZ TestLich CC';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5');
end;
$$;

drop table if exists pg_temp.moc;
create temp table moc as select now() as tu;
call pg_temp.don_dep();
drop table if exists pg_temp.dong_lich;
-- Kiểu bản ghi để đọc lại kết quả lich_lop_hoc đã gom thành jsonb (chỉ cần các cột được kiểm tra)
create temp table dong_lich (lop_id uuid, trang_thai_hien_thi text, con_thieu boolean, toi_day boolean);
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

create or replace function pg_temp.vao(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000c' || i)::uuid, 'authenticated', 'authenticated',
       'lich' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 5) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000c2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000c3', 'gv_khong_bac_si'),
  ('00000000-0000-0000-0000-0000000000c4', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000c5', 'gv_bac_si');

do $$
declare
  c1 uuid := '00000000-0000-0000-0000-0000000000c1';
  c2 uuid := '00000000-0000-0000-0000-0000000000c2';
  c3 uuid := '00000000-0000-0000-0000-0000000000c3';
  c4 uuid := '00000000-0000-0000-0000-0000000000c4';
  c5 uuid := '00000000-0000-0000-0000-0000000000c5';
  res jsonb := '[]';
  n int;
  n2 int;
  ok boolean;
  nl uuid; cc uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid;
  b1 uuid; b1b uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid;
  goc timestamptz := date_trunc('hour', now()) + interval '3 days';
  r record;
  lich jsonb;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  insert into public.danh_muc_loai_chung_chi (ten) values ('ZZ TestLich CC') returning id into cc;
  insert into public.chung_chi (user_id, loai_id) values (c2, cc);

  -- ===== L1: tạo không nêu cong_khai_som -> mặc định công khai sớm =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestLich L1', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc + interval '5 days')::date, 'nhap') returning id into l1;
  res := res || jsonb_build_object('t', '01 Lớp mới mặc định "Công khai sớm" = bật', 'ok',
    (select cong_khai_som from public.lop_hoc where id = l1));
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si'), (l1, 'tg_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 1, 'Bài 1', goc, goc + interval '2 hours') returning id into b1;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b1, 'tro_giang', 1), (b1, 'tro_giang', 2);

  select count(*) into n from public.thong_bao
  where loai = 'bai_trong_moi' and tieu_de = 'Lớp sắp mở đăng ký' and lien_ket = '/lop-hoc/' || l1 and user_id in (c2, c4, c5);
  res := res || jsonb_build_object('t', '02 Lớp Dự kiến công khai sớm có Bài đầu tiên: GV + TG đủ điều kiện nhận "Lớp sắp mở đăng ký"', 'ok', n = 3);
  select count(*) into n from public.thong_bao where user_id in (c1, c3);
  res := res || jsonb_build_object('t', '03 Người không đủ điều kiện (sai nhóm) và Admin không nhận thông báo lớp sắp mở', 'ok', n = 0);

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 2, 'Bài 2', goc + interval '1 day', goc + interval '1 day 2 hours') returning id into b1b;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1b, 'giang_vien', 1);
  select count(*) into n from public.thong_bao where user_id = c2 and khoa = 'sap_mo' and tieu_de = 'Lớp sắp mở đăng ký';
  res := res || jsonb_build_object('t', '04 Thêm Bài nữa vào lớp sắp mở không báo lặp (mỗi lớp 1 lần/người)', 'ok', n = 1);

  -- ===== L2: chưa công khai, cần chứng chỉ =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, cong_khai_som)
  values ('ZZ TestLich L2', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'nhap', false) returning id into l2;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l2, 'gv_bac_si');
  insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, loai_id) values (l2, cc);
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l2, 1, 'Bài trùng giờ', goc + interval '30 minutes', goc + interval '90 minutes') returning id into b2;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b2, 'giang_vien', 1);
  select count(*) into n from public.thong_bao where lien_ket = '/lop-hoc/' || l2;
  res := res || jsonb_build_object('t', '05 Lớp Dự kiến chưa công khai sớm: không ai được báo', 'ok', n = 0);

  -- Admin c1 là người thao tác (ghi bảng trực tiếp vì luu_lop_hoc đòi đủ mọi trường của form)
  perform set_config('request.jwt.claims', json_build_object('sub', c1)::text, true);
  update public.lop_hoc set cong_khai_som = true where id = l2;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.thong_bao
  where user_id = c2 and khoa = 'sap_mo' and not da_doc and tieu_de = '2 lớp sắp mở đăng ký' and lien_ket = '/lop-hoc?xem=lich';
  select count(*) into n2 from public.thong_bao where user_id = c2 and khoa = 'sap_mo';
  res := res || jsonb_build_object('t', '06 Bật công khai sớm cho lớp đã có Bài: người đủ điều kiện được báo, GỘP vào thông báo chưa đọc ("2 lớp", dẫn tới Lịch)', 'ok', n = 1 and n2 = 1);
  select count(*) into n from public.thong_bao where user_id = c5 and khoa = 'sap_mo' and tieu_de = 'Lớp sắp mở đăng ký';
  res := res || jsonb_build_object('t', '07 Người cùng nhóm nhưng thiếu chứng chỉ yêu cầu không được báo lớp đó (vẫn "1 lớp")', 'ok', n = 1);

  -- ===== L3 không công khai, L4 đã hủy =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, cong_khai_som)
  values ('ZZ TestLich L3', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'nhap', false) returning id into l3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l3, 1, 'Bài kín', goc, goc + interval '1 hour') returning id into b3;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestLich L4', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'da_huy') returning id into l4;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l4, 1, 'Bài hủy', goc, goc + interval '1 hour') returning id into b4;

  -- c2 được phân công GV Bài 1 của L1; L2 (1 slot GV) được lấp đủ bởi c5 -> không còn thiếu người
  update public.slot_giang_day set nguoi_phan_cong = c2, trang_thai = 'da_phan_cong' where bai_id = b1 and vai_tro = 'giang_vien';
  update public.slot_giang_day set nguoi_phan_cong = c5, trang_thai = 'da_phan_cong' where bai_id = b2;

  -- ===== Lịch nhìn từ GV c2 (theo LỚP) =====
  -- Gom kết quả vào biến jsonb (role authenticated không tạo được bảng tạm trong pg_temp)
  perform pg_temp.vao(c2);
  select coalesce(jsonb_agg(to_jsonb(x)), '[]') into lich
  from public.lich_lop_hoc(goc::date - 1, goc::date + 30) x where x.ten like 'ZZ TestLich%';
  execute 'reset role';
  res := res || jsonb_build_object('t', '08 GV thấy lớp sắp mở (công khai sớm), không thấy lớp Dự kiến kín và lớp đã hủy; mỗi lớp 1 dòng', 'ok',
    jsonb_array_length(lich) = 2
    and not exists (select 1 from jsonb_array_elements(lich) e where (e ->> 'lop_id')::uuid in (l3, l4)));
  select * into r from jsonb_populate_recordset(null::pg_temp.dong_lich, lich) x where x.lop_id = l1;
  res := res || jsonb_build_object('t', '09 Lớp L1: trạng thái "nhap", còn thiếu người (slot TG trống), người xem có dạy trong lớp', 'ok',
    r.trang_thai_hien_thi = 'nhap' and r.con_thieu and r.toi_day);
  select * into r from jsonb_populate_recordset(null::pg_temp.dong_lich, lich) x where x.lop_id = l2;
  res := res || jsonb_build_object('t', '10 Lớp L2 đã lấp đủ slot: không còn thiếu người; người xem không dạy lớp này', 'ok',
    not r.con_thieu and not r.toi_day);

  perform pg_temp.vao(c2);
  select count(*) into n from public.lich_lop_hoc(goc::date - 40, goc::date - 10) x where x.ten like 'ZZ TestLich%';
  execute 'reset role';
  res := res || jsonb_build_object('t', '11 Lớp nằm ngoài khoảng ngày không được trả về', 'ok', n = 0);

  perform pg_temp.vao(c1);
  select count(*) into n from public.lich_lop_hoc(goc::date - 1, goc::date + 30) x where x.ten like 'ZZ TestLich%';
  execute 'reset role';
  res := res || jsonb_build_object('t', '12 Admin thấy cả lớp Dự kiến chưa công khai, vẫn ẩn lớp đã hủy', 'ok', n = 3);

  -- ===== Ràng buộc tham số / quyền =====
  perform pg_temp.vao(c2);
  ok := false; begin perform public.lich_lop_hoc(current_date, current_date + 90); exception when invalid_parameter_value then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '13 Khoảng thời gian quá 62 ngày bị từ chối', 'ok', ok);
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  ok := false; begin perform public.lich_lop_hoc(current_date, current_date + 1); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '14 Người chưa đăng nhập không gọi được lich_lop_hoc', 'ok', ok);

  -- ===== Đã đọc thông báo gộp rồi mà có lớp sắp mở mới -> tạo thông báo mới =====
  update public.thong_bao set da_doc = true where user_id = c2 and khoa = 'sap_mo';
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestLich L5', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc + interval '10 days')::date, (goc + interval '10 days')::date, 'nhap') returning id into l5;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l5, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l5, 1, 'Bài 1', goc + interval '10 days', goc + interval '10 days 2 hours') returning id into b5;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b5, 'giang_vien', 1);
  select count(*) into n from public.thong_bao where user_id = c2 and khoa = 'sap_mo';
  select count(*) into n2 from public.thong_bao where user_id = c2 and khoa = 'sap_mo' and not da_doc and tieu_de = 'Lớp sắp mở đăng ký';
  res := res || jsonb_build_object('t', '15 Thông báo gộp đã đọc + có lớp sắp mở mới -> tạo thông báo mới "1 lớp"', 'ok', n = 2 and n2 = 1);

  -- ===== Mở đăng ký vẫn gửi "Lớp mới mở đăng ký" như cũ =====
  perform pg_temp.vao(c1);
  perform public.doi_trang_thai_lop(l1, 'dang_mo');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = c4 and loai = 'bai_trong_moi' and lien_ket = '/lop-hoc/' || l1;
  res := res || jsonb_build_object('t', '16 Khi lớp sắp mở chính thức mở đăng ký, người đủ điều kiện nhận thêm "Lớp mới mở đăng ký"', 'ok', n = 2);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();
drop table if exists pg_temp.dong_lich;

select ten, dat from pg_temp.ket_qua order by dat, ts;
