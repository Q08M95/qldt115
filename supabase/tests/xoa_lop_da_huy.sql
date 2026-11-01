-- Test tự kiểm tra "Xóa lớp đã hủy + báo người liên quan khi xóa lớp Dự kiến" (migration 20261101110000_xoa_lop_da_huy.sql).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20261101110000 (và mọi migration trước).
-- Script tự tạo 4 user giả (@qldt.test) + các lớp "ZZ TestXoa...", kiểm tra rồi xóa sạch, kể cả thông báo và nhật ký
-- phát sinh trong lúc chạy thử (xóa mọi thông báo/nhật ký tạo từ lúc bắt đầu script).
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   f1 Admin | f2 GV có lời mời đang chờ | f3 GV đã được phân công | f4 GV không liên quan
--   L1 Dự kiến công khai sớm (có lời mời + phân công) | L2 Đang mở | L3 Đã hoàn thành | L4 Đã hủy (có phân công, thông báo cũ)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.dang_ky_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ TestXoa%');
  delete from public.slot_giang_day where bai_id in (
    select b.id from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where l.ten like 'ZZ TestXoa%');
  delete from public.bai_hoc where lop_id in (select id from public.lop_hoc where ten like 'ZZ TestXoa%');
  delete from public.lop_hoc where ten like 'ZZ TestXoa%';
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4');
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from public.audit_log where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4');
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
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000f' || i)::uuid, 'authenticated', 'authenticated',
       'xoalop' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 4) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000f1';
insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000f2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000f3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000f4', 'gv_bac_si');

do $$
declare
  f1 uuid := '00000000-0000-0000-0000-0000000000f1';
  f2 uuid := '00000000-0000-0000-0000-0000000000f2';
  f3 uuid := '00000000-0000-0000-0000-0000000000f3';
  f4 uuid := '00000000-0000-0000-0000-0000000000f4';
  res jsonb := '[]';
  n int;
  ok boolean;
  nl uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  b1 uuid; b4 uuid; s1 uuid; s4 uuid; moi uuid;
  goc timestamptz := date_trunc('hour', now()) + interval '6 days';
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;

  -- ===== L1 Dự kiến công khai sớm: f2 có lời mời đang chờ, f3 đã được phân công =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai, cong_khai_som)
  values ('ZZ TestXoa L1', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'nhap', true) returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si');
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l1, 1, 'Bài 1', goc, goc + interval '2 hours') returning id into b1;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b1, 'giang_vien', 1), (b1, 'giang_vien', 2);
  select id into s1 from public.slot_giang_day where bai_id = b1 and vi_tri = 1;
  update public.slot_giang_day set nguoi_phan_cong = f3, trang_thai = 'da_phan_cong' where id = s1;
  insert into public.dang_ky_giang_day (bai_id, vai_tro, user_id, loai, nguoi_moi)
  values (b1, 'giang_vien', f2, 'duoc_moi', f1) returning id into moi;

  -- ===== L2 Đang mở, L3 Đã hoàn thành =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestXoa L2', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'dang_mo') returning id into l2;
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestXoa L3', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'da_hoan_thanh') returning id into l3;

  -- ===== L4 Đã hủy: f3 từng được phân công, đã có thông báo cũ trỏ tới trang lớp =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ TestXoa L4', nl, 'nhan_vien_y_te', 'co_kinh_phi', (goc)::date, (goc)::date, 'dang_mo') returning id into l4;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc)
  values (l4, 1, 'Bài 1', goc + interval '3 hours', goc + interval '5 hours') returning id into b4;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values (b4, 'giang_vien', 1) returning id into s4;
  update public.slot_giang_day set nguoi_phan_cong = f3, trang_thai = 'da_phan_cong' where id = s4;
  perform pg_temp.vao(f1);
  perform public.doi_trang_thai_lop(l4, 'da_huy');
  execute 'reset role';

  -- Thông báo lời mời "cần hành động" của f2 đã có trước khi xóa
  select count(*) into n from public.thong_bao where user_id = f2 and loai = 'duoc_moi' and not da_doc and khoa = 'loi_moi:' || moi;
  res := res || jsonb_build_object('t', '00 (chuẩn bị) f2 có thông báo "Bạn được mời dạy" chưa đọc', 'ok', n = 1);

  -- ===== GV không xóa được =====
  perform pg_temp.vao(f4);
  ok := false;
  begin
    perform public.xoa_lop_hoc(l4);
  exception when others then ok := true;
  end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '01 GV không xóa được lớp', 'ok', ok and exists (select 1 from public.lop_hoc where id = l4));

  -- ===== Không xóa được lớp Đang mở / Đã hoàn thành =====
  perform pg_temp.vao(f1);
  ok := false;
  begin
    perform public.xoa_lop_hoc(l2);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '02 Không xóa được lớp Đang mở (phải hủy trước)', 'ok', ok);
  ok := false;
  begin
    perform public.xoa_lop_hoc(l3);
  exception when others then ok := true;
  end;
  res := res || jsonb_build_object('t', '03 Không xóa được lớp Đã hoàn thành', 'ok', ok);

  -- ===== Xóa lớp Dự kiến có lời mời + phân công =====
  perform public.xoa_lop_hoc(l1);
  execute 'reset role';
  res := res || jsonb_build_object('t', '04 Xóa được lớp Dự kiến (kèm Bài, slot, lời mời)', 'ok',
    not exists (select 1 from public.lop_hoc where id = l1) and not exists (select 1 from public.dang_ky_giang_day where id = moi));
  select count(*) into n from public.thong_bao
  where user_id in (f2, f3) and loai = 'huy_lop' and tieu_de = 'Lớp đã bị hủy' and noi_dung like '%ZZ TestXoa L1%' and lien_ket = '/lop-hoc';
  res := res || jsonb_build_object('t', '05 Người có lời mời chờ + người được phân công nhận "Lớp đã bị hủy" (link về danh sách lớp)', 'ok', n = 2);
  select count(*) into n from public.thong_bao where user_id in (f1, f4) and loai = 'huy_lop' and noi_dung like '%ZZ TestXoa L1%';
  res := res || jsonb_build_object('t', '06 Người không liên quan và người xóa không nhận thông báo', 'ok', n = 0);
  select count(*) into n from public.thong_bao where user_id = f2 and loai = 'duoc_moi' and not da_doc and khoa = 'loi_moi:' || moi;
  res := res || jsonb_build_object('t', '07 Thông báo "Bạn được mời dạy" của lớp đã xóa hết hiệu lực ngay', 'ok', n = 0);
  select count(*) into n from public.audit_log where loai = 'xoa_lop' and doi_tuong = 'Lớp ZZ TestXoa L1' and created_at >= (select tu from pg_temp.moc);
  res := res || jsonb_build_object('t', '08 Nhật ký hệ thống ghi "Xóa lớp" lớp Dự kiến', 'ok', n = 1);

  -- ===== Xóa lớp Đã hủy =====
  select count(*) into n from public.thong_bao where user_id = f3 and loai = 'huy_lop' and lien_ket = '/lop-hoc/' || l4;
  res := res || jsonb_build_object('t', '09 (chuẩn bị) Hủy lớp L4 đã báo f3, link tới trang lớp', 'ok', n = 1);
  perform pg_temp.vao(f1);
  ok := true;
  begin
    perform public.xoa_lop_hoc(l4);
  exception when others then ok := false;
  end;
  execute 'reset role';
  res := res || jsonb_build_object('t', '10 Xóa được lớp Đã hủy', 'ok', ok and not exists (select 1 from public.lop_hoc where id = l4));
  select count(*) into n from public.thong_bao where user_id = f3 and noi_dung like '%ZZ TestXoa L4%';
  res := res || jsonb_build_object('t', '11 Xóa lớp đã hủy không báo lại (đã báo lúc hủy)', 'ok', n = 1);
  select count(*) into n from public.thong_bao where lien_ket = '/lop-hoc/' || l4;
  res := res || jsonb_build_object('t', '12 Thông báo cũ trỏ tới lớp đã xóa được chuyển về danh sách Lớp học', 'ok',
    n = 0 and exists (select 1 from public.thong_bao where user_id = f3 and noi_dung like '%ZZ TestXoa L4%' and lien_ket = '/lop-hoc'));
  select count(*) into n from public.audit_log where loai = 'xoa_lop' and doi_tuong = 'Lớp ZZ TestXoa L4' and created_at >= (select tu from pg_temp.moc);
  res := res || jsonb_build_object('t', '13 Nhật ký hệ thống ghi "Xóa lớp" lớp đã hủy (lịch sử hủy lớp vẫn còn)', 'ok',
    n = 1 and exists (select 1 from public.audit_log where loai = 'huy_lop' and doi_tuong like '%ZZ TestXoa L4%' and created_at >= (select tu from pg_temp.moc)));

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
