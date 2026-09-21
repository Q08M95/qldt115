-- Dọn NHẬT KÝ và thông báo còn sót của dữ liệu demo Giai đoạn 8-9 (chạy SAU KHI đã chạy: node scripts/demo-gd89.mjs xoa).
-- Nhật ký là bảng chỉ-thêm nên script Node không xóa được; script này chạy trong SQL Editor (quyền cao) và CHỈ xóa dòng gắn với demo:
--   * do tài khoản demo thực hiện (tên bắt đầu "GD89 "), hoặc nhắc tới lớp/đối tượng/mô tả có chữ "Demo GD89" / "GD89 ".
-- Kết quả: 2 số dòng đã xóa.
with a as (
  delete from public.audit_log
  where nguoi_thuc_hien_ten like 'GD89 %'
     or doi_tuong like '%Demo GD89%' or mo_ta like '%Demo GD89%' or mo_ta like '%GD89 %' or doi_tuong like '%GD89 %'
  returning 1
),
b as (
  delete from public.thong_bao
  where noi_dung like '%Demo GD89%' or tieu_de like '%Demo GD89%'
  returning 1
)
select (select count(*) from a) as so_dong_nhat_ky_da_xoa, (select count(*) from b) as so_thong_bao_da_xoa;
