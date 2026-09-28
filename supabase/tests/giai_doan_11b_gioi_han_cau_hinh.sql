-- Test tự kiểm tra Giai đoạn 11b (thu hẹp quyền Cấu hình hệ thống của Quản lý lớp).
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy migration 20261001100000 (và mọi migration trước).
-- Script tự tạo 2 user giả (@qldt.test): b1 Admin, b2 GV giữ Quyền Quản lý lớp (không phải Admin gốc) — kiểm tra rồi xóa sạch.
-- Kỳ vọng:
--   * b2 (Quản lý lớp): luu_cau_hinh_kpi / luu_cau_hinh_diem_danh / UPDATE trực tiếp cau_hinh_he_thong đều bị chặn (42501 hoặc 0 dòng).
--   * b2 vẫn làm được Danh mục (thêm chuyên môn) và Kỳ đánh giá (luu_ky/xoa_ky).
--   * b1 (Admin) vẫn làm được cả 2 việc trên (không bị ảnh hưởng).
-- Kết quả: bảng cuối cùng, cột "dat" phải là true hết (dòng sai lên đầu nhờ order by dat).

create or replace procedure pg_temp.don_dep()
language plpgsql
as $$
begin
  delete from public.ky_danh_gia where ten like 'ZZ Test 11b%';
  delete from public.danh_muc_chuyen_mon where ten like 'ZZ Test 11b%';
  delete from public.nhan_su_nhom where user_id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');
  delete from auth.users where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');
end;
$$;

call pg_temp.don_dep();
drop table if exists pg_temp.ket_qua;
create temp table ket_qua (ts timestamptz default clock_timestamp(), ten text, dat boolean);
-- Cho phép ghi kết quả ngay cả khi phiên đang "đóng vai" b1/b2 (role authenticated) ở dưới, tránh lỗi
-- "permission denied for table ket_qua" (bảng tạm mặc định chỉ role tạo ra nó mới ghi được).
grant insert on ket_qua to authenticated;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'b1@qldt.test', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'b2@qldt.test', '{}', '{}', now(), now());

update public.profiles set phan_quyen = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set co_quyen_quan_ly_lop = true where id = '00000000-0000-0000-0000-0000000000b2';

-- ===== Đóng vai b2 (Quản lý lớp, không phải Admin gốc) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2"}', false);
set role authenticated;

do $$
declare err text;
begin
  begin
    perform public.luu_cau_hinh_kpi('{}'::jsonb);
  exception when others then
    err := sqlstate;
  end;
  insert into ket_qua (ten, dat) values ('b2 (Quản lý lớp) luu_cau_hinh_kpi bị chặn', err = '42501');
end;
$$;

do $$
declare err text;
begin
  begin
    perform public.luu_cau_hinh_diem_danh('{}'::jsonb);
  exception when others then
    err := sqlstate;
  end;
  insert into ket_qua (ten, dat) values ('b2 (Quản lý lớp) luu_cau_hinh_diem_danh bị chặn', err = '42501');
end;
$$;

-- UPDATE trực tiếp qua RLS (không phải RPC) -> không raise lỗi, chỉ 0 dòng bị đổi (RLS is_admin() loại hết dòng)
do $$
declare v_truoc numeric; v_sau numeric;
begin
  select gia_tri into v_truoc from public.cau_hinh_he_thong where khoa = 'canh_bao_pool_nho';
  update public.cau_hinh_he_thong set gia_tri = gia_tri where khoa = 'canh_bao_pool_nho';
  select gia_tri into v_sau from public.cau_hinh_he_thong where khoa = 'canh_bao_pool_nho';
  insert into ket_qua (ten, dat) values ('b2 (Quản lý lớp) UPDATE trực tiếp cau_hinh_he_thong bị RLS chặn', v_truoc = v_sau);
end;
$$;

-- Danh mục + Kỳ đánh giá vẫn dùng được
insert into public.danh_muc_chuyen_mon (ten, thu_tu) values ('ZZ Test 11b chuyên môn', 999);
insert into ket_qua (ten, dat)
  values ('b2 vẫn thêm được Danh mục', exists (select 1 from public.danh_muc_chuyen_mon where ten = 'ZZ Test 11b chuyên môn'));

do $$
declare v_id uuid;
begin
  select public.luu_ky(null, 'ZZ Test 11b kỳ', date '2019-01-01', date '2019-03-31') into v_id;
  insert into ket_qua (ten, dat) values ('b2 vẫn tạo được Kỳ đánh giá', v_id is not null);
  perform public.xoa_ky(v_id);
  insert into ket_qua (ten, dat) values ('b2 vẫn xóa được Kỳ đánh giá', not exists (select 1 from public.ky_danh_gia where id = v_id));
end;
$$;

reset role;

-- ===== Đóng vai b1 (Admin gốc) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1"}', false);
set role authenticated;

do $$
declare err text;
begin
  begin
    perform public.luu_cau_hinh_kpi('{}'::jsonb);
  exception when others then
    err := sqlstate;
  end;
  insert into ket_qua (ten, dat) values ('b1 (Admin) luu_cau_hinh_kpi vẫn chạy được', err is null);
end;
$$;

do $$
declare err text;
begin
  begin
    perform public.luu_cau_hinh_diem_danh('{}'::jsonb);
  exception when others then
    err := sqlstate;
  end;
  insert into ket_qua (ten, dat) values ('b1 (Admin) luu_cau_hinh_diem_danh vẫn chạy được', err is null);
end;
$$;

do $$
declare v_id uuid;
begin
  select public.luu_ky(null, 'ZZ Test 11b kỳ (admin)', date '2019-04-01', date '2019-06-30') into v_id;
  insert into ket_qua (ten, dat) values ('b1 (Admin) vẫn tạo được Kỳ đánh giá', v_id is not null);
  perform public.xoa_ky(v_id);
end;
$$;

reset role;

call pg_temp.don_dep();

select ten, dat from ket_qua order by dat, ts;
select count(*) filter (where not dat) as so_sai, count(*) as tong from ket_qua;
