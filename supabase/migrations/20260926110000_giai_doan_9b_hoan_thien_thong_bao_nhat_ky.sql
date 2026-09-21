-- Giai đoạn 8-9 (bổ sung sau rà soát logic)
--   * Thông báo "cần hành động" của Admin (đăng ký cần duyệt, đề xuất cần duyệt) tự chuyển sang đã đọc khi việc đó đã xử lý xong — trước đây tồn đọng.
--   * Nhắc check-in quá 6 giờ tự đã đọc; dọn mọi thông báo quá 365 ngày (kể cả chưa đọc), đã đọc quá 180 ngày.
--   * Nhật ký: sửa "kinh nghiệm" trong hồ sơ người khác cũng được ghi (trước chỉ ghi họ tên, SĐT, ảnh, email).
--   * Chính sách đọc audit_log dùng (select ...) để kiểm tra quyền 1 lần cho cả truy vấn thay vì từng dòng.

-- ============ Đăng ký: tự giải quyết thông báo "cần duyệt" ============
create or replace function public.tb_dang_ky_cap_nhat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  a record;
  v_ly text;
begin
  for r in
    select m.id, m.loai, m.trang_thai, m.user_id, m.vai_tro, m.ly_do, b.ten as bai_ten, b.bat_dau,
           l.id as lop_id, l.ten as lop_ten, p.ho_ten
    from moi m
    join cu on cu.id = m.id
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    join public.profiles p on p.id = m.user_id
    where cu.trang_thai = 'cho_xu_ly' and m.trang_thai <> 'cho_xu_ly'
  loop
    -- Lời mời đã được xử lý -> thông báo "cần hành động" của nó hết hiệu lực
    if r.loai = 'duoc_moi' then
      update public.thong_bao set da_doc = true where khoa = 'loi_moi:' || r.id and not da_doc;
    end if;

    v_ly := case when coalesce(r.ly_do, '') <> '' then ' Lý do: ' || r.ly_do || '.' else '' end;

    if r.loai = 'tu_dang_ky' and r.trang_thai = 'da_duyet' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký được duyệt',
        format('Lớp %s — %s (%s), %s.', r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro), public.dinh_dang_gio(r.bat_dau)),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'tu_dang_ky' and r.trang_thai = 'tu_choi' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký bị từ chối',
        format('Lớp %s — %s, %s.%s', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau), v_ly),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'tu_dang_ky' and r.trang_thai = 'da_huy' and r.ly_do = 'Slot đã đủ người' then
      perform public.tao_thong_bao(
        r.user_id, 'dang_ky_ket_qua', 'thong_tin', 'Đăng ký đã đóng',
        format('Lớp %s — %s: slot đã đủ người.', r.lop_ten, r.bai_ten),
        '/lop-hoc/' || r.lop_id
      );
    elsif r.loai = 'duoc_moi' and r.trang_thai = 'tu_choi' then
      for a in select q.id from public.nguoi_quan_tri() q loop
        perform public.tao_thong_bao(
          a.id, 'loi_moi_ket_qua', 'thong_tin', 'Lời mời bị từ chối',
          format('%s từ chối lời mời dạy lớp %s — %s (%s). Slot đã mở lại, hãy mời người khác.', r.ho_ten, r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro)),
          '/lop-hoc/' || r.lop_id, 'loi_moi_tu_choi:' || r.id
        );
      end loop;
    elsif r.loai = 'duoc_moi' and r.trang_thai = 'da_huy' and r.ly_do = 'Admin thu hồi lời mời' then
      perform public.tao_thong_bao(
        r.user_id, 'loi_moi_ket_qua', 'thong_tin', 'Lời mời dạy đã được thu hồi',
        format('Lớp %s — %s, %s.', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau)),
        '/lop-hoc/' || r.lop_id
      );
    end if;
  end loop;
  -- Việc "cần duyệt" đã xử lý xong (duyệt/từ chối/rút/lớp hủy hết đăng ký chờ của người đó trong lớp) -> thông báo của Admin hết hiệu lực
  update public.thong_bao t set da_doc = true
  where t.loai = 'dang_ky_can_duyet' and not t.da_doc
    and t.khoa in (
      select 'dang_ky:' || b.lop_id || ':' || m.user_id
      from moi m
      join cu on cu.id = m.id
      join public.bai_hoc b on b.id = m.bai_id
      where m.loai = 'tu_dang_ky' and cu.trang_thai = 'cho_xu_ly' and m.trang_thai <> 'cho_xu_ly'
        and not exists (
          select 1 from public.dang_ky_giang_day d join public.bai_hoc b2 on b2.id = d.bai_id
          where b2.lop_id = b.lop_id and d.user_id = m.user_id and d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly'
        )
    );
  return null;
end;
$$;


-- ============ Đề xuất: hết đề xuất chờ thì thông báo "cần duyệt" hết hiệu lực ============
create function public.tb_de_xuat_het_cho()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.de_xuat_nhan_su where trang_thai = 'cho_duyet') then
    update public.thong_bao set da_doc = true where loai = 'de_xuat_can_duyet' and not da_doc;
  end if;
  return null;
end;
$$;
create trigger de_xuat_nhan_su_tb_het_cho_cap_nhat
  after update on public.de_xuat_nhan_su
  for each statement execute function public.tb_de_xuat_het_cho();
create trigger de_xuat_nhan_su_tb_het_cho_xoa
  after delete on public.de_xuat_nhan_su
  for each statement execute function public.tb_de_xuat_het_cho();

-- ============ Job: nhắc check-in + dọn thông báo cũ ============
create or replace function public.nhac_check_in()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phut int := least(
    greatest(public.cau_hinh_so('nhac_check_in_truoc_phut', 30)::int, 1),
    greatest(public.cau_hinh_so('checkin_truoc_phut', 45)::int, 1)
  );
  r record;
  v_n int := 0;
begin
  -- Nhắc check-in quá 6 giờ thì đã hết ý nghĩa: tự chuyển sang đã đọc để không tồn đọng thành "cần hành động"
  update public.thong_bao set da_doc = true where loai = 'nhac_check_in' and not da_doc and created_at < now() - interval '6 hours';
  for r in
    select s.nguoi_phan_cong as uid, b.id as bai_id, b.ten as bai_ten, b.bat_dau, l.id as lop_id, l.ten as lop_ten
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong'
      and l.trang_thai <> 'da_huy'
      and b.bat_dau > now()
      and b.bat_dau <= now() + make_interval(mins => v_phut)
      and not exists (select 1 from public.diem_danh_bai d where d.bai_id = b.id and d.user_id = s.nguoi_phan_cong)
  loop
    if public.tao_thong_bao(
      r.uid, 'nhac_check_in', 'can_hanh_dong', 'Sắp đến giờ dạy — nhớ check-in',
      format('Lớp %s — %s bắt đầu lúc %s. Bấm "Tôi đã có mặt" để không bị tính 0%% chuyên cần.', r.lop_ten, r.bai_ten, public.dinh_dang_gio(r.bat_dau)),
      '/lop-hoc/' || r.lop_id, 'nhac_check_in:' || r.bai_id || ':' || r.uid
    ) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;


create or replace function public.don_thong_bao_cu()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  delete from public.thong_bao where (da_doc and created_at < now() - interval '180 days') or created_at < now() - interval '365 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ============ Nhật ký: ghi thêm "kinh nghiệm" khi sửa hồ sơ người khác ============
create or replace function public.nk_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cu jsonb;
  v_moi jsonb;
begin
  if v_uid is null then
    return null;
  end if;

  if new.trang_thai_tham_gia is distinct from old.trang_thai_tham_gia then
    perform public.ghi_nhat_ky(
      'doi_trang_thai_tham_gia', new.ho_ten, format('Đổi trạng thái tham gia giảng dạy của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('trang_thai_tham_gia', old.trang_thai_tham_gia), jsonb_build_object('trang_thai_tham_gia', new.trang_thai_tham_gia)
    );
  end if;

  if new.co_quyen_quan_ly_lop is distinct from old.co_quyen_quan_ly_lop then
    perform public.ghi_nhat_ky(
      'gan_quyen_quan_ly_lop', new.ho_ten,
      format('%s Quyền Quản lý lớp %s %s', case when new.co_quyen_quan_ly_lop then 'Gán' else 'Thu hồi' end, case when new.co_quyen_quan_ly_lop then 'cho' else 'của' end, new.ho_ten),
      '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('co_quyen_quan_ly_lop', old.co_quyen_quan_ly_lop), jsonb_build_object('co_quyen_quan_ly_lop', new.co_quyen_quan_ly_lop)
    );
  end if;

  if new.phan_quyen is distinct from old.phan_quyen then
    perform public.ghi_nhat_ky(
      'doi_phan_quyen', new.ho_ten, format('Đổi phân quyền của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
      jsonb_build_object('phan_quyen', old.phan_quyen), jsonb_build_object('phan_quyen', new.phan_quyen)
    );
  end if;

  -- Người khác sửa hồ sơ của mình (tự sửa hồ sơ của chính mình không ghi)
  if v_uid <> new.id then
    v_cu := jsonb_build_object('ho_ten', old.ho_ten, 'so_dien_thoai', old.so_dien_thoai, 'avatar_url', old.avatar_url, 'email', old.email, 'kinh_nghiem', old.kinh_nghiem);
    v_moi := jsonb_build_object('ho_ten', new.ho_ten, 'so_dien_thoai', new.so_dien_thoai, 'avatar_url', new.avatar_url, 'email', new.email, 'kinh_nghiem', new.kinh_nghiem);
    if v_cu is distinct from v_moi then
      perform public.ghi_nhat_ky(
        'sua_ho_so', new.ho_ten, format('Sửa hồ sơ của %s', new.ho_ten), '/nhan-su/' || new.id, array[new.id],
        public.jsonb_khac(v_cu, v_moi, true), public.jsonb_khac(v_cu, v_moi, false)
      );
    end if;
  end if;
  return null;
end;
$$;


-- ============ Nhật ký: chính sách đọc kiểm tra quyền 1 lần ============
drop policy audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.is_quan_tri()) or (select auth.uid()) = any (nguoi_lien_quan));

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.tb_de_xuat_het_cho() from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_cap_nhat() from public, anon, authenticated;
revoke execute on function public.nhac_check_in() from public, anon, authenticated;
revoke execute on function public.don_thong_bao_cu() from public, anon, authenticated;
revoke execute on function public.nk_profiles() from public, anon, authenticated;
