-- Giai đoạn 9 (bổ sung): ghi nhật ký thêm việc tạo/xóa lớp, thêm/sửa/xóa Bài, tạo đề xuất nhân sự.
-- Cùng nguyên tắc với migration 20260926100000: trigger, chỉ ghi khi có người đăng nhập thực hiện, đúng 1 dòng cho 1 việc, chỉ người quản trị xem
-- (không có người liên quan nên GV/TG không thấy các dòng này).

alter type public.loai_nhat_ky add value if not exists 'tao_lop';
alter type public.loai_nhat_ky add value if not exists 'xoa_lop';
alter type public.loai_nhat_ky add value if not exists 'them_bai';
alter type public.loai_nhat_ky add value if not exists 'sua_bai';
alter type public.loai_nhat_ky add value if not exists 'xoa_bai';
alter type public.loai_nhat_ky add value if not exists 'tao_de_xuat';

-- ============ Lớp: tạo / xóa (lớp Nháp) ============
create function public.nk_lop_tao_xoa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.ghi_nhat_ky(
      'tao_lop', 'Lớp ' || new.ten, format('Tạo lớp %s', new.ten), '/lop-hoc/' || new.id, null, null,
      jsonb_build_object('ten', new.ten, 'nhom_lop', (select n.ten from public.danh_muc_nhom_lop n where n.id = new.nhom_lop_id),
        'doi_tuong', new.doi_tuong, 'loai_kinh_phi', new.loai_kinh_phi, 'ngay_bat_dau', new.ngay_bat_dau, 'ngay_ket_thuc', new.ngay_ket_thuc)
    );
  else
    perform public.ghi_nhat_ky('xoa_lop', 'Lớp ' || old.ten, format('Xóa lớp %s', old.ten), null, null, jsonb_build_object('ten', old.ten, 'trang_thai', old.trang_thai));
  end if;
  return null;
end;
$$;
create trigger lop_hoc_nk_tao after insert on public.lop_hoc for each row execute function public.nk_lop_tao_xoa();
create trigger lop_hoc_nk_xoa after delete on public.lop_hoc for each row execute function public.nk_lop_tao_xoa();

-- ============ Bài: thêm / xóa / sửa ============
create function public.nk_bai_them_xoa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lop text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    select l.ten into v_lop from public.lop_hoc l where l.id = new.lop_id;
    perform public.ghi_nhat_ky(
      'them_bai', format('Lớp %s — %s', v_lop, new.ten), format('Thêm %s vào lớp %s', new.ten, v_lop), '/lop-hoc/' || new.lop_id, null, null,
      jsonb_build_object('ten', new.ten, 'bat_dau', new.bat_dau, 'ket_thuc', new.ket_thuc)
    );
  else
    -- Xóa cả lớp kéo theo xóa các Bài của nó: chỉ ghi 1 dòng "xóa lớp", không ghi từng Bài
    select l.ten into v_lop from public.lop_hoc l where l.id = old.lop_id;
    if v_lop is not null then
      perform public.ghi_nhat_ky(
        'xoa_bai', format('Lớp %s — %s', v_lop, old.ten), format('Xóa %s khỏi lớp %s', old.ten, v_lop), '/lop-hoc/' || old.lop_id,
        null, jsonb_build_object('ten', old.ten, 'bat_dau', old.bat_dau, 'ket_thuc', old.ket_thuc)
      );
    end if;
  end if;
  return null;
end;
$$;
create trigger bai_hoc_nk_them after insert on public.bai_hoc for each row execute function public.nk_bai_them_xoa();
create trigger bai_hoc_nk_xoa after delete on public.bai_hoc for each row execute function public.nk_bai_them_xoa();

-- Sửa Bài: đổi tên; đổi giờ khi CHƯA có người phân công (đổi giờ Bài đã có người đã ghi ở nk_bai_doi_lich)
create function public.nk_bai_sua()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_co_nguoi boolean;
  v_cu jsonb := jsonb_build_object('ten', old.ten);
  v_moi jsonb := jsonb_build_object('ten', new.ten);
  v_lop text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  select exists (select 1 from public.slot_giang_day s where s.bai_id = new.id and s.nguoi_phan_cong is not null) into v_co_nguoi;
  if not v_co_nguoi then
    v_cu := v_cu || jsonb_build_object('bat_dau', old.bat_dau, 'ket_thuc', old.ket_thuc);
    v_moi := v_moi || jsonb_build_object('bat_dau', new.bat_dau, 'ket_thuc', new.ket_thuc);
  end if;
  if v_cu = v_moi then
    return null;
  end if;
  select l.ten into v_lop from public.lop_hoc l where l.id = new.lop_id;
  perform public.ghi_nhat_ky(
    'sua_bai', format('Lớp %s — %s', v_lop, new.ten), format('Sửa %s (lớp %s)', new.ten, v_lop), '/lop-hoc/' || new.lop_id, null,
    public.jsonb_khac(v_cu, v_moi, true), public.jsonb_khac(v_cu, v_moi, false)
  );
  return null;
end;
$$;
create trigger bai_hoc_nk_sua
  after update of ten, bat_dau, ket_thuc on public.bai_hoc
  for each row
  when (old.ten is distinct from new.ten or old.bat_dau is distinct from new.bat_dau or old.ket_thuc is distinct from new.ket_thuc)
  execute function public.nk_bai_sua();

-- ============ Đề xuất nhân sự: tạo mới (thủ công hoặc do đóng kỳ sinh ra) ============
-- Gộp theo câu lệnh: đóng kỳ sinh nhiều đề xuất 1 lượt chỉ ghi 1 dòng. Không nêu tên nhóm.
create function public.nk_de_xuat_tao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
  v_ten text;
  v_loai text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  select count(*)::int into v_n from moi;
  if v_n = 0 then
    return null;
  end if;
  if v_n = 1 then
    select p.ho_ten, case m.loai when 'phan_cong' then 'phân công' when 'dao_tao' then 'đào tạo bồi dưỡng' when 'khen_thuong_nhac_nho' then 'khen thưởng/nhắc nhở' else 'đổi nhóm' end
    into v_ten, v_loai from moi m join public.profiles p on p.id = m.user_id;
    perform public.ghi_nhat_ky('tao_de_xuat', 'Đề xuất ' || v_loai || ' — ' || v_ten, format('Tạo đề xuất %s cho %s', v_loai, v_ten), '/nhan-su/de-xuat');
  else
    perform public.ghi_nhat_ky('tao_de_xuat', format('%s đề xuất nhân sự', v_n), format('Tạo %s đề xuất nhân sự (thường do đóng kỳ đánh giá)', v_n), '/nhan-su/de-xuat',
      null, null, jsonb_build_object('so_luong', v_n));
  end if;
  return null;
end;
$$;
create trigger de_xuat_nhan_su_nk_tao
  after insert on public.de_xuat_nhan_su
  referencing new table as moi
  for each statement execute function public.nk_de_xuat_tao();

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.nk_lop_tao_xoa() from public, anon, authenticated;
revoke execute on function public.nk_bai_them_xoa() from public, anon, authenticated;
revoke execute on function public.nk_bai_sua() from public, anon, authenticated;
revoke execute on function public.nk_de_xuat_tao() from public, anon, authenticated;
