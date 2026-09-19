-- Giai đoạn 1 / File 4: sửa khóa ngoại nhan_su_nhom.updated_by
-- Lỗi: thiếu ON DELETE nên không xóa được tài khoản của người từng đặt nhóm cho người khác.
-- updated_by chỉ là thông tin "ai sửa gần nhất" nên khi người đó bị xóa thì đặt về NULL
-- (lịch sử đầy đủ sẽ nằm ở audit_log, Giai đoạn 9).
alter table public.nhan_su_nhom
  drop constraint nhan_su_nhom_updated_by_fkey,
  add constraint nhan_su_nhom_updated_by_fkey
    foreign key (updated_by) references auth.users (id) on delete set null;
