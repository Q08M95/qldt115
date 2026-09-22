-- Giai đoạn 10, lượt 2: Báo cáo #1 (KPI tổng hợp toàn đơn vị theo kỳ), #2 (xu hướng KPI theo thời gian),
-- #6 (A4 — đóng góp lớp không kinh phí), #7 (đề xuất nhân sự theo kỳ) — mục 4.7.
-- Cả 4 báo cáo chỉ xem theo KỲ ĐÁNH GIÁ (không có khung tuần/tháng/quý/năm như lượt 1), đúng nguyên tắc mục 4.7:
-- gắn chặt với KPI/kỳ nên không có ý nghĩa ở granularity khác.

-- ============ Báo cáo #1: KPI tổng hợp toàn đơn vị theo kỳ ============
-- Vỏ bọc quanh kpi_ky() (đã có từ Giai đoạn 6, giữ nguyên chữ ký để không ảnh hưởng màn hình Cấu hình > Kỳ đánh giá):
-- thêm cột nhóm — CHỈ trả cho Admin/Quản lý lớp, GV/TG nhận null (ẩn nhãn nhóm, mục 4.7/3).
create function public.bc_kpi_tong_hop(p_ky uuid)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  vai_tro public.vai_tro_giang_day,
  nhom public.nhom_nhan_su,
  kpi numeric,
  hang int,
  diem_nhom jsonb,
  gia_tri jsonb,
  trong_so_hieu_luc jsonb,
  gio_thuc numeric,
  gio_quy_doi numeric,
  so_bai int,
  so_lop int,
  a4_ky int,
  a4_luy_ke int,
  che_do_a1 text,
  percentile numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_quan_tri boolean := public.is_quan_tri();
begin
  return query
  select k.user_id, k.ho_ten, k.avatar_url, k.vai_tro,
    case when v_quan_tri then public.nhom_tai_ngay(k.user_id, (select ky.den from public.ky_danh_gia ky where ky.id = p_ky)) end,
    k.kpi, k.hang, k.diem_nhom, k.gia_tri, k.trong_so_hieu_luc, k.gio_thuc, k.gio_quy_doi, k.so_bai, k.so_lop,
    k.a4_ky, k.a4_luy_ke, k.che_do_a1, k.percentile
  from public.kpi_ky(p_ky) k
  order by k.hang;
end;
$$;

-- ============ Báo cáo #2: xu hướng KPI theo thời gian (toàn đơn vị, nhiều kỳ) ============
-- Mỗi kỳ: KPI trung bình toàn đơn vị + theo vai trò (không theo nhóm). Kỳ "Chờ duyệt" chỉ xuất hiện với Admin/Quản lý lớp
-- (đúng nguyên tắc quyền xem KPI mục 7); GV/TG chỉ thấy kỳ Đang mở/Đã đóng. Tối đa p_gioi_han kỳ gần nhất (mặc định 8).
create function public.bc_kpi_theo_ky(p_gioi_han int default 8)
returns table (
  ky_id uuid,
  ten text,
  tu date,
  den date,
  trang_thai public.trang_thai_ky,
  kpi_tb numeric,
  kpi_tb_gv numeric,
  kpi_tb_tg numeric,
  so_nguoi int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_quan_tri boolean := public.is_quan_tri();
  r record;
begin
  -- Lấy N kỳ gần nhất (mới nhất trước) rồi duyệt lại theo thứ tự cũ -> mới, đúng chiều trục thời gian của biểu đồ xu hướng
  for r in
    select k.id, k.ten, k.tu, k.den, k.trang_thai
    from (
      select k.id, k.ten, k.tu, k.den, k.trang_thai
      from public.ky_danh_gia k
      where v_quan_tri or k.trang_thai <> 'cho_duyet'
      order by k.tu desc
      limit greatest(1, least(p_gioi_han, 24))
    ) k
    order by k.tu asc
  loop
    return query
    select r.id, r.ten, r.tu, r.den, r.trang_thai,
      round(avg(x.kpi), 2),
      round(avg(x.kpi) filter (where x.vai_tro = 'giang_vien'), 2),
      round(avg(x.kpi) filter (where x.vai_tro = 'tro_giang'), 2),
      count(*)::int
    from public.kpi_ky(r.id) x;
  end loop;
end;
$$;

-- ============ Báo cáo #6: A4 — đóng góp lớp không kinh phí ============
-- Đếm THEO LỚP (1 lần/lớp không kinh phí đã tham gia dạy — mục 4.2), không phụ thuộc cấu hình KPI nên tính trực tiếp
-- từ dữ liệu, không cần snapshot: a4_ky = trong khoảng kỳ đã chọn; a4_luy_ke = TOÀN THỜI GIAN tính đến hiện tại
-- (không phụ thuộc kỳ đang xem — dùng để xét vinh danh cuối năm, mục 4.2/6). Trả cho mọi người đang/đã từng tham gia.
create function public.bc_a4(p_ky uuid)
returns table (
  user_id uuid,
  ho_ten text,
  avatar_url text,
  vai_tro public.vai_tro_giang_day,
  dang_tham_gia boolean,
  a4_ky int,
  a4_luy_ke int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ky public.ky_danh_gia%rowtype;
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    return;
  end if;
  return query
  with theo_ky as (
    select s.nguoi_phan_cong as uid, count(distinct l.id)::int as n
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and s.nguoi_phan_cong is not null
      and l.trang_thai <> 'da_huy' and l.loai_kinh_phi = 'khong_kinh_phi'
      and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den
    group by s.nguoi_phan_cong
  ),
  luy_ke as (
    select s.nguoi_phan_cong as uid, count(distinct l.id)::int as n
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    join public.lop_hoc l on l.id = b.lop_id
    where s.trang_thai = 'da_phan_cong' and s.nguoi_phan_cong is not null
      and l.trang_thai <> 'da_huy' and l.loai_kinh_phi = 'khong_kinh_phi'
      and b.bat_dau <= now()
    group by s.nguoi_phan_cong
  )
  select p.id, p.ho_ten, p.avatar_url, p.vai_tro_giang_day, (p.trang_thai_tham_gia = 'dang_tham_gia'),
    coalesce(tk.n, 0), coalesce(lk.n, 0)
  from public.profiles p
  left join theo_ky tk on tk.uid = p.id
  left join luy_ke lk on lk.uid = p.id
  where p.vai_tro_giang_day is not null and (p.trang_thai_tham_gia = 'dang_tham_gia' or lk.uid is not null)
  order by coalesce(lk.n, 0) desc, coalesce(tk.n, 0) desc, p.ho_ten;
end;
$$;

-- ============ Báo cáo #7: đề xuất nhân sự — thống kê theo loại/kỳ (không lộ ai được đề xuất gì) ============
-- Đề xuất "Đổi nhóm" luôn gắn ky_id (sinh khi đóng kỳ); các loại khác (phân công/đào tạo/khen thưởng-nhắc nhở) do Admin
-- tạo thủ công bất kỳ lúc nào, không có ky_id nên quy về kỳ theo NGÀY TẠO. Công khai số liệu cho mọi người (mục 4.7);
-- không trả user_id/nội dung — mức chi tiết đó thuộc Nhật ký hệ thống (chỉ Admin/Quản lý lớp).
create function public.bc_de_xuat(p_ky uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ky public.ky_danh_gia%rowtype;
  v_theo_loai jsonb;
  v_cho_duyet int;
  v_da_duyet int;
  v_bo_qua int;
begin
  select k.* into v_ky from public.ky_danh_gia k where k.id = p_ky;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'loai', x.loai, 'cho_duyet', x.cho_duyet, 'da_duyet', x.da_duyet, 'bo_qua', x.bo_qua
    ) order by x.loai), '[]'::jsonb),
    coalesce(sum(x.cho_duyet), 0)::int, coalesce(sum(x.da_duyet), 0)::int, coalesce(sum(x.bo_qua), 0)::int
  into v_theo_loai, v_cho_duyet, v_da_duyet, v_bo_qua
  from (
    select d.loai,
      (count(*) filter (where d.trang_thai = 'cho_duyet'))::int as cho_duyet,
      (count(*) filter (where d.trang_thai = 'da_duyet'))::int as da_duyet,
      (count(*) filter (where d.trang_thai = 'bo_qua'))::int as bo_qua
    from public.de_xuat_nhan_su d
    where (d.ky_id = p_ky) or (d.ky_id is null and (d.created_at at time zone 'Asia/Ho_Chi_Minh')::date between v_ky.tu and v_ky.den)
    group by d.loai
  ) x;

  return jsonb_build_object('theo_loai', v_theo_loai, 'cho_duyet', v_cho_duyet, 'da_duyet', v_da_duyet, 'bo_qua', v_bo_qua);
end;
$$;

revoke execute on function public.bc_kpi_tong_hop(uuid) from public, anon;
revoke execute on function public.bc_kpi_theo_ky(int) from public, anon;
revoke execute on function public.bc_a4(uuid) from public, anon;
revoke execute on function public.bc_de_xuat(uuid) from public, anon;
grant execute on function public.bc_kpi_tong_hop(uuid) to authenticated;
grant execute on function public.bc_kpi_theo_ky(int) to authenticated;
grant execute on function public.bc_a4(uuid) to authenticated;
grant execute on function public.bc_de_xuat(uuid) to authenticated;
