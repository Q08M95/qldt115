-- Test tự kiểm tra Giai đoạn 9 (Nhật ký hệ thống: ghi log đúng, giá trị trước/sau, nhãn tự duyệt, phân quyền xem, chỉ-thêm).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20260926100000 (và các migration trước).
-- Script tự tạo 5 user giả (@qldt.test) + lớp "ZZ Test9..." + 1 kỳ thử NĂM 2025, kiểm tra rồi xóa sạch, kể cả các dòng nhật ký và thông báo
-- phát sinh trong lúc chạy thử (xóa mọi dòng tạo từ lúc bắt đầu script). Script tạm đổi 2 cấu hình điểm danh/rubric và khôi phục ở cuối.
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết.
--
--   a1 Admin (cũng là Giảng viên bác sĩ, để thử tự duyệt) | a2, a3 Giảng viên bác sĩ | a4 Trợ giảng bác sĩ | a5 Quản lý lớp (được gán trong lúc thử)

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.ky_danh_gia where ten like 'ZZ Test%';
  delete from public.de_xuat_nhan_su where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.danh_gia_du_gio where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.diem_danh_bai where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
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
  delete from public.lich_su_doi_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  delete from public.nhan_su_nhom where user_id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
  -- Nhật ký và thông báo phát sinh trong lúc chạy thử (kể cả cho Admin thật)
  delete from public.audit_log where created_at >= (select tu from pg_temp.moc);
  delete from public.thong_bao where created_at >= (select tu from pg_temp.moc);
  delete from auth.users where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5');
end;
$$;

drop table if exists pg_temp.moc;
create temp table moc as select now() as tu;
call pg_temp.don_dep();
-- Chỉ gồm nhật ký phát sinh từ lúc chạy thử (để log thật đã có không làm sai kết quả). Khối chạy dưới vai trò người dùng đọc bảng thật để RLS áp dụng.
create or replace temp view nk as select * from public.audit_log where created_at >= (select tu from pg_temp.moc);
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);

-- Đăng nhập giả lập: đặt người dùng + vai trò authenticated; ra() trả về quyền cao và XÓA người dùng (để thao tác dữ liệu nền không bị ghi log)
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
-- Chỉ đặt người dùng (giữ quyền cao) để thử các thay đổi dữ liệu mà API không cho làm trực tiếp
create or replace function pg_temp.la(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
end;
$$;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', ('00000000-0000-0000-0000-0000000000a' || i)::uuid, 'authenticated', 'authenticated',
       'u' || i || '@qldt.test', '{}', '{}', now(), now()
from generate_series(1, 5) i;

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.nhan_su_nhom (user_id, nhom) values
  ('00000000-0000-0000-0000-0000000000a1', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a2', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a3', 'gv_bac_si'),
  ('00000000-0000-0000-0000-0000000000a4', 'tg_bac_si');

do $$
declare
  a1 uuid := '00000000-0000-0000-0000-0000000000a1';
  a2 uuid := '00000000-0000-0000-0000-0000000000a2';
  a3 uuid := '00000000-0000-0000-0000-0000000000a3';
  a4 uuid := '00000000-0000-0000-0000-0000000000a4';
  a5 uuid := '00000000-0000-0000-0000-0000000000a5';
  res jsonb := '[]';
  n int;
  n2 int;
  n3 int;
  ok boolean;
  ok2 boolean;
  ok3 boolean;
  nl uuid;
  l1 uuid; l2 uuid;
  b1 uuid; b2 uuid; b3 uuid; bR uuid; bP uuid;
  inv uuid; inv2 uuid; reg uuid; sl uuid; dx uuid; kk uuid; lcc uuid;
  r record;
  o_max numeric;
  o_rubric jsonb;
  so_admin int;
  v_tu timestamptz := (select tu from pg_temp.moc);
begin
  select id into nl from public.danh_muc_nhom_lop order by thu_tu limit 1;
  select id into lcc from public.danh_muc_loai_chung_chi order by thu_tu limit 1;
  select gia_tri into o_max from public.cau_hinh_he_thong where khoa = 'b1_tre_toi_da_phut';
  select jsonb_object_agg(muc::text, jsonb_build_object('ten', ten, 'mo_ta', mo_ta)) into o_rubric from public.rubric_du_gio;

  -- ===== Dữ liệu nền (chèn trực tiếp, không có người đăng nhập => không ghi log) =====
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test9 Lớp 1', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date + 2, current_date + 9, 'dang_mo') returning id into l1;
  insert into public.lop_hoc_nhom_du_dieu_kien (lop_id, nhom) values (l1, 'gv_bac_si'), (l1, 'tg_bac_si');
  insert into public.lop_hoc (ten, nhom_lop_id, doi_tuong, loai_kinh_phi, ngay_bat_dau, ngay_ket_thuc, trang_thai)
  values ('ZZ Test9 Lớp 2', nl, 'nhan_vien_y_te', 'co_kinh_phi', current_date - 1, current_date + 1, 'dang_mo') returning id into l2;

  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 1, 'Bài 1', now() + interval '2 days', now() + interval '2 days 2 hours') returning id into b1;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 2, 'Bài 2', now() + interval '4 days', now() + interval '4 days 2 hours') returning id into b2;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l1, 3, 'Bài 3', now() + interval '6 days', now() + interval '6 days 2 hours') returning id into b3;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri) values
    (b1, 'giang_vien', 1), (b1, 'giang_vien', 2), (b1, 'tro_giang', 1), (b2, 'giang_vien', 1), (b3, 'giang_vien', 1);
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 1, 'Bài P', now() - interval '4 hours', now() - interval '2 hours') returning id into bP;
  insert into public.bai_hoc (lop_id, thu_tu, ten, bat_dau, ket_thuc) values (l2, 2, 'Bài R', now() + interval '20 minutes', now() + interval '2 hours') returning id into bR;
  insert into public.slot_giang_day (bai_id, vai_tro, vi_tri, trang_thai, nguoi_phan_cong) values
    (bP, 'giang_vien', 1, 'da_phan_cong', a2), (bR, 'giang_vien', 1, 'da_phan_cong', a2);

  res := res || jsonb_build_object('t', '01 Dữ liệu nền chèn khi không có người đăng nhập (seed/job) không sinh dòng nhật ký', 'ok', not exists (select 1 from pg_temp.nk));

  -- ===== Mời / trả lời lời mời =====
  perform pg_temp.vao(a1);
  inv := public.moi_giang_day(b1, 'giang_vien', a3);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'moi_giang_day' and nguoi_thuc_hien = a1 and nguoi_lien_quan = array[a3] and nguoi_thuc_hien_ten is not null and mo_ta like 'Mời %';
  res := res || jsonb_build_object('t', '02 Admin mời dạy: đúng 1 dòng nhật ký (người thực hiện + tên, người liên quan, mô tả)', 'ok', n = 1);

  perform pg_temp.vao(a3);
  perform public.phan_hoi_loi_moi(inv, true);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'phan_hoi_loi_moi' and nguoi_thuc_hien = a3 and sau ->> 'trang_thai' = 'dong_y';
  res := res || jsonb_build_object('t', '03 Người được mời đồng ý: 1 dòng, người thực hiện là chính họ', 'ok', n = 1);

  perform pg_temp.vao(a1);
  inv2 := public.moi_giang_day(b1, 'tro_giang', a4);
  perform public.thu_hoi_loi_moi(inv2);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'thu_hoi_loi_moi' and nguoi_lien_quan = array[a4];
  res := res || jsonb_build_object('t', '04 Admin thu hồi lời mời: 1 dòng thu hồi', 'ok', n = 1);

  -- ===== Duyệt / từ chối / tự duyệt =====
  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b2]);
  perform pg_temp.ra();
  select id into reg from public.dang_ky_giang_day where user_id = a2 and bai_id = b2;
  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(reg, true);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk
  where loai = 'duyet_dang_ky' and nguoi_thuc_hien = a1 and nguoi_lien_quan = array[a2] and not tu_duyet
    and truoc ->> 'trang_thai' = 'cho_xu_ly' and sau ->> 'trang_thai' = 'da_duyet';
  res := res || jsonb_build_object('t', '05 Duyệt đăng ký: đúng 1 dòng, có trạng thái trước/sau, không gắn nhãn tự duyệt', 'ok', n = 1);

  perform pg_temp.vao(a2);
  perform public.dang_ky_bai(array[b3]);
  perform pg_temp.ra();
  select id into reg from public.dang_ky_giang_day where user_id = a2 and bai_id = b3;
  perform pg_temp.vao(a1);
  perform public.tu_choi_dang_ky(reg, 'Trùng kế hoạch');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'tu_choi_dang_ky' and nguoi_lien_quan = array[a2] and ly_do = 'Trùng kế hoạch';
  res := res || jsonb_build_object('t', '06 Từ chối đăng ký: 1 dòng kèm lý do', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.dang_ky_bai(array[b3]);
  perform pg_temp.ra();
  select id into reg from public.dang_ky_giang_day where user_id = a1 and bai_id = b3;
  perform pg_temp.vao(a1);
  perform public.duyet_dang_ky(reg, true);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'duyet_dang_ky' and nguoi_thuc_hien = a1 and nguoi_lien_quan = array[a1] and tu_duyet and mo_ta like '%tự duyệt%';
  res := res || jsonb_build_object('t', '07 Admin tự duyệt đăng ký của chính mình: dòng log gắn nhãn tự duyệt', 'ok', n = 1);

  -- ===== Hủy phân công =====
  select id into sl from public.slot_giang_day where bai_id = b2 and nguoi_phan_cong = a2;
  perform pg_temp.vao(a1);
  perform public.huy_phan_cong(sl, 'Đổi kế hoạch');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'huy_phan_cong' and nguoi_lien_quan = array[a2] and ly_do = 'Đổi kế hoạch'
    and (sau ->> 'nguoi_phan_cong') is null and (truoc ->> 'nguoi_phan_cong') is not null;
  res := res || jsonb_build_object('t', '08 Hủy phân công: 1 dòng kèm lý do và người bị hủy (trước có tên, sau rỗng)', 'ok', n = 1);
  update public.slot_giang_day set trang_thai = 'da_phan_cong', nguoi_phan_cong = a2 where id = sl;

  -- ===== Đề xuất nhân sự + đổi nhóm (không lộ nhãn nhóm cho GV/TG) =====
  insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi) values ('doi_nhom', a4, 'Thăng theo KPI', 'tg_bac_si', 'gv_bac_si') returning id into dx;
  perform pg_temp.vao(a1);
  perform public.xu_ly_de_xuat(dx, true);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'xu_ly_de_xuat' and nguoi_lien_quan = array[a4] and mo_ta like 'Duyệt%'
    and mo_ta not ilike '%bác sĩ%' and coalesce(truoc::text, '') not like '%bac_si%' and coalesce(sau::text, '') not like '%bac_si%';
  res := res || jsonb_build_object('t', '09 Duyệt đề xuất đổi nhóm: 1 dòng cho người liên quan, KHÔNG chứa tên nhóm', 'ok', n = 1);
  select count(*), bool_and(nguoi_lien_quan = '{}' and truoc ->> 'nhom' = 'tg_bac_si' and sau ->> 'nhom' = 'gv_bac_si') into n, ok
  from pg_temp.nk where loai = 'doi_nhom';
  res := res || jsonb_build_object('t', '10 Đổi nhóm: dòng log riêng (nhóm cũ/mới) và để trống người liên quan => chỉ quản trị xem', 'ok', n = 1 and ok);

  -- ===== Phân quyền xem =====
  perform pg_temp.vao(a4);
  select count(*), bool_and(a4 = any (nguoi_lien_quan)),
         count(*) filter (where loai in ('doi_nhom', 'doi_cau_hinh')),
         count(*) filter (where coalesce(truoc::text, '') || coalesce(sau::text, '') || mo_ta like '%gv_bac_si%' or coalesce(truoc::text, '') || coalesce(sau::text, '') like '%tg_bac_si%')
  into n, ok, n2, n3 from public.audit_log;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '11 GV/TG (a4) chỉ thấy dòng có tên mình; không thấy dòng đổi nhóm/cấu hình; không dòng nào lộ nhãn nhóm', 'ok', n >= 2 and ok and n2 = 0 and n3 = 0);

  perform pg_temp.vao(a2);
  select count(*), bool_and(a2 = any (nguoi_lien_quan)) into n, ok from public.audit_log;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '12 GV (a2) thấy log duyệt/từ chối/hủy phân công của mình (>= 3 dòng) và không thấy dòng của người khác', 'ok', n >= 3 and ok);

  perform pg_temp.vao(a1);
  select count(*) into so_admin from public.audit_log where created_at >= v_tu;
  select count(*) into n from public.audit_log where loai = 'doi_nhom' and created_at >= v_tu;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '13 Admin xem toàn bộ nhật ký, gồm cả dòng đổi nhóm', 'ok', so_admin >= 9 and n = 1);

  -- ===== Cấu hình: giá trị cũ/mới =====
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh('{"b1_tre_toi_da_phut": 20}');
  perform public.luu_cau_hinh_diem_danh('{"b1_tre_toi_da_phut": 20}');
  perform pg_temp.ra();
  select count(*), bool_and((truoc ->> 'gia_tri')::numeric = o_max and (sau ->> 'gia_tri')::numeric = 20 and loai = 'doi_cau_hinh')
  into n, ok from pg_temp.nk where doi_tuong like '%b1_tre_toi_da_phut' and created_at >= v_tu;
  res := res || jsonb_build_object('t', '14 Đổi cấu hình: 1 dòng có giá trị cũ và mới; lưu lại đúng giá trị cũ không tạo thêm dòng', 'ok', n = 1 and ok);

  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh('{"rubric": {"80": {"ten": "Khá ZZ", "mo_ta": "Mô tả thử"}}}');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'doi_cau_hinh' and doi_tuong like 'Rubric%' and truoc ->> 'ten' = 'Tốt' and sau ->> 'ten' = 'Khá ZZ';
  res := res || jsonb_build_object('t', '15 Đổi rubric dự giờ: ghi tên cũ/mới', 'ok', n = 1);

  perform pg_temp.vao(a2);
  select count(*) into n from public.audit_log where loai = 'doi_cau_hinh';
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '16 GV/TG không thấy nhật ký thay đổi cấu hình hệ thống', 'ok', n = 0);

  -- ===== Trạng thái tham gia + Quyền Quản lý lớp =====
  perform pg_temp.vao(a1);
  perform public.dat_trang_thai_tham_gia(a4, 'tam_ngung');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'doi_trang_thai_tham_gia' and nguoi_lien_quan = array[a4]
    and truoc ->> 'trang_thai_tham_gia' = 'dang_tham_gia' and sau ->> 'trang_thai_tham_gia' = 'tam_ngung';
  res := res || jsonb_build_object('t', '17 Đổi trạng thái tham gia: 1 dòng trước/sau', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.gan_quyen_quan_ly_lop(a5, true);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'gan_quyen_quan_ly_lop' and nguoi_lien_quan = array[a5] and mo_ta like 'Gán%' and (sau ->> 'co_quyen_quan_ly_lop')::boolean;
  res := res || jsonb_build_object('t', '18 Gán Quyền Quản lý lớp: 1 dòng nhật ký', 'ok', n = 1);

  perform pg_temp.vao(a5);
  select count(*) into n from public.audit_log where created_at >= v_tu;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '19 Người giữ Quyền Quản lý lớp xem toàn bộ nhật ký như Admin', 'ok', n >= so_admin);

  perform pg_temp.vao(a1);
  perform public.gan_quyen_quan_ly_lop(a5, false);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'gan_quyen_quan_ly_lop' and mo_ta like 'Thu hồi%' and nguoi_lien_quan = array[a5];
  res := res || jsonb_build_object('t', '20 Thu hồi Quyền Quản lý lớp: 1 dòng nhật ký', 'ok', n = 1);

  -- ===== Sửa hồ sơ của người khác (tự sửa không ghi) =====
  perform pg_temp.vao(a1);
  update public.profiles set so_dien_thoai = '0909000111' where id = a2;
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'sua_ho_so' and nguoi_lien_quan = array[a2] and sau ->> 'so_dien_thoai' = '0909000111' and truoc ->> 'so_dien_thoai' is null;
  perform pg_temp.vao(a2);
  update public.profiles set so_dien_thoai = '0909000222' where id = a2;
  perform pg_temp.ra();
  select count(*) into n2 from pg_temp.nk where loai = 'sua_ho_so' and nguoi_lien_quan = array[a2];
  res := res || jsonb_build_object('t', '21 Admin sửa hồ sơ người khác: 1 dòng (chỉ trường đổi); người đó tự sửa hồ sơ mình thì không ghi', 'ok', n = 1 and n2 = 1);

  perform pg_temp.vao(a1);
  insert into public.chung_chi (user_id, loai_id, so_chung_chi, noi_dung) values (a2, lcc, 'ZZ-001', 'Thử');
  perform pg_temp.ra();
  perform pg_temp.vao(a2);
  insert into public.chung_chi (user_id, loai_id, so_chung_chi, noi_dung) values (a2, lcc, 'ZZ-002', 'Tự thêm');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'sua_ho_so' and mo_ta like 'Thêm chứng chỉ%' and nguoi_lien_quan = array[a2];
  res := res || jsonb_build_object('t', '22 Admin thêm chứng chỉ cho người khác: có log; người đó tự thêm cho mình: không log', 'ok', n = 1);

  -- ===== Điểm danh chỉnh tay + dự giờ =====
  perform pg_temp.vao(a1);
  perform public.chinh_diem_danh(bP, a2, 80, 'Lỗi kỹ thuật khi check-in');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'sua_diem_danh' and nguoi_lien_quan = array[a2] and ly_do = 'Lỗi kỹ thuật khi check-in'
    and (sau ->> 'b1_phan_tram')::numeric = 80 and (truoc ->> 'b1_phan_tram') is null;
  res := res || jsonb_build_object('t', '23 Admin chỉnh tay điểm danh: 1 dòng có lý do, B1 trước/sau', 'ok', n = 1);

  perform pg_temp.vao(a2);
  perform public.check_in_bai(bR);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'sua_diem_danh';
  res := res || jsonb_build_object('t', '24 Tự check-in bình thường không ghi log chỉnh sửa', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.luu_danh_gia_du_gio(bP, a2, 80::smallint, 'Truyền đạt rõ');
  perform public.xoa_danh_gia_du_gio(bP, a2);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'nhap_du_gio' and nguoi_lien_quan = array[a2];
  select count(*) into n2 from pg_temp.nk where loai = 'nhap_du_gio' and (sau ->> 'muc_diem') = '80' and truoc is null;
  res := res || jsonb_build_object('t', '25 Nhập rồi xóa điểm dự giờ (C2): 2 dòng, dòng nhập có mức điểm 80', 'ok', n = 2 and n2 = 1);

  -- ===== Đổi lịch Bài, sửa/hủy lớp =====
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b1, l1, 'Bài 1 (đổi tên)', now() + interval '2 days', now() + interval '2 days 2 hours', 2, 1);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'doi_lich_bai';
  perform pg_temp.vao(a1);
  perform public.luu_bai_hoc(b1, l1, 'Bài 1 (đổi tên)', now() + interval '2 days 1 hour', now() + interval '2 days 3 hours', 2, 1);
  perform pg_temp.ra();
  select count(*), bool_and(a3 = any (nguoi_lien_quan) and truoc ? 'bat_dau' and sau ? 'ket_thuc') into n2, ok from pg_temp.nk where loai = 'doi_lich_bai';
  res := res || jsonb_build_object('t', '26 Đổi giờ Bài đã có người phân công: 1 dòng cho những người liên quan; chỉ đổi tên thì không ghi', 'ok', n = 0 and n2 = 1 and ok);

  perform pg_temp.la(a1);
  update public.lop_hoc set dia_diem = 'Phòng 5' where id = l2;
  update public.lop_hoc set c3_phan_tram = 90 where id = l2;
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'sua_lop' and doi_tuong = 'Lớp ZZ Test9 Lớp 2' and sau ->> 'dia_diem' = 'Phòng 5' and truoc ->> 'dia_diem' is null;
  select count(*) into n2 from pg_temp.nk where loai = 'nhap_ket_qua_lop' and doi_tuong = 'Lớp ZZ Test9 Lớp 2' and (sau ->> 'c3_phan_tram')::numeric = 90;
  res := res || jsonb_build_object('t', '27 Sửa thông tin lớp đã mở và nhập kết quả C3: mỗi việc 1 dòng có giá trị trước/sau', 'ok', n = 1 and n2 = 1);

  update public.lop_hoc set dia_diem = 'Phòng 9' where id = l2;
  select count(*) into n from pg_temp.nk where loai = 'sua_lop' and doi_tuong = 'Lớp ZZ Test9 Lớp 2';
  res := res || jsonb_build_object('t', '28 Thay đổi do job/script (không có người đăng nhập) không ghi log', 'ok', n = 1);

  perform pg_temp.vao(a1);
  perform public.doi_trang_thai_lop(l1, 'da_huy');
  perform pg_temp.ra();
  select count(*), bool_and(a3 = any (nguoi_lien_quan) and a2 = any (nguoi_lien_quan) and a1 = any (nguoi_lien_quan)) into n, ok from pg_temp.nk where loai = 'huy_lop';
  res := res || jsonb_build_object('t', '29 Hủy lớp đã có người phân công: 1 dòng, liên quan tới tất cả người đã phân công', 'ok', n = 1 and ok);

  -- ===== Kỳ đánh giá: mỗi việc đúng 1 dòng =====
  perform pg_temp.vao(a1);
  kk := public.luu_ky(null, 'ZZ Test9 Q3/2025', '2025-07-01', '2025-09-30');
  perform public.doi_trang_thai_ky(kk, 'cho_duyet');
  perform public.doi_trang_thai_ky(kk, 'da_dong');
  perform public.mo_lai_ky(kk, 'Thử mở lại để kiểm tra');
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'doi_ky_danh_gia' and doi_tuong = 'Kỳ ZZ Test9 Q3/2025';
  select count(*) into n2 from pg_temp.nk where loai = 'doi_ky_danh_gia' and doi_tuong = 'Kỳ ZZ Test9 Q3/2025' and ly_do = 'Thử mở lại để kiểm tra' and mo_ta like 'Mở lại%';
  res := res || jsonb_build_object('t', '30 Kỳ đánh giá: tạo, chuyển chờ duyệt, đóng, mở lại = đúng 4 dòng; mở lại có lý do', 'ok', n = 4 and n2 = 1);

  -- ===== Chỉ-thêm =====
  perform pg_temp.vao(a1);
  ok := false; begin insert into public.audit_log (loai, mo_ta) values ('sua_lop', 'giả'); exception when insufficient_privilege then ok := true; end;
  ok2 := false; begin update public.audit_log set mo_ta = 'sửa'; exception when insufficient_privilege then ok2 := true; end;
  ok3 := false; begin delete from public.audit_log; exception when insufficient_privilege then ok3 := true; end;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '31 Ngay cả Admin cũng không thêm/sửa/xóa nhật ký qua API', 'ok', ok and ok2 and ok3);

  perform pg_temp.vao(a1);
  ok := false; begin perform public.ghi_nhat_ky('sua_lop', 'x', 'giả'); exception when insufficient_privilege then ok := true; end;
  ok2 := false; begin perform public.ghi_nhat_ky_ngoai(a1, 'tai_khoan', 'x', 'giả'); exception when insufficient_privilege then ok2 := true; end;
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '32 Người dùng không gọi được hàm ghi nhật ký trực tiếp', 'ok', ok and ok2);

  execute 'set local role service_role';
  ok := false; begin update public.audit_log set mo_ta = 'sửa'; exception when insufficient_privilege then ok := true; end;
  ok2 := false; begin delete from pg_temp.nk; exception when insufficient_privilege then ok2 := true; end;
  perform public.ghi_nhat_ky_ngoai(a1, 'tai_khoan', 'Đặt lại mật khẩu: ZZ', 'Đặt lại mật khẩu cho ZZ', array[a2]);
  perform pg_temp.ra();
  select count(*) into n from pg_temp.nk where loai = 'tai_khoan' and doi_tuong = 'Đặt lại mật khẩu: ZZ' and nguoi_thuc_hien = a1 and nguoi_lien_quan = array[a2];
  res := res || jsonb_build_object('t', '33 Server (service_role) ghi được nhật ký tài khoản qua hàm riêng nhưng không sửa/xóa được log', 'ok', ok and ok2 and n = 1);

  -- ===== Khôi phục cấu hình =====
  perform pg_temp.vao(a1);
  perform public.luu_cau_hinh_diem_danh(jsonb_build_object('b1_tre_toi_da_phut', o_max, 'rubric', o_rubric));
  perform pg_temp.ra();
  res := res || jsonb_build_object('t', '34 Đã khôi phục cấu hình điểm danh và rubric ban đầu', 'ok',
    (select gia_tri from public.cau_hinh_he_thong where khoa = 'b1_tre_toi_da_phut') = o_max
    and (select jsonb_object_agg(muc::text, jsonb_build_object('ten', ten, 'mo_ta', mo_ta)) from public.rubric_du_gio) = o_rubric);

  insert into pg_temp.ket_qua (ten, dat)
  select e ->> 't', (e ->> 'ok')::boolean from jsonb_array_elements(res) e;
end;
$$;

call pg_temp.don_dep();

select ten, dat from pg_temp.ket_qua order by dat, ts;
