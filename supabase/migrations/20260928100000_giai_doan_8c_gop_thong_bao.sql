-- Gộp bớt thông báo (theo phản hồi: thông báo gộp cho Admin theo lớp; nhắc check-in gộp khi các Bài liền nhau)
--   * B: "Đăng ký cần duyệt" của Admin gộp theo LỚP (trước đây theo từng người đăng ký): 1 thông báo/lớp, cập nhật số người + số lượt Bài + vài tên
--        khi có thêm hoặc khi một phần được xử lý; xử lý hết thì tự đã đọc. Thông báo đã đọc rồi mà có đăng ký mới thì tạo thông báo mới (và mới có push).
--   * D: nhắc check-in gộp: các Bài của cùng 1 người mà Bài sau bắt đầu cách giờ kết thúc Bài trước dưới 3 giờ được nhắc chung trong 1 thông báo
--        (đến hạn nhắc theo Bài đầu tiên). Thông báo chỉ tự đã đọc khi check-in đủ các Bài trong đó.

alter table public.thong_bao add column bai_ids uuid[];

-- Số đăng ký tự nguyện đang chờ của 1 lớp -> đồng bộ thông báo gộp của các Admin. p_moi = true (có đăng ký mới): đưa thông báo lên đầu + tạo mới nếu đã đọc.
create function public.dong_bo_tb_dang_ky_lop(p_lop uuid, p_moi boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_khoa text := 'dang_ky:' || p_lop;
  v_lop text;
  v_nguoi int;
  v_luot int;
  v_ten text;
  v_nd text;
  a record;
begin
  select l.ten into v_lop from public.lop_hoc l where l.id = p_lop;
  select count(distinct d.user_id)::int, count(*)::int into v_nguoi, v_luot
  from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
  where b.lop_id = p_lop and d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly';

  if v_luot = 0 then
    update public.thong_bao set da_doc = true where khoa = v_khoa and not da_doc;
    return;
  end if;

  select string_agg(q.ho_ten, ', ' order by q.ho_ten) into v_ten from (
    select distinct p.ho_ten from public.dang_ky_giang_day d
    join public.bai_hoc b on b.id = d.bai_id join public.profiles p on p.id = d.user_id
    where b.lop_id = p_lop and d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly'
    order by p.ho_ten limit 3
  ) q;
  v_nd := format('%s người đăng ký (%s lượt Bài) đang chờ duyệt — lớp %s: %s%s.', v_nguoi, v_luot, v_lop, v_ten,
                 case when v_nguoi > 3 then format(' và %s người khác', v_nguoi - 3) else '' end);

  for a in select q.id from public.nguoi_quan_tri() q loop
    if p_moi then
      update public.thong_bao set noi_dung = v_nd, created_at = now() where user_id = a.id and khoa = v_khoa and not da_doc;
    else
      update public.thong_bao set noi_dung = v_nd where user_id = a.id and khoa = v_khoa and not da_doc;
    end if;
    if not found and p_moi then
      perform public.tao_thong_bao(a.id, 'dang_ky_can_duyet', 'can_hanh_dong', 'Đăng ký cần duyệt', v_nd, '/lop-hoc/' || p_lop, v_khoa, true);
    end if;
  end loop;
end;
$$;

create or replace function public.tb_dang_ky_moi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  x record;
begin
  for r in
    select m.id, m.user_id, m.vai_tro, b.ten as bai_ten, b.bat_dau, l.id as lop_id, l.ten as lop_ten
    from moi m
    join public.bai_hoc b on b.id = m.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where m.loai = 'duoc_moi' and m.trang_thai = 'cho_xu_ly'
  loop
    perform public.tao_thong_bao(
      r.user_id, 'duoc_moi', 'can_hanh_dong', 'Bạn được mời dạy',
      format('Lớp %s — %s (%s), %s. Hãy xác nhận hoặc từ chối.', r.lop_ten, r.bai_ten, public.ten_vai_tro(r.vai_tro), public.dinh_dang_gio(r.bat_dau)),
      '/lop-hoc/' || r.lop_id, 'loi_moi:' || r.id
    );
  end loop;

  -- Đăng ký tự nguyện: gộp theo LỚP — mỗi Admin chỉ có 1 thông báo "đăng ký cần duyệt" cho mỗi lớp, cập nhật số người/lượt khi có thêm
  for x in
    select distinct b.lop_id
    from moi m join public.bai_hoc b on b.id = m.bai_id
    where m.loai = 'tu_dang_ky' and m.trang_thai = 'cho_xu_ly'
  loop
    perform public.dong_bo_tb_dang_ky_lop(x.lop_id, true);
  end loop;
  return null;
end;
$$;

create or replace function public.tb_dang_ky_cap_nhat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  a record;
  x record;
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
  -- Số đăng ký chờ của từng lớp vừa đổi: còn thì cập nhật số trong thông báo gộp, hết thì thông báo "cần duyệt" tự đã đọc
  for x in
    select distinct b.lop_id
    from moi m
    join cu on cu.id = m.id
    join public.bai_hoc b on b.id = m.bai_id
    where m.loai = 'tu_dang_ky' and cu.trang_thai = 'cho_xu_ly' and m.trang_thai <> 'cho_xu_ly'
  loop
    perform public.dong_bo_tb_dang_ky_lop(x.lop_id, false);
  end loop;
  return null;
end;
$$;

create or replace function public.tb_diem_danh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bai text;
  v_lop_id uuid;
  v_lop text;
begin
  if tg_op = 'INSERT' and new.check_in_luc is not null then
    -- Nhắc check-in (có thể gộp nhiều Bài): chỉ chuyển đã đọc khi mọi Bài trong thông báo đều đã có điểm danh
    update public.thong_bao t set da_doc = true
    where t.user_id = new.user_id and t.loai = 'nhac_check_in' and not t.da_doc
      and (t.khoa = 'nhac_check_in:' || new.bai_id || ':' || new.user_id or new.bai_id = any (t.bai_ids))
      and not exists (
        select 1 from unnest(coalesce(t.bai_ids, '{}'::uuid[])) as x(id)
        where x.id <> new.bai_id
          and not exists (select 1 from public.diem_danh_bai d where d.bai_id = x.id and d.user_id = t.user_id)
      );
  end if;

  if new.chinh_luc is not null and new.chinh_boi is distinct from new.user_id
     and (tg_op = 'INSERT' or old.chinh_luc is distinct from new.chinh_luc) then
    select b.ten, l.id, l.ten into v_bai, v_lop_id, v_lop
    from public.bai_hoc b join public.lop_hoc l on l.id = b.lop_id where b.id = new.bai_id;
    perform public.tao_thong_bao(
      new.user_id, 'sua_diem_danh', 'thong_tin', 'Điểm danh của bạn đã được chỉnh sửa',
      format('Lớp %s — %s: B1 = %s%%. Lý do: %s.', v_lop, v_bai, trim(to_char(new.b1_phan_tram, 'FM990.##')), coalesce(new.ly_do_chinh, '—')),
      '/lop-hoc/' || v_lop_id
    );
  end if;
  return null;
end;
$$;

-- Nhắc check-in gộp (xem đầu file). Mỗi thông báo lưu danh sách Bài đã phủ (bai_ids) để Bài đến hạn sau không bị nhắc lặp.
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
  u record;
  h record;
  c record;
  v_ids uuid[];
  v_ds text;
  v_truoc timestamptz;
  v_so int;
  v_khoa text;
  v_td text;
  v_nd text;
  v_ok boolean;
  v_n int := 0;
begin
  -- Nhắc check-in quá 6 giờ thì đã hết ý nghĩa: tự chuyển sang đã đọc để không tồn đọng thành "cần hành động"
  update public.thong_bao set da_doc = true where loai = 'nhac_check_in' and not da_doc and created_at < now() - interval '6 hours';

  for u in
    select distinct s.nguoi_phan_cong as uid
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
      and b.bat_dau > now() and b.bat_dau <= now() + make_interval(mins => v_phut)
      and not exists (select 1 from public.diem_danh_bai d where d.bai_id = b.id and d.user_id = s.nguoi_phan_cong)
  loop
    loop
      -- Bài sớm nhất đã đến hạn nhắc mà chưa nằm trong thông báo nhắc nào
      select b.id as bai_id, b.bat_dau, l.id as lop_id into h
      from public.slot_giang_day s
      join public.bai_hoc b on b.id = s.bai_id
      join public.lop_hoc l on l.id = b.lop_id
      where s.nguoi_phan_cong = u.uid and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
        and b.bat_dau > now() and b.bat_dau <= now() + make_interval(mins => v_phut)
        and not exists (select 1 from public.diem_danh_bai d where d.bai_id = b.id and d.user_id = u.uid)
        and not exists (
          select 1 from public.thong_bao t
          where t.user_id = u.uid and t.loai = 'nhac_check_in'
            and (b.id = any (t.bai_ids) or t.khoa like 'nhac_check_in:' || b.id::text || ':%')
        )
      order by b.bat_dau limit 1;
      exit when not found;

      -- Chuỗi Bài liền nhau từ Bài đó (nghỉ giữa 2 Bài < 3 giờ), chưa check-in
      v_ids := '{}'; v_ds := ''; v_truoc := null; v_so := 0;
      for c in
        select b.id, b.ten as bai_ten, b.bat_dau, b.ket_thuc, l.ten as lop_ten
        from public.slot_giang_day s
        join public.bai_hoc b on b.id = s.bai_id
        join public.lop_hoc l on l.id = b.lop_id
        where s.nguoi_phan_cong = u.uid and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
          and b.bat_dau >= h.bat_dau
          and not exists (select 1 from public.diem_danh_bai d where d.bai_id = b.id and d.user_id = u.uid)
        order by b.bat_dau
      loop
        if v_truoc is not null and c.bat_dau - v_truoc >= interval '3 hours' then
          exit;
        end if;
        v_ids := v_ids || c.id;
        v_so := v_so + 1;
        v_ds := v_ds || case when v_ds = '' then '' else E'\n' end || format('• %s — %s, %s', c.lop_ten, c.bai_ten, public.dinh_dang_gio(c.bat_dau));
        v_truoc := c.ket_thuc;
      end loop;

      v_khoa := 'nhac_check_in:' || h.bai_id || ':' || u.uid;
      if v_so = 1 then
        v_td := 'Sắp đến giờ dạy — nhớ check-in';
        v_nd := format('%s. Bấm "Tôi đã có mặt" để không bị tính 0%% chuyên cần.', substring(v_ds from 3));
      else
        v_td := format('Sắp đến giờ dạy — %s Bài liên tiếp, nhớ check-in', v_so);
        v_nd := v_ds || E'\nBấm "Tôi đã có mặt" ở từng Bài để không bị tính 0% chuyên cần.';
      end if;
      v_ok := public.tao_thong_bao(u.uid, 'nhac_check_in', 'can_hanh_dong', v_td, v_nd, '/lop-hoc/' || h.lop_id, v_khoa);
      exit when not v_ok;
      update public.thong_bao set bai_ids = v_ids where user_id = u.uid and khoa = v_khoa;
      v_n := v_n + 1;
    end loop;
  end loop;
  return v_n;
end;
$$;

-- ============ Chuyển thông báo "đăng ký cần duyệt" cũ (theo từng người) sang dạng gộp theo lớp ============
update public.thong_bao set da_doc = true
where loai = 'dang_ky_can_duyet' and not da_doc and khoa ~ '^dang_ky:[^:]+:[^:]+$';

do $$
declare
  r record;
begin
  for r in
    select distinct b.lop_id
    from public.dang_ky_giang_day d join public.bai_hoc b on b.id = d.bai_id
    where d.loai = 'tu_dang_ky' and d.trang_thai = 'cho_xu_ly'
  loop
    perform public.dong_bo_tb_dang_ky_lop(r.lop_id, true);
  end loop;
end;
$$;

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.dong_bo_tb_dang_ky_lop(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_moi() from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_cap_nhat() from public, anon, authenticated;
revoke execute on function public.tb_diem_danh() from public, anon, authenticated;
revoke execute on function public.nhac_check_in() from public, anon, authenticated;
