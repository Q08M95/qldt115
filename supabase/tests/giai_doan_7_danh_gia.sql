-- Test tự kiểm tra Giai đoạn 7 (check-in B1, chỉnh điểm danh, nhập C2 dự giờ, cấu hình điểm danh/rubric, KPI cá nhân).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260924100000 (và các migration trước).
-- Script tự tạo 5 user giả (@qldt.test) + lớp "ZZ Test..." + 1 kỳ thử NĂM 2025 (không đụng kỳ thật), kiểm tra rồi xóa sạch.
-- Script tạm đổi 3 cấu hình (khung check-in, mốc áp dụng B1=0%, mô tả rubric) và KHÔNG QUÊN khôi phục ở cuối.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   a1 Admin | a2, a3 Giảng viên bác sĩ | a4, a5 Trợ giảng bác sĩ
--
-- Bài tương đối theo giờ chạy (các Bài "trong khung" đều nằm trong kỳ thật hiện tại, không ảnh hưởng kết quả kỳ):
--   bA: bắt đầu sau 20 phút     — a2 (GV), a4 (TG)  — trong khung check-in (mở trước 45 phút)
--   bB: bắt đầu sau 3 giờ       — a2               — chưa đến giờ check-in
--   bC: đã bắt đầu 10,5 phút    — a3               — trễ 10 phút => B1 = 100 - 10x100/30 = 66,67
--   bD: đã bắt đầu 40 phút      — a4               — trễ >= 30 phút => B1 = 0
--   bE: đã kết thúc (bắt đầu 3 giờ trước) — a2, a3 — không check-in được; Admin chỉnh tay
--   bF: lớp đã hủy, trong khung — a5               — không check-in được
-- Kỳ thử 2025 (07-01..09-30): bK1 (a2 GV + a4 TG), bK2 (a2 GV); điểm danh: (bK2,a2)=100, (bK1,a4)=80; a2 vắng bK1
--   => với mốc "vắng = 0%" áp dụng: B1 a2 = 50, a4 = 80; mốc chưa tới: a2 = 100 (chỉ tính Bài có bản ghi).

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.ky_danh_gia where ten like 'ZZ Test%';  -- kéo theo ket_qua_kpi của kỳ thử
  delete from public.de_xuat_nhan_su where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.diem_danh_bai where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.danh_gia_du_gio where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
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
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 5) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a5', 'tg_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  a5 uuid := '00000000-0000-0000-0000-0000000000a5';
  res jsonb := '[]';
  n int;
  ok boolean;
  ok2 boolean;
  nl uuid;
  lp uuid; lh uuid; lk uuid;
  bA uuid; bB uuid; bC uuid; bD uuid; bE uuid; bF uuid; bK1 uuid; bK2 uuid;
  kE uuid;
  pt numeric;
  d numeric;
  j jsonb;
  o_truoc numeric; o_max numeric; o_tu numeric;
  o_rubric jsonb;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- Lưu cấu hình hiện có để khôi phục ở cuối
  select gia_tri into o_truoc from public.cau_hinh_he_thong where khoa = 'checkin_truoc_phut';
  select gia_tri into o_max from public.cau_hinh_he_thong where khoa = 'b1_tre_toi_da_phut';
  select gia_tri into o_tu from public.cau_hinh_he_thong where khoa = 'b1_ap_dung_tu';
  select jsonb_object_agg(muc::text, jsonb_build_object('ten', ten, 'mo_ta', mo_ta)) into o_rubric from public.rubric_du_gio;

  -- ===== Dữ liệu thử =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test7 Đang mở', nl, 'nhan_vien_y_te', 'co_kinh_phi', (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1,
          (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, 'dang_mo') returning id into lp;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test7 Đã hủy', nl, 'nhan_vien_y_te', 'co_kinh_phi', (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1,
          (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, 'da_huy') returning id into lh;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test7 Kỳ 2025', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-07-10', '2025-07-11', 'da_hoan_thanh') returning id into lk;

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp, 1, 'A', now() + interval '20 minutes', now() + interval '2 hours') returning id into bA;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp, 2, 'B', now() + interval '3 hours', now() + interval '5 hours') returning id into bB;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp, 3, 'C', now() - interval '10 minutes 30 seconds', now() + interval '1 hour') returning id into bC;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp, 4, 'D', now() - interval '40 minutes', now() + interval '1 hour') returning id into bD;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lp, 5, 'E', now() - interval '3 hours', now() - interval '1 hour') returning id into bE;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lh, 1, 'F', now() - interval '5 minutes', now() + interval '1 hour') returning id into bF;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lk, 1, 'K1', '2025-07-10 08:00:00+07', '2025-07-10 10:00:00+07') returning id into bK1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (lk, 2, 'K2', '2025-07-11 08:00:00+07', '2025-07-11 10:00:00+07') returning id into bK2;

  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (bA, 'giang_vien', 1, 'da_phan_cong', a2), (bA, 'tro_giang', 1, 'da_phan_cong', a4),
    (bB, 'giang_vien', 1, 'da_phan_cong', a2),
    (bC, 'giang_vien', 1, 'da_phan_cong', a3),
    (bD, 'tro_giang', 1, 'da_phan_cong', a4),
    (bE, 'giang_vien', 1, 'da_phan_cong', a2), (bE, 'giang_vien', 2, 'da_phan_cong', a3),
    (bF, 'tro_giang', 1, 'da_phan_cong', a5),
    (bK1, 'giang_vien', 1, 'da_phan_cong', a2), (bK1, 'tro_giang', 1, 'da_phan_cong', a4),
    (bK2, 'giang_vien', 1, 'da_phan_cong', a2);

  -- ===== Cấu hình khởi điểm =====
  res := res || jsonb_build_object('t', '01 Khung check-in khởi điểm 45 phút, ngưỡng trễ tối đa B1 khởi điểm 30 phút', 'ok',
    o_truoc = 45 and o_max = 30);
  select count(*) into n from public.rubric_du_gio where muc in (100, 80, 60, 0) and btrim(ten) <> '';
  res := res || jsonb_build_object('t', '02 Rubric C2 có đủ 4 mức (100/80/60/0) với tên và mô tả', 'ok', n = 4);
  res := res || jsonb_build_object('t', '03 Mốc áp dụng "vắng = 0%" đã được đặt', 'ok', o_tu is not null and o_tu >= 20260101);

  -- ===== Check-in =====
  perform pg_temp.vao(a2);
  select public.check_in_bai(bA) into pt;
  execute 'reset role';
  res := res || jsonb_build_object('t', '04 a2 check-in bA (chưa đến giờ học, trong khung 45 phút) => B1 = 100', 'ok', pt = 100);
  res := res || jsonb_build_object('t', '05 Bản ghi điểm danh có thời điểm check-in và không phải sửa tay', 'ok',
    exists (select 1 from public.diem_danh_bai d where d.bai_id = bA and d.user_id = a2 and d.check_in_luc is not null and not d.chinh_tay and d.b1_phan_tram = 100));

  perform pg_temp.vao(a2);
  ok := false; begin perform public.check_in_bai(bA); exception when unique_violation then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '06 Check-in lần 2 cùng Bài bị từ chối', 'ok', ok);

  perform pg_temp.vao(a3);
  ok := false; begin perform public.check_in_bai(bA); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '07 Người không được phân công ở Bài đó không check-in được', 'ok', ok);

  perform pg_temp.vao(a2);
  ok := false; begin perform public.check_in_bai(bB); exception when check_violation then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '08 Chưa đến khung giờ (Bài bắt đầu sau 3 giờ) thì không check-in được', 'ok', ok);

  perform pg_temp.vao(a2);
  ok := false; begin perform public.check_in_bai(bE); exception when check_violation then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '09 Bài đã kết thúc thì không check-in được', 'ok', ok);

  perform pg_temp.vao(a5);
  ok := false; begin perform public.check_in_bai(bF); exception when check_violation then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '10 Lớp đã hủy thì không check-in được', 'ok', ok);

  perform pg_temp.vao(a3);
  select public.check_in_bai(bC) into pt;
  execute 'reset role';
  res := res || jsonb_build_object('t', '11 Trễ 10 phút trên ngưỡng 30 phút => B1 = 66,67 (giảm tuyến tính)', 'ok', pt = 66.67);

  perform pg_temp.vao(a4);
  select public.check_in_bai(bD) into pt;
  execute 'reset role';
  res := res || jsonb_build_object('t', '12 Trễ 40 phút (vượt ngưỡng) => B1 = 0', 'ok', pt = 0);

  perform pg_temp.vao(a2);
  ok := false;
  begin
    insert into public.diem_danh_bai (bai_id, user_id, b1_phan_tram) values (bB, a2, 100);
  exception when insufficient_privilege then ok := true;
  end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '13 Không ghi thẳng vào bảng điểm danh được (phải qua hàm check-in)', 'ok', ok);

  -- Danh sách Bài đang trong khung check-in của tôi
  perform pg_temp.vao(a2);
  select count(*), bool_and(x.bai_id = bA and x.da_check_in) into n, ok from public.bai_can_check_in() x;
  execute 'reset role';
  res := res || jsonb_build_object('t', '14 a2 chỉ thấy bA trong khung check-in (bB chưa tới, bE đã hết), kèm trạng thái đã check-in', 'ok', n = 1 and ok);
  perform pg_temp.vao(a4);
  select count(*) into n from public.bai_can_check_in();
  execute 'reset role';
  res := res || jsonb_build_object('t', '15 a4 thấy 2 Bài trong khung (bA chưa check-in, bD đã check-in)', 'ok', n = 2);

  -- ===== Cấu hình điểm danh =====
  perform pg_temp.vao(a2);
  ok := false; begin perform public.luu_cau_hinh_diem_danh('{"checkin_truoc_phut": 10}'); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '16 Người không phải quản trị không sửa được cấu hình điểm danh', 'ok', ok);

  perform pg_temp.vao(a1);
  ok := false; begin perform public.luu_cau_hinh_diem_danh('{"b1_tre_toi_da_phut": 0}'); exception when check_violation then ok := true; end;
  ok2 := false; begin perform public.luu_cau_hinh_diem_danh('{"checkin_truoc_phut": 999}'); exception when check_violation then ok2 := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '17 Ngưỡng trễ B1 < 1 phút và khung check-in > 240 phút bị từ chối', 'ok', ok and ok2);

  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh('{"checkin_truoc_phut": 10}');
  perform pg_temp.vao(a4);
  select count(*) into n from public.bai_can_check_in();
  ok := false; begin perform public.check_in_bai(bA); exception when check_violation then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '18 Đổi khung check-in còn 10 phút: bA (bắt đầu sau 20 phút) ra khỏi khung, không check-in được', 'ok', n = 1 and ok);

  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh(jsonb_build_object('checkin_truoc_phut', o_truoc));
  execute 'reset role';

  perform pg_temp.vao(a1);
  ok := false; begin perform public.luu_cau_hinh_diem_danh('{"rubric": {"80": {"ten": "  ", "mo_ta": "x"}}}'); exception when check_violation then ok := true; end;
  perform public.luu_cau_hinh_diem_danh('{"rubric": {"80": {"ten": "Khá", "mo_ta": "Mô tả thử"}}}');
  execute 'reset role';
  res := res || jsonb_build_object('t', '19 Sửa mô tả rubric: tên trống bị từ chối, tên hợp lệ được lưu', 'ok',
    ok and exists (select 1 from public.rubric_du_gio where muc = 80 and ten = 'Khá' and mo_ta = 'Mô tả thử'));
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh(jsonb_build_object('rubric', o_rubric));
  execute 'reset role';

  -- ===== Chỉnh tay điểm danh =====
  perform pg_temp.vao(a2);
  ok := false; begin perform public.chinh_diem_danh(bE, a2, 100, 'Tự sửa điểm của mình'); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '20 GV/TG không tự chỉnh được điểm danh', 'ok', ok);

  perform pg_temp.vao(a1);
  ok := false; begin perform public.chinh_diem_danh(bE, a2, 70, 'ngắn'); exception when check_violation then ok := true; end;
  ok2 := false; begin perform public.chinh_diem_danh(bE, a2, 101, 'Điểm vượt trần'); exception when check_violation then ok2 := true; end;
  res := res || jsonb_build_object('t', '21 Chỉnh điểm danh cần lý do >= 5 ký tự và điểm 0-100', 'ok', ok and ok2);
  ok := false; begin perform public.chinh_diem_danh(bE, a4, 70, 'Người này không thuộc Bài'); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '22 Chỉnh điểm danh cho người không được phân công ở Bài đó bị từ chối', 'ok', ok);
  perform public.chinh_diem_danh(bE, a2, 70, 'Lỗi kỹ thuật khi check-in');
  execute 'reset role';
  res := res || jsonb_build_object('t', '23 Admin chỉnh tay điểm danh bài đã kết thúc: lưu 70%, đánh dấu sửa tay, có lý do và người sửa', 'ok',
    exists (select 1 from public.diem_danh_bai d where d.bai_id = bE and d.user_id = a2 and d.b1_phan_tram = 70 and d.chinh_tay
      and d.ly_do_chinh = 'Lỗi kỹ thuật khi check-in' and d.chinh_boi = a1 and d.chinh_luc is not null and d.check_in_luc is null));

  perform pg_temp.vao(a1);
  perform public.chinh_diem_danh(bC, a3, 100, 'Chỉnh lại sau khiếu nại');
  execute 'reset role';
  res := res || jsonb_build_object('t', '24 Chỉnh lại điểm đã check-in: cập nhật giá trị, giữ nguyên thời điểm check-in, đánh dấu sửa tay', 'ok',
    exists (select 1 from public.diem_danh_bai d where d.bai_id = bC and d.user_id = a3 and d.b1_phan_tram = 100 and d.chinh_tay and d.check_in_luc is not null));

  -- ===== Nhập C2 (dự giờ) =====
  perform pg_temp.vao(a2);
  ok := false; begin perform public.luu_danh_gia_du_gio(bE, a3, 80::smallint, null); exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '25 GV/TG không nhập được điểm dự giờ', 'ok', ok);

  perform pg_temp.vao(a1);
  ok := false; begin perform public.luu_danh_gia_du_gio(bE, a1, 80::smallint, null); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '26 Không tự chấm dự giờ cho chính mình', 'ok', ok);
  ok := false; begin perform public.luu_danh_gia_du_gio(bE, a2, 90::smallint, null); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '27 Mức điểm ngoài rubric (100/80/60/0) bị từ chối', 'ok', ok);
  ok := false; begin perform public.luu_danh_gia_du_gio(bE, a4, 80::smallint, null); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '28 Chấm người không được phân công ở Bài đó bị từ chối', 'ok', ok);
  ok := false; begin perform public.luu_danh_gia_du_gio(bB, a2, 80::smallint, null); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '29 Bài chưa bắt đầu chưa nhập được điểm dự giờ', 'ok', ok);
  perform public.luu_danh_gia_du_gio(bE, a2, 80::smallint, 'Truyền đạt rõ, còn chậm phần thực hành');
  perform public.luu_danh_gia_du_gio(bE, a2, 100::smallint, 'Sau khi xem lại: xuất sắc');
  execute 'reset role';
  res := res || jsonb_build_object('t', '30 Nhập rồi sửa điểm dự giờ cùng Bài: chỉ còn 1 bản ghi, mức 100, có người chấm và ghi chú', 'ok',
    (select count(*) = 1 and bool_and(g.muc_diem = 100 and g.nguoi_cham = a1 and g.ghi_chu = 'Sau khi xem lại: xuất sắc')
     from public.danh_gia_du_gio g where g.bai_id = bE and g.user_id = a2));

  -- Quyền đọc bản ghi C2: người quản trị + chính người được chấm
  perform pg_temp.vao(a2);
  select count(*) into n from public.danh_gia_du_gio where user_id = a2;
  execute 'reset role';
  perform pg_temp.vao(a3);
  select count(*) into d from public.danh_gia_du_gio where user_id = a2;
  execute 'reset role';
  res := res || jsonb_build_object('t', '31 Bản ghi dự giờ: chính chủ đọc được, người khác (GV/TG) không đọc được', 'ok', n = 1 and d = 0);

  perform pg_temp.vao(a1);
  perform public.xoa_danh_gia_du_gio(bE, a2);
  execute 'reset role';
  res := res || jsonb_build_object('t', '32 Xóa điểm dự giờ', 'ok', not exists (select 1 from public.danh_gia_du_gio where bai_id = bE and user_id = a2));

  -- ===== Engine: vắng = 0% từ mốc áp dụng =====
  insert into public.ky_danh_gia (ten, tu, den) values ('ZZ Test7 Q3/2025', '2025-07-01', '2025-09-30') returning id into kE;
  insert into public.diem_danh_bai (bai_id, user_id, b1_phan_tram) values (bK2, a2, 100), (bK1, a4, 80);

  update public.cau_hinh_he_thong set gia_tri = 20250101 where khoa = 'b1_ap_dung_tu';
  select (t.gia_tri ->> 'B1')::numeric into d from public.tinh_kpi(kE, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a2;
  select (t.gia_tri ->> 'B1')::numeric = 80 into ok from public.tinh_kpi(kE, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a4;
  res := res || jsonb_build_object('t', '33 Mốc đã áp dụng: a2 vắng 1/2 Bài => B1 = 50 (Bài không check-in = 0%); a4 có điểm danh đủ => 80', 'ok', d = 50 and ok);

  update public.cau_hinh_he_thong set gia_tri = 20990101 where khoa = 'b1_ap_dung_tu';
  select (t.gia_tri ->> 'B1')::numeric into d from public.tinh_kpi(kE, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '34 Mốc chưa tới: chỉ tính các Bài có điểm danh (a2 => 100), Bài không có bản ghi là thiếu dữ liệu, không phạt oan', 'ok', d = 100);

  update public.cau_hinh_he_thong set gia_tri = 20250101 where khoa = 'b1_ap_dung_tu';
  update public.ky_danh_gia set trang_thai = 'cho_duyet' where id = kE;
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_ky(kE, 'da_dong');
  execute 'reset role';
  update public.cau_hinh_he_thong set gia_tri = 20990101 where khoa = 'b1_ap_dung_tu';
  select (r.gia_tri ->> 'B1')::numeric into d from public.ket_qua_kpi r where r.ky_id = kE and r.user_id = a2;
  res := res || jsonb_build_object('t', '35 Kỳ đã đóng giữ nguyên B1 = 50 dù mốc áp dụng đổi sau đó (không hồi tố), snapshot có mốc áp dụng', 'ok',
    d = 50 and (select (k.cau_hinh_snapshot #>> '{tham_so,b1_ap_dung_tu}')::numeric = 20250101 from public.ky_danh_gia k where k.id = kE));

  -- ===== Kỳ đã đóng thì không sửa điểm danh / dự giờ =====
  perform pg_temp.vao(a1);
  ok := false; begin perform public.chinh_diem_danh(bK1, a2, 100, 'Sửa sau khi kỳ đã đóng'); exception when check_violation then ok := true; end;
  ok2 := false; begin perform public.luu_danh_gia_du_gio(bK1, a2, 80::smallint, null); exception when check_violation then ok2 := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '36 Bài thuộc kỳ đã đóng: không chỉnh điểm danh, không nhập dự giờ (phải mở lại kỳ)', 'ok', ok and ok2);

  -- ===== KPI cá nhân =====
  perform pg_temp.vao(a3);
  j := public.kpi_ca_nhan(a2);
  execute 'reset role';
  res := res || jsonb_build_object('t', '37 kpi_ca_nhan: kỳ đã đóng có KPI của a2, tổng lũy kế A4 = 0, không trả nhãn nhóm', 'ok',
    exists (select 1 from jsonb_array_elements(j -> 'ky') e where e ->> 'ky_id' = kE::text and (e ->> 'kpi') is not null)
    and (j ->> 'a4_tong')::int = 0 and not (j::text like '%gv_bac_si%'));
  res := res || jsonb_build_object('t', '38 Người khác (GV) xem KPI của a2 không thấy tiến độ đổi nhóm (tránh lộ nhóm)', 'ok', (j -> 'tien_do') is null or j -> 'tien_do' = 'null'::jsonb);

  perform pg_temp.vao(a2);
  j := public.kpi_ca_nhan(a2);
  execute 'reset role';
  res := res || jsonb_build_object('t', '39 a2 (Giảng viên) tự xem: tiến độ hướng GIÁNG, ngưỡng và số kỳ cần khớp cấu hình', 'ok',
    j #>> '{tien_do,huong}' = 'giang' and (j #>> '{tien_do,so_ky_can}')::int = public.cau_hinh_so('kpi_giang_nhom_y', 3)::int
    and (j #>> '{tien_do,nguong}')::numeric = public.cau_hinh_so('kpi_giang_nhom_x', 50));

  perform pg_temp.vao(a4);
  j := public.kpi_ca_nhan(a4);
  execute 'reset role';
  res := res || jsonb_build_object('t', '40 a4 (Trợ giảng) tự xem: tiến độ hướng THĂNG, số kỳ đạt không vượt số kỳ cần', 'ok',
    j #>> '{tien_do,huong}' = 'thang' and (j #>> '{tien_do,so_ky_dat}')::int <= (j #>> '{tien_do,so_ky_can}')::int);

  perform pg_temp.vao(a1);
  j := public.kpi_ca_nhan(a2);
  execute 'reset role';
  res := res || jsonb_build_object('t', '41 Admin xem KPI của a2 vẫn thấy tiến độ đổi nhóm', 'ok', j #>> '{tien_do,huong}' = 'giang');

  -- ===== Mở lại kỳ rồi sửa được =====
  perform pg_temp.vao(a1);
  perform public.mo_lai_ky(kE, 'Thử nghiệm mở lại để sửa điểm danh');
  perform public.chinh_diem_danh(bK1, a2, 90, 'Bổ sung sau khi mở lại kỳ');
  execute 'reset role';
  res := res || jsonb_build_object('t', '42 Mở lại kỳ (có lý do) rồi chỉnh điểm danh được', 'ok',
    exists (select 1 from public.diem_danh_bai d where d.bai_id = bK1 and d.user_id = a2 and d.b1_phan_tram = 90 and d.chinh_tay));

  -- ===== Khôi phục cấu hình =====
  update public.cau_hinh_he_thong set gia_tri = o_tu where khoa = 'b1_ap_dung_tu';
  res := res || jsonb_build_object('t', '43 Đã khôi phục cấu hình điểm danh, mốc áp dụng và rubric ban đầu', 'ok',
    (select gia_tri from public.cau_hinh_he_thong where khoa = 'checkin_truoc_phut') = o_truoc
    and (select gia_tri from public.cau_hinh_he_thong where khoa = 'b1_tre_toi_da_phut') = o_max
    and (select gia_tri from public.cau_hinh_he_thong where khoa = 'b1_ap_dung_tu') = o_tu
    and (select jsonb_object_agg(muc::text, jsonb_build_object('ten', ten, 'mo_ta', mo_ta)) from public.rubric_du_gio) = o_rubric);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
