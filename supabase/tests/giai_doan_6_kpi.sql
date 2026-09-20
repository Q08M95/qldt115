-- Test tự kiểm tra Giai đoạn 6 (engine KPI, cấu hình, kỳ đánh giá, snapshot, đề xuất đổi nhóm).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260923100000 (và các migration trước).
-- Script tự tạo 9 user giả (@qldt.test) + lớp "ZZ Test..." + 2 kỳ thử NĂM 2025 (không đụng kỳ thật), kiểm tra rồi xóa sạch.
-- Script tạm đặt cấu hình KPI về giá trị khởi điểm (30/45/25, 40/35/25, 50/25/25, D2 1.1, D3 1.1/1.0) để số liệu tính tay
-- đối chiếu được, và KHÔNG QUÊN khôi phục cấu hình cũ ở cuối. Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   a1 Admin | a2..a6 GV bác sĩ (5 người = đủ ngưỡng percentile) | a7, a8, a9 TG bác sĩ (3 người = dưới ngưỡng, dùng fallback)
--
-- Kỳ 1 (2025-07-01..09-30) — số liệu tính tay (cấu hình khởi điểm):
--   a2: 5h, A1 90 (percentile), A2 50, A3 -, B1 90, C2 94, C3 90, C1 80  => A 76,67  B 90  C 89,10  KPI 86,26
--   a3: 4h L2 không kinh phí (hệ số 1,21), A1 70, A2 100, B1 -, C2 72,6, C1 60 => KPI 72,13 (thiếu B => chia lại trọng số)
--   a4: 3h, A1 50, A2 0, A3 50, B1 50, C3 90, C1 80 => KPI 63,00
--   a5: 2h, A1 30, A2 0, C3 100, C1 100 => KPI 71,43
--   a7: TG 7h/3 Bài/2 lớp, A2 33,33, B1 100, C3 90, C1 70 (TB 80 và 60) => KPI 75,08
--   a8: TG 2h, A2 0, A3 100, C1 60 => KPI 56,43
-- Kỳ 2 (2025-10-01..12-31): a7 dạy Bài L3 lúc 01:00 sáng 01/10 (giờ VN; theo giờ UTC vẫn là 30/09 — phải tính vào kỳ 2).

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.ky_danh_gia where ten like 'ZZ Test%';  -- kéo theo ket_qua_kpi của kỳ thử
  delete from public.de_xuat_nhan_su where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.diem_danh_bai where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.danh_gia_du_gio where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.dang_ky_giang_day where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6',
    '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a9');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ Test%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ Test%');
  delete from public.lop_hoc where ten like 'ZZ Test%';
  delete from public.lich_su_doi_nhom where user_id in (
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

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a5', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a6', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a7', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000a8', 'tg_bac_si'),
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
  l1 uuid; l2 uuid; l3 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid; b6 uuid;
  k1 uuid; k2 uuid; kx uuid;
  orig jsonb; porig jsonb; pdef jsonb; ch jsonb; ch2 jsonb;
  d numeric; d2 numeric; d3 numeric; d4 numeric;
  ok2 boolean;
  tt text;
  j jsonb;
  dx uuid;
  r record;
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- Lưu cấu hình hiện có để khôi phục ở cuối
  orig := public.cau_hinh_kpi_hien_tai();
  porig := jsonb_build_object(
    'nhom', orig -> 'nhom',
    'tieu_chi', (select jsonb_object_agg(x ->> 'ma', jsonb_build_object('trong_so', x -> 'trong_so', 'bat', x -> 'bat'))
                 from jsonb_array_elements(orig -> 'tieu_chi') x),
    'he_so', orig -> 'he_so', 'd1', orig -> 'd1', 'tham_so', orig -> 'tham_so');
  -- Cấu hình khởi điểm theo CLAUDE.md (riêng ngưỡng đổi nhóm tạm hạ xuống 70 điểm / 2 kỳ để thử được với 2 kỳ)
  pdef := jsonb_build_object(
    'nhom', '{"A": 25, "B": 30, "C": 45}'::jsonb,
    'tieu_chi', '{"A1": {"trong_so": 50, "bat": true}, "A2": {"trong_so": 25, "bat": true}, "A3": {"trong_so": 25, "bat": true},
                  "A4": {"trong_so": 0, "bat": true}, "B1": {"trong_so": 100, "bat": true}, "C1": {"trong_so": 25, "bat": true},
                  "C2": {"trong_so": 40, "bat": true}, "C3": {"trong_so": 35, "bat": true}}'::jsonb,
    'he_so', '{"D2": 1.1, "D3_GV": 1.1, "D3_TG": 1}'::jsonb,
    'd1', (select jsonb_object_agg(id::text, 1.0) from public.danh_muc_nhom_lop),
    'tham_so', '{"min_nhom": 5, "so_ky_fallback": 3, "gop_c": 0, "doi_nhom_x": 70, "doi_nhom_y": 2}'::jsonb);

  -- ===== Dữ liệu thử: 3 lớp, 6 Bài (đều đã kết thúc) =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, c1_phan_tram, c1_nguon, c3_phan_tram)
  values ('ZZ Test L1', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-07-10', '2025-07-11', 'da_hoan_thanh', 80, 'nhap_tay', 90) returning id into l1;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, c1_phan_tram, c1_nguon, c3_phan_tram)
  values ('ZZ Test L2', nl, 'cong_dong', 'khong_kinh_phi', '2025-08-05', '2025-08-06', 'da_hoan_thanh', 60, 'nhap_tay', null) returning id into l2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, c1_phan_tram, c1_nguon, c3_phan_tram)
  values ('ZZ Test L3', nl, 'nhan_vien_y_te', 'co_kinh_phi', '2025-09-30', '2025-10-01', 'da_hoan_thanh', 100, 'nhap_tay', 100) returning id into l3;

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'B1', '2025-07-10 08:00:00+07', '2025-07-10 10:00:00+07') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'B2', '2025-07-11 08:00:00+07', '2025-07-11 11:00:00+07') returning id into b2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 1, 'B3', '2025-08-05 08:00:00+07', '2025-08-05 10:00:00+07') returning id into b3;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 2, 'B4', '2025-08-06 08:00:00+07', '2025-08-06 10:00:00+07') returning id into b4;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l3, 1, 'B5', '2025-09-30 08:00:00+07', '2025-09-30 10:00:00+07') returning id into b5;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l3, 2, 'B6', '2025-10-01 01:00:00+07', '2025-10-01 03:00:00+07') returning id into b6;

  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (b1, 'giang_vien', 1, 'da_phan_cong', a2), (b1, 'tro_giang', 1, 'da_phan_cong', a7),
    (b2, 'giang_vien', 1, 'da_phan_cong', a2), (b2, 'giang_vien', 2, 'da_phan_cong', a4), (b2, 'tro_giang', 1, 'da_phan_cong', a7),
    (b3, 'giang_vien', 1, 'da_phan_cong', a3), (b3, 'tro_giang', 1, 'da_phan_cong', a8), (b3, 'tro_giang', 2, 'da_phan_cong', a7),
    (b4, 'giang_vien', 1, 'da_phan_cong', a3),
    (b5, 'giang_vien', 1, 'da_phan_cong', a5),
    (b6, 'tro_giang', 1, 'da_phan_cong', a7);

  -- Đăng ký chủ động được duyệt (A2) và lời mời (A3)
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, trang_thai, slot_id)
  select v.bai, v.vt, v.u, v.loai::public.loai_dang_ky, v.trt::public.trang_thai_dang_ky,
         (select s.id from public.slot_giang_day s where s.bai_id = v.bai and s.nguoi_phan_cong = v.u)
  from (values
    (b1, 'giang_vien'::public.vai_tro_giang_day, a2, 'tu_dang_ky', 'da_duyet'),
    (b3, 'giang_vien', a3, 'tu_dang_ky', 'da_duyet'),
    (b4, 'giang_vien', a3, 'tu_dang_ky', 'da_duyet'),
    (b1, 'tro_giang', a7, 'tu_dang_ky', 'da_duyet'),
    (b6, 'tro_giang', a7, 'tu_dang_ky', 'da_duyet'),
    (b2, 'giang_vien', a4, 'duoc_moi', 'da_duyet'),
    (b3, 'tro_giang', a8, 'duoc_moi', 'da_duyet'),
    (b4, 'giang_vien', a4, 'duoc_moi', 'tu_choi')
  ) as v(bai, vt, u, loai, trt);

  -- B1 (điểm danh) và C2 (dự giờ)
  insert into public.diem_danh_bai (bai_id, user_id, b1_phan_tram) values (b1, a2, 100), (b2, a2, 80), (b2, a4, 50), (b1, a7, 100);
  insert into public.danh_gia_du_gio (bai_id, user_id, muc_diem) values (b1, a2, 80), (b2, a2, 100), (b3, a3, 60);

  -- ===== Cấu hình khởi điểm có đủ =====
  select count(*) into n from public.nhom_tieu_chi;
  select count(*) into d from public.tieu_chi_con;
  select count(*) into d2 from public.he_so_do_kho;
  res := res || jsonb_build_object('t', '01 Có đủ 3 nhóm tiêu chí, 8 tiêu chí con (A1-A4, B1, C1-C3), 3 hệ số D (D2, D3 GV/TG)', 'ok', n = 3 and d = 8 and d2 = 3);
  select count(*) into n from public.cau_hinh_he_thong where khoa like 'kpi\_%';
  res := res || jsonb_build_object('t', '02 Có đủ 5 tham số KPI (ngưỡng percentile, số kỳ fallback, cách gộp C, ngưỡng đổi nhóm X/Y)', 'ok', n = 5);
  select count(*) into n from public.tieu_chi_con where ma = 'A4' and tinh_vao_kpi = false;
  res := res || jsonb_build_object('t', '03 A4 tách khỏi công thức KPI (tinh_vao_kpi = false)', 'ok', n = 1);
  select k.tu, k.den into r from public.ky_hien_tai() k;
  res := res || jsonb_build_object('t', '04 ky_hien_tai() trả kỳ chứa hôm nay', 'ok',
    r.tu <= (now() at time zone 'Asia/Ho_Chi_Minh')::date and r.den >= (now() at time zone 'Asia/Ho_Chi_Minh')::date);

  -- ===== Admin: cấu hình + kỳ =====
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_kpi(pdef);

  ok := false;
  begin
    perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{nhom,A}', '30'));
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '05 Tổng trọng số nhóm khác 100% bị từ chối', 'ok', ok);

  ok := false;
  begin
    perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{tieu_chi,A1,trong_so}', '60'));
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '06 Tổng trọng số tiêu chí con của 1 nhóm khác 100% bị từ chối', 'ok', ok);

  ok := false;
  begin
    perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{tham_so,min_nhom}', '1'));
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '07 Ngưỡng percentile < 2 người bị từ chối', 'ok', ok);

  ok := false;
  begin
    perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{he_so,D2}', '0'));
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '08 Hệ số D <= 0 bị từ chối', 'ok', ok);

  -- Tắt B1 => nhóm B không còn tiêu chí nào => tổng nhóm còn lại (25+45) phải = 100 mới hợp lệ
  ok := false;
  begin
    perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{tieu_chi,B1,bat}', 'false'));
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '09 Tắt B1 mà không chia lại trọng số nhóm (25+45 <> 100) bị từ chối', 'ok', ok);

  perform public.luu_cau_hinh_kpi(pdef);
  select h.gia_tri into d from public.he_so_do_kho h where h.ma = 'D2';
  res := res || jsonb_build_object('t', '10 Lưu cấu hình hợp lệ: D2 = 1,1 và các lần lưu lỗi trước đó không để lại thay đổi', 'ok',
    d = 1.10 and (select trong_so from public.nhom_tieu_chi where ma = 'A') = 25);

  k1 := public.luu_ky(null, 'ZZ Test Kỳ 1', '2025-07-01', '2025-09-30');
  k2 := public.luu_ky(null, 'ZZ Test Kỳ 2', '2025-10-01', '2025-12-31');
  res := res || jsonb_build_object('t', '11 Tạo 2 kỳ thử, trạng thái ban đầu Đang mở', 'ok',
    k1 is not null and k2 is not null and (select count(*) from public.ky_danh_gia where id in (k1, k2) and trang_thai = 'dang_mo') = 2);

  ok := false;
  begin
    perform public.luu_ky(null, 'ZZ Test Chồng', '2025-09-15', '2025-10-15');
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '12 Kỳ có ngày chồng lên kỳ khác bị từ chối', 'ok', ok);

  ok := false;
  begin
    perform public.luu_ky(null, 'ZZ Test Ngược', '2024-05-10', '2024-05-01');
  exception when check_violation then ok := true;
  end;
  res := res || jsonb_build_object('t', '13 Ngày kết thúc trước ngày bắt đầu bị từ chối', 'ok', ok);

  kx := public.luu_ky(null, 'ZZ Test Xóa', '2024-01-01', '2024-03-31');
  perform public.luu_ky(kx, 'ZZ Test Xóa 2', '2024-01-01', '2024-03-31');
  res := res || jsonb_build_object('t', '14 Sửa được tên kỳ khi còn Đang mở', 'ok', (select ten from public.ky_danh_gia where id = kx) = 'ZZ Test Xóa 2');
  perform public.xoa_ky(kx);
  res := res || jsonb_build_object('t', '15 Xóa được kỳ Đang mở', 'ok', not exists (select 1 from public.ky_danh_gia where id = kx));
  execute 'reset role';

  -- ===== ENGINE: kỳ 1, cấu hình khởi điểm (tính tay ở đầu file) =====
  ch := public.cau_hinh_kpi_hien_tai();
  select count(*) into n from public.tinh_kpi(k1, ch);
  res := res || jsonb_build_object('t', '16 Chỉ tính cho người có dạy trong kỳ: 6 người (a2,a3,a4,a5,a7,a8), không có a6/a9 (không dạy) và a1', 'ok',
    n = 6 and not exists (select 1 from public.tinh_kpi(k1, ch) t where t.user_id in (a1, a6, a9)));

  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '17 KPI a2 = 86,26 (tính tay)', 'ok', abs(d - 86.26) < 0.011);
  select (t.diem_nhom ->> 'A')::numeric, (t.diem_nhom ->> 'B')::numeric, (t.diem_nhom ->> 'C')::numeric into d, d2, d3
    from public.tinh_kpi(k1, ch) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '18 Điểm từng nhóm a2: A 76,67 (A3 thiếu nên chia lại), B 90, C 89,10', 'ok',
    abs(d - 76.67) < 0.011 and abs(d2 - 90) < 0.011 and abs(d3 - 89.10) < 0.011);
  select (t.gia_tri ->> 'A1')::numeric, (t.gia_tri ->> 'C2')::numeric into d, d2 from public.tinh_kpi(k1, ch) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '19 A1 a2 = 90 (percentile: nhiều giờ nhất trong nhóm 5 người); C2 a2 = 94 (80×1,1=88 và 100×1,1 chặn ở 100, TB 94)', 'ok',
    abs(d - 90) < 0.011 and abs(d2 - 94) < 0.011);

  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a3;
  res := res || jsonb_build_object('t', '20 KPI a3 = 72,13: thiếu B1 nên trọng số B chia lại cho A và C', 'ok', abs(d - 72.13) < 0.011);
  select (t.trong_so_hieu_luc ->> 'B1') is null and (select sum(v::numeric) from jsonb_each_text(t.trong_so_hieu_luc) e(k, v)) between 99.9 and 100.1
    into ok from public.tinh_kpi(k1, ch) t where t.user_id = a3;
  res := res || jsonb_build_object('t', '21 Trọng số hiệu lực của a3 không có B1 và cộng lại đúng 100%', 'ok', ok);

  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a4;
  res := res || jsonb_build_object('t', '22 KPI a4 = 63,00', 'ok', abs(d - 63.00) < 0.011);
  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a5;
  res := res || jsonb_build_object('t', '23 KPI a5 = 71,43 (chỉ có A1, A2, C3, C1)', 'ok', abs(d - 71.43) < 0.011);

  select t.kpi, t.che_do_a1, t.gio_thuc, t.gio_quy_doi, t.so_bai, t.so_lop into r from public.tinh_kpi(k1, ch) t where t.user_id = a7;
  res := res || jsonb_build_object('t', '24 a7 (TG, nhóm 3 người < ngưỡng 5, chưa có lịch sử): không có A1, KPI 75,08', 'ok',
    abs(r.kpi - 75.08) < 0.011 and r.che_do_a1 is null
    and not exists (select 1 from public.tinh_kpi(k1, ch) t where t.user_id = a7 and (t.gia_tri -> 'A1') is not null));
  res := res || jsonb_build_object('t', '25 a7: 7 giờ thật, 7,2 giờ quy đổi (2+3+2×1,1), 3 Bài / 2 lớp — Bài 01:00 sáng 01/10 (giờ VN) KHÔNG tính vào kỳ 1', 'ok',
    r.gio_thuc = 7 and r.gio_quy_doi = 7.2 and r.so_bai = 3 and r.so_lop = 2);
  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a8;
  res := res || jsonb_build_object('t', '26 KPI a8 = 56,43', 'ok', abs(d - 56.43) < 0.011);

  select t.gio_quy_doi, t.a4_ky, t.a4_luy_ke, t.so_bai, t.so_lop into r from public.tinh_kpi(k1, ch) t where t.user_id = a3;
  res := res || jsonb_build_object('t', '27 a3: 4 giờ × hệ số max(D1 1,0; D2 1,1) × D3 GV 1,1 = 4,84 giờ quy đổi; A4 = 1 lớp không kinh phí (tính 1 lần dù 2 Bài)', 'ok',
    r.gio_quy_doi = 4.84 and r.a4_ky = 1 and r.a4_luy_ke = 1 and r.so_bai = 2 and r.so_lop = 1);
  select t.a4_ky, t.a4_luy_ke into r from public.tinh_kpi(k1, ch) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '28 a2 (chỉ dạy lớp có kinh phí): A4 = 0', 'ok', r.a4_ky = 0 and r.a4_luy_ke = 0);

  -- Biến thể cấu hình: mọi thay đổi chỉ là dữ liệu, không sửa code
  ch2 := jsonb_set(ch, array['d1', nl::text], '1.5');
  select t.gio_quy_doi into d from public.tinh_kpi(k1, ch2) t where t.user_id = a2;
  select t.gio_quy_doi into d2 from public.tinh_kpi(k1, ch2) t where t.user_id = a3;
  res := res || jsonb_build_object('t', '29 D1 = 1,5: a2 = 5×1,5×1,1 = 8,25 giờ; a3 = 4×max(1,5; 1,1)×1,1 = 6,6 giờ (D1 và D2 lấy max, không cộng dồn)', 'ok', d = 8.25 and d2 = 6.6);

  ch2 := jsonb_set(ch, '{tieu_chi}', (
    select jsonb_agg(case when x ->> 'ma' = 'B1' then jsonb_set(x, '{bat}', 'false') else x end) from jsonb_array_elements(ch -> 'tieu_chi') x));
  select t.kpi into d from public.tinh_kpi(k1, ch2) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '30 Tắt B1 (chỉ dữ liệu): a2 = (25×76,67 + 45×89,1) ÷ 70 = 84,66', 'ok', abs(d - 84.66) < 0.011);

  ch2 := jsonb_set(ch, '{tham_so,min_nhom}', '6');
  select t.kpi, t.che_do_a1 into r from public.tinh_kpi(k1, ch2) t where t.user_id = a2;
  res := res || jsonb_build_object('t', '31 Ngưỡng nhóm = 6 (nhóm GV có 5 người) và chưa có lịch sử: a2 mất A1, KPI 79,60', 'ok', abs(r.kpi - 79.60) < 0.011 and r.che_do_a1 is null);

  select t.kpi into d from public.tinh_kpi(k1, ch) t where t.user_id = a7;
  ch2 := jsonb_set(ch, '{tham_so,gop_c}', '1');
  select t.kpi into d2 from public.tinh_kpi(k1, ch2) t where t.user_id = a7;
  res := res || jsonb_build_object('t', '32 Gộp C1 theo số Bài (a7: L1 2 Bài 80%, L2 1 Bài 60%): KPI 75,71 thay vì 75,08 khi trung bình đơn giản', 'ok',
    abs(d - 75.08) < 0.011 and abs(d2 - 75.71) < 0.011);

  -- ===== Quyền: GV/TG =====
  perform pg_temp.vao(a2);
  select count(*) into n from public.kpi_ky(k1);
  res := res || jsonb_build_object('t', '33 GV xem được KPI kỳ Đang mở (realtime, công khai nội bộ): 6 người', 'ok', n = 6);
  select count(*) into n from public.nhom_tieu_chi;
  res := res || jsonb_build_object('t', '34 GV đọc được cấu hình trọng số (minh bạch)', 'ok', n = 3);

  ok := false; begin perform public.luu_ky(null, 'ZZ Test GV', '2030-01-01', '2030-03-31'); exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '35 GV KHÔNG tạo được kỳ', 'ok', ok);
  ok := false; begin perform public.luu_cau_hinh_kpi(pdef); exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '36 GV KHÔNG sửa được cấu hình KPI', 'ok', ok);
  ok := false; begin perform public.doi_trang_thai_ky(k1, 'cho_duyet'); exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '37 GV KHÔNG đổi được trạng thái kỳ', 'ok', ok);
  ok := false; begin perform public.tinh_kpi(k1, pdef); exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '38 GV KHÔNG gọi được engine nội bộ tinh_kpi', 'ok', ok);
  ok := false; begin update public.nhom_tieu_chi set trong_so = 50 where ma = 'A'; exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '39 GV KHÔNG sửa trực tiếp bảng cấu hình', 'ok', ok);
  ok := false; begin insert into public.ket_qua_kpi (ky_id, user_id, kpi, diem_nhom, gia_tri, trong_so_hieu_luc, gio_thuc, gio_quy_doi, so_bai, so_lop, a4_ky, a4_luy_ke)
    values (k1, a2, 100, '{}', '{}', '{}', 0, 0, 0, 0, 0, 0); exception when insufficient_privilege then ok := true; end;
  res := res || jsonb_build_object('t', '40 GV KHÔNG tự ghi kết quả KPI', 'ok', ok);
  execute 'reset role';

  execute 'set local role anon';
  ok := false; begin perform count(*) from public.ket_qua_kpi; exception when insufficient_privilege then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '41 anon KHÔNG đọc được KPI', 'ok', ok);

  -- ===== Vòng đời kỳ + đóng kỳ (snapshot) =====
  perform pg_temp.vao(a1);
  ok := false; begin perform public.doi_trang_thai_ky(k1, 'da_dong'); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '42 Không nhảy thẳng từ Đang mở sang Đã đóng (phải qua Chờ duyệt)', 'ok', ok);

  perform public.doi_trang_thai_ky(k2, 'cho_duyet');
  ok := false; begin perform public.doi_trang_thai_ky(k2, 'da_dong'); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '43 Không đóng kỳ 2 khi kỳ 1 (sớm hơn) chưa đóng', 'ok', ok);
  perform public.doi_trang_thai_ky(k2, 'dang_mo');
  res := res || jsonb_build_object('t', '44 Chờ duyệt quay lại Đang mở được', 'ok', (select trang_thai from public.ky_danh_gia where id = k2) = 'dang_mo');

  perform public.doi_trang_thai_ky(k1, 'cho_duyet');
  select count(*) into n from public.kpi_ky(k1);
  execute 'reset role';
  perform pg_temp.vao(a2);
  select count(*) into d from public.kpi_ky(k1);
  execute 'reset role';
  res := res || jsonb_build_object('t', '45 Kỳ Chờ duyệt: Admin xem được 6 người, GV chưa xem được (chưa công bố)', 'ok', n = 6 and d = 0);

  perform pg_temp.vao(a1);
  j := public.doi_trang_thai_ky(k1, 'da_dong');
  execute 'reset role';
  res := res || jsonb_build_object('t', '46 Đóng kỳ 1: lưu 6 kết quả, chưa sinh đề xuất đổi nhóm (mới 1 kỳ đã đóng)', 'ok',
    (j ->> 'so_ket_qua')::int = 6 and (j ->> 'so_de_xuat_doi_nhom')::int = 0
    and (select count(*) from public.ket_qua_kpi where ky_id = k1) = 6);
  select k.cau_hinh_snapshot -> 'he_so' ->> 'D2', k.dong_luc is not null into tt, ok from public.ky_danh_gia k where k.id = k1;
  res := res || jsonb_build_object('t', '47 Kỳ đã đóng có snapshot cấu hình (D2 = 1,1) và thời điểm đóng', 'ok', tt::numeric = 1.1 and ok);

  -- Đổi cấu hình sau khi đóng: kỳ đã đóng không đổi (không hồi tố)
  select r2.gio_quy_doi, r2.kpi into d, d2 from public.ket_qua_kpi r2 where r2.ky_id = k1 and r2.user_id = a3;
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_kpi(jsonb_set(pdef, '{he_so,D2}', '1.5'));
  select r2.gio_quy_doi, r2.kpi into d3, d4 from public.kpi_ky(k1) r2 where r2.user_id = a3;
  execute 'reset role';
  res := res || jsonb_build_object('t', '48 Đổi D2 sang 1,5 sau khi đóng kỳ 1: kết quả a3 của kỳ 1 giữ nguyên (không hồi tố)', 'ok',
    d3 = d and d = 4.84 and d4 = d2);
  select t.gio_quy_doi into d from public.tinh_kpi(k1, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a3;
  res := res || jsonb_build_object('t', '49 Nhưng cấu hình mới có hiệu lực với tính toán mới (a3 = 4×1,5×1,1 = 6,6 giờ) — tức kỳ sau/kỳ đang mở dùng cấu hình mới', 'ok', d = 6.6);
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_kpi(pdef);
  execute 'reset role';

  perform pg_temp.vao(a1);
  ok := false; begin perform public.doi_trang_thai_ky(k1, 'dang_mo'); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '50 Kỳ đã đóng khóa cứng: không mở lại được', 'ok', ok);
  ok := false; begin perform public.luu_ky(k1, 'ZZ Test đổi tên', '2025-07-01', '2025-09-30'); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '51 Kỳ đã đóng: không sửa được', 'ok', ok);
  ok := false; begin perform public.xoa_ky(k1); exception when check_violation then ok := true; end;
  res := res || jsonb_build_object('t', '52 Kỳ đã đóng: không xóa được', 'ok', ok);
  execute 'reset role';

  perform pg_temp.vao(a2);
  select count(*) into n from public.kpi_ky(k1);
  select count(*) into d from public.kpi_ky(k1) where user_id = a3 and kpi = d2;
  execute 'reset role';
  res := res || jsonb_build_object('t', '53 Kỳ đã đóng: GV xem được kết quả đã công bố', 'ok', n = 6 and d = 1);

  -- KPI kỳ gần nhất phục vụ tie-break matching-score
  select public.kpi_gan_nhat(a2) into d;
  select public.kpi_gan_nhat(a6) into d2;
  res := res || jsonb_build_object('t', '54 kpi_gan_nhat: a2 = 86,26 (kỳ 1 đã đóng); a6 chưa có dữ liệu = null', 'ok', abs(d - 86.26) < 0.011 and d2 is null);

  -- ===== Kỳ 2: fallback lịch sử + tính theo ngày từng buổi =====
  select t.kpi, t.che_do_a1, t.gio_thuc, t.gio_quy_doi, t.so_bai, (t.gia_tri ->> 'A1')::numeric as a1v into r
    from public.tinh_kpi(k2, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a7;
  select r2.gio_quy_doi into d from public.ket_qua_kpi r2 where r2.ky_id = k1 and r2.user_id = a7;
  res := res || jsonb_build_object('t', '55 Kỳ 2: a7 chỉ có 1 Bài (Bài 01:00 sáng 01/10 giờ VN tính đúng vào kỳ 2), nhóm nhỏ nên dùng fallback lịch sử', 'ok',
    r.so_bai = 1 and r.gio_thuc = 2 and r.che_do_a1 = 'lich_su');
  res := res || jsonb_build_object('t', '56 A1 fallback = 50 + 50×(giờ quy đổi kỳ này ÷ giờ quy đổi kỳ trước − 1) = 13,89 (kỳ trước 7,2 giờ, kỳ này 2 giờ)', 'ok',
    abs(r.a1v - greatest(0, least(100, 50 + 50 * (r.gio_quy_doi / d - 1)))) < 0.011 and abs(r.a1v - 13.89) < 0.02);
  res := res || jsonb_build_object('t', '57 KPI a7 kỳ 2 = 79,50 (A: 13,89 và 100; không có B; C 100)', 'ok', abs(r.kpi - 79.50) < 0.02);

  select count(*) into n from public.tinh_kpi(k2, public.cau_hinh_kpi_hien_tai());
  res := res || jsonb_build_object('t', '58 Kỳ 2 chỉ có a7 (a2..a5 không dạy trong kỳ này)', 'ok', n = 1);

  -- ===== Đóng kỳ 2 => đề xuất đổi nhóm =====
  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_ky(k2, 'cho_duyet');
  j := public.doi_trang_thai_ky(k2, 'da_dong');
  execute 'reset role';
  res := res || jsonb_build_object('t', '59 Đóng kỳ 2 (KPI a7 = 75,08 rồi 79,50, đều >= 70 trong 2 kỳ liên tiếp): sinh đúng 1 đề xuất đổi nhóm', 'ok',
    (j ->> 'so_de_xuat_doi_nhom')::int = 1);
  select x.id, x.user_id = a7 and x.loai = 'doi_nhom' and x.nhom_cu = 'tg_bac_si' and x.nhom_moi = 'gv_bac_si' and x.ky_id = k2 and x.trang_thai = 'cho_duyet'
    into dx, ok from public.de_xuat_nhan_su x where x.user_id in (a1, a2, a3, a4, a5, a6, a7, a8, a9);
  res := res || jsonb_build_object('t', '60 Đề xuất: a7 từ Trợ giảng bác sĩ lên Giảng viên bác sĩ (cùng nhánh), gắn với kỳ 2, chờ duyệt', 'ok', ok);
  res := res || jsonb_build_object('t', '61 Chạy rà soát lần nữa không sinh đề xuất trùng (đã có đề xuất chờ duyệt)', 'ok', public.ra_soat_doi_nhom(k2) = 0);

  perform pg_temp.vao(a2);
  select count(*) into n from public.de_xuat_nhan_su;
  execute 'reset role';
  res := res || jsonb_build_object('t', '62 GV KHÔNG đọc được đề xuất nhân sự', 'ok', n = 0);

  -- ===== Duyệt đề xuất: hiệu lực từ kỳ sau =====
  perform pg_temp.vao(a1);
  perform public.xu_ly_de_xuat(dx, true);
  execute 'reset role';
  select (ns.nhom = 'gv_bac_si'), (p.vai_tro_giang_day = 'giang_vien') into ok, ok2 from public.nhan_su_nhom ns join public.profiles p on p.id = ns.user_id where ns.user_id = a7;
  res := res || jsonb_build_object('t', '63 Duyệt đề xuất: a7 thành Giảng viên bác sĩ, vai trò giảng dạy đổi theo', 'ok', ok and ok2);
  res := res || jsonb_build_object('t', '64 Lịch sử đổi nhóm ghi hiệu lực từ 01/01/2026 (đầu kỳ sau), có lý do', 'ok',
    exists (select 1 from public.lich_su_doi_nhom h where h.user_id = a7 and h.nhom_cu = 'tg_bac_si' and h.nhom_moi = 'gv_bac_si'
            and h.ngay_hieu_luc = '2026-01-01' and h.ly_do is not null));
  res := res || jsonb_build_object('t', '65 nhom_tai_ngay: a7 vẫn là TG bác sĩ ở 31/12/2025, là GV bác sĩ từ 01/01/2026', 'ok',
    public.nhom_tai_ngay(a7, '2025-12-31') = 'tg_bac_si' and public.nhom_tai_ngay(a7, '2026-01-01') = 'gv_bac_si');
  select t.che_do_a1 into tt from public.tinh_kpi(k2, public.cau_hinh_kpi_hien_tai()) t where t.user_id = a7;
  res := res || jsonb_build_object('t', '66 Tính lại kỳ 2 sau khi đổi nhóm: a7 vẫn xếp theo nhóm cũ (nhóm 3 người => fallback), kỳ đang tính dở dùng nhóm cũ', 'ok', tt = 'lich_su');

  -- Đề xuất duyệt xong không xử lý lại được
  perform pg_temp.vao(a1);
  ok := false; begin perform public.xu_ly_de_xuat(dx, true); exception when no_data_found then ok := true; end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '67 Đề xuất đã xử lý không duyệt lại được', 'ok', ok);

  -- ===== Khôi phục cấu hình ban đầu =====
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_kpi(porig);
  execute 'reset role';
  res := res || jsonb_build_object('t', '68 Đã khôi phục cấu hình KPI ban đầu (trọng số nhóm, D2, ngưỡng đổi nhóm)', 'ok',
    public.cau_hinh_kpi_hien_tai() = orig);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
