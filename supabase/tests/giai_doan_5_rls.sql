-- Test tự kiểm tra Giai đoạn 5 (đăng ký giảng dạy: Luồng A/B, matching-score, trùng lịch, cảnh báo dồn tải, hủy phân công).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260921100000 (và các migration trước).
-- Script tự tạo 9 user giả (@qldt.test) + dữ liệu thử (lớp tên "ZZ Test..."), kiểm tra rồi xóa sạch.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 Admin | a2 GV bác sĩ | a3 TG bác sĩ | a4 GV bác sĩ + Quyền Quản lý lớp | a5 GV bác sĩ (đã dạy nhiều giờ)
--   a6 GV KHÔNG bác sĩ (không đủ điều kiện nhóm) | a7 TG bác sĩ thiếu chứng chỉ | a8 GV bác sĩ tạm ngừng | a9 TG bác sĩ

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  -- Xóa bảng con trước để tránh lỗi kiểm tra khóa ngoại khi cascade trong cùng 1 transaction
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_nhom_du_dieu_kien where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_chung_chi_yeu_cau where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
end;
$$;

call pg_temp.don_dep();
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

-- Đổi sang 1 người dùng đã đăng nhập (chỉ gọi khi đang là vai trò gốc)
create or replace function pg_temp.vao(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000a' || i)::uuid, 'authenticated', 'authenticated',
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 9) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set co_quyen_quan_ly_lop = true where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set trang_thai_tham_gia = 'tam_ngung' where id = '00000000-0000-0000-0000-0000000000a8';

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a5', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a6', 'gv_khong_bac_si'),
  ('00000000-0000-0000-0000-0000000000a7', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a8', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a9', 'tg_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  a5 uuid := '00000000-0000-0000-0000-0000000000a5';
  a6 uuid := '00000000-0000-0000-0000-0000000000a6';
  a7 uuid := '00000000-0000-0000-0000-0000000000a7';
  a8 uuid := '00000000-0000-0000-0000-0000000000a8';
  a9 uuid := '00000000-0000-0000-0000-0000000000a9';
  res jsonb := '[]';
  n int;
  ok boolean;
  nl uuid;
  lcc uuid;
  tq_tu date;
  tq_den date;
  t0 timestamptz;
  tw timestamptz;
  tp timestamptz;
  d0 date;
  lop_w uuid;
  lop_a4 uuid;
  lop1 uuid;
  lop2 uuid;
  lop_nf uuid;
  bai_w uuid;
  bai_a4 uuid;
  bai1 uuid;
  bai2 uuid;
  bai3 uuid;
  bai4 uuid;
  bai5 uuid;
  bai_l2 uuid;
  rid uuid;
  rid5 uuid;
  inv1 uuid;
  inv2 uuid;
  inv3 uuid;
  sid uuid;
  j jsonb;
  d_a2 numeric;
  d_a4 numeric;
  d_a5 numeric;
  arr uuid[];
  tt text;
  v boolean;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  select id into lcc from public.danh_muc_loai_chung_chi order by thu_tu limit 1;
  select k.tu, k.den into tq_tu, tq_den from public.ky_hien_tai() k;
  t0 := ((tq_den + 40)::timestamp + interval '8 hours') at time zone 'Asia/Ho_Chi_Minh';  -- ngoài kỳ hiện tại
  tw := (tq_tu::timestamp + interval '8 hours') at time zone 'Asia/Ho_Chi_Minh';           -- đầu kỳ hiện tại
  tp := ((tq_tu - 30)::timestamp + interval '8 hours') at time zone 'Asia/Ho_Chi_Minh';    -- kỳ trước
  d0 := (t0 at time zone 'Asia/Ho_Chi_Minh')::date;

  -- Chứng chỉ: mọi người có trừ a7 (thiếu chứng chỉ yêu cầu)
  insert into public.chung_chi (user_id, loai_id, so_chung_chi)
  select u, lcc, 'ZZ-CC' from unnest(array[a2, a3, a4, a5, a6, a8, a9]) u;

  -- Lớp "khối lượng": a5 đã có 4 giờ trong kỳ hiện tại. Lớp "A4": a2 đã nhận 1 lớp không kinh phí ở kỳ trước.
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test Lớp W', nl, 'nhan_vien_y_te', 'co_kinh_phi', tq_tu, tq_tu, 'dang_mo') returning id into lop_w;
  insert into public.bai_hoc (lop_id, ten, bat_dau, ket_thuc) values (lop_w, 'Bài W', tw, tw + interval '4 hours') returning id into bai_w;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values (bai_w, 'giang_vien', 1, 'da_phan_cong', a5);

  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test Lớp A4', nl, 'cong_dong', 'khong_kinh_phi', (tq_tu - 30), (tq_tu - 30), 'da_hoan_thanh') returning id into lop_a4;
  insert into public.bai_hoc (lop_id, ten, bat_dau, ket_thuc) values (lop_a4, 'Bài A4', tp, tp + interval '2 hours') returning id into bai_a4;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values (bai_a4, 'giang_vien', 1, 'da_phan_cong', a2);

  select count(*) into n from public.cau_hinh_he_thong
  where khoa in ('matching_ty_trong_cong_bang', 'matching_phat_cung_lop', 'canh_bao_pool_nho', 'canh_bao_don_tai_ty_le');
  res := res || jsonb_build_object('t', '01 Cấu hình khởi điểm (tỷ trọng 80/20, pool nhỏ, dồn tải, phạt cùng lớp) có đủ 4 khóa', 'ok', n = 4);

  -- ===== Admin dựng lớp =====
  perform pg_temp.vao(a1);
  lop1 := public.luu_lop_hoc(null, 'ZZ Test Lớp 1', nl, 'nhan_vien_y_te', 'co_kinh_phi', d0, d0 + 3, 'Phòng A',
    false, array['gv_bac_si', 'tg_bac_si']::public.nhom_nhan_su[], array[lcc]);
  bai1 := public.luu_bai_hoc(null, lop1, 'Bài 1', t0, t0 + interval '3 hours', 1, 2);
  bai2 := public.luu_bai_hoc(null, lop1, 'Bài 2', t0 + interval '1 day', t0 + interval '1 day 3 hours', 1, 0);
  bai3 := public.luu_bai_hoc(null, lop1, 'Bài 3 trùng giờ Bài 1', t0 + interval '1 hour', t0 + interval '2 hours', 1, 0);
  bai4 := public.luu_bai_hoc(null, lop1, 'Bài 4', t0 + interval '2 days', t0 + interval '2 days 3 hours', 1, 0);
  perform public.doi_trang_thai_lop(lop1, 'dang_mo');

  -- Lớp không kinh phí (xếp theo A4) + lớp Nháp chưa công khai
  lop_nf := public.luu_lop_hoc(null, 'ZZ Test Lớp NF', nl, 'cong_dong', 'khong_kinh_phi', d0 + 10, d0 + 10, null,
    false, array['gv_bac_si', 'tg_bac_si']::public.nhom_nhan_su[], array[]::uuid[]);
  bai5 := public.luu_bai_hoc(null, lop_nf, 'Bài NF', t0 + interval '10 days', t0 + interval '10 days 3 hours', 1, 0);
  perform public.doi_trang_thai_lop(lop_nf, 'dang_mo');

  lop2 := public.luu_lop_hoc(null, 'ZZ Test Lớp Nháp', nl, 'nhan_vien_y_te', 'co_kinh_phi', d0 + 20, d0 + 20, null,
    false, array['gv_bac_si']::public.nhom_nhan_su[], array[]::uuid[]);
  bai_l2 := public.luu_bai_hoc(null, lop2, 'Bài Nháp', t0 + interval '20 days', t0 + interval '20 days 3 hours', 1, 0);

  -- ===== Lọc cứng + xếp hạng (Admin xem) =====
  select array_agg(u.user_id) into arr from public.ung_vien_bai(bai1, 'giang_vien') u;
  res := res || jsonb_build_object('t', '02 Ứng viên GV Bài 1 gồm a2, a4, a5; KHÔNG có a6 (sai nhóm), a8 (tạm ngừng), a1 (không có nhóm)', 'ok',
    a2 = any(arr) and a4 = any(arr) and a5 = any(arr) and not (a6 = any(arr)) and not (a8 = any(arr)) and not (a1 = any(arr)));

  select array_agg(u.user_id) into arr from public.ung_vien_bai(bai1, 'tro_giang') u;
  res := res || jsonb_build_object('t', '03 Ứng viên TG Bài 1 gồm a3, a9; KHÔNG có a7 (thiếu chứng chỉ) và không lẫn GV', 'ok',
    a3 = any(arr) and a9 = any(arr) and not (a7 = any(arr)) and not (a2 = any(arr)));

  select u.diem into d_a2 from public.ung_vien_bai(bai1, 'giang_vien') u where u.user_id = a2;
  select u.diem into d_a4 from public.ung_vien_bai(bai1, 'giang_vien') u where u.user_id = a4;
  select u.diem into d_a5 from public.ung_vien_bai(bai1, 'giang_vien') u where u.user_id = a5;
  res := res || jsonb_build_object('t', '04 Công bằng: a5 (đã dạy 4 giờ trong kỳ) điểm thấp hơn a2 (0 giờ)', 'ok', d_a5 < d_a2);
  res := res || jsonb_build_object('t', '05 Cùng nhóm, cùng khối lượng (a2, a4): điểm bằng nhau', 'ok', d_a2 = d_a4);

  select count(*) into n from public.ung_vien_bai(bai_l2, 'giang_vien');
  res := res || jsonb_build_object('t', '06 Admin xem được gợi ý của lớp Nháp', 'ok', n >= 1);

  execute 'reset role';

  -- ===== a6 / a7: bị lọc cứng, lý do trung lập =====
  perform pg_temp.vao(a6);
  select ly_do into tt from public.kha_nang_dang_ky_lop(lop1) where bai_id = bai1;
  res := res || jsonb_build_object('t', '07 a6 (sai nhóm) thấy lý do TRUNG LẬP, không lộ tên nhóm', 'ok', tt = 'Chưa đủ điều kiện đăng ký lớp này');
  execute 'reset role';

  perform pg_temp.vao(a7);
  select ly_do into tt from public.kha_nang_dang_ky_lop(lop1) where bai_id = bai2;
  res := res || jsonb_build_object('t', '08 a7 thiếu chứng chỉ thấy lý do nêu tên chứng chỉ thiếu', 'ok', tt like 'Thiếu chứng chỉ yêu cầu:%');
  execute 'reset role';

  -- ===== a2 (GV): gợi ý công khai, ẩn cờ của người khác, lớp Nháp bị ẩn =====
  perform pg_temp.vao(a2);
  select count(*) into n from public.kha_nang_dang_ky_lop(lop1) where ly_do is null;
  res := res || jsonb_build_object('t', '09 a2 đủ điều kiện đăng ký cả 4 Bài của lớp 1 (chưa trùng lịch vì chưa ai được duyệt)', 'ok', n = 4);

  select count(*) into n from public.ung_vien_bai(bai_l2, 'giang_vien');
  res := res || jsonb_build_object('t', '10 GV KHÔNG thấy gợi ý của lớp Nháp chưa công khai', 'ok', n = 0);

  select count(*) into n from public.kha_nang_dang_ky_lop(lop2);
  res := res || jsonb_build_object('t', '11 GV KHÔNG thấy khả năng đăng ký của lớp Nháp', 'ok', n = 0);

  select count(*) into n from public.ung_vien_bai(bai1, 'giang_vien');
  res := res || jsonb_build_object('t', '12 GV xem được danh sách gợi ý công khai của Bài đang mở', 'ok', n >= 3);

  -- ===== Luồng A: đăng ký nhiều Bài 1 lượt =====
  select count(*) into n from public.dang_ky_bai(array[bai1, bai2, bai3, bai4]) r where r.ok;
  res := res || jsonb_build_object('t', '13 a2 đăng ký 4 Bài 1 lượt: cả 4 thành công (tách thành 4 lượt riêng)', 'ok', n = 4);

  select count(*) into n from public.dang_ky_bai(array[bai1]) r where r.ok;
  res := res || jsonb_build_object('t', '14 Đăng ký lại Bài đã đăng ký bị từ chối', 'ok', n = 0);

  select count(*) into n from public.dang_ky_bai(array[bai_l2]) r where r.ok;
  res := res || jsonb_build_object('t', '15 Không đăng ký được Bài của lớp chưa mở (Nháp)', 'ok', n = 0);

  select count(*) into n from public.dang_ky_bai(array[bai_w]) r where r.ok;
  res := res || jsonb_build_object('t', '16 Không đăng ký được Bài đã bắt đầu / slot đã đủ', 'ok', n = 0);
  execute 'reset role';

  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'giang_vien' and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '17 Slot GV Bài 1 chuyển "Đang chờ duyệt" sau khi có đăng ký', 'ok', n = 1);

  perform pg_temp.vao(a5);
  select count(*) into n from public.dang_ky_bai(array[bai1, bai2]) r where r.ok;
  res := res || jsonb_build_object('t', '18 a5 cũng đăng ký Bài 1 và Bài 2', 'ok', n = 2);
  execute 'reset role';

  perform pg_temp.vao(a3);
  select count(*) into n from public.dang_ky_bai(array[bai1]) r where r.ok;
  res := res || jsonb_build_object('t', '19 a3 (TG) đăng ký được slot TG của Bài 1', 'ok', n = 1);
  execute 'reset role';

  perform pg_temp.vao(a6);
  select count(*) into n from public.dang_ky_bai(array[bai1]) r where r.ok;
  res := res || jsonb_build_object('t', '20 a6 (sai nhóm) KHÔNG đăng ký được', 'ok', n = 0);
  execute 'reset role';

  perform pg_temp.vao(a2);
  select count(*) into n from public.dang_ky_giang_day where user_id <> a2;
  res := res || jsonb_build_object('t', '21 GV chỉ thấy đăng ký của chính mình (RLS)', 'ok', n = 0);
  select count(*) into n from public.ung_vien_bai(bai1, 'giang_vien') where user_id = a5 and trang_thai_hien_co is not null;
  res := res || jsonb_build_object('t', '22 GV KHÔNG thấy cờ "đã đăng ký" của người khác trong danh sách gợi ý', 'ok', n = 0);
  select count(*) into n from public.ung_vien_bai(bai1, 'giang_vien') where user_id = a2 and trang_thai_hien_co = 'dang_ky';
  res := res || jsonb_build_object('t', '23 GV thấy cờ "đã đăng ký" của chính mình', 'ok', n = 1);

  -- a2 KHÔNG được thao tác quản trị
  ok := false;
  begin
    select id into rid5 from public.dang_ky_giang_day where user_id = a2 and bai_id = bai1 and trang_thai = 'cho_xu_ly';
    perform public.duyet_dang_ky(rid5, false);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '24 GV KHÔNG duyệt được đăng ký', 'ok', ok);

  ok := false;
  begin
    perform public.moi_giang_day(bai1, 'tro_giang', a9);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '25 GV KHÔNG gửi được lời mời', 'ok', ok);
  execute 'reset role';

  -- a5 rút đăng ký Bài 2; a2 không rút hộ người khác được
  perform pg_temp.vao(a5);
  select id into rid5 from public.dang_ky_giang_day where user_id = a5 and bai_id = bai2 and trang_thai = 'cho_xu_ly';
  perform public.rut_dang_ky(rid5);
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id = rid5 and trang_thai = 'da_huy';
  res := res || jsonb_build_object('t', '26 a5 rút được đăng ký của mình (chuyển da_huy)', 'ok', n = 1);
  select count(*) into n from public.dang_ky_giang_day where user_id = a2 and bai_id = bai2 and trang_thai = 'cho_xu_ly';
  res := res || jsonb_build_object('t', '27 Đăng ký của a2 ở Bài 2 vẫn còn chờ sau khi a5 rút', 'ok', n = 1);

  perform pg_temp.vao(a2);
  select id into rid5 from public.dang_ky_giang_day where bai_id = bai1 and user_id = a2 and trang_thai = 'cho_xu_ly';
  execute 'reset role';
  select id into inv1 from public.dang_ky_giang_day where user_id = a5 and bai_id = bai1 and trang_thai = 'cho_xu_ly';
  perform pg_temp.vao(a2);
  ok := false;
  begin
    perform public.rut_dang_ky(inv1);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '28 GV KHÔNG rút hộ đăng ký của người khác', 'ok', ok);
  execute 'reset role';

  -- ===== Admin duyệt: slot đóng theo số ĐÃ DUYỆT =====
  perform pg_temp.vao(a1);
  j := public.duyet_dang_ky(rid5, false);
  res := res || jsonb_build_object('t', '29 Admin duyệt đăng ký của a2 ở Bài 1', 'ok', (j ->> 'ok')::boolean);

  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'giang_vien' and trang_thai = 'da_phan_cong' and nguoi_phan_cong = a2;
  res := res || jsonb_build_object('t', '30 Slot GV Bài 1 đã phân công cho a2', 'ok', n = 1);

  select count(*) into n from public.dang_ky_giang_day where id = inv1 and trang_thai = 'da_huy' and ly_do = 'Slot đã đủ người';
  res := res || jsonb_build_object('t', '31 Đăng ký của a5 ở Bài 1 tự đóng vì slot đã đủ', 'ok', n = 1);

  -- Trùng lịch: a2 đã được duyệt Bài 1 (t0..t0+3h) nên không duyệt được Bài 3 (t0+1h..t0+2h)
  select id into rid from public.dang_ky_giang_day where user_id = a2 and bai_id = bai3 and trang_thai = 'cho_xu_ly';
  ok := false;
  begin
    perform public.duyet_dang_ky(rid, false);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '32 KHÔNG duyệt được Bài trùng giờ với Bài đã duyệt của cùng người', 'ok', ok);

  select array_agg(u.user_id) into arr from public.ung_vien_bai(bai3, 'giang_vien') u;
  res := res || jsonb_build_object('t', '33 a2 bị loại khỏi gợi ý Bài 3 (trùng lịch), a4 và a5 còn', 'ok', not (a2 = any(arr)) and a4 = any(arr) and a5 = any(arr));

  -- Đa dạng hóa: người đã được duyệt ở Bài khác trong cùng lớp bị hạ nhẹ điểm
  select u.diem into d_a2 from public.ung_vien_bai(bai2, 'giang_vien') u where u.user_id = a2;
  select u.diem into d_a4 from public.ung_vien_bai(bai2, 'giang_vien') u where u.user_id = a4;
  select count(*) into n from public.ung_vien_bai(bai2, 'giang_vien') u where u.user_id = a2 and u.cung_lop = 1;
  res := res || jsonb_build_object('t', '34 a2 đã được duyệt Bài khác cùng lớp -> cung_lop = 1 và điểm thấp hơn a4', 'ok', n = 1 and d_a2 < d_a4);

  -- a2 duyệt Bài 2: 2/4 Bài GV trong lớp (50%) — dưới ngưỡng 70% nên không cảnh báo
  select id into rid from public.dang_ky_giang_day where user_id = a2 and bai_id = bai2 and trang_thai = 'cho_xu_ly';
  j := public.duyet_dang_ky(rid, false);
  res := res || jsonb_build_object('t', '35 Duyệt a2 ở Bài 2 (2/4 Bài GV = 50%) không cảnh báo', 'ok', (j ->> 'ok')::boolean and j -> 'canh_bao' is null);
  execute 'reset role';

  -- Tự duyệt: a4 (Quyền Quản lý lớp) đăng ký rồi tự duyệt cho chính mình (không chặn, có gắn cờ)
  perform pg_temp.vao(a4);
  select count(*) into n from public.dang_ky_bai(array[bai3]) r where r.ok;
  select id into rid from public.dang_ky_giang_day where user_id = a4 and bai_id = bai3 and trang_thai = 'cho_xu_ly';
  j := public.duyet_dang_ky(rid, false);
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id = rid and trang_thai = 'da_duyet' and tu_duyet;
  res := res || jsonb_build_object('t', '36 Tự duyệt không bị chặn và được gắn cờ tu_duyet', 'ok', n = 1);

  -- Cảnh báo dồn tải: a2 sẽ đảm nhiệm 3/4 Bài GV (75% > 70%) -> cảnh báo mềm, chưa gán
  perform pg_temp.vao(a1);
  select id into rid from public.dang_ky_giang_day where user_id = a2 and bai_id = bai4 and trang_thai = 'cho_xu_ly';
  j := public.duyet_dang_ky(rid, false);
  select count(*) into n from public.slot_giang_day where bai_id = bai4 and nguoi_phan_cong = a2;
  res := res || jsonb_build_object('t', '37 Vượt ngưỡng dồn tải -> trả cảnh báo mềm và CHƯA gán slot', 'ok', (j ->> 'canh_bao')::boolean and n = 0 and (j ->> 'thong_bao') like '%3/4%');
  j := public.duyet_dang_ky(rid, true);
  select count(*) into n from public.slot_giang_day where bai_id = bai4 and nguoi_phan_cong = a2;
  res := res || jsonb_build_object('t', '38 Xác nhận vẫn duyệt -> gán được (cảnh báo không chặn cứng)', 'ok', (j ->> 'ok')::boolean and n = 1);

  -- ===== Luồng B: lời mời =====
  inv1 := public.moi_giang_day(bai1, 'tro_giang', a9);
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang' and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '39 Mời a9 + đăng ký của a3 = 2 chờ xử lý -> cả 2 slot TG "Đang chờ duyệt"', 'ok', inv1 is not null and n = 2);

  ok := false;
  begin
    perform public.moi_giang_day(bai1, 'tro_giang', a7);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '40 KHÔNG mời được người không đủ điều kiện (thiếu chứng chỉ)', 'ok', ok);

  ok := false;
  begin
    perform public.moi_giang_day(bai1, 'tro_giang', a3);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '41 KHÔNG mời người đã có đăng ký chờ ở cùng Bài', 'ok', ok);
  execute 'reset role';

  perform pg_temp.vao(a3);
  select count(*) into n from public.dang_ky_giang_day where user_id = a9;
  ok := false;
  begin
    perform public.phan_hoi_loi_moi(inv1, true);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '42 Người khác KHÔNG thấy/không phản hồi hộ lời mời của a9', 'ok', n = 0 and ok);
  execute 'reset role';

  perform pg_temp.vao(a9);
  select count(*) into n from public.dang_ky_giang_day where user_id = a9 and loai = 'duoc_moi' and trang_thai = 'cho_xu_ly';
  res := res || jsonb_build_object('t', '43 a9 thấy lời mời của mình', 'ok', n = 1);
  perform public.phan_hoi_loi_moi(inv1, false);
  execute 'reset role';

  select count(*) into n from public.dang_ky_giang_day where id = inv1 and trang_thai = 'tu_choi';
  res := res || jsonb_build_object('t', '44 Lời mời bị từ chối được GHI LẠI (tu_choi) — phục vụ A3', 'ok', n = 1);

  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang' and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '45 Sau khi lời mời bị từ chối, 1 slot TG quay lại "Trống"', 'ok', n = 1);

  perform pg_temp.vao(a1);
  inv2 := public.moi_giang_day(bai1, 'tro_giang', a9);
  perform public.thu_hoi_loi_moi(inv2);
  inv3 := public.moi_giang_day(bai1, 'tro_giang', a9);
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where id = inv2 and trang_thai = 'da_huy';
  res := res || jsonb_build_object('t', '46 Admin thu hồi được lời mời (da_huy), rồi mời lại được', 'ok', n = 1 and inv3 is not null);

  perform pg_temp.vao(a9);
  perform public.phan_hoi_loi_moi(inv3, true);
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang' and trang_thai = 'da_phan_cong' and nguoi_phan_cong = a9;
  res := res || jsonb_build_object('t', '47 a9 đồng ý lời mời -> slot TG đã phân công cho a9', 'ok', n = 1);

  select count(*) into n from public.dang_ky_giang_day where user_id = a9 and loai = 'duoc_moi';
  select count(*) into tt from public.dang_ky_giang_day where user_id = a9 and loai = 'duoc_moi' and trang_thai in ('tu_choi', 'da_huy', 'da_duyet');
  res := res || jsonb_build_object('t', '48 Log đủ 3 lời mời của a9 (từ chối, thu hồi, đồng ý)', 'ok', n = 3 and tt::int = 3);

  -- a3 (đăng ký chờ) được duyệt nốt slot TG còn lại
  perform pg_temp.vao(a1);
  select id into rid from public.dang_ky_giang_day where user_id = a3 and bai_id = bai1 and trang_thai = 'cho_xu_ly';
  j := public.duyet_dang_ky(rid, false);
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang' and trang_thai = 'da_phan_cong';
  res := res || jsonb_build_object('t', '49 Duyệt nốt a3 -> Bài 1 đủ 2 TG', 'ok', (j ->> 'ok')::boolean and n = 2);

  -- ===== Hủy phân công =====
  select id into sid from public.slot_giang_day where bai_id = bai1 and nguoi_phan_cong = a9;
  perform pg_temp.vao(a1);
  perform public.huy_phan_cong(sid, 'Test hủy');
  execute 'reset role';
  select count(*) into n from public.slot_giang_day where id = sid and trang_thai = 'trong' and nguoi_phan_cong is null;
  res := res || jsonb_build_object('t', '50 Hủy phân công -> slot quay lại "Trống"', 'ok', n = 1);
  select count(*) into n from public.dang_ky_giang_day where id = inv3 and trang_thai = 'da_huy';
  res := res || jsonb_build_object('t', '51 Bản ghi đã duyệt chuyển da_huy khi bị hủy phân công', 'ok', n = 1);

  perform pg_temp.vao(a1);
  ok := false;
  begin
    perform public.huy_phan_cong(sid, null);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '52 KHÔNG hủy phân công slot đang trống', 'ok', ok);

  -- ===== Đổi giờ Bài gây trùng lịch =====
  ok := false;
  begin
    perform public.luu_bai_hoc(bai2, lop1, 'Bài 2', t0 + interval '30 minutes', t0 + interval '2 hours', 1, 0);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '53 KHÔNG đổi giờ Bài nếu làm người đã phân công bị trùng lịch', 'ok', ok);
  execute 'reset role';

  -- ===== Lớp không kinh phí: xếp theo A4 (thấp hơn được ưu tiên) =====
  perform pg_temp.vao(a1);
  select u.diem into d_a2 from public.ung_vien_bai(bai5, 'giang_vien') u where u.user_id = a2;
  select u.diem into d_a5 from public.ung_vien_bai(bai5, 'giang_vien') u where u.user_id = a5;
  select count(*) into n from public.ung_vien_bai(bai5, 'giang_vien') u where u.user_id = a2 and u.so_lop_khong_kinh_phi = 1;
  res := res || jsonb_build_object('t', '54 Lớp không kinh phí: a2 (A4 = 1) xếp thấp hơn a5 (A4 = 0), dù a5 dạy nhiều giờ hơn', 'ok', d_a5 > d_a2 and n = 1);
  execute 'reset role';

  -- ===== Hủy lớp đóng các đăng ký còn chờ =====
  perform pg_temp.vao(a5);
  select count(*) into n from public.dang_ky_bai(array[bai5]) r where r.ok;
  execute 'reset role';
  select count(*) into tt from public.slot_giang_day where bai_id = bai5 and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '55 a5 đăng ký Bài của lớp không kinh phí -> slot chờ duyệt', 'ok', n = 1 and tt::int = 1);

  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_lop(lop_nf, 'da_huy');
  execute 'reset role';
  select count(*) into n from public.dang_ky_giang_day where bai_id = bai5 and user_id = a5 and trang_thai = 'da_huy' and ly_do = 'Lớp đã hủy';
  select count(*) into tt from public.slot_giang_day where bai_id = bai5 and trang_thai = 'cho_duyet';
  res := res || jsonb_build_object('t', '56 Hủy lớp -> đăng ký chờ bị đóng, slot "chờ duyệt" trả về "trống"', 'ok', n = 1 and tt::int = 0);

  -- ===== anon =====
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  ok := false;
  begin
    perform 1 from public.ung_vien_bai(bai1, 'giang_vien');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '58 anon KHÔNG gọi được ung_vien_bai', 'ok', ok);

  ok := false;
  begin
    perform 1 from public.dang_ky_bai(array[bai1]);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '59 anon KHÔNG đăng ký được', 'ok', ok);

  ok := false;
  begin
    perform 1 from public.dang_ky_giang_day limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '60 anon KHÔNG đọc được bảng đăng ký', 'ok', ok);
  execute 'reset role';

  -- ===== Hàm nội bộ không lộ ra cho người dùng =====
  perform pg_temp.vao(a2);
  ok := false;
  begin
    perform public.gan_slot(bai2, 'giang_vien', a2);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '61 GV KHÔNG gọi được hàm nội bộ gan_slot (tự gán slot)', 'ok', ok);

  ok := false;
  begin
    update public.cau_hinh_he_thong set gia_tri = 0 where khoa = 'canh_bao_pool_nho';
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '62 GV KHÔNG sửa được cấu hình hệ thống', 'ok', ok);
  execute 'reset role';

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
