-- Test tự kiểm tra Giai đoạn 10a (báo cáo #3 sản lượng, #4 tỷ lệ A2/A3, #5 vận hành đăng ký + cảnh báo pool nhỏ).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260929100000 (và các migration trước).
-- Script tự tạo 5 user giả (@qldt.test) + lớp "ZZ Test10a..." rồi xóa sạch, kể cả thông báo/nhật ký phát sinh.
-- Số liệu thử nằm ở tuần 03/03–09/03/2025 (không đụng dữ liệu thật) nên kết quả không phụ thuộc giờ chạy; riêng phần cảnh báo pool dùng
-- một loại chứng chỉ thử mà chỉ user giả có, nên không lẫn người thật. Kết quả: cột "dat" phải là true hết.
--   a1 Admin | a2, a3 Giảng viên bác sĩ | a4 Trợ giảng bác sĩ | a5 Giảng viên bác sĩ (không dạy — kiểm tra người 0 giờ)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.danh_muc_loai_chung_chi where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.audit_log where created_at >= (select tu from pg_temp.moc);
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
end;
$$;

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
from generate_series(1, 5) i;
update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a5', 'gv_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  a5 uuid := '00000000-0000-0000-0000-0000000000a5';
  res jsonb := '[]';
  nl uuid; l1 uuid; l2 uuid; l3 uuid; lp1 uuid; lp2 uuid; cc1 uuid; cc2 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid; bp1 uuid; bp2 uuid;
  s_b1_gv uuid; s_b2_gv2 uuid;
  r record; j jsonb; n int; ok boolean; ok2 boolean;
  v_hom_nay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- Lớp đã hoàn thành trong tuần thử + 1 Bài ngoài tuần (cùng tháng), lớp đã hủy, lớp đang mở có Bài sắp tới
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10a L1', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-03-03', '2025-03-20', 'da_hoan_thanh') returning id into l1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10a Hủy', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-03-05', '2025-03-05', 'da_huy') returning id into l2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10a Sắp tới', nl, 'nhan_vien_y_te', 'co_kinh_phi', v_hom_nay + 1, v_hom_nay + 3, 'dang_mo') returning id into l3;

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'B1', '2025-03-03 08:00:00+07', '2025-03-03 10:00:00+07') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'B2', '2025-03-04 08:00:00+07', '2025-03-04 11:00:00+07') returning id into b2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 3, 'B3', '2025-03-20 08:00:00+07', '2025-03-20 10:00:00+07') returning id into b3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 1, 'B4', '2025-03-05 08:00:00+07', '2025-03-05 10:00:00+07') returning id into b4;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l3, 1, 'B5', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b5;

  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (b1, 'giang_vien', 1, 'da_phan_cong', a2), (b1, 'tro_giang', 1, 'da_phan_cong', a4),
    (b2, 'giang_vien', 1, 'da_phan_cong', a2), (b2, 'giang_vien', 2, 'da_phan_cong', a3),
    (b3, 'giang_vien', 1, 'da_phan_cong', a3),
    (b4, 'giang_vien', 1, 'da_phan_cong', a5),
    (b5, 'giang_vien', 1, 'da_phan_cong', a3);
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b2, 'tro_giang', 1);

  select id into s_b1_gv from public.slot_giang_day where bai_id = b1 and vai_tro = 'giang_vien' and vi_tri = 1;
  select id into s_b2_gv2 from public.slot_giang_day where bai_id = b2 and vai_tro = 'giang_vien' and vi_tri = 2;

  -- Đăng ký: a2 tự đăng ký B1 (duyệt sau 5 giờ); a3 được mời B2 và đồng ý (sau 1 giờ); a3 từ chối 1 lời mời B1
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, trang_thai, slot_id, xu_ly_luc)
  values (b1, 'giang_vien', a2, 'tu_dang_ky', 'da_duyet', s_b1_gv, now() + interval '5 hours');
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, trang_thai, slot_id, xu_ly_luc, nguoi_moi)
  values (b2, 'giang_vien', a3, 'duoc_moi', 'da_duyet', s_b2_gv2, now() + interval '1 hour', a1);
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, trang_thai, xu_ly_luc, nguoi_moi)
  values (b1, 'giang_vien', a3, 'duoc_moi', 'tu_choi', now(), a1);
  -- Đang chờ: 1 đăng ký (a4 vào Bài sắp tới) + 1 lời mời (a5 vào Bài sắp tới)
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai) values (b5, 'tro_giang', a4, 'tu_dang_ky');
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi) values (b5, 'giang_vien', a5, 'duoc_moi', a1);

  -- ===== Báo cáo #3: sản lượng =====
  select * into r from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.user_id = a2;
  res := res || jsonb_build_object('t', '01 Sản lượng tuần thử: a2 dạy 2 Bài, 1 lớp, 5 giờ (2h + 3h)', 'ok',
    r.so_bai = 2 and r.so_lop = 1 and r.gio_thuc = 5 and r.vai_tro = 'giang_vien' and r.so_bai_sap = 0);
  select * into r from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.user_id = a3;
  res := res || jsonb_build_object('t', '02 a3 chỉ tính Bài trong tuần (B2, 3 giờ) — B3 ngày 20/03 ngoài khoảng', 'ok', r.so_bai = 1 and r.gio_thuc = 3);
  select * into r from public.bc_san_luong('2025-03-03', '2025-03-31') x where x.user_id = a3;
  res := res || jsonb_build_object('t', '03 Khoảng cả tháng 03/2025: a3 có 2 Bài, 5 giờ', 'ok', r.so_bai = 2 and r.gio_thuc = 5);
  select * into r from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.user_id = a4;
  res := res || jsonb_build_object('t', '04 Trợ giảng a4: 1 Bài, 2 giờ, vai trò tro_giang', 'ok', r.so_bai = 1 and r.gio_thuc = 2 and r.vai_tro = 'tro_giang');
  select * into r from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.user_id = a5;
  res := res || jsonb_build_object('t', '05 a5 chỉ có Bài của lớp đã hủy: vẫn hiện (đang tham gia) nhưng 0 Bài, 0 giờ', 'ok',
    found and r.so_bai = 0 and r.gio_thuc = 0);
  select count(*) into n from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.user_id = a1;
  res := res || jsonb_build_object('t', '06 Tài khoản không có vai trò giảng dạy (Admin thuần) không xuất hiện', 'ok', n = 0);
  select * into r from public.bc_san_luong(v_hom_nay - 1, v_hom_nay + 7) x where x.user_id = a3;
  res := res || jsonb_build_object('t', '07 Bài đã phân công nhưng chưa diễn ra tính riêng (so_bai_sap = 1, 2 giờ), chưa vào giờ đã dạy', 'ok',
    r.so_bai_sap = 1 and r.gio_sap = 2 and r.so_bai = 0);
  select count(*) into n from public.bc_san_luong('2025-03-03', '2025-03-09') x where x.so_bai > 0 and x.user_id not in (a2, a3, a4)
    and x.user_id in (a1, a5);
  res := res || jsonb_build_object('t', '08 Lớp đã hủy không tính vào sản lượng của a5', 'ok', n = 0);

  -- ===== Báo cáo #4: A2/A3 =====
  select * into r from public.bc_ty_le_dang_ky('2025-03-03', '2025-03-09') x where x.user_id = a2;
  res := res || jsonb_build_object('t', '09 A2 của a2: 2 Bài đã dạy, 1 Bài tự đăng ký được duyệt', 'ok', r.so_bai_da_day = 2 and r.so_tu_dang_ky = 1);
  select * into r from public.bc_ty_le_dang_ky('2025-03-03', '2025-03-09') x where x.user_id = a3;
  res := res || jsonb_build_object('t', '10 A3 của a3: 1 lời mời đồng ý, 1 từ chối; Bài đã dạy 1, tự đăng ký 0', 'ok',
    r.so_moi_dong_y = 1 and r.so_moi_tu_choi = 1 and r.so_bai_da_day = 1 and r.so_tu_dang_ky = 0);
  select count(*) into n from public.bc_ty_le_dang_ky('2025-03-03', '2025-03-09') x where x.user_id in (a1, a5);
  res := res || jsonb_build_object('t', '11 Người không phát sinh gì trong khoảng (a5: lớp hủy, không lời mời đã trả lời) không xuất hiện', 'ok', n = 0);
  select count(*) into n from public.bc_ty_le_dang_ky('2025-04-01', '2025-04-30') x where x.user_id in (a2, a3, a4);
  res := res || jsonb_build_object('t', '12 Khoảng không có hoạt động: không có dòng nào của user thử', 'ok', n = 0);

  -- ===== Báo cáo #5: vận hành đăng ký =====
  j := public.bc_van_hanh_dang_ky('2025-03-03', '2025-03-09');
  res := res || jsonb_build_object('t', '13 Tỷ lệ lấp đầy tuần thử: 5 slot, 4 đã phân công (lớp hủy không tính)', 'ok',
    (j ->> 'slot_tong')::int = 5 and (j ->> 'slot_da_phan_cong')::int = 4);
  res := res || jsonb_build_object('t', '14 Thời gian TB lấp slot = (5 giờ + 1 giờ) / 2 = 3,0 giờ trên 2 slot có ghi nhận duyệt', 'ok',
    (j ->> 'gio_lap_tb')::numeric = 3.0 and (j ->> 'so_slot_do_duyet')::int = 2);
  res := res || jsonb_build_object('t', '15 Chuỗi theo ngày đủ 7 phần tử cho khoảng 7 ngày', 'ok', jsonb_array_length(j -> 'serie') = 7);
  j := public.bc_van_hanh_dang_ky(v_hom_nay, v_hom_nay + 1);
  res := res || jsonb_build_object('t', '16 Số đăng ký/lời mời tạo hôm nay: ≥ 2 đăng ký (a2, a4) và ≥ 3 lời mời; chờ xử lý ≥ 1 đăng ký + ≥ 1 lời mời', 'ok',
    (j ->> 'dang_ky_moi')::int >= 2 and (j ->> 'loi_moi_gui')::int >= 3
    and (j ->> 'dang_ky_cho')::int >= 1 and (j ->> 'loi_moi_cho')::int >= 1);
  select coalesce(sum((e ->> 'dang_ky')::int), 0) into n from jsonb_array_elements(j -> 'serie') e;
  res := res || jsonb_build_object('t', '17 Chuỗi theo ngày cộng lại khớp số đăng ký mới trong khoảng', 'ok', n = (j ->> 'dang_ky_moi')::int);

  -- ===== Cảnh báo pool ứng viên nhỏ =====
  insert into public.danh_muc_loai_chung_chi (ten) values ('ZZ Test10a CC1') returning id into cc1;
  insert into public.danh_muc_loai_chung_chi (ten) values ('ZZ Test10a CC2') returning id into cc2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10a Pool1', nl, 'nhan_vien_y_te', 'co_kinh_phi', v_hom_nay + 20, v_hom_nay + 21, 'dang_mo') returning id into lp1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test10a Pool2', nl, 'nhan_vien_y_te', 'co_kinh_phi', v_hom_nay + 22, v_hom_nay + 23, 'dang_mo') returning id into lp2;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (lp1, 'gv_bac_si'), (lp1, 'tg_bac_si'), (lp2, 'gv_bac_si');
  insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, loai_id) values (lp1, cc1), (lp2, cc2);
  insert into public.chung_chi (user_id, loai_id) values (a2, cc1), (a4, cc1);
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp1, 1, 'P1', now() + interval '20 days', now() + interval '20 days 2 hours') returning id into bp1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp2, 1, 'P2', now() + interval '22 days', now() + interval '22 days 2 hours') returning id into bp2;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (bp1, 'giang_vien', 1), (bp1, 'tro_giang', 1), (bp2, 'giang_vien', 1);

  select * into r from public.bc_canh_bao_pool() x where x.bai_id = bp1 and x.vai_tro = 'giang_vien';
  res := res || jsonb_build_object('t', '18 Pool Giảng viên Bài P1: chỉ a2 đủ chứng chỉ → 1 người (< ngưỡng 3) nên có cảnh báo', 'ok', found and r.so_ung_vien = 1 and r.slot_trong = 1);
  select * into r from public.bc_canh_bao_pool() x where x.bai_id = bp1 and x.vai_tro = 'tro_giang';
  res := res || jsonb_build_object('t', '19 Pool Trợ giảng Bài P1: chỉ a4 → 1 người', 'ok', found and r.so_ung_vien = 1);
  select * into r from public.bc_canh_bao_pool() x where x.bai_id = bp2;
  res := res || jsonb_build_object('t', '20 Bài P2 yêu cầu chứng chỉ không ai có: 0 người vẫn được liệt kê', 'ok', found and r.so_ung_vien = 0);
  select count(*) into n from public.bc_canh_bao_pool() x where x.bai_id = b5 and x.vai_tro = 'giang_vien';
  res := res || jsonb_build_object('t', '21 Slot Giảng viên của B5 đã có người phân công nên không còn được tính là slot trống để cảnh báo', 'ok', n = 0);
  select count(*) into n from public.bc_canh_bao_pool() x where x.bai_id in (b1, b2, b3);
  res := res || jsonb_build_object('t', '22 Bài đã qua (lớp đã hoàn thành) không nằm trong cảnh báo', 'ok', n = 0);

  -- ===== Quyền gọi =====
  perform set_config('request.jwt.claims', json_build_object('sub', a3, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bc_san_luong('2025-03-03', '2025-03-09');
  ok := n >= 4;
  j := public.bc_van_hanh_dang_ky('2025-03-03', '2025-03-09');
  ok2 := (j ->> 'slot_tong')::int = 5;
  execute 'reset role';
  res := res || jsonb_build_object('t', '23 GV/TG (a3) xem được báo cáo tổng hợp toàn đơn vị (công khai nội bộ)', 'ok', ok and ok2);

  ok := false;
  execute 'set local role authenticated';
  begin perform public.bc_kiem_tra_khoang('2025-03-03', '2025-03-09'); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '24 Hàm kiểm tra khoảng thời gian nội bộ không gọi trực tiếp được', 'ok', ok);

  ok := false; ok2 := false;
  begin perform * from public.bc_san_luong('2025-03-09', '2025-03-03'); exception when sqlstate '22023' then ok := true; end;
  begin perform * from public.bc_ty_le_dang_ky('2024-01-01', '2025-12-31'); exception when sqlstate '22023' then ok2 := true; end;
  res := res || jsonb_build_object('t', '25 Khoảng ngược hoặc dài quá 400 ngày bị từ chối', 'ok', ok and ok2);

  ok := false;
  execute 'set local role anon';
  begin perform * from public.bc_san_luong('2025-03-03', '2025-03-09'); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '26 Người chưa đăng nhập không gọi được báo cáo', 'ok', ok);

  insert into public.cau_hinh_push select * from pg_temp.webhook;
  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
