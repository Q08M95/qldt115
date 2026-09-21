-- Test tự kiểm tra Giai đoạn 8 (Thông báo: trigger sự kiện, nhắc check-in, quyền đọc/ghi, đăng ký push, cấu hình).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260925100000 (và các migration trước).
-- Script tự tạo 6 user giả (@qldt.test) + lớp "ZZ Test8..." + 1 kỳ thử NĂM 2025 (không đụng kỳ thật), kiểm tra rồi xóa sạch,
-- kể cả các thông báo phát sinh cho Admin thật trong lúc chạy thử (xóa mọi thông báo tạo từ lúc bắt đầu script).
-- Script tạm đổi cấu hình "nhắc check-in" và khôi phục ở cuối. Không gọi webhook push (không tạo thông báo cho người đã đăng ký push).
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   a1 Admin | a2, a3 Giảng viên bác sĩ | a4, a5 Trợ giảng bác sĩ (a5 tạm ngừng) | a6 chưa có nhóm (sẽ được gán Quyền Quản lý lớp)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.ky_danh_gia where ten like 'ZZ Test%';
  delete from public.de_xuat_nhan_su where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
  delete from public.diem_danh_bai where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
  -- Thông báo phát sinh trong lúc chạy thử (kể cả cho Admin thật) + của user giả (xóa cascade cùng user)
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6');
end;
$$;

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

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000a' || i)::uuid, 'authenticated', 'authenticated',
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 6) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a5', 'tg_bac_si');
update public.profiles set trang_thai_tham_gia = 'tam_ngung' where id = '00000000-0000-0000-0000-0000000000a5';

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  a5 uuid := '00000000-0000-0000-0000-0000000000a5';
  a6 uuid := '00000000-0000-0000-0000-0000000000a6';
  res jsonb := '[]';
  n int;
  n2 int;
  ok boolean;
  ok2 boolean;
  nl uuid;
  l1 uuid; l2 uuid; l3 uuid; lk uuid;
  b1 uuid; b1b uuid; b2 uuid; bR uuid; bR2 uuid; bR3 uuid; bR6 uuid; bR4 uuid; bP uuid; bK uuid;
  reg1 uuid; reg2 uuid; inv uuid; inv2 uuid; dx1 uuid; dx2 uuid; kk uuid; sl uuid;
  t record;
  o_nhac numeric;
  v_tin text;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  select gia_tri into o_nhac from public.cau_hinh_he_thong where khoa = 'nhac_check_in_truoc_phut';

  -- ===== Dữ liệu thử =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8 Lớp 1', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'nhap') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si'), (l1, 'tg_bac_si');
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8 Lớp nhắc giờ', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date - 1, current_date + 1, 'dang_mo') returning id into l2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8 Lớp đã hủy', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date - 1, current_date + 1, 'da_huy') returning id into l3;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test8 Kỳ 2025', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-07-10', '2025-07-11', 'da_hoan_thanh') returning id into lk;

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 2, 'Bài 2', now() + interval '4 days', now() + interval '4 days 2 hours') returning id into b2;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values
    (b1, 'giang_vien', 1), (b1, 'giang_vien', 2), (b1, 'tro_giang', 1), (b2, 'giang_vien', 1);

  -- ===== Lớp Nháp: chưa ai được báo =====
  select count(*) into n from public.thong_bao where user_id in (a2, a3, a4, a5, a6);
  res := res || jsonb_build_object('t', '01 Lớp/Bài ở trạng thái Nháp: chưa phát sinh thông báo nào', 'ok', n = 0);

  -- ===== Lớp mở đăng ký -> người đủ điều kiện =====
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_lop(l1, 'dang_mo');
  execute 'reset role';
  select count(*) into n from public.thong_bao where loai = 'bai_trong_moi' and user_id in (a2, a3, a4) and lien_ket = '/lop-hoc/' || l1;
  res := res || jsonb_build_object('t', '02 Mở đăng ký lớp: 3 người đủ điều kiện (2 GV + 1 TG đang tham gia) đều nhận thông báo', 'ok', n = 3);
  select count(*) into n from public.thong_bao where user_id in (a1, a5, a6);
  res := res || jsonb_build_object('t', '03 Người thao tác, người tạm ngừng và người chưa có nhóm không nhận thông báo lớp mới', 'ok', n = 0);
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'bai_trong_moi' and muc_do = 'thong_tin' and lien_ket = '/lop-hoc/' || l1;
  res := res || jsonb_build_object('t', '04 Thông báo lớp mới thuộc mức "thông tin", dẫn tới trang lớp', 'ok', n = 1);

  -- ===== Thêm Bài vào lớp đang mở: gộp, không dồn dập =====
  perform pg_temp.vao(a1);
  b1b := public.luu_bai_hoc(null, l1, 'Bài 3', now() + interval '5 days', now() + interval '5 days 2 hours', 1, 1);
  perform public.luu_bai_hoc(null, l1, 'Bài 4', now() + interval '6 days', now() + interval '6 days 2 hours', 1, 1);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and khoa = 'bai_moi:' || l1;
  select count(*) into n2 from public.thong_bao where user_id = a4 and khoa = 'bai_moi:' || l1;
  res := res || jsonb_build_object('t', '05 Thêm 2 Bài liên tiếp vào lớp đang mở: mỗi người đủ điều kiện chỉ nhận 1 thông báo "Bài mới" (gộp)', 'ok', n = 1 and n2 = 1);
  update public.thong_bao set da_doc = true where user_id = a2 and khoa = 'bai_moi:' || l1;
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(null, l1, 'Bài 5', now() + interval '7 days', now() + interval '7 days 2 hours', 1, 0);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and khoa = 'bai_moi:' || l1;
  res := res || jsonb_build_object('t', '06 Sau khi đã đọc, Bài mới tiếp theo lại tạo thông báo mới', 'ok', n = 2);

  -- ===== Đăng ký tự nguyện -> Admin =====
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b1, b2]);
  execute 'reset role';
  select count(*), max(noi_dung), bool_and(muc_do = 'can_hanh_dong') into n, v_tin, ok from public.thong_bao where user_id = a1 and loai = 'dang_ky_can_duyet';
  res := res || jsonb_build_object('t', '07 a2 đăng ký 2 Bài 1 lượt: Admin nhận đúng 1 thông báo "cần hành động", ghi rõ 2 Bài', 'ok',
    n = 1 and ok and v_tin like '%2 Bài%' and v_tin like '%ZZ Test8 Lớp 1%');
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'dang_ky_can_duyet';
  res := res || jsonb_build_object('t', '08 Người đăng ký không nhận thông báo về chính đăng ký của mình', 'ok', n = 0);

  -- ===== Duyệt / từ chối =====
  select id into reg1 from public.dang_ky_giang_day where user_id = a2 and bai_id = b1;
  select id into reg2 from public.dang_ky_giang_day where user_id = a2 and bai_id = b2;
  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(reg1, true);
  perform public.tu_choi_dang_ky(reg2, 'Trùng kế hoạch');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'dang_ky_ket_qua' and tieu_de = 'Đăng ký được duyệt';
  select count(*) into n2 from public.thong_bao where user_id = a2 and loai = 'dang_ky_ket_qua' and tieu_de = 'Đăng ký bị từ chối' and noi_dung like '%Trùng kế hoạch%';
  res := res || jsonb_build_object('t', '09 Duyệt -> người đăng ký nhận "được duyệt"; từ chối -> nhận "bị từ chối" kèm lý do', 'ok', n = 1 and n2 = 1);

  -- ===== Lời mời (Luồng B) =====
  perform pg_temp.vao(a1);
  inv := public.moi_giang_day(b2, 'giang_vien', a3);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a3 and loai = 'duoc_moi' and muc_do = 'can_hanh_dong' and khoa = 'loi_moi:' || inv;
  res := res || jsonb_build_object('t', '10 Được mời dạy: người được mời nhận thông báo "cần hành động"', 'ok', n = 1);

  perform pg_temp.vao(a3);
  perform public.phan_hoi_loi_moi(inv, false);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a1 and loai = 'loi_moi_ket_qua' and noi_dung like '%từ chối lời mời%';
  select da_doc into ok from public.thong_bao where user_id = a3 and khoa = 'loi_moi:' || inv;
  res := res || jsonb_build_object('t', '11 Lời mời bị từ chối: Admin nhận thông báo; thông báo lời mời của người từ chối tự chuyển sang đã đọc', 'ok', n = 1 and ok);

  perform pg_temp.vao(a1);
  inv2 := public.moi_giang_day(b2, 'giang_vien', a3);
  perform public.thu_hoi_loi_moi(inv2);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a3 and tieu_de = 'Lời mời dạy đã được thu hồi';
  select da_doc into ok from public.thong_bao where user_id = a3 and khoa = 'loi_moi:' || inv2;
  res := res || jsonb_build_object('t', '12 Admin thu hồi lời mời: người được mời nhận thông báo thu hồi và lời mời cũ chuyển sang đã đọc', 'ok', n = 1 and ok);

  -- ===== Hủy phân công =====
  select id into sl from public.slot_giang_day where bai_id = b1 and nguoi_phan_cong = a2;
  perform pg_temp.vao(a1);
  perform public.huy_phan_cong(sl, 'Đổi kế hoạch');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'huy_phan_cong' and noi_dung like '%Đổi kế hoạch%';
  res := res || jsonb_build_object('t', '13 Admin hủy phân công: người bị hủy nhận thông báo kèm lý do', 'ok', n = 1);
  -- Gán lại a2 để thử đổi lịch / hủy lớp
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a2 where id = sl;

  -- ===== Đổi lịch =====
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b1, l1, 'Bài 1 (đổi tên)', now() + interval '2 days', now() + interval '2 days 2 hours', 2, 1);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'doi_lich';
  res := res || jsonb_build_object('t', '14 Chỉ đổi tên Bài (giờ giữ nguyên): không có thông báo đổi lịch', 'ok', n = 0);
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b1, l1, 'Bài 1 (đổi tên)', now() + interval '2 days 1 hour', now() + interval '2 days 3 hours', 2, 1);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'doi_lich' and noi_dung like '%sang%';
  select count(*) into n2 from public.thong_bao where user_id in (a3, a4) and loai = 'doi_lich';
  res := res || jsonb_build_object('t', '15 Đổi giờ Bài đã phân công: đúng người được phân công nhận thông báo (1), người khác không', 'ok', n = 1 and n2 = 0);

  -- ===== Nhắc check-in (job) =====
  update public.cau_hinh_he_thong set gia_tri = 30 where khoa = 'nhac_check_in_truoc_phut';
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 1, 'R1', now() + interval '20 minutes', now() + interval '2 hours') returning id into bR;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 2, 'R2', now() + interval '3 hours', now() + interval '5 hours') returning id into bR2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 3, 'R3', now() - interval '10 minutes', now() + interval '1 hour') returning id into bR3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 4, 'R6', now() + interval '40 minutes', now() + interval '2 hours') returning id into bR6;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l3, 1, 'R4', now() + interval '10 minutes', now() + interval '1 hour') returning id into bR4;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (bR, 'giang_vien', 1, 'da_phan_cong', a2), (bR, 'tro_giang', 1, 'da_phan_cong', a4),
    (bR2, 'giang_vien', 1, 'da_phan_cong', a2), (bR3, 'giang_vien', 1, 'da_phan_cong', a2),
    (bR6, 'giang_vien', 1, 'da_phan_cong', a3), (bR4, 'tro_giang', 1, 'da_phan_cong', a4);
  -- a4 đã check-in bR sẵn -> không cần nhắc
  insert into public.diem_danh_bai (bai_id, user_id, check_in_luc, b1_phan_tram) values (bR, a4, now(), 100);

  n := public.nhac_check_in();
  select count(*) into n2 from public.thong_bao where loai = 'nhac_check_in' and user_id in (a2, a3, a4);
  res := res || jsonb_build_object('t', '16 Job nhắc check-in: chỉ a2 (Bài R1 bắt đầu sau 20 phút) được nhắc; Bài xa (3 giờ, 40 phút), đã bắt đầu, lớp hủy, đã check-in đều không', 'ok',
    n >= 1 and n2 = 1 and exists (select 1 from public.thong_bao where user_id = a2 and khoa = 'nhac_check_in:' || bR || ':' || a2 and muc_do = 'can_hanh_dong'));
  n := public.nhac_check_in();
  select count(*) into n2 from public.thong_bao where loai = 'nhac_check_in' and user_id in (a2, a3, a4);
  res := res || jsonb_build_object('t', '17 Chạy job lần nữa không nhắc trùng (mỗi Bài-người 1 lần)', 'ok', n2 = 1);
  update public.cau_hinh_he_thong set gia_tri = 60 where khoa = 'nhac_check_in_truoc_phut';
  perform public.nhac_check_in();
  select count(*) into n2 from public.thong_bao where loai = 'nhac_check_in' and user_id = a3;
  res := res || jsonb_build_object('t', '18 Cấu hình nhắc 60 phút bị chặn ở khung check-in 45 phút: Bài còn 40 phút thì nhắc a3', 'ok', n2 = 1);

  perform pg_temp.vao(a2);
  perform public.check_in_bai(bR);
  execute 'reset role';
  select da_doc into ok from public.thong_bao where user_id = a2 and khoa = 'nhac_check_in:' || bR || ':' || a2;
  res := res || jsonb_build_object('t', '19 Đã check-in: thông báo nhắc của Bài đó tự chuyển sang đã đọc', 'ok', ok);

  -- ===== Điểm danh bị chỉnh tay =====
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 5, 'P', now() - interval '4 hours', now() - interval '2 hours') returning id into bP;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values (bP, 'giang_vien', 1, 'da_phan_cong', a2);
  perform pg_temp.vao(a1);
  perform public.chinh_diem_danh(bP, a2, 80, 'Lỗi kỹ thuật khi check-in');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'sua_diem_danh' and noi_dung like '%80%' and noi_dung like '%Lỗi kỹ thuật%';
  res := res || jsonb_build_object('t', '20 Admin chỉnh tay B1: người bị sửa nhận thông báo có giá trị mới và lý do', 'ok', n = 1);
  perform pg_temp.vao(a2);
  perform public.check_in_bai(bR3);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'sua_diem_danh';
  res := res || jsonb_build_object('t', '21 Tự check-in không tạo thông báo "bị chỉnh sửa"', 'ok', n = 1);

  -- ===== Quyền Quản lý lớp + đề xuất nhân sự =====
  perform pg_temp.vao(a1);
  perform public.gan_quyen_quan_ly_lop(a6, true);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a6 and loai = 'quyen_quan_ly_lop' and tieu_de like '%được gán%';
  res := res || jsonb_build_object('t', '22 Được gán Quyền Quản lý lớp: người đó nhận thông báo', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.tao_de_xuat('khen_thuong_nhac_nho', a2, 'Khen thưởng thử');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a6 and loai = 'de_xuat_can_duyet' and muc_do = 'can_hanh_dong';
  select count(*) into n2 from public.thong_bao where user_id = a1 and loai = 'de_xuat_can_duyet';
  res := res || jsonb_build_object('t', '23 Đề xuất mới: người giữ Quyền Quản lý lớp (không phải người tạo) nhận thông báo "cần hành động"', 'ok', n = 1 and n2 = 0);

  perform pg_temp.vao(a1);
  perform public.gan_quyen_quan_ly_lop(a6, false);
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a6 and loai = 'quyen_quan_ly_lop' and tieu_de like '%thu hồi%';
  res := res || jsonb_build_object('t', '24 Thu hồi Quyền Quản lý lớp: người đó nhận thông báo', 'ok', n = 1);

  -- ===== Kết quả đề xuất đổi nhóm: chỉ nói theo VAI TRÒ, không lộ nhóm =====
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi)
  values ('doi_nhom', a4, 'Thăng theo KPI', 'tg_bac_si', 'gv_bac_si') returning id into dx1;
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi)
  values ('doi_nhom', a5, 'Thăng theo KPI', 'tg_bac_si', 'gv_bac_si') returning id into dx2;
  perform pg_temp.vao(a1);
  perform public.xu_ly_de_xuat(dx1, true);
  perform public.xu_ly_de_xuat(dx2, false);
  execute 'reset role';
  select tieu_de || ' ' || coalesce(noi_dung, '') into v_tin from public.thong_bao where user_id = a4 and loai = 'ket_qua_doi_nhom';
  res := res || jsonb_build_object('t', '25 Đề xuất được duyệt: nhận thông báo nêu vai trò mới (Giảng viên), KHÔNG lộ nhãn nhóm / bác sĩ', 'ok',
    v_tin like '%Giảng viên%' and v_tin not ilike '%bác sĩ%' and v_tin not like '%gv_bac_si%' and v_tin not like '%tg_bac_si%');
  select count(*) into n from public.thong_bao where user_id = a5 and loai = 'ket_qua_doi_nhom' and tieu_de like '%không được duyệt%';
  res := res || jsonb_build_object('t', '26 Đề xuất bị bỏ qua: người đó nhận thông báo "không được duyệt"', 'ok', n = 1);

  -- ===== Đóng kỳ = công bố KPI =====
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lk, 1, 'K1', '2025-07-10 08:00:00+07', '2025-07-10 10:00:00+07') returning id into bK;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values (bK, 'giang_vien', 1, 'da_phan_cong', a3);
  insert into public.diem_danh_bai (bai_id, user_id, b1_phan_tram) values (bK, a3, 100);
  insert into public.ky_danh_gia (ten, tu, den, trang_thai) values ('ZZ Test8 Q3/2025', '2025-07-01', '2025-09-30', 'cho_duyet') returning id into kk;
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_ky(kk, 'da_dong');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a3 and loai = 'cong_bo_kpi' and noi_dung like '%điểm%' and khoa = 'cong_bo_kpi:' || kk;
  select count(*) into n2 from public.thong_bao where user_id = a4 and loai = 'cong_bo_kpi';
  res := res || jsonb_build_object('t', '27 Đóng kỳ: người có KPI trong kỳ nhận thông báo công bố, người không có kết quả thì không', 'ok', n = 1 and n2 = 0);

  -- ===== Hủy lớp =====
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b1b]);
  execute 'reset role';
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_lop(l1, 'da_huy');
  execute 'reset role';
  select count(*) into n from public.thong_bao where user_id = a2 and loai = 'huy_lop' and lien_ket = '/lop-hoc/' || l1;
  res := res || jsonb_build_object('t', '28 Hủy lớp: người đã phân công và người đang chờ duyệt nhận thông báo (a2 có cả hai nhưng chỉ nhận 1)', 'ok', n = 1);

  -- ===== Quyền đọc / ghi thông báo =====
  perform pg_temp.vao(a3);
  select count(*) into n from public.thong_bao where user_id <> a3;
  execute 'reset role';
  res := res || jsonb_build_object('t', '29 Người dùng chỉ đọc được thông báo của chính mình', 'ok', n = 0);

  perform pg_temp.vao(a2);
  select count(*) into n from public.thong_bao where user_id = a2 and not da_doc;
  ok := false; begin insert into public.thong_bao (user_id, loai, muc_do, tieu_de) values (a2, 'huy_lop', 'thong_tin', 'giả'); exception when insufficient_privilege then ok := true; end;
  ok2 := false; begin update public.thong_bao set tieu_de = 'sửa' where user_id = a2; exception when insufficient_privilege then ok2 := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '30 Không tự tạo hoặc sửa nội dung thông báo được (chỉ đánh dấu đã đọc)', 'ok', n > 0 and ok and ok2);

  perform pg_temp.vao(a2);
  update public.thong_bao set da_doc = true where id = (select id from public.thong_bao where user_id = a2 and not da_doc limit 1);
  update public.thong_bao set da_doc = true where user_id = a3;  -- không thấy dòng nào, không đổi được
  execute 'reset role';
  select count(*) into n2 from public.thong_bao where user_id = a2 and da_doc and doc_luc is not null;
  res := res || jsonb_build_object('t', '31 Đánh dấu đã đọc: ghi thời điểm đọc; không đánh dấu được thông báo của người khác', 'ok',
    n2 >= 1 and exists (select 1 from public.thong_bao where user_id = a3 and not da_doc));

  -- ===== Đăng ký push =====
  perform pg_temp.vao(a2);
  perform public.luu_push_subscription('https://push.example/ZZ-test-8', 'p256', 'authkey', 'UA-a2');
  execute 'reset role';
  perform pg_temp.vao(a3);
  perform public.luu_push_subscription('https://push.example/ZZ-test-8', 'p256b', 'authkey2', 'UA-a3');
  select count(*) into n from public.push_subscription where endpoint = 'https://push.example/ZZ-test-8' and user_id = a3;
  execute 'reset role';
  select count(*) into n2 from public.push_subscription where endpoint = 'https://push.example/ZZ-test-8' and user_id = a2;
  res := res || jsonb_build_object('t', '32 Thiết bị đăng ký push chuyển sang tài khoản đăng ký sau (1 endpoint chỉ thuộc 1 người)', 'ok', n = 1 and n2 = 0);

  perform pg_temp.vao(a2);
  perform public.xoa_push_subscription('https://push.example/ZZ-test-8');
  execute 'reset role';
  select count(*) into n from public.push_subscription where endpoint = 'https://push.example/ZZ-test-8';
  perform pg_temp.vao(a3);
  select count(*) into n2 from public.push_subscription;
  ok := false; begin insert into public.push_subscription (user_id, endpoint, p256dh, auth) values (a3, 'x', 'y', 'z'); exception when insufficient_privilege then ok := true; end;
  perform public.xoa_push_subscription('https://push.example/ZZ-test-8');
  execute 'reset role';
  res := res || jsonb_build_object('t', '33 Xóa thiết bị: không xóa được của người khác; chỉ thấy thiết bị của mình; không ghi thẳng bảng', 'ok',
    n = 1 and n2 = 1 and ok and not exists (select 1 from public.push_subscription where endpoint = 'https://push.example/ZZ-test-8'));

  perform pg_temp.vao(a2);
  select count(*) into n from public.push_subscription;
  ok := false; begin perform 1 from public.cau_hinh_push; exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '34 Bảng cấu hình webhook push (chứa khóa bí mật) không đọc được qua API', 'ok', ok);

  -- ===== Quyền gọi hàm nội bộ =====
  perform pg_temp.vao(a1);
  ok := false; begin perform public.nhac_check_in(); exception when insufficient_privilege then ok := true; end;
  ok2 := false; begin perform public.tao_thong_bao(a2, 'huy_lop', 'thong_tin', 'giả', null, null); exception when insufficient_privilege then ok2 := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '35 Ngay cả Admin cũng không gọi được nhac_check_in / tao_thong_bao qua API (chỉ job và trigger)', 'ok', ok and ok2);

  -- ===== Cấu hình nhắc check-in =====
  perform pg_temp.vao(a1);
  ok := false; begin perform public.luu_cau_hinh_diem_danh('{"nhac_check_in_truoc_phut": 0}'); exception when check_violation then ok := true; end;
  perform public.luu_cau_hinh_diem_danh('{"nhac_check_in_truoc_phut": 25}');
  execute 'reset role';
  res := res || jsonb_build_object('t', '36 Cấu hình nhắc check-in: 0 phút bị từ chối, 25 phút được lưu', 'ok',
    ok and (select gia_tri from public.cau_hinh_he_thong where khoa = 'nhac_check_in_truoc_phut') = 25);
  update public.cau_hinh_he_thong set gia_tri = o_nhac where khoa = 'nhac_check_in_truoc_phut';
  res := res || jsonb_build_object('t', '37 Đã khôi phục cấu hình nhắc check-in ban đầu', 'ok',
    (select gia_tri from public.cau_hinh_he_thong where khoa = 'nhac_check_in_truoc_phut') = o_nhac);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
