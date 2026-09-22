-- Test tự kiểm tra Giai đoạn 10b (báo cáo #1 KPI tổng hợp theo kỳ, #2 xu hướng KPI, #6 A4, #7 đề xuất nhân sự theo kỳ).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260930100000 (và các migration trước).
-- Script tự tạo 3 user giả (@qldt.test) + 3 kỳ "ZZ Test10b ..." (2025, không đụng kỳ thật) + lớp "ZZ Test10b..." rồi xóa sạch.
-- Kết quả: cột "dat" phải là true hết.
--   a1 Admin | a2 Giảng viên bác sĩ | a3 Trợ giảng bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.de_xuat_nhan_su where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.diem_danh_bai where user_id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.dang_ky_giang_day where user_id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test10b%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test10b%');
  delete from public.lop_hoc where ten like 'ZZ Test10b%';
  delete from public.ky_danh_gia where ten like 'ZZ Test10b%';
  delete from public.lich_su_doi_nhom where user_id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.nhan_su_nhom where user_id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from auth.users where id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
end;
$$;

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
  ('00000000-0000-0000-0000-0000000000a3', 'tg_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  res jsonb := '[]';
  nl uuid; k1 uuid; k2 uuid; k3 uuid;
  lco1 uuid; lco2 uuid; lkp1 uuid; lkp2 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid;
  r record; j jsonb; n int; n2 int; ok boolean; ok2 boolean;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- Kỳ K1 đã đóng (snapshot), K2 đang mở (tính live), K3 chờ duyệt (chỉ Admin xem) — đều nằm trong 2025, không đụng kỳ thật
  insert into public.ky_danh_gia (ten, tu, den, trang_thai) values ('ZZ Test10b K1', '2025-01-01', '2025-03-31', 'da_dong') returning id into k1;
  insert into public.ky_danh_gia (ten, tu, den, trang_thai) values ('ZZ Test10b K2', '2025-04-01', '2025-06-30', 'dang_mo') returning id into k2;
  insert into public.ky_danh_gia (ten, tu, den, trang_thai) values ('ZZ Test10b K3', '2025-07-01', '2025-07-31', 'cho_duyet') returning id into k3;

  -- K1: lớp có kinh phí (để dạy có A1) + lớp không kinh phí (A4) — snapshot ket_qua_kpi ghi trực tiếp (giả lập đã đóng kỳ)
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10b Lớp K1 có KP', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-01-05', '2025-01-06', 'da_hoan_thanh') returning id into lco1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10b Lớp K1 không KP', nl, 'nhan_vien_y_te', 'khong_kinh_phi', '2025-01-10', '2025-01-10', 'da_hoan_thanh') returning id into lkp1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lco1, 1, 'Bài 1', '2025-01-05 08:00:00+07', '2025-01-05 10:00:00+07') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lkp1, 1, 'Bài 1', '2025-01-10 08:00:00+07', '2025-01-10 10:00:00+07') returning id into b2;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (b1, 'giang_vien', 1, 'da_phan_cong', a2), (b2, 'giang_vien', 1, 'da_phan_cong', a2);
  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram) values
    (b1, a2, '2025-01-05 08:00:00+07', 100), (b2, a2, '2025-01-10 08:00:00+07', 100);
  insert into public.ket_qua_kpi (ky_id, user_id, kpi, diem_nhom, gia_tri, trong_so_hieu_luc, gio_thuc, gio_quy_doi, so_bai, so_lop, a4_ky, a4_luy_ke, che_do_a1, percentile)
  values (k1, a2, 70.5, '{"A":65,"B":100,"C":0}'::jsonb, '{"A1":65,"B1":100}'::jsonb, '{"A1":25,"B1":30}'::jsonb, 4, 4.4, 2, 2, 1, 1, 'percentile', 65);

  -- K2 đang mở: a2 và a3 cùng dạy 1 lớp có kinh phí (đủ điểm danh để KPI khác null) + a2 thêm 1 lớp không kinh phí (A4 lũy kế)
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10b Lớp K2 có KP', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-04-05', '2025-04-06', 'da_hoan_thanh') returning id into lco2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10b Lớp K2 không KP', nl, 'nhan_vien_y_te', 'khong_kinh_phi', '2025-04-12', '2025-04-12', 'da_hoan_thanh') returning id into lkp2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lco2, 1, 'Bài 1', '2025-04-05 08:00:00+07', '2025-04-05 10:00:00+07') returning id into b3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lkp2, 1, 'Bài 1', '2025-04-12 08:00:00+07', '2025-04-12 10:00:00+07') returning id into b4;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (b3, 'giang_vien', 1, 'da_phan_cong', a2), (b3, 'tro_giang', 1, 'da_phan_cong', a3), (b4, 'giang_vien', 1, 'da_phan_cong', a2);
  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram) values
    (b3, a2, '2025-04-05 08:00:00+07', 100), (b3, a3, '2025-04-05 08:00:00+07', 90), (b4, a2, '2025-04-12 08:00:00+07', 100);

  -- K3 chờ duyệt: a3 dạy 1 Bài — chỉ để kiểm tra quyền xem (không cần KPI chi tiết)
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lco2, 2, 'Bài 2 (K3)', '2025-07-05 08:00:00+07', '2025-07-05 10:00:00+07') returning id into b1;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values (b1, 'tro_giang', 1, 'da_phan_cong', a3);
  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram) values (b1, a3, '2025-07-05 08:00:00+07', 100);

  -- Đề xuất nhân sự: 1 đổi nhóm gắn ky_id=K1 (đã duyệt); 1 khen thưởng thủ công không ky_id, tạo trong khoảng ngày K2 (chờ duyệt);
  -- 1 đào tạo thủ công ngoài mọi khoảng kỳ test (không được đếm vào K1/K2)
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi, ky_id, trang_thai, created_at) values
    ('doi_nhom', a3, 'ZZ demo', 'tg_bac_si', 'gv_bac_si', k1, 'da_duyet', '2025-01-15');
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, trang_thai, created_at) values
    ('khen_thuong_nhac_nho', a2, 'ZZ demo khen thưởng', 'cho_duyet', '2025-04-20 10:00:00+07');
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, trang_thai, created_at) values
    ('dao_tao', a2, 'ZZ demo đào tạo ngoài kỳ', 'bo_qua', '2024-01-01');

  -- ===== #1 KPI tổng hợp theo kỳ: ẩn/hiện nhóm theo quyền =====
  select * into r from public.bc_kpi_tong_hop(k1) x where x.user_id = a2;
  res := res || jsonb_build_object('t', '01 K1 đã đóng: đọc đúng snapshot (kpi=70.5, a4_ky=1)', 'ok', r.kpi = 70.5 and r.a4_ky = 1);
  res := res || jsonb_build_object('t', '02 GV/TG (không quản trị) gọi báo cáo #1: cột nhóm là NULL (ẩn nhãn nhóm)', 'ok', r.nhom is null);

  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.bc_kpi_tong_hop(k1) x where x.user_id = a2;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_object('t', '03 Admin/Quản lý lớp gọi báo cáo #1: thấy đúng nhóm (gv_bac_si)', 'ok', r.nhom::text = 'gv_bac_si');

  select count(*) into n from public.bc_kpi_tong_hop(k2) x where x.user_id in (a2, a3);
  res := res || jsonb_build_object('t', '04 K2 đang mở: tính LIVE theo dữ liệu hiện tại, có KPI cho cả a2 và a3', 'ok', n = 2);

  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bc_kpi_tong_hop(k3);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_object('t', '05 Kỳ Chờ duyệt (K3): GV/TG không xem được (0 dòng)', 'ok', n = 0);

  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bc_kpi_tong_hop(k3);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_object('t', '06 Kỳ Chờ duyệt (K3): Admin/Quản lý lớp xem được', 'ok', n = 1);

  -- ===== #2 xu hướng KPI theo thời gian =====
  select * into r from public.bc_kpi_theo_ky(24) x where x.ten = 'ZZ Test10b K1';
  res := res || jsonb_build_object('t', '07 Xu hướng K1: KPI trung bình = 70.5 (chỉ a2 có kết quả), 1 người', 'ok', r.kpi_tb = 70.5 and r.so_nguoi = 1);
  select * into r from public.bc_kpi_theo_ky(24) x where x.ten = 'ZZ Test10b K2';
  res := res || jsonb_build_object('t', '08 Xu hướng K2: có đủ 2 người (a2 GV, a3 TG), KPI TB GV và TG đều có giá trị', 'ok', r.so_nguoi = 2 and r.kpi_tb_gv is not null and r.kpi_tb_tg is not null);

  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bc_kpi_theo_ky(24) x where x.ten = 'ZZ Test10b K3';
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_object('t', '09 Xu hướng: kỳ Chờ duyệt (K3) không xuất hiện với GV/TG', 'ok', n = 0);

  -- Thứ tự: cũ -> mới (phục vụ trục thời gian biểu đồ)
  with x as (
    select ten, row_number() over () as vt from public.bc_kpi_theo_ky(24) where ten like 'ZZ Test10b%'
  )
  select (max(vt) filter (where ten = 'ZZ Test10b K1')) < (max(vt) filter (where ten = 'ZZ Test10b K2')) into ok from x;
  res := res || jsonb_build_object('t', '10 Thứ tự trả về: kỳ cũ hơn đứng trước kỳ mới hơn', 'ok', ok);

  -- ===== #6 A4 =====
  select * into r from public.bc_a4(k1) x where x.user_id = a2;
  res := res || jsonb_build_object('t', '11 A4 kỳ K1 của a2 = 1 (1 lớp không kinh phí trong K1)', 'ok', r.a4_ky = 1);
  res := res || jsonb_build_object('t', '12 A4 lũy kế (tính đến hiện tại) của a2 = 2 (lớp không KP ở K1 + K2)', 'ok', r.a4_luy_ke = 2);
  select * into r from public.bc_a4(k2) x where x.user_id = a2;
  res := res || jsonb_build_object('t', '13 A4 kỳ K2 của a2 = 1 (chỉ lớp không KP trong khoảng K2); lũy kế vẫn = 2 dù xem theo kỳ nào', 'ok', r.a4_ky = 1 and r.a4_luy_ke = 2);
  select * into r from public.bc_a4(k1) x where x.user_id = a3;
  res := res || jsonb_build_object('t', '14 a3 không có lớp không kinh phí nào: a4_ky = 0, a4_luy_ke = 0', 'ok', found and r.a4_ky = 0 and r.a4_luy_ke = 0);

  -- ===== #7 đề xuất nhân sự theo kỳ =====
  j := public.bc_de_xuat(k1);
  select (e -> 'da_duyet')::int into n from jsonb_array_elements(j -> 'theo_loai') e where e ->> 'loai' = 'doi_nhom';
  res := res || jsonb_build_object('t', '15 K1: đề xuất đổi nhóm (gắn ky_id) tính đúng dù ngoài phạm vi ngày kỳ', 'ok', n = 1 and (j ->> 'da_duyet')::int = 1);

  j := public.bc_de_xuat(k2);
  select (e -> 'cho_duyet')::int into n from jsonb_array_elements(j -> 'theo_loai') e where e ->> 'loai' = 'khen_thuong_nhac_nho';
  res := res || jsonb_build_object('t', '16 K2: đề xuất thủ công (không ky_id) quy về kỳ theo NGÀY TẠO, đếm đúng 1 chờ duyệt', 'ok', n = 1 and (j ->> 'cho_duyet')::int = 1);

  select count(*) into n from jsonb_array_elements(j -> 'theo_loai') e where e ->> 'loai' = 'dao_tao';
  res := res || jsonb_build_object('t', '17 Đề xuất tạo ngoài mọi khoảng kỳ test không lẫn vào K2', 'ok', n = 0);
  j := public.bc_de_xuat(k1);
  select count(*) into n from jsonb_array_elements(j -> 'theo_loai') e where e ->> 'loai' = 'dao_tao';
  res := res || jsonb_build_object('t', '18 ...cũng không lẫn vào K1', 'ok', n = 0);

  -- ===== Quyền gọi: mọi người đăng nhập gọi được (công khai số liệu tổng hợp, mục 4.7) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a3, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bc_a4(k1);
  j := public.bc_de_xuat(k1);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_object('t', '19 GV/TG (a3) gọi được báo cáo #6 và #7 (công khai tổng hợp toàn đơn vị)', 'ok', n >= 2 and j is not null);

  ok := false;
  execute 'set local role anon';
  begin perform public.bc_a4(k1); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '20 Người chưa đăng nhập không gọi được các báo cáo mới', 'ok', ok);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
