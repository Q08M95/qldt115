-- Test tự kiểm tra bản bổ sung 8b (tùy chọn thông báo, thử lại push) và 9c (nhật ký tạo/xóa lớp, thêm/sửa/xóa Bài, tạo đề xuất).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260927100000 và 20260927110000 (và các migration trước).
-- Script tự tạo 3 user giả (@qldt.test) + lớp "ZZ Test8b..." rồi xóa sạch, kể cả nhật ký/thông báo phát sinh cho Admin thật.
-- Tạm gỡ cấu hình webhook push trong lúc thử (để không gọi ra ngoài) và KHÔI PHỤC ở cuối.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 Admin | a2, a3 Giảng viên bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.push_subscription where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
  delete from public.de_xuat_nhan_su where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
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
create or replace function pg_temp.la(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
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
  nl uuid; lo uuid; l1 uuid; lz uuid; b1 uuid; b2 uuid; bz uuid; tb uuid;
  n int; n2 int; n3 int; ok boolean; ok2 boolean;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- ===================== 8b: tùy chọn thông báo =====================
  perform pg_temp.vao(a2);
  perform public.luu_tuy_chon_thong_bao('bai_trong_moi', false, true);
  select count(*) into n from public.thong_bao_tuy_chon;
  perform pg_temp.ra();
  select trong_app, day_push into ok, ok2 from public.thong_bao_tuy_chon where user_id = a2 and loai = 'bai_trong_moi';
  res := res || jsonb_build_object('t', '01 Tắt "lớp/Bài mới" trong app: lưu tùy chọn; tắt trong app thì tắt luôn push', 'ok', n = 1 and not ok and not ok2);

  perform pg_temp.vao(a2);
  ok := false; begin perform public.luu_tuy_chon_thong_bao('nhac_check_in', false, false); exception when check_violation then ok := true; end;
  ok2 := false; begin perform public.luu_tuy_chon_thong_bao('duoc_moi', false, false); exception when check_violation then ok2 := true; end;
  n := 0;
  begin insert into public.thong_bao_tuy_chon (user_id, loai) values (a2, 'huy_lop'); exception when insufficient_privilege then n := 1; end;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '02 Loại bắt buộc (nhắc check-in, lời mời dạy) không tắt được; không ghi thẳng bảng tùy chọn', 'ok', ok and ok2 and n = 1);

  perform pg_temp.vao(a3);
  select count(*) into n from public.thong_bao_tuy_chon;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '03 Người khác không thấy tùy chọn của a2', 'ok', n = 0);

  -- Lớp mở đăng ký: a3 nhận, a2 (đã tắt) không nhận
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8b Lớp mở', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'nhap') returning id into lo;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (lo, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lo, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1);
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_lop(lo, 'dang_mo');
  perform pg_temp.ra();
  select count(*) into n from public.thong_bao where user_id = a3 and loai = 'bai_trong_moi' and lien_ket = '/lop-hoc/' || lo;
  select count(*) into n2 from public.thong_bao where user_id = a2 and loai = 'bai_trong_moi';
  res := res || jsonb_build_object('t', '04 Đã tắt "lớp/Bài mới": a2 không nhận thông báo; a3 (mặc định bật) vẫn nhận', 'ok', n = 1 and n2 = 0);

  -- ===================== 8b: thử lại push =====================
  perform pg_temp.vao(a3);
  perform public.luu_tuy_chon_thong_bao('bai_trong_moi', true, false);
  perform pg_temp.ra();
  insert into public.push_subscription (user_id, endpoint, p256dh, auth) values (a3, 'https://push.example/ZZ-test-8b', 'p', 'a');
  update public.thong_bao set created_at = now() - interval '5 minutes' where user_id = a3 and loai = 'bai_trong_moi' and lien_ket = '/lop-hoc/' || lo returning id into tb;
  n := public.thu_lai_push();
  select push_so_lan into n2 from public.thong_bao where id = tb;
  res := res || jsonb_build_object('t', '05 Đã tắt push cho loại này: job thử lại bỏ qua thông báo đó', 'ok', n = 0 and n2 = 0);

  perform pg_temp.vao(a3);
  perform public.luu_tuy_chon_thong_bao('bai_trong_moi', true, true);
  perform pg_temp.ra();
  n := public.thu_lai_push();
  select push_so_lan, push_lan_cuoi is not null into n2, ok from public.thong_bao where id = tb;
  res := res || jsonb_build_object('t', '06 Bật lại push: job thử lại gọi lại 1 lần, ghi số lần thử và thời điểm', 'ok', n = 1 and n2 = 1 and ok);

  n := public.thu_lai_push();
  res := res || jsonb_build_object('t', '07 Vừa thử xong thì chưa thử lại ngay (cách nhau >= 2 phút)', 'ok', n = 0);

  update public.thong_bao set push_lan_cuoi = now() - interval '3 minutes', push_so_lan = 3 where id = tb;
  n := public.thu_lai_push();
  update public.thong_bao set push_so_lan = 1, push_luc = now() where id = tb;
  n2 := public.thu_lai_push();
  res := res || jsonb_build_object('t', '08 Đã thử đủ 3 lần hoặc đã đẩy được thì dừng', 'ok', n = 0 and n2 = 0);

  update public.thong_bao set push_luc = null, push_so_lan = 0, push_lan_cuoi = null, created_at = now() - interval '2 hours' where id = tb;
  n := public.thu_lai_push();
  res := res || jsonb_build_object('t', '09 Thông báo tạo quá 30 phút trước không thử lại nữa', 'ok', n = 0);

  -- ===================== 9c: nhật ký bổ sung =====================
  perform pg_temp.la(a1);
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8b Lớp nhật ký', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 5, 'nhap') returning id into l1;
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'tao_lop' and doi_tuong = 'Lớp ZZ Test8b Lớp nhật ký' and sau ->> 'ten' = 'ZZ Test8b Lớp nhật ký' and created_at >= v_tu;
  res := res || jsonb_build_object('t', '10 Tạo lớp: đúng 1 dòng nhật ký', 'ok', n = 1);

  perform pg_temp.vao(a1);
  b2 := public.luu_bai_hoc(null, l1, 'Bài A', now() + interval '3 days', now() + interval '3 days 2 hours', 1, 0);
  bz := public.luu_bai_hoc(null, l1, 'Bài B', now() + interval '4 days', now() + interval '4 days 2 hours', 1, 0);
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'them_bai' and created_at >= v_tu and doi_tuong like 'Lớp ZZ Test8b Lớp nhật ký%';
  res := res || jsonb_build_object('t', '11 Thêm 2 Bài: 2 dòng nhật ký (mỗi Bài 1 dòng)', 'ok', n = 2);

  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b2, l1, 'Bài A (đổi tên)', now() + interval '3 days', now() + interval '3 days 2 hours', 1, 0);
  perform public.luu_bai_hoc(b2, l1, 'Bài A (đổi tên)', now() + interval '3 days 1 hour', now() + interval '3 days 3 hours', 1, 0);
  perform pg_temp.ra();
  select count(*), bool_or(truoc ->> 'ten' = 'Bài A' and sau ->> 'ten' = 'Bài A (đổi tên)'), bool_or(truoc ? 'bat_dau' and sau ? 'ket_thuc')
  into n, ok, ok2 from public.audit_log where loai = 'sua_bai' and created_at >= v_tu and doi_tuong like 'Lớp ZZ Test8b Lớp nhật ký%';
  res := res || jsonb_build_object('t', '12 Sửa Bài chưa có người: đổi tên 1 dòng, đổi giờ 1 dòng (kèm trước/sau)', 'ok', n = 2 and ok and ok2);

  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a2 where bai_id = b2;
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b2, l1, 'Bài A (đổi tên)', now() + interval '3 days 4 hours', now() + interval '3 days 6 hours', 1, 0);
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'sua_bai' and created_at >= v_tu and doi_tuong like 'Lớp ZZ Test8b Lớp nhật ký%';
  select count(*) into n2 from public.audit_log where loai = 'doi_lich_bai' and created_at >= v_tu and a2 = any (nguoi_lien_quan);
  res := res || jsonb_build_object('t', '13 Đổi giờ Bài ĐÃ có người phân công: chỉ ghi "đổi lịch Bài" (không trùng thêm dòng "sửa Bài")', 'ok', n = 2 and n2 = 1);
  update public.slot_giang_day set trang_thai = 'trong', nguoi_phan_cong = null where bai_id = b2;

  perform pg_temp.vao(a1);
  perform public.xoa_bai_hoc(bz);
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'xoa_bai' and created_at >= v_tu and doi_tuong = 'Lớp ZZ Test8b Lớp nhật ký — Bài B';
  res := res || jsonb_build_object('t', '14 Xóa Bài: 1 dòng nhật ký', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.xoa_lop_hoc(l1);
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'xoa_lop' and created_at >= v_tu and doi_tuong = 'Lớp ZZ Test8b Lớp nhật ký';
  select count(*) into n2 from public.audit_log where loai = 'xoa_bai' and created_at >= v_tu and doi_tuong like 'Lớp ZZ Test8b Lớp nhật ký%';
  res := res || jsonb_build_object('t', '15 Xóa lớp Nháp: 1 dòng "xóa lớp"; các Bài bị xóa kèm theo không ghi thêm dòng riêng', 'ok', n = 1 and n2 = 1);

  perform pg_temp.vao(a1);
  perform public.tao_de_xuat('khen_thuong_nhac_nho', a2, 'Khen thưởng thử');
  perform pg_temp.ra();
  perform pg_temp.la(a1);
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung) values ('dao_tao', a2, 'x'), ('dao_tao', a3, 'y'), ('phan_cong', a3, 'z');
  perform pg_temp.ra();
  select count(*) into n from public.audit_log where loai = 'tao_de_xuat' and created_at >= v_tu;
  select count(*) into n2 from public.audit_log where loai = 'tao_de_xuat' and created_at >= v_tu and (sau ->> 'so_luong') = '3';
  res := res || jsonb_build_object('t', '16 Tạo 1 đề xuất: 1 dòng có tên; tạo 3 đề xuất cùng lúc (như đóng kỳ): 1 dòng gộp ghi số lượng', 'ok', n = 2 and n2 = 1);

  perform pg_temp.vao(a2);
  select count(*) into n from public.audit_log where loai in ('tao_lop', 'xoa_lop', 'them_bai', 'sua_bai', 'xoa_bai', 'tao_de_xuat');
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '17 GV/TG không thấy các dòng nhật ký quản trị mới (tạo/xóa lớp, sửa Bài, đề xuất)', 'ok', n = 0);

  -- Khôi phục cấu hình webhook push
  insert into public.cau_hinh_push select * from pg_temp.webhook;
  res := res || jsonb_build_object('t', '18 Đã khôi phục cấu hình webhook push', 'ok', (select count(*) from public.cau_hinh_push) = (select count(*) from pg_temp.webhook));

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
