-- Liên kết thông báo "cần hành động" về đúng nơi xử lý (theo phản hồi test) + giữ thông báo gọn theo thời gian
--   * "Đăng ký cần duyệt" (Admin) và "Bạn được mời dạy" (GV/TG) dẫn tới trang "Đăng ký giảng dạy" (/dang-ky) — nơi tập trung việc cần duyệt / lời mời cần
--     phản hồi kèm nút thao tác — thay vì trang chi tiết lớp. Cập nhật luôn các thông báo đang có.
--   * Thông báo đã đọc giữ 90 ngày (trước 180) rồi dọn hằng ngày; mọi thông báo quá 365 ngày dọn như cũ.

create or replace function public.dong_bo_tb_dang_ky_lop(p_lop uuid, p_moi boolean)
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
      perform public.tao_thong_bao(a.id, 'dang_ky_can_duyet', 'can_hanh_dong', 'Đăng ký cần duyệt', v_nd, '/dang-ky', v_khoa, true);
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
      '/dang-ky', 'loi_moi:' || r.id
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

update public.thong_bao set lien_ket = '/dang-ky'
where loai in ('dang_ky_can_duyet', 'duoc_moi') and lien_ket is distinct from '/dang-ky';

create or replace function public.don_thong_bao_cu()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  delete from public.thong_bao where (da_doc and created_at < now() - interval '90 days') or created_at < now() - interval '365 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.dong_bo_tb_dang_ky_lop(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.tb_dang_ky_moi() from public, anon, authenticated;
revoke execute on function public.don_thong_bao_cu() from public, anon, authenticated;
