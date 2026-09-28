-- Giai đoạn 11 (bổ sung): thu hẹp quyền của người giữ Quyền Quản lý lớp trong Cấu hình hệ thống (mục 4.8).
-- Quyết định (theo yêu cầu người dùng): Quản lý lớp CHỈ còn sửa được "Danh mục" (chuyên môn, loại chứng chỉ,
-- nhóm lớp kèm D1) và "Kỳ đánh giá" — không còn sửa được "Cấu hình KPI" (trọng số, hệ số D2/D3, ngưỡng đổi
-- nhóm, cấu hình điểm danh/rubric C2) và "Đăng ký & matching" (ngưỡng cảnh báo, tỷ trọng matching-score).
-- Admin gốc vẫn toàn quyền như cũ. Không đổi gì ở "Danh mục" và "Kỳ đánh giá" (vẫn public.is_quan_tri()).
--
-- Lưu ý: hệ số D1 (theo nhóm lớp) vẫn sửa được qua màn hình Danh mục > Nhóm lớp (bảng danh_muc_nhom_lop,
-- RPC/ghi trực tiếp riêng, không đi qua luu_cau_hinh_kpi) — nên Quản lý lớp vẫn đổi được D1 ở đó, chỉ không
-- còn đổi được từ mini-bảng D1 lồng trong màn hình Cấu hình KPI.

-- ============ cau_hinh_he_thong: chỉ Admin được UPDATE ============
-- Bảng này chỉ chứa khóa của 2 nhóm bị thu hẹp (kpi_*, checkin_*/b1_*/nhac_*, matching_*, canh_bao_*) —
-- không có khóa nào thuộc Danh mục/Kỳ đánh giá, nên đổi chung 1 policy là an toàn.
drop policy if exists cau_hinh_update on public.cau_hinh_he_thong;
create policy cau_hinh_update on public.cau_hinh_he_thong for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ Cấu hình KPI (trọng số, D2/D3, D1, ngưỡng đổi nhóm) — chỉ Admin ============
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
  if not public.is_admin() then
    raise exception 'Chỉ Admin được sửa cấu hình KPI' using errcode = '42501';
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
end;
$$;

-- ============ Cấu hình điểm danh B1 / khung check-in / rubric C2 — chỉ Admin ============
create or replace function public.luu_cau_hinh_diem_danh(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_truoc numeric := coalesce((p ->> 'checkin_truoc_phut')::numeric, public.cau_hinh_so('checkin_truoc_phut', 45));
  v_max numeric := coalesce((p ->> 'b1_tre_toi_da_phut')::numeric, public.cau_hinh_so('b1_tre_toi_da_phut', 30));
  v_nhac numeric := coalesce((p ->> 'nhac_check_in_truoc_phut')::numeric, public.cau_hinh_so('nhac_check_in_truoc_phut', 30));
  v_uid uuid := (select auth.uid());
  r record;
  v_ten text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ Admin được sửa cấu hình điểm danh' using errcode = '42501';
  end if;
  if v_truoc < 0 or v_truoc > 240 or v_truoc <> trunc(v_truoc) then
    raise exception 'Số phút được check-in trước giờ học phải là số nguyên từ 0 đến 240' using errcode = '23514';
  end if;
  if v_max < 1 or v_max > 240 or v_max <> trunc(v_max) then
    raise exception 'Ngưỡng trễ tối đa của B1 phải là số nguyên phút từ 1 đến 240' using errcode = '23514';
  end if;
  if v_nhac < 1 or v_nhac > 240 or v_nhac <> trunc(v_nhac) then
    raise exception 'Số phút nhắc check-in trước giờ học phải là số nguyên từ 1 đến 240' using errcode = '23514';
  end if;

  for r in select u.muc from public.rubric_du_gio u loop
    if (p -> 'rubric') -> (r.muc::text) is not null then
      v_ten := btrim(coalesce(p -> 'rubric' -> (r.muc::text) ->> 'ten', ''));
      if v_ten = '' then
        raise exception 'Tên mức rubric % không được để trống', r.muc using errcode = '23514';
      end if;
      update public.rubric_du_gio
      set ten = v_ten, mo_ta = btrim(coalesce(p -> 'rubric' -> (r.muc::text) ->> 'mo_ta', ''))
      where muc = r.muc;
    end if;
  end loop;

  update public.cau_hinh_he_thong set gia_tri = v_truoc, updated_at = now(), updated_by = v_uid where khoa = 'checkin_truoc_phut';
  update public.cau_hinh_he_thong set gia_tri = v_max, updated_at = now(), updated_by = v_uid where khoa = 'b1_tre_toi_da_phut';
  update public.cau_hinh_he_thong set gia_tri = v_nhac, updated_at = now(), updated_by = v_uid where khoa = 'nhac_check_in_truoc_phut';
end;
$$;
