-- Giai đoạn 1 / File 3: đặt Admin đầu tiên (chạy trong SQL Editor với quyền postgres,
-- nên không bị chặn bởi grant cột). Sau này dùng hàm dat_phan_quyen / gan_quyen_quan_ly_lop.
update public.profiles
set phan_quyen = 'admin'
where lower(email) = lower('nguyenhoangtuminh08@gmail.com');

select id, email, ho_ten, phan_quyen, co_quyen_quan_ly_lop
from public.profiles
order by created_at;
