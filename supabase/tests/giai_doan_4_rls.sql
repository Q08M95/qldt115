-- Test tự kiểm tra Giai đoạn 4 (lớp học, Bài, slot, view tiến độ, khảo sát C1, C3).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260920100000.
-- Script tự tạo 4 user giả (@qldt.test) + dữ liệu thử (tên bắt đầu bằng "ZZ Test"), kiểm tra rồi xóa sạch.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--   a1 = Admin, a2 = Giảng viên, a3 = Trợ giảng, a4 = GV được gán Quyền Quản lý lớp

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  -- Xóa bảng con trước để tránh lỗi kiểm tra khóa ngoại khi cascade trong cùng 1 transaction
  delete from public.khao_sat_phan_hoi where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_khao_sat where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_nhom_du_dieu_kien where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc_chung_chi_yeu_cau where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.danh_muc_nhom_lop where ten like 'ZZ Test%';
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4');
end;
$$;

call pg_temp.don_dep();
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@qldt.test', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'gv@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'tg@qldt.test',    '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'qll@qldt.test',   '{}', '{}', now(), now());

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set co_quyen_quan_ly_lop = true where id = '00000000-0000-0000-0000-0000000000a4';

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  res jsonb := '[]';
  n int;
  ok boolean;
  nl uuid;
  lcc uuid;
  lop1 uuid;
  lop2 uuid;
  lop3 uuid;
  bai1 uuid;
  bai2 uuid;
  bai3 uuid;
  tk uuid;
  v record;
  c numeric;
  nguon text;
  nhom_arr public.nhom_nhan_su[] := array['gv_bac_si', 'tg_bac_si']::public.nhom_nhan_su[];
  t0 timestamptz := now() + interval '30 days';
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  select id into lcc from public.danh_muc_loai_chung_chi order by thu_tu limit 1;

  select count(*) into n from public.danh_muc_nhom_lop where he_so_d1 > 0;
  res := res || jsonb_build_object('t', '01 Danh mục nhóm lớp có dữ liệu khởi điểm kèm hệ số D1', 'ok', n >= 5);

  -- ===== Giảng viên thường (a2): không được ghi =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := false;
  begin
    insert into public.danh_muc_nhom_lop (ten) values ('ZZ Test nhóm lớp');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '02 GV KHÔNG thêm được nhóm lớp', 'ok', ok);

  ok := false;
  begin
    perform public.luu_lop_hoc(null, 'ZZ Test GV', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 10, current_date + 12, null, false, nhom_arr, array[]::uuid[]);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '03 GV KHÔNG tạo được lớp (hàm luu_lop_hoc)', 'ok', ok);

  ok := false;
  begin
    insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc)
    values ('ZZ Test GV', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date, current_date);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '04 GV KHÔNG insert trực tiếp vào lop_hoc', 'ok', ok);

  execute 'reset role';

  -- ===== Admin (a1): tạo lớp, Bài =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    lop1 := public.luu_lop_hoc(null, 'ZZ Test Lớp 1', nl, 'nhan_vien_y_te', 'khong_kinh_phi', current_date + 30, current_date + 32,
      'Phòng A', false, nhom_arr, array[lcc]);
    lop2 := public.luu_lop_hoc(null, 'ZZ Test Lớp 2', nl, 'cong_dong', 'co_kinh_phi', current_date + 40, current_date + 41,
      null, false, nhom_arr, array[lcc]);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '05 Admin tạo được 2 lớp (kèm nhóm đủ điều kiện + chứng chỉ yêu cầu)', 'ok', ok);

  select count(*) into n from public.lop_hoc where id = lop1 and trang_thai = 'nhap';
  res := res || jsonb_build_object('t', '06 Lớp mới mặc định ở trạng thái Nháp', 'ok', n = 1);

  select count(*) into n from public.lop_hoc_nhom_du_dieu_kien where lop_id = lop1;
  res := res || jsonb_build_object('t', '07 Admin đọc được nhóm đủ điều kiện của lớp (2 nhóm)', 'ok', n = 2);

  ok := true;
  begin
    bai1 := public.luu_bai_hoc(null, lop1, 'Bài 1', t0, t0 + interval '3 hours', 1, 3);
  exception when others then ok := false;
  end;
  select count(*) into n from public.slot_giang_day where bai_id = bai1;
  res := res || jsonb_build_object('t', '08 Tạo Bài 1 cần 1 GV + 3 TG sinh đúng 4 slot trống', 'ok', ok and n = 4);

  ok := false;
  begin
    perform public.luu_bai_hoc(null, lop1, 'Bài sai giờ', t0, t0 - interval '1 hour', 1, 0);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '09 Bài có giờ kết thúc trước giờ bắt đầu bị chặn', 'ok', ok);

  ok := false;
  begin
    perform public.luu_bai_hoc(null, lop1, 'Bài không slot', t0, t0 + interval '1 hour', 0, 0);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '10 Bài không có slot nào bị chặn', 'ok', ok);

  ok := false;
  begin
    perform public.luu_lop_hoc(null, 'ZZ Test Sai ngày', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 5, current_date + 1, null, false, nhom_arr, array[]::uuid[]);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '11 Lớp có ngày kết thúc trước ngày bắt đầu bị chặn', 'ok', ok);

  ok := false;
  begin
    perform public.luu_lop_hoc(null, 'ZZ Test Không nhóm', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 1, current_date + 2, null, false, array[]::public.nhom_nhan_su[], array[]::uuid[]);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '12 Lớp không chọn nhóm đủ điều kiện nào bị chặn', 'ok', ok);

  execute 'reset role';

  -- ===== GV (a2): lớp Nháp bị ẩn, bảng nhãn nhóm bị ẩn =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lop_hoc where ten like 'ZZ Test%';
  res := res || jsonb_build_object('t', '13 GV KHÔNG thấy lớp Nháp (chưa công khai sớm)', 'ok', n = 0);

  select count(*) into n from public.lop_hoc_tong_hop where ten like 'ZZ Test%';
  res := res || jsonb_build_object('t', '14 GV KHÔNG thấy lớp Nháp qua view tổng hợp', 'ok', n = 0);

  select count(*) into n from public.bai_hoc where lop_id = lop1;
  res := res || jsonb_build_object('t', '15 GV KHÔNG thấy Bài của lớp Nháp', 'ok', n = 0);

  execute 'reset role';

  -- ===== Admin: công khai sớm lớp 2, mở đăng ký =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    perform public.luu_lop_hoc(lop2, 'ZZ Test Lớp 2', nl, 'cong_dong', 'co_kinh_phi', current_date + 40, current_date + 41,
      null, true, nhom_arr, array[lcc]);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '16 Admin sửa được lớp (bật công khai sớm)', 'ok', ok);

  ok := false;
  begin
    perform public.doi_trang_thai_lop(lop2, 'dang_mo');
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '17 Lớp chưa có Bài nào KHÔNG mở đăng ký được', 'ok', ok);

  ok := true;
  begin
    perform public.doi_trang_thai_lop(lop1, 'dang_mo');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '18 Lớp có Bài mở đăng ký được', 'ok', ok);

  execute 'reset role';

  -- ===== GV: thấy lớp đã mở / công khai sớm, nhưng KHÔNG thấy nhãn nhóm =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lop_hoc where ten like 'ZZ Test%';
  res := res || jsonb_build_object('t', '19 GV thấy lớp đang mở + lớp Nháp công khai sớm (2 lớp)', 'ok', n = 2);

  select count(*) into n from public.lop_hoc_nhom_du_dieu_kien;
  res := res || jsonb_build_object('t', '20 GV KHÔNG đọc được nhóm đủ điều kiện (ẩn nhãn nhóm)', 'ok', n = 0);

  select count(*) into n from public.lop_hoc_chung_chi_yeu_cau where lop_id = lop1;
  res := res || jsonb_build_object('t', '21 GV đọc được chứng chỉ yêu cầu của lớp', 'ok', n = 1);

  select count(*) into n from public.bai_hoc where lop_id = lop1;
  res := res || jsonb_build_object('t', '22 GV thấy Bài của lớp đã mở', 'ok', n = 1);

  ok := false;
  begin
    perform public.doi_trang_thai_lop(lop1, 'da_huy');
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '23 GV KHÔNG đổi được trạng thái lớp', 'ok', ok);

  execute 'reset role';

  -- ===== Phân công (giả lập Giai đoạn 5 bằng quyền cao) + kiểm tra view tiến độ =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bai2 := public.luu_bai_hoc(null, lop1, 'Bài 2', t0 + interval '1 day', t0 + interval '1 day 3 hours', 1, 1);
  execute 'reset role';

  -- Bài 1: GV=a2, TG1=a3, TG2=a4, TG3 trống. Bài 2: GV=a2, TG=a3 (a2, a3 dạy nhiều Bài — hợp lệ)
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a2 where bai_id = bai1 and vai_tro = 'giang_vien';
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a3 where bai_id = bai1 and vai_tro = 'tro_giang' and vi_tri = 1;
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a4 where bai_id = bai1 and vai_tro = 'tro_giang' and vi_tri = 2;
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a2 where bai_id = bai2 and vai_tro = 'giang_vien';
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a3 where bai_id = bai2 and vai_tro = 'tro_giang';

  select * into v from public.lop_hoc_tong_hop where id = lop1;
  res := res || jsonb_build_object('t', '24 View: so_bai = 2, GV 2/2 lượt, TG 3/4 lượt', 'ok',
    v.so_bai = 2 and v.gv_tong = 2 and v.gv_da_phan_cong = 2 and v.tg_tong = 4 and v.tg_da_phan_cong = 3);
  res := res || jsonb_build_object('t', '25 View: số nhân sự khác nhau — GV 1 người, TG 2 người', 'ok', v.gv_nhan_su = 1 and v.tg_nhan_su = 2);
  res := res || jsonb_build_object('t', '26 View: GV do 1 người đảm nhiệm toàn bộ -> có tên duy nhất (auto-collapse); TG 2 người -> không', 'ok',
    v.gv_ten_duy_nhat is not null and v.tg_ten_duy_nhat is null);
  res := res || jsonb_build_object('t', '27 View: còn slot trống nên trạng thái vẫn là dang_mo (chưa đủ đăng ký)', 'ok', v.trang_thai_hien_thi = 'dang_mo');

  ok := false;
  begin
    update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a3
    where bai_id = bai1 and vai_tro = 'tro_giang' and vi_tri = 3;
  exception when unique_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '28 1 người KHÔNG giữ 2 slot trong cùng 1 Bài', 'ok', ok);

  ok := false;
  begin
    update public.slot_giang_day set trang_thai = 'da_phan_cong'
    where bai_id = bai1 and vai_tro = 'tro_giang' and vi_tri = 3;
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '29 Slot "đã phân công" bắt buộc có người', 'ok', ok);

  -- ===== Admin: sửa số slot khi đã có người =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := false;
  begin
    perform public.luu_bai_hoc(bai1, lop1, 'Bài 1', t0, t0 + interval '3 hours', 1, 1);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '30 KHÔNG giảm số slot xuống dưới vị trí đã có người', 'ok', ok);

  ok := true;
  begin
    perform public.luu_bai_hoc(bai1, lop1, 'Bài 1', t0, t0 + interval '3 hours', 1, 2);
  exception when others then ok := false;
  end;
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang';
  res := res || jsonb_build_object('t', '31 Giảm được số slot khi slot bị bỏ còn trống (3 -> 2)', 'ok', ok and n = 2);

  ok := true;
  begin
    perform public.luu_bai_hoc(bai1, lop1, 'Bài 1', t0, t0 + interval '3 hours', 1, 3);
  exception when others then ok := false;
  end;
  select count(*) into n from public.slot_giang_day where bai_id = bai1 and vai_tro = 'tro_giang';
  res := res || jsonb_build_object('t', '32 Tăng lại số slot (2 -> 3) thêm 1 slot trống, không mất người đã phân công', 'ok', ok and n = 3);

  select count(*) into n from public.slot_giang_day where bai_id = bai1 and nguoi_phan_cong is not null;
  res := res || jsonb_build_object('t', '33 Người đã phân công của Bài 1 vẫn còn nguyên (3 người)', 'ok', n = 3);

  ok := false;
  begin
    perform public.xoa_bai_hoc(bai1);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '34 KHÔNG xóa được Bài đã có người phân công', 'ok', ok);

  ok := true;
  begin
    bai3 := public.luu_bai_hoc(null, lop1, 'Bài tạm', t0 + interval '2 days', t0 + interval '2 days 2 hours', 1, 0);
    perform public.xoa_bai_hoc(bai3);
  exception when others then ok := false;
  end;
  select count(*) into n from public.bai_hoc where id = bai3;
  res := res || jsonb_build_object('t', '35 Xóa được Bài còn trống hoàn toàn (kèm slot)', 'ok', ok and n = 0);

  ok := false;
  begin
    perform public.doi_trang_thai_lop(lop1, 'nhap');
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '36 KHÔNG đưa lớp đã có người phân công về Nháp', 'ok', ok);

  ok := false;
  begin
    perform public.dat_c3(lop1, 80);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '37 KHÔNG nhập C3 khi lớp chưa hoàn thành', 'ok', ok);

  ok := false;
  begin
    perform public.bat_tat_khao_sat(lop1, true);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '38 KHÔNG tạo khảo sát khi lớp chưa hoàn thành', 'ok', ok);

  execute 'reset role';

  -- Lấp nốt slot cuối -> "Đã đủ đăng ký" (suy ra, không lưu)
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a1 where bai_id = bai1 and vai_tro = 'tro_giang' and vi_tri = 3;
  select * into v from public.lop_hoc_tong_hop where id = lop1;
  res := res || jsonb_build_object('t', '39 View: mọi slot đã phân công -> trạng thái suy ra "da_du_dang_ky"', 'ok', v.trang_thai_hien_thi = 'da_du_dang_ky');

  select trang_thai::text into nguon from public.lop_hoc where id = lop1;
  res := res || jsonb_build_object('t', '40 Trạng thái lưu trong bảng vẫn là dang_mo (không nhập tay "đã đủ")', 'ok', nguon = 'dang_mo');

  -- ===== Hoàn thành lớp, nhập C1/C3 =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    perform public.doi_trang_thai_lop(lop1, 'da_hoan_thanh');
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '41 Admin chuyển lớp sang Đã hoàn thành', 'ok', ok);

  ok := false;
  begin
    perform public.luu_bai_hoc(bai2, lop1, 'Bài 2 sửa', t0, t0 + interval '1 hour', 1, 1);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '42 Lớp đã hoàn thành KHÔNG sửa Bài được', 'ok', ok);

  ok := true;
  begin
    perform public.dat_c3(lop1, 88.5);
    perform public.dat_c1_thu_cong(lop1, 70);
  exception when others then ok := false;
  end;
  select c1_phan_tram, c1_nguon::text into c, nguon from public.lop_hoc where id = lop1;
  res := res || jsonb_build_object('t', '43 Nhập C3 = 88.5 và C1 nhập tay = 70 (nguồn nhap_tay)', 'ok', ok and c = 70 and nguon = 'nhap_tay');

  ok := false;
  begin
    perform public.dat_c3(lop1, 101);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '44 C3 ngoài khoảng 0-100 bị chặn', 'ok', ok);

  ok := true;
  begin
    tk := public.bat_tat_khao_sat(lop1, true);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '45 Admin tạo link khảo sát (có token)', 'ok', ok and tk is not null);

  execute 'reset role';

  -- ===== Người điền khảo sát (anon, không đăng nhập) =====
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';

  select count(*) into n from public.lay_khao_sat(tk) where dang_mo;
  res := res || jsonb_build_object('t', '46 anon đọc được khảo sát bằng token (đang mở)', 'ok', n = 1);

  ok := true;
  begin
    perform public.gui_khao_sat(tk, 5, 4, 'Rất tốt');
    perform public.gui_khao_sat(tk, 3, 3, null);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '47 anon gửi được 2 phản hồi', 'ok', ok);

  ok := false;
  begin
    perform public.gui_khao_sat(tk, 6, 4, null);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '48 Điểm ngoài khoảng 1-5 bị chặn', 'ok', ok);

  ok := false;
  begin
    perform public.gui_khao_sat('11111111-1111-1111-1111-111111111111', 5, 5, null);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '49 Token sai bị từ chối', 'ok', ok);

  ok := false;
  begin
    perform 1 from public.khao_sat_phan_hoi limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '50 anon KHÔNG đọc được bảng phản hồi', 'ok', ok);

  ok := false;
  begin
    perform 1 from public.lop_hoc limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '51 anon KHÔNG đọc được lop_hoc', 'ok', ok);

  ok := false;
  begin
    perform public.luu_lop_hoc(null, 'ZZ Test anon', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date, current_date, null, false, nhom_arr, array[]::uuid[]);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '52 anon KHÔNG gọi được hàm quản lý lớp', 'ok', ok);

  execute 'reset role';

  select c1_phan_tram, c1_nguon::text into c, nguon from public.lop_hoc where id = lop1;
  res := res || jsonb_build_object('t', '53 C1 tự tính = TB điểm quy % = 75.00, nguồn khao_sat (phản hồi ghi đè nhập tay)', 'ok', c = 75.00 and nguon = 'khao_sat');

  -- Nhập tay sau cùng thắng, rồi phản hồi mới lại ghi đè
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.dat_c1_thu_cong(lop1, 60);
  select c1_phan_tram, c1_nguon::text into c, nguon from public.lop_hoc where id = lop1;
  res := res || jsonb_build_object('t', '54 Nhập tay sau cùng ghi đè khảo sát (C1 = 60, nhap_tay)', 'ok', c = 60 and nguon = 'nhap_tay');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  perform public.gui_khao_sat(tk, 5, 5, null);
  execute 'reset role';
  select c1_phan_tram, c1_nguon::text into c, nguon from public.lop_hoc where id = lop1;
  res := res || jsonb_build_object('t', '55 Phản hồi mới sau cùng ghi đè nhập tay: TB (4.5; 3; 5) = 83.33, khao_sat', 'ok', c = 83.33 and nguon = 'khao_sat');

  -- ===== GV: không đọc được phản hồi/token =====
  perform set_config('request.jwt.claims', json_build_object('sub', a2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.khao_sat_phan_hoi;
  res := res || jsonb_build_object('t', '56 GV KHÔNG đọc được phản hồi khảo sát', 'ok', n = 0);

  select count(*) into n from public.lop_hoc_khao_sat;
  res := res || jsonb_build_object('t', '57 GV KHÔNG đọc được token khảo sát', 'ok', n = 0);

  select c1_phan_tram, c3_phan_tram into v from public.lop_hoc_tong_hop where id = lop1;
  res := res || jsonb_build_object('t', '58 GV đọc được kết quả C1/C3 của lớp (công khai nội bộ)', 'ok', v.c1_phan_tram = 83.33 and v.c3_phan_tram = 88.5);

  ok := false;
  begin
    perform public.bat_tat_khao_sat(lop1, false);
  exception when insufficient_privilege then ok := true;
  end;
  res := res || jsonb_build_object('t', '59 GV KHÔNG bật/tắt được khảo sát', 'ok', ok);

  execute 'reset role';

  -- ===== Đóng khảo sát =====
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.bat_tat_khao_sat(lop1, false);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  ok := false;
  begin
    perform public.gui_khao_sat(tk, 5, 5, null);
  exception when others then ok := true;
  end;
  select count(*) into n from public.lay_khao_sat(tk) where not dang_mo;
  res := res || jsonb_build_object('t', '60 Khảo sát đã đóng: không gửi được, trang báo "đã đóng"', 'ok', ok and n = 1);
  execute 'reset role';

  -- ===== Người giữ Quyền Quản lý lớp (a4) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a4, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  ok := true;
  begin
    lop3 := public.luu_lop_hoc(null, 'ZZ Test Lớp 3', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 50, current_date + 51,
      null, false, nhom_arr, array[]::uuid[]);
  exception when others then ok := false;
  end;
  res := res || jsonb_build_object('t', '61 Người giữ Quyền Quản lý lớp tạo được lớp', 'ok', ok);

  ok := false;
  begin
    perform public.xoa_lop_hoc(lop1);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '62 KHÔNG xóa được lớp đã mở/hoàn thành (chỉ hủy)', 'ok', ok);

  ok := true;
  begin
    perform public.xoa_lop_hoc(lop3);
  exception when others then ok := false;
  end;
  select count(*) into n from public.lop_hoc where id = lop3;
  res := res || jsonb_build_object('t', '63 Xóa được lớp còn Nháp', 'ok', ok and n = 0);

  ok := true;
  begin
    perform public.doi_trang_thai_lop(lop2, 'da_huy');
  exception when others then ok := false;
  end;
  select count(*) into n from public.lop_hoc where id = lop2 and trang_thai = 'da_huy';
  res := res || jsonb_build_object('t', '64 Hủy được lớp Nháp', 'ok', ok and n = 1);

  ok := false;
  begin
    perform public.doi_trang_thai_lop(lop2, 'dang_mo');
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '65 Lớp đã hủy KHÔNG mở lại được', 'ok', ok);

  execute 'reset role';

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
