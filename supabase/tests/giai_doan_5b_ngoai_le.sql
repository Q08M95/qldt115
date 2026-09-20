-- Test tự kiểm tra "Mời ngoại lệ vượt lọc cứng" (Giai đoạn 5 bổ sung).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260922100000 (và các migration Giai đoạn 1-5).
-- Script tự tạo 6 user giả (@qldt.test) + lớp "ZZ Test Ngoại lệ", kiểm tra rồi xóa sạch.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 Admin | a2 GV bác sĩ (đủ điều kiện) | a6 GV KHÔNG bác sĩ (sai nhóm) | a7 TG bác sĩ thiếu chứng chỉ
--   a8 GV bác sĩ tạm ngừng | a9 GV chưa xếp nhóm

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_nhom_du_dieu_kien where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_chung_chi_yeu_cau where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
end;
$$;

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
       'nl' || i || '@qldt.test', '{}', '{}', now(), now()
from unnest(array[1, 2, 6, 7, 8, 9]) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set trang_thai_tham_gia = 'tam_ngung' where id = '00000000-0000-0000-0000-0000000000a8';

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a6', 'gv_khong_bac_si'),
  ('00000000-0000-0000-0000-0000000000a7', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a8', 'gv_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a6 uuid := '00000000-0000-0000-0000-0000000000a6';
  a7 uuid := '00000000-0000-0000-0000-0000000000a7';
  a8 uuid := '00000000-0000-0000-0000-0000000000a8';
  a9 uuid := '00000000-0000-0000-0000-0000000000a9';
  res jsonb := '[]';
  n int;
  ok boolean;
  nl uuid;
  lcc uuid;
  t0 timestamptz;
  d0 date;
  lop uuid;
  bai1 uuid;
  bai2 uuid;
  bai3 uuid;
  inv_a6 uuid;
  inv_a2 uuid;
  inv_a7 uuid;
  inv_a8 uuid;
  inv_a9 uuid;
  tt text;
  b boolean;
  rec record;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  select id into lcc from public.danh_muc_loai_chung_chi order by thu_tu limit 1;
  t0 := ((current_date + 40)::timestamp + interval '8 hours') at time zone 'Asia/Ho_Chi_Minh';
  d0 := (t0 at time zone 'Asia/Ho_Chi_Minh')::date;

  -- Chứng chỉ: có đủ trừ a7
  insert into public.chung_chi (user_id, loai_id, so_chung_chi)
  select u, lcc, 'ZZ-CC' from unnest(array[a2, a6, a8, a9]) u;

  -- Lớp yêu cầu chứng chỉ, chỉ mở cho GV bác sĩ + TG bác sĩ. Bài 2 TRÙNG GIỜ Bài 1.
  perform pg_temp.vao(a1);
  lop := public.luu_lop_hoc(null, 'ZZ Test Ngoại lệ', nl, 'nhan_vien_y_te', 'co_kinh_phi', d0, d0 + 1, null,
    false, array['gv_bac_si', 'tg_bac_si']::public.nhom_nhan_su[], array[lcc]);
  bai1 := public.luu_bai_hoc(null, lop, 'Bài 1', t0, t0 + interval '3 hours', 1, 1);
  bai2 := public.luu_bai_hoc(null, lop, 'Bài 2 trùng giờ Bài 1', t0 + interval '1 hour', t0 + interval '2 hours', 1, 0);
  bai3 := public.luu_bai_hoc(null, lop, 'Bài 3', t0 + interval '1 day', t0 + interval '1 day 3 hours', 2, 0);
  perform public.doi_trang_thai_lop(lop, 'dang_mo');

  -- ===== Mời thường vẫn bị chặn; ngoại lệ bắt buộc có lý do =====
  ok := false;
  begin
    perform public.moi_giang_day(bai1, 'giang_vien', a6);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '01 Mời THƯỜNG người sai nhóm vẫn bị chặn', 'ok', ok);

  ok := false;
  begin
    perform public.moi_giang_day(bai1, 'giang_vien', a6, true, '   ');
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '02 Mời ngoại lệ mà không có lý do bị chặn', 'ok', ok);

  -- ===== Danh sách cho hộp thoại "Mời người ngoài đề xuất" =====
  select r.ly_do into tt from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a6;
  res := res || jsonb_build_object('t', '03 a6 (sai nhóm) có lý do "Chưa đủ điều kiện đăng ký lớp này"', 'ok', tt = 'Chưa đủ điều kiện đăng ký lớp này');
  select r.ly_do is null into b from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a2;
  res := res || jsonb_build_object('t', '04 a2 (đủ điều kiện) không có lý do', 'ok', b);
  select r.ly_do into tt from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a8;
  res := res || jsonb_build_object('t', '05 a8 (tạm ngừng) có lý do trạng thái tham gia', 'ok', tt like 'Không ở trạng thái%');
  select r.ly_do into tt from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a9;
  res := res || jsonb_build_object('t', '06 a9 (chưa xếp nhóm) có lý do "Chưa được xếp nhóm"', 'ok', tt = 'Chưa được xếp nhóm');
  select r.ly_do into tt from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a7;
  res := res || jsonb_build_object('t', '07 a7 (TG) khi xét slot Giảng viên có lý do vai trò không phù hợp', 'ok', tt like 'Vai trò không phù hợp%');
  select count(*) into n from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.chan_cung;
  res := res || jsonb_build_object('t', '08 Lúc đầu chưa ai bị chặn cứng', 'ok', n = 0);

  -- ===== Mời ngoại lệ a6 (sai nhóm) =====
  inv_a6 := public.moi_giang_day(bai1, 'giang_vien', a6, true, 'Giảng viên mời thỉnh giảng, đã được Ban giám đốc đồng ý');
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day
  where id = inv_a6 and ngoai_le and vuot_loc = 'Chưa đủ điều kiện đăng ký lớp này' and ly_do_ngoai_le like 'Giảng viên mời thỉnh giảng%' and trang_thai = 'cho_xu_ly';
  res := res || jsonb_build_object('t', '09 Mời ngoại lệ được ghi lại: cờ ngoai_le, phần lọc bị bỏ qua, lý do, đang chờ phản hồi', 'ok', n = 1);

  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'giang_vien' and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '10 Slot GV Bài 1 chuyển "Đang chờ duyệt"', 'ok', n = 1);

  -- ===== a2 (GV thường) không được dùng chức năng quản trị này =====
  perform pg_temp.vao(a2);
  ok := false;
  begin
    perform public.moi_giang_day(bai3, 'giang_vien', a8, true, 'thử');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '11 GV KHÔNG mời ngoại lệ được', 'ok', ok);
  ok := false;
  begin
    perform 1 from public.nhan_su_cho_moi(bai3, 'giang_vien');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '12 GV KHÔNG xem được danh sách nhân sự mời ngoại lệ', 'ok', ok);
  execute 'reset role';

  -- ===== a6 đồng ý: vẫn nhận được dù sai nhóm (vì là lời mời ngoại lệ) =====
  perform pg_temp.vao(a6);
  select count(*) into n from public.dang_ky_giang_day where user_id = a6 and loai = 'duoc_moi' and trang_thai = 'cho_xu_ly';
  perform public.phan_hoi_loi_moi(inv_a6, true);
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'giang_vien' and trang_thai = 'da_phan_cong' and nguoi_phan_cong = a6;
  res := res || jsonb_build_object('t', '13 a6 đồng ý lời mời ngoại lệ -> được phân công dù sai nhóm', 'ok', n = 1);

  -- ===== Chặn cứng vẫn giữ: trùng lịch / đã phân công =====
  perform pg_temp.vao(a1);
  ok := false;
  begin
    perform public.moi_giang_day(bai2, 'giang_vien', a6, true, 'thử trùng lịch');
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '14 Mời ngoại lệ KHÔNG vượt được chặn trùng lịch', 'ok', ok);

  select r.chan_cung into b from public.nhan_su_cho_moi(bai1, 'giang_vien') r where r.user_id = a6;
  res := res || jsonb_build_object('t', '15 a6 đã phân công ở Bài 1 -> chan_cung = true', 'ok', b);
  select r.chan_cung into b from public.nhan_su_cho_moi(bai2, 'giang_vien') r where r.user_id = a6;
  res := res || jsonb_build_object('t', '16 a6 ở Bài 2 (trùng giờ) -> chan_cung = true', 'ok', b);

  -- ===== Ngoại lệ cho người tạm ngừng / chưa xếp nhóm =====
  inv_a8 := public.moi_giang_day(bai3, 'giang_vien', a8, true, 'Quay lại giảng dạy tạm thời');
  inv_a9 := public.moi_giang_day(bai3, 'giang_vien', a9, true, 'Nhân sự mới chưa kịp xếp nhóm');
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id in (inv_a8, inv_a9) and ngoai_le;
  res := res || jsonb_build_object('t', '17 Mời ngoại lệ được cho người tạm ngừng và người chưa xếp nhóm', 'ok', n = 2);

  perform pg_temp.vao(a8);
  perform public.phan_hoi_loi_moi(inv_a8, false);
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id = inv_a8 and trang_thai = 'tu_choi';
  res := res || jsonb_build_object('t', '18 a8 từ chối lời mời ngoại lệ -> ghi lại tu_choi (slot mở lại)', 'ok', n = 1);

  perform pg_temp.vao(a9);
  perform public.phan_hoi_loi_moi(inv_a9, true);
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where bai_id = bai3 and nguoi_phan_cong = a9 and trang_thai = 'da_phan_cong';
  res := res || jsonb_build_object('t', '19 a9 (chưa xếp nhóm) đồng ý -> được phân công', 'ok', n = 1);

  -- ===== Ngoại lệ cho người vốn đủ điều kiện: không bị đánh dấu ngoại lệ =====
  perform pg_temp.vao(a1);
  inv_a2 := public.moi_giang_day(bai3, 'giang_vien', a2, true, 'Chỉ định trực tiếp');
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id = inv_a2 and not ngoai_le and vuot_loc is null and ly_do_ngoai_le is null;
  res := res || jsonb_build_object('t', '20 Người vốn đủ điều kiện được mời -> KHÔNG gắn cờ ngoại lệ', 'ok', n = 1);

  perform pg_temp.vao(a2);
  perform public.phan_hoi_loi_moi(inv_a2, true);
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where bai_id = bai3 and nguoi_phan_cong = a2;
  res := res || jsonb_build_object('t', '21 a2 đồng ý lời mời thường như cũ (không hỏng luồng cũ)', 'ok', n = 1);

  -- ===== Người được mời ngoại lệ bị xung đột SAU khi được mời -> đồng ý bị chặn =====
  perform pg_temp.vao(a1);
  inv_a7 := public.moi_giang_day(bai1, 'tro_giang', a7, true, 'TG thiếu chứng chỉ, sẽ bổ sung sau');
  execute 'reset role';
  -- a7 bị giao 1 Bài trùng giờ (giả lập phát sinh sau khi mời)
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a7
  where bai_id = bai2 and vai_tro = 'giang_vien';
  perform pg_temp.vao(a7);
  ok := false;
  begin
    perform public.phan_hoi_loi_moi(inv_a7, true);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '22 Lời mời ngoại lệ vẫn bị chặn nếu người đó đã trùng lịch lúc đồng ý', 'ok', ok);
  execute 'reset role';

  -- ===== anon =====
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  ok := false;
  begin
    perform 1 from public.nhan_su_cho_moi(bai1, 'giang_vien');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '23 anon KHÔNG gọi được nhan_su_cho_moi', 'ok', ok);
  execute 'reset role';

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
