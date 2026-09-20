-- Giai đoạn 6 (bổ sung): danh sách kiểm tra trước khi đóng kỳ, mở lại kỳ đã đóng gần nhất, đề xuất GIÁNG nhóm theo KPI,
-- giới hạn quyền đọc bản ghi dự giờ (C2).

-- ============ Tham số đề xuất giáng nhóm ============
insert into public.cau_hinh_he_thong (khoa, gia_tri, mo_ta) values
  ('kpi_giang_nhom_x', 50, 'Ngưỡng KPI (điểm): dưới mức này liên tục đủ số kỳ thì đề xuất giáng Giảng viên xuống Trợ giảng'),
  ('kpi_giang_nhom_y', 3, 'Số kỳ đã đóng liên tiếp có KPI dưới ngưỡng để đề xuất giáng nhóm')
on conflict (khoa) do nothing;

create or replace function public.cau_hinh_kpi_hien_tai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nhom', (select coalesce(jsonb_object_agg(ma, trong_so), '{}') from public.nhom_tieu_chi),
    'tieu_chi', (select coalesce(jsonb_agg(jsonb_build_object('ma', ma, 'nhom', nhom, 'trong_so', trong_so, 'bat', bat, 'tinh_vao_kpi', tinh_vao_kpi) order by thu_tu), '[]') from public.tieu_chi_con),
    'he_so', (select coalesce(jsonb_object_agg(ma, gia_tri), '{}') from public.he_so_do_kho),
    'd1', (select coalesce(jsonb_object_agg(id::text, he_so_d1), '{}') from public.danh_muc_nhom_lop),
    'tham_so', jsonb_build_object(
      'min_nhom', public.cau_hinh_so('kpi_min_nhom_percentile', 5),
      'so_ky_fallback', public.cau_hinh_so('kpi_so_ky_fallback', 3),
      'gop_c', public.cau_hinh_so('kpi_gop_c', 0),
      'doi_nhom_x', public.cau_hinh_so('kpi_doi_nhom_x', 85),
      'doi_nhom_y', public.cau_hinh_so('kpi_doi_nhom_y', 3),
      'giang_nhom_x', public.cau_hinh_so('kpi_giang_nhom_x', 50),
      'giang_nhom_y', public.cau_hinh_so('kpi_giang_nhom_y', 3)
    )
  );
$$;

-- Lưu cấu hình KPI: thêm 2 tham số giáng nhóm (nếu payload không gửi thì giữ giá trị đang có)
create or replace function public.luu_cau_hinh_kpi(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_w numeric;
  v_bat boolean;
  v_tong numeric;
  v_min numeric := coalesce((p #>> '{tham_so,min_nhom}')::numeric, 5);
  v_so_ky numeric := coalesce((p #>> '{tham_so,so_ky_fallback}')::numeric, 3);
  v_gop numeric := coalesce((p #>> '{tham_so,gop_c}')::numeric, 0);
  v_x numeric := coalesce((p #>> '{tham_so,doi_nhom_x}')::numeric, 85);
  v_y numeric := coalesce((p #>> '{tham_so,doi_nhom_y}')::numeric, 3);
  v_xg numeric := coalesce((p #>> '{tham_so,giang_nhom_x}')::numeric, public.cau_hinh_so('kpi_giang_nhom_x', 50));
  v_yg numeric := coalesce((p #>> '{tham_so,giang_nhom_y}')::numeric, public.cau_hinh_so('kpi_giang_nhom_y', 3));
  v_uid uuid := (select auth.uid());
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền sửa cấu hình KPI' using errcode = '42501';
  end if;

  if v_min < 2 or v_min > 1000 or v_min <> trunc(v_min) then
    raise exception 'Số người tối thiểu của nhóm phải là số nguyên từ 2 trở lên' using errcode = '23514';
  end if;
  if v_so_ky < 1 or v_so_ky > 8 or v_so_ky <> trunc(v_so_ky) then
    raise exception 'Số kỳ so sánh lịch sử phải là số nguyên từ 1 đến 8' using errcode = '23514';
  end if;
  if v_gop not in (0, 1) then
    raise exception 'Cách gộp C1/C3 không hợp lệ' using errcode = '23514';
  end if;
  if v_x < 0 or v_x > 100 then
    raise exception 'Ngưỡng KPI đổi nhóm phải từ 0 đến 100' using errcode = '23514';
  end if;
  if v_y < 1 or v_y > 12 or v_y <> trunc(v_y) then
    raise exception 'Số kỳ liên tiếp phải là số nguyên từ 1 đến 12' using errcode = '23514';
  end if;
  if v_xg < 0 or v_xg > 100 then
    raise exception 'Ngưỡng KPI giáng nhóm phải từ 0 đến 100' using errcode = '23514';
  end if;
  if v_yg < 1 or v_yg > 12 or v_yg <> trunc(v_yg) then
    raise exception 'Số kỳ liên tiếp để giáng nhóm phải là số nguyên từ 1 đến 12' using errcode = '23514';
  end if;
  if v_xg >= v_x then
    raise exception 'Ngưỡng giáng nhóm phải thấp hơn ngưỡng thăng nhóm' using errcode = '23514';
  end if;

  -- Trọng số tiêu chí con + Bật/Tắt
  for r in select t.ma from public.tieu_chi_con t loop
    if (p -> 'tieu_chi') -> r.ma is not null then
      v_w := coalesce((p -> 'tieu_chi' -> r.ma ->> 'trong_so')::numeric, 0);
      v_bat := coalesce((p -> 'tieu_chi' -> r.ma ->> 'bat')::boolean, true);
      if v_w < 0 or v_w > 100 then
        raise exception 'Trọng số của % phải từ 0 đến 100', r.ma using errcode = '23514';
      end if;
      update public.tieu_chi_con set trong_so = v_w, bat = v_bat where ma = r.ma;
    end if;
  end loop;

  -- Trọng số nhóm
  for r in select n.ma from public.nhom_tieu_chi n loop
    if (p -> 'nhom') -> r.ma is not null then
      v_w := (p -> 'nhom' ->> r.ma)::numeric;
      if v_w < 0 or v_w > 100 then
        raise exception 'Trọng số nhóm % phải từ 0 đến 100', r.ma using errcode = '23514';
      end if;
      update public.nhom_tieu_chi set trong_so = v_w where ma = r.ma;
    end if;
  end loop;

  -- Kiểm tra tổng: tiêu chí đang Bật (và nằm trong công thức) của mỗi nhóm = 100; các nhóm có tiêu chí Bật = 100
  for r in
    select n.ma, coalesce(sum(t.trong_so) filter (where t.bat and t.tinh_vao_kpi), 0) as tong,
           count(*) filter (where t.bat and t.tinh_vao_kpi) as so_tc
    from public.nhom_tieu_chi n left join public.tieu_chi_con t on t.nhom = n.ma
    group by n.ma
  loop
    if r.so_tc > 0 and abs(r.tong - 100) > 0.01 then
      raise exception 'Tổng trọng số các tiêu chí đang bật của nhóm % phải bằng 100 (hiện là %)', r.ma, r.tong using errcode = '23514';
    end if;
  end loop;
  select coalesce(sum(n.trong_so), 0) into v_tong
  from public.nhom_tieu_chi n
  where exists (select 1 from public.tieu_chi_con t where t.nhom = n.ma and t.bat and t.tinh_vao_kpi);
  if abs(v_tong - 100) > 0.01 then
    raise exception 'Tổng trọng số các nhóm tiêu chí phải bằng 100 (hiện là %)', v_tong using errcode = '23514';
  end if;

  -- Hệ số độ khó D2, D3
  for r in select h.ma from public.he_so_do_kho h loop
    if (p -> 'he_so') -> r.ma is not null then
      v_w := (p -> 'he_so' ->> r.ma)::numeric;
      if v_w <= 0 or v_w > 9.99 then
        raise exception 'Hệ số % phải lớn hơn 0 và không quá 9,99', r.ma using errcode = '23514';
      end if;
      update public.he_so_do_kho set gia_tri = v_w where ma = r.ma;
    end if;
  end loop;

  -- Hệ số D1 theo nhóm lớp
  for r in select d.id from public.danh_muc_nhom_lop d loop
    if (p -> 'd1') -> (r.id::text) is not null then
      v_w := (p -> 'd1' ->> (r.id::text))::numeric;
      if v_w <= 0 or v_w > 9.99 then
        raise exception 'Hệ số D1 phải lớn hơn 0 và không quá 9,99' using errcode = '23514';
      end if;
      update public.danh_muc_nhom_lop set he_so_d1 = v_w where id = r.id;
    end if;
  end loop;

  -- Tham số khác
  update public.cau_hinh_he_thong set gia_tri = v_min, updated_at = now(), updated_by = v_uid where khoa = 'kpi_min_nhom_percentile';
  update public.cau_hinh_he_thong set gia_tri = v_so_ky, updated_at = now(), updated_by = v_uid where khoa = 'kpi_so_ky_fallback';
  update public.cau_hinh_he_thong set gia_tri = v_gop, updated_at = now(), updated_by = v_uid where khoa = 'kpi_gop_c';
  update public.cau_hinh_he_thong set gia_tri = v_x, updated_at = now(), updated_by = v_uid where khoa = 'kpi_doi_nhom_x';
  update public.cau_hinh_he_thong set gia_tri = v_y, updated_at = now(), updated_by = v_uid where khoa = 'kpi_doi_nhom_y';
  update public.cau_hinh_he_thong set gia_tri = v_xg, updated_at = now(), updated_by = v_uid where khoa = 'kpi_giang_nhom_x';
  update public.cau_hinh_he_thong set gia_tri = v_yg, updated_at = now(), updated_by = v_uid where khoa = 'kpi_giang_nhom_y';
  -- TODO Giai đoạn 9: ghi Nhật ký hệ thống (giá trị trước/sau)
end;
$$;

-- ============ Rà soát đổi nhóm theo KPI: THĂNG (Trợ giảng → Giảng viên) và GIÁNG (Giảng viên → Trợ giảng) ============
-- Cùng nhánh bác sĩ / không bác sĩ; không áp dụng nhóm Ban giám đốc. Chỉ sinh đề xuất, Admin duyệt/bỏ qua thủ công.
-- Thăng: KPI >= X liên tục Y kỳ đã đóng gần nhất. Giáng: KPI < X' liên tục Y' kỳ đã đóng gần nhất.
-- Người chưa có kết quả (không dạy) ở một trong các kỳ đó không được tính là "thấp" -> không bị đề xuất giáng.
create or replace function public.ra_soat_doi_nhom(p_ky uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_x numeric := public.cau_hinh_so('kpi_doi_nhom_x', 85);
  v_y int := public.cau_hinh_so('kpi_doi_nhom_y', 3)::int;
  v_xg numeric := public.cau_hinh_so('kpi_giang_nhom_x', 50);
  v_yg int := public.cau_hinh_so('kpi_giang_nhom_y', 3)::int;
  v_ky public.ky_danh_gia%rowtype;
  v_kys uuid[];
  v_kysg uuid[];
  v_n int := 0;
  v_m int := 0;
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;

  -- Thăng nhóm
  select array_agg(x.id) into v_kys
  from (select k.id from public.ky_danh_gia k where k.trang_thai = 'da_dong' and k.tu <= v_ky.tu order by k.tu desc limit v_y) x;
  if coalesce(array_length(v_kys, 1), 0) = v_y then
    insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi, ky_id)
    select 'doi_nhom'::public.loai_de_xuat, r.user_id,
      'Đạt KPI từ ' || (v_x::float8)::text || ' điểm liên tục ' || v_y || ' kỳ đến ' || v_ky.ten
        || ' — đề xuất thăng từ Trợ giảng lên Giảng viên.',
      n.nhom,
      case n.nhom when 'tg_bac_si' then 'gv_bac_si'::public.nhom_nhan_su else 'gv_khong_bac_si'::public.nhom_nhan_su end,
      v_ky.id
    from public.ket_qua_kpi r
    join public.nhan_su_nhom n on n.user_id = r.user_id
    where r.ky_id = any (v_kys) and r.kpi >= v_x and n.nhom in ('tg_bac_si', 'tg_khong_bac_si')
    group by r.user_id, n.nhom
    having count(*) = v_y
      and not exists (
        select 1 from public.de_xuat_nhan_su d
        where d.user_id = r.user_id and d.loai = 'doi_nhom' and d.trang_thai = 'cho_duyet'
      );
    get diagnostics v_n = row_count;
  end if;

  -- Giáng nhóm
  select array_agg(x.id) into v_kysg
  from (select k.id from public.ky_danh_gia k where k.trang_thai = 'da_dong' and k.tu <= v_ky.tu order by k.tu desc limit v_yg) x;
  if coalesce(array_length(v_kysg, 1), 0) = v_yg then
    insert into public.de_xuat_nhan_su (loai, user_id, noi_dung, nhom_cu, nhom_moi, ky_id)
    select 'doi_nhom'::public.loai_de_xuat, r.user_id,
      'KPI dưới ' || (v_xg::float8)::text || ' điểm liên tục ' || v_yg || ' kỳ đến ' || v_ky.ten
        || ' — đề xuất chuyển từ Giảng viên xuống Trợ giảng.',
      n.nhom,
      case n.nhom when 'gv_bac_si' then 'tg_bac_si'::public.nhom_nhan_su else 'tg_khong_bac_si'::public.nhom_nhan_su end,
      v_ky.id
    from public.ket_qua_kpi r
    join public.nhan_su_nhom n on n.user_id = r.user_id
    where r.ky_id = any (v_kysg) and r.kpi < v_xg and n.nhom in ('gv_bac_si', 'gv_khong_bac_si')
    group by r.user_id, n.nhom
    having count(*) = v_yg
      and not exists (
        select 1 from public.de_xuat_nhan_su d
        where d.user_id = r.user_id and d.loai = 'doi_nhom' and d.trang_thai = 'cho_duyet'
      );
    get diagnostics v_m = row_count;
  end if;

  return v_n + v_m;
end;
$$;

-- ============ Nhật ký đóng / mở lại kỳ (Giai đoạn 9 sẽ gộp vào Nhật ký hệ thống chung) ============
create table public.ky_danh_gia_nhat_ky (
  id uuid primary key default gen_random_uuid(),
  ky_id uuid not null references public.ky_danh_gia (id) on delete cascade,
  hanh_dong text not null check (hanh_dong in ('dong', 'mo_lai')),
  ly_do text,
  nguoi uuid references auth.users (id) on delete set null,
  luc timestamptz not null default now()
);
create index ky_danh_gia_nhat_ky_ky_idx on public.ky_danh_gia_nhat_ky (ky_id, luc);

revoke all on table public.ky_danh_gia_nhat_ky from anon, authenticated;
grant select on public.ky_danh_gia_nhat_ky to authenticated;
alter table public.ky_danh_gia_nhat_ky enable row level security;
create policy ky_nhat_ky_select on public.ky_danh_gia_nhat_ky for select to authenticated using (public.is_quan_tri());

-- Đóng kỳ: như cũ + ghi nhật ký
create or replace function public.doi_trang_thai_ky(p_id uuid, p_moi public.trang_thai_ky)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ky public.ky_danh_gia%rowtype;
  v_ch jsonb;
  v_truoc text;
  v_de_xuat int := 0;
  v_so int := 0;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý kỳ đánh giá' using errcode = '42501';
  end if;
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
  end if;
  if v_ky.trang_thai = 'da_dong' then
    raise exception 'Kỳ đã đóng, không thể thay đổi (chỉ mở lại được kỳ đóng gần nhất, kèm lý do)' using errcode = '23514';
  end if;

  if v_ky.trang_thai = 'dang_mo' and p_moi = 'cho_duyet' then
    update public.ky_danh_gia set trang_thai = 'cho_duyet' where id = p_id;

  elsif v_ky.trang_thai = 'cho_duyet' and p_moi = 'dang_mo' then
    update public.ky_danh_gia set trang_thai = 'dang_mo' where id = p_id;

  elsif v_ky.trang_thai = 'cho_duyet' and p_moi = 'da_dong' then
    -- Phải đóng theo thứ tự thời gian để lịch sử A1 (fallback) không bị hổng
    select k.ten into v_truoc from public.ky_danh_gia k where k.tu < v_ky.tu and k.trang_thai <> 'da_dong' order by k.tu limit 1;
    if v_truoc is not null then
      raise exception 'Hãy đóng % trước', v_truoc using errcode = '23514';
    end if;

    v_ch := public.cau_hinh_kpi_hien_tai();
    insert into public.ket_qua_kpi (ky_id, user_id, kpi, diem_nhom, gia_tri, trong_so_hieu_luc, gio_thuc, gio_quy_doi,
                                    so_bai, so_lop, a4_ky, a4_luy_ke, che_do_a1, percentile)
    select p_id, t.user_id, t.kpi, t.diem_nhom, t.gia_tri, t.trong_so_hieu_luc, t.gio_thuc, t.gio_quy_doi,
           t.so_bai, t.so_lop, t.a4_ky, t.a4_luy_ke, t.che_do_a1, t.percentile
    from public.tinh_kpi(p_id, v_ch) t
    where t.kpi is not null;
    get diagnostics v_so = row_count;

    update public.ky_danh_gia
    set trang_thai = 'da_dong', cau_hinh_snapshot = v_ch, dong_luc = now(), dong_boi = (select auth.uid())
    where id = p_id;

    v_de_xuat := public.ra_soat_doi_nhom(p_id);
    insert into public.ky_danh_gia_nhat_ky (ky_id, hanh_dong, nguoi) values (p_id, 'dong', (select auth.uid()));
  else
    raise exception 'Không thể chuyển kỳ từ trạng thái hiện tại sang trạng thái này' using errcode = '23514';
  end if;

  -- TODO Giai đoạn 8: thông báo "Kỳ đánh giá mới công bố KPI" khi đóng kỳ; Giai đoạn 9: ghi Nhật ký hệ thống
  return jsonb_build_object('so_ket_qua', v_so, 'so_de_xuat_doi_nhom', v_de_xuat);
end;
$$;

-- ============ Mở lại kỳ đã đóng ============
-- Chỉ mở lại được kỳ đóng GẦN NHẤT (các kỳ sau dựa vào kết quả kỳ này để so sánh lịch sử), phải có lý do.
-- Kỳ về "Chờ duyệt": kết quả và snapshot bị xóa, tính lại khi đóng lần nữa. Đề xuất đổi nhóm đang chờ duyệt do lần đóng đó sinh ra bị thu hồi;
-- nếu đã có đề xuất được DUYỆT (nhóm đã đổi) thì không mở lại được, vì kết quả đã tác động tới hồ sơ.
create function public.mo_lai_ky(p_id uuid, p_ly_do text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ky public.ky_danh_gia%rowtype;
  v_ly_do text := btrim(coalesce(p_ly_do, ''));
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền quản lý kỳ đánh giá' using errcode = '42501';
  end if;
  if char_length(v_ly_do) < 5 then
    raise exception 'Hãy nhập lý do mở lại kỳ (tối thiểu 5 ký tự)' using errcode = '23514';
  end if;

  select k.* into v_ky from public.ky_danh_gia k where k.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
  end if;
  if v_ky.trang_thai <> 'da_dong' then
    raise exception 'Chỉ mở lại được kỳ đã đóng' using errcode = '23514';
  end if;
  if exists (select 1 from public.ky_danh_gia k where k.trang_thai = 'da_dong' and k.tu > v_ky.tu) then
    raise exception 'Chỉ mở lại được kỳ đã đóng gần nhất' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.de_xuat_nhan_su d where d.ky_id = p_id and d.loai = 'doi_nhom' and d.trang_thai = 'da_duyet'
  ) then
    raise exception 'Không mở lại được: đã có đề xuất đổi nhóm sinh từ kỳ này được duyệt' using errcode = '23514';
  end if;

  delete from public.de_xuat_nhan_su where ky_id = p_id and loai = 'doi_nhom' and trang_thai = 'cho_duyet';
  delete from public.ket_qua_kpi where ky_id = p_id;
  update public.ky_danh_gia
  set trang_thai = 'cho_duyet', cau_hinh_snapshot = null, dong_luc = null, dong_boi = null
  where id = p_id;
  insert into public.ky_danh_gia_nhat_ky (ky_id, hanh_dong, ly_do, nguoi) values (p_id, 'mo_lai', v_ly_do, (select auth.uid()));
end;
$$;

-- ============ Danh sách kiểm tra trước khi đóng kỳ ============
-- Chỉ cảnh báo, không chặn. Xét người/lớp có Bài ĐÃ KẾT THÚC trong kỳ (lớp chưa hủy).
create function public.kiem_tra_dong_ky(p_ky uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ky public.ky_danh_gia%rowtype;
  v_hom_nay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_chua_hoan_thanh jsonb;
  v_thieu_c1 jsonb;
  v_thieu_c3 jsonb;
  v_tong int;
  v_thieu_dd int;
begin
  if not public.is_quan_tri() then
    raise exception 'Không có quyền xem danh sách kiểm tra' using errcode = '42501';
  end if;
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    raise exception 'Không tìm thấy kỳ' using errcode = 'P0002';
  end if;

  with bai_ky as (
    select s.nguoi_phan_cong as uid, b.id as bid, l.id as lid, l.ten as lten, l.trang_thai as ltt, l.c1_phan_tram as c1, l.c3_phan_tram as c3
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy' and b.ket_thuc <= now()
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den
  ),
  lop as (
    select distinct lid, lten, ltt, c1, c3 from bai_ky
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object('id', lid, 'ten', lten) order by lten) from lop where ltt <> 'da_hoan_thanh'), '[]'),
    coalesce((select jsonb_agg(jsonb_build_object('id', lid, 'ten', lten) order by lten) from lop where ltt = 'da_hoan_thanh' and c1 is null), '[]'),
    coalesce((select jsonb_agg(jsonb_build_object('id', lid, 'ten', lten) order by lten) from lop where ltt = 'da_hoan_thanh' and c3 is null), '[]'),
    (select count(*)::int from bai_ky),
    (select count(*)::int from bai_ky bk where not exists (select 1 from public.diem_danh_bai d where d.bai_id = bk.bid and d.user_id = bk.uid))
  into v_chua_hoan_thanh, v_thieu_c1, v_thieu_c3, v_tong, v_thieu_dd;

  return jsonb_build_object(
    'chua_ket_thuc', v_hom_nay <= v_ky.den,
    'con_ngay', greatest(v_ky.den - v_hom_nay, 0),
    'lop_chua_hoan_thanh', v_chua_hoan_thanh,
    'lop_thieu_c1', v_thieu_c1,
    'lop_thieu_c3', v_thieu_c3,
    'luot_thieu_diem_danh', v_thieu_dd,
    'tong_luot', v_tong
  );
end;
$$;

-- ============ Bản ghi dự giờ (C2): chỉ người quản trị và chính người được chấm đọc được ============
-- Điểm C2 đã gộp vào KPI (công khai nội bộ) nên vẫn hiện qua kết quả KPI; ghi chú/nhận xét từng buổi thì không công khai.
drop policy danh_gia_du_gio_select on public.danh_gia_du_gio;
create policy danh_gia_du_gio_select on public.danh_gia_du_gio for select to authenticated
  using (public.is_quan_tri() or user_id = (select auth.uid()));

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.mo_lai_ky(uuid, text) from public, anon;
revoke execute on function public.kiem_tra_dong_ky(uuid) from public, anon;
grant execute on function public.mo_lai_ky(uuid, text) to authenticated;
grant execute on function public.kiem_tra_dong_ky(uuid) to authenticated;
