-- Giai đoạn 13 (QA đầu-cuối) — sửa lỗi thật phát hiện khi kiểm thử qua UI: goi_y_core() luôn trả "dang_ky" cho MỌI
-- ứng viên khi người xem là Admin/Quản lý lớp hoặc chính người đó, DÙ KHÔNG có bản ghi đăng ký/lời mời nào tồn tại.
--
-- Nguyên nhân: dòng
--   case when v_quan_tri or u.uid = v_me then (case dk.loai when 'duoc_moi' then 'duoc_moi' else 'dang_ky' end) end
-- dùng CASE dk.loai WHEN ... ELSE 'dang_ky' — khi LEFT JOIN dang_ky_giang_day không khớp (dk.loai là NULL, tức
-- chưa hề có đăng ký/lời mời), biểu thức CASE rơi vào nhánh ELSE và trả nhầm 'dang_ky' thay vì NULL.
--
-- Hậu quả thực tế: component GoiYBai chỉ hiện nút "Mời" (NutMoi) khi `!u.trang_thai_hien_co` — vì trường này luôn
-- có giá trị (không bao giờ NULL) với người xem là Admin/Quản lý lớp, nút "Mời" KHÔNG BAO GIỜ hiện được cho bất kỳ
-- ứng viên nào chưa từng đăng ký/được mời trước đó — Luồng B (mời dạy ngay lúc tạo Bài, mục 4.3) coi như bị vô hiệu
-- hóa hoàn toàn từ khi hàm này được tạo (Giai đoạn 5c) tới nay, không lộ ra qua test trước đó vì các kịch bản test
-- trước giờ đều chèn thẳng dữ liệu demo vào dang_ky_giang_day, luôn có sẵn 1 bản ghi khớp nên vô tình che mất lỗi.
-- Phát hiện bằng kiểm thử qua UI thật với dữ liệu hoàn toàn trống (Giai đoạn 13).
--
-- Sửa: chỉ trả trang_thai_hien_co/dang_ky_id khi THỰC SỰ có bản ghi khớp (dk.id is not null).
create or replace function public.goi_y_core(
  p_lop uuid,
  p_bai uuid,
  p_vai public.vai_tro_giang_day,
  p_chi_con_trong boolean
)
returns table (
  bai_id uuid,
  vai_tro public.vai_tro_giang_day,
  user_id uuid,
  ho_ten text,
  avatar_url text,
  diem numeric,
  hang int,
  gio_ky numeric,
  so_lop_khong_kinh_phi int,
  cung_lop int,
  trang_thai_hien_co text,
  dang_ky_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_lop public.lop_hoc%rowtype;
  v_tu date;
  v_den date;
  v_w numeric := public.cau_hinh_so('matching_ty_trong_cong_bang', 0.8);
  v_phat numeric := public.cau_hinh_so('matching_phat_cung_lop', 0.1);
  v_quan_tri boolean := public.is_quan_tri();
  v_me uuid := (select auth.uid());
begin
  select l.* into v_lop from public.lop_hoc l where l.id = p_lop;
  if not found then
    return;
  end if;
  -- Chỉ người nhìn thấy được lớp mới xem được gợi ý (lớp Nháp chưa công khai sớm bị ẩn với GV/TG)
  if not (v_quan_tri or v_lop.trang_thai <> 'nhap' or v_lop.cong_khai_som) then
    return;
  end if;
  select k.tu, k.den into v_tu, v_den from public.ky_hien_tai() k;

  return query
  with cap as (
    -- Các cặp (Bài, vai trò) cần gợi ý
    select distinct s.bai_id as bid, s.vai_tro as vt, b.bat_dau as b_bd, b.ket_thuc as b_kt
    from public.slot_giang_day s
    join public.bai_hoc b on b.id = s.bai_id
    where b.lop_id = p_lop
      and (p_bai is null or b.id = p_bai)
      and (p_vai is null or s.vai_tro = p_vai)
      and (not p_chi_con_trong or exists (
        select 1 from public.slot_giang_day s2
        where s2.bai_id = s.bai_id and s2.vai_tro = s.vai_tro and s2.nguoi_phan_cong is null))
  ),
  dan_so as (
    -- Mọi người đang tham gia, kèm nhóm, số giờ trong kỳ và A4 — tập so sánh percentile theo nhóm (tính 1 lần)
    select p.id as uid, n.nhom as nhom_nv,
      coalesce((
        select sum(extract(epoch from (b.ket_thuc - b.bat_dau))::numeric / 3600.0)
        from public.slot_giang_day s
        join public.bai_hoc b on b.id = s.bai_id
        join public.lop_hoc l on l.id = b.lop_id
        where s.nguoi_phan_cong = p.id and s.trang_thai = 'da_phan_cong' and l.trang_thai <> 'da_huy'
          and (b.bat_dau at time zone 'Asia/Ho_Chi_Minh')::date between v_tu and v_den
      ), 0) as gio,
      (
        select count(distinct l.id)::int
        from public.slot_giang_day s
        join public.bai_hoc b on b.id = s.bai_id
        join public.lop_hoc l on l.id = b.lop_id
        where s.nguoi_phan_cong = p.id and s.trang_thai = 'da_phan_cong'
          and l.trang_thai <> 'da_huy' and l.loai_kinh_phi = 'khong_kinh_phi'
      ) as a4,
      (
        select count(*)::int from public.slot_giang_day s3
        join public.bai_hoc b3 on b3.id = s3.bai_id
        where b3.lop_id = p_lop and s3.nguoi_phan_cong = p.id
      ) as so_cung_lop
    from public.profiles p
    join public.nhan_su_nhom n on n.user_id = p.id
    where p.trang_thai_tham_gia = 'dang_tham_gia'
  ),
  chi_so as (
    select d.uid, d.nhom_nv, d.gio, d.a4, d.so_cung_lop,
      case when v_lop.loai_kinh_phi = 'khong_kinh_phi' then d.a4::numeric else d.gio end as cs
    from dan_so d
  ),
  pr as (
    select c.uid, c.nhom_nv, c.gio, c.a4, c.so_cung_lop,
      count(*) over (partition by c.nhom_nv) as n_nhom,
      rank() over (partition by c.nhom_nv order by c.cs) as rk,
      (cume_dist() over (partition by c.nhom_nv order by c.cs))::numeric as cd
    from chi_so c
  ),
  ung as (
    -- Lọc cứng bằng truy vấn tập hợp (tương đương ly_do_khong_du_dieu_kien):
    -- vai trò khớp, nhóm nằm trong nhóm đủ điều kiện của lớp, đủ chứng chỉ yêu cầu, chưa giữ slot trong Bài, không trùng lịch
    select cap.bid, cap.vt, pf.id as uid, pf.ho_ten as ten, pf.avatar_url as anh, pr.gio, pr.a4, pr.so_cung_lop,
      round(
        v_w * (1 - (((pr.rk - 1)::numeric / pr.n_nhom) + pr.cd) / 2)
        + (1 - v_w) * coalesce(public.kpi_gan_nhat(pf.id) / 100.0, 0.5)
        - case when pr.so_cung_lop > 0 then v_phat else 0 end
      , 4) as diem_tinh
    from cap
    join pr on true
    join public.profiles pf on pf.id = pr.uid and pf.vai_tro_giang_day = cap.vt
    where pr.nhom_nv in (select d.nhom from public.lop_hoc_nhom_du_dieu_kien d where d.lop_id = p_lop)
      and not exists (
        select 1 from public.lop_hoc_chung_chi_yeu_cau r
        where r.lop_id = p_lop
          and not exists (select 1 from public.chung_chi c where c.user_id = pr.uid and c.loai_id = r.loai_id)
      )
      and not exists (
        select 1 from public.slot_giang_day sx where sx.bai_id = cap.bid and sx.nguoi_phan_cong = pr.uid
      )
      and not exists (
        select 1
        from public.slot_giang_day s2
        join public.bai_hoc b2 on b2.id = s2.bai_id and b2.id <> cap.bid
        join public.lop_hoc l2 on l2.id = b2.lop_id and l2.trang_thai <> 'da_huy'
        where s2.nguoi_phan_cong = pr.uid and s2.trang_thai = 'da_phan_cong'
          and b2.bat_dau < cap.b_kt and b2.ket_thuc > cap.b_bd
      )
  )
  select u.bid, u.vt, u.uid, u.ten, u.anh, u.diem_tinh,
    (row_number() over (partition by u.bid, u.vt order by u.diem_tinh desc, u.gio asc, u.ten))::int,
    round(u.gio, 2),
    u.a4,
    u.so_cung_lop,
    -- ĐÃ SỬA: thêm điều kiện "dk.id is not null" — trước đây thiếu điều kiện này nên LEFT JOIN không khớp (dk.loai
    -- NULL) vẫn rơi vào nhánh ELSE và trả nhầm 'dang_ky'.
    case when (v_quan_tri or u.uid = v_me) and dk.id is not null then (case dk.loai when 'duoc_moi' then 'duoc_moi' else 'dang_ky' end) end,
    case when (v_quan_tri or u.uid = v_me) and dk.id is not null then dk.id end
  from ung u
  left join public.dang_ky_giang_day dk
    on dk.bai_id = u.bid and dk.user_id = u.uid and dk.trang_thai = 'cho_xu_ly' and (v_quan_tri or u.uid = v_me)
  order by u.bid, u.vt, 7;
end;
$$;
