-- Test tự kiểm tra "Chứng chỉ yêu cầu theo vai trò" (migration 20261101100000_chung_chi_theo_vai_tro.sql).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20261101100000 (và mọi migration trước).
-- Script tự tạo 5 user giả (@qldt.test) + lớp "ZZ TestCCVT..." + 2 loại chứng chỉ "ZZ TestCCVT ...", kiểm tra rồi xóa sạch,
-- kể cả thông báo phát sinh trong lúc chạy thử (xóa mọi thông báo tạo từ lúc bắt đầu script).
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   d1 Admin | d2 GV bác sĩ có BLS | d3 GV bác sĩ KHÔNG có BLS | d4 TG bác sĩ không chứng chỉ | d5 TG bác sĩ có ACLS
--   Lớp L1 Đang mở: Giảng viên cần BLS, Trợ giảng không cần (sau đó thêm: Trợ giảng cần ACLS)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ TestCCVT%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ TestCCVT%');
  delete from public.lop_hoc where ten like 'ZZ TestCCVT%';
  delete from public.chung_chi where user_id in (
    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
    '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5');
  delete from public.danh_muc_loai_chung_chi where ten like 'ZZ TestCCVT%';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
    '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
    '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5');
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
    '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5');
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
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000d' || i)::uuid, 'authenticated', 'authenticated',
       'ccvt' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 5) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000d1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000d2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000d3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000d4', 'tg_bac_si'),
  ('00000000-0000-0000-0000-0000000000d5', 'tg_bac_si');

do $$
declare
  d1 uuid := '00000000-0000-0000-0000-0000000000d1';
  d2 uuid := '00000000-0000-0000-0000-0000000000d2';
  d3 uuid := '00000000-0000-0000-0000-0000000000d3';
  d4 uuid := '00000000-0000-0000-0000-0000000000d4';
  d5 uuid := '00000000-0000-0000-0000-0000000000d5';
  res jsonb := '[]';
  n int;
  ok boolean;
  nl uuid; bls uuid; acls uuid;
  l1 uuid; l2 uuid; b1 uuid;
  goc timestamptz := date_trunc('hour', now()) + interval '5 days';
  nhom_arr public.nhom_nhan_su[] := array['gv_bac_si', 'tg_bac_si']::public.nhom_nhan_su[];
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  insert into public.danh_muc_loai_chung_chi (ten) values ('ZZ TestCCVT BLS') returning id into bls;
  insert into public.danh_muc_loai_chung_chi (ten) values ('ZZ TestCCVT ACLS') returning id into acls;
  insert into public.chung_chi (user_id, loai_id) values (d2, bls), (d5, acls);

  -- ===== L1 Đang mở: Giảng viên cần BLS, Trợ giảng không cần =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestCCVT L1', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'dang_mo') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si'), (l1, 'tg_bac_si');
  insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, vai_tro, loai_id) values (l1, 'giang_vien', bls);
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 1, 'Bài 1', goc, goc + interval '2 hours') returning id into b1;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b1, 'tro_giang', 1);

  res := res || jsonb_build_object('t', '01 GV có BLS đủ điều kiện slot Giảng viên', 'ok',
    public.ly_do_khong_du_dieu_kien(d2, b1, 'giang_vien') is null);
  res := res || jsonb_build_object('t', '02 GV thiếu BLS bị chặn ở slot Giảng viên, lý do nêu tên chứng chỉ', 'ok',
    coalesce(public.ly_do_khong_du_dieu_kien(d3, b1, 'giang_vien'), '') = 'Thiếu chứng chỉ yêu cầu: ZZ TestCCVT BLS');
  res := res || jsonb_build_object('t', '03 TG không có BLS vẫn đủ điều kiện slot Trợ giảng (BLS chỉ yêu cầu Giảng viên)', 'ok',
    public.ly_do_khong_du_dieu_kien(d4, b1, 'tro_giang') is null);

  select count(*) into n from public.goi_y_core(l1, null, null, false) g
  where (g.vai_tro = 'giang_vien' and g.user_id = d2) or (g.vai_tro = 'tro_giang' and g.user_id in (d4, d5));
  ok := n = 3 and not exists (
    select 1 from public.goi_y_core(l1, null, null, false) g where g.vai_tro = 'giang_vien' and g.user_id = d3);
  res := res || jsonb_build_object('t', '04 Gợi ý: Giảng viên chỉ có người có BLS; Trợ giảng gồm cả người không có BLS', 'ok', ok);

  select count(*) into n from public.nguoi_du_dieu_kien_lop(l1) q where q.id in (d2, d4, d5);
  ok := n = 3 and not exists (select 1 from public.nguoi_du_dieu_kien_lop(l1) q where q.id = d3);
  res := res || jsonb_build_object('t', '05 Thông báo lớp/Bài mới: GV có BLS + mọi TG nhận, GV thiếu BLS không nhận', 'ok', ok);

  -- ===== Thêm yêu cầu riêng cho Trợ giảng: ACLS =====
  insert into public.lop_hoc_chung_chi_yeu_cau (lop_id, vai_tro, loai_id) values (l1, 'tro_giang', acls);
  res := res || jsonb_build_object('t', '06 TG có ACLS đủ điều kiện, TG không có ACLS bị chặn', 'ok',
    public.ly_do_khong_du_dieu_kien(d5, b1, 'tro_giang') is null
    and coalesce(public.ly_do_khong_du_dieu_kien(d4, b1, 'tro_giang'), '') = 'Thiếu chứng chỉ yêu cầu: ZZ TestCCVT ACLS');
  res := res || jsonb_build_object('t', '07 Yêu cầu ACLS của Trợ giảng không ảnh hưởng Giảng viên (GV có BLS, không có ACLS vẫn đủ)', 'ok',
    public.ly_do_khong_du_dieu_kien(d2, b1, 'giang_vien') is null);
  ok := exists (select 1 from public.goi_y_core(l1, null, null, false) g where g.vai_tro = 'tro_giang' and g.user_id = d5)
    and not exists (select 1 from public.goi_y_core(l1, null, null, false) g where g.vai_tro = 'tro_giang' and g.user_id = d4);
  res := res || jsonb_build_object('t', '08 Gợi ý Trợ giảng lọc theo ACLS', 'ok', ok);

  -- ===== Lưu lớp qua luu_lop_hoc (Admin) =====
  perform pg_temp.vao(d1);
  l2 := public.luu_lop_hoc(null, 'ZZ TestCCVT L2', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, null, true,
    nhom_arr, array[bls], array[]::uuid[]);
  execute 'reset role';
  select count(*) into n from public.lop_hoc_chung_chi_yeu_cau where lop_id = l2;
  ok := n = 1 and exists (select 1 from public.lop_hoc_chung_chi_yeu_cau where lop_id = l2 and vai_tro = 'giang_vien' and loai_id = bls);
  res := res || jsonb_build_object('t', '09 luu_lop_hoc 2 mảng: chỉ ghi BLS cho Giảng viên', 'ok', ok);

  perform pg_temp.vao(d1);
  perform public.luu_lop_hoc(l2, 'ZZ TestCCVT L2', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, null, true,
    nhom_arr, array[]::uuid[], array[acls, acls]);
  execute 'reset role';
  select count(*) into n from public.lop_hoc_chung_chi_yeu_cau where lop_id = l2;
  ok := n = 1 and exists (select 1 from public.lop_hoc_chung_chi_yeu_cau where lop_id = l2 and vai_tro = 'tro_giang' and loai_id = acls);
  res := res || jsonb_build_object('t', '10 Sửa lớp thay toàn bộ yêu cầu cũ (trùng lặp trong mảng chỉ ghi 1 lần)', 'ok', ok);

  perform pg_temp.vao(d1);
  perform public.luu_lop_hoc(l2, 'ZZ TestCCVT L2', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, null, true,
    nhom_arr, array[bls]);
  execute 'reset role';
  select count(*) into n from public.lop_hoc_chung_chi_yeu_cau where lop_id = l2 and loai_id = bls;
  res := res || jsonb_build_object('t', '11 Bản cũ 1 mảng (web chưa cập nhật) áp chứng chỉ cho cả 2 vai trò', 'ok', n = 2);

  perform pg_temp.vao(d3);
  ok := true;
  begin
    perform public.luu_lop_hoc(null, 'ZZ TestCCVT GV tao', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, null, true,
      nhom_arr, array[]::uuid[], array[]::uuid[]);
    ok := false;
  exception when others then ok := true;
  end;
  select count(*) into n from public.lop_hoc_chung_chi_yeu_cau where lop_id = l1 and vai_tro = 'giang_vien';
  execute 'reset role';
  res := res || jsonb_build_object('t', '12 GV không tạo được lớp; vẫn đọc được chứng chỉ yêu cầu theo vai trò của lớp', 'ok', ok and n = 1);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
