-- Giai đoạn 8 (bổ sung): tùy chọn thông báo theo loại + thử lại push khi gửi lỗi
--
--   * Mỗi người tắt/bật được từng loại thông báo "không bắt buộc" theo 2 kênh: trong app và đẩy (push). Loại bắt buộc (lời mời dạy, đổi lịch,
--     hủy lớp/phân công, nhắc check-in, kết quả đổi nhóm, sửa điểm danh, Quyền Quản lý lớp) luôn gửi đầy đủ — đặc biệt nhắc check-in là bắt buộc (mục 4.4).
--     Không có dòng tùy chọn = bật cả hai kênh (mặc định).
--   * Push gửi lỗi tạm thời được thử lại: app đếm số lần thử/thời điểm thử cuối trên thông báo, job mỗi phút gọi lại webhook cho thông báo
--     chưa đọc, chưa gửi được, tạo trong 30 phút gần đây, tối đa 3 lần.

-- ============ Tùy chọn thông báo ============
create table public.thong_bao_tuy_chon (
  user_id uuid not null references public.profiles (id) on delete cascade,
  loai public.loai_thong_bao not null,
  trong_app boolean not null default true,
  day_push boolean not null default true,
  primary key (user_id, loai)
);

revoke all on table public.thong_bao_tuy_chon from anon, authenticated;
grant select on public.thong_bao_tuy_chon to authenticated;
alter table public.thong_bao_tuy_chon enable row level security;
create policy thong_bao_tuy_chon_select on public.thong_bao_tuy_chon for select to authenticated
  using (user_id = (select auth.uid()));

-- Loại thông báo cho phép người dùng tắt (còn lại là bắt buộc)
create function public.loai_thong_bao_tat_duoc(p public.loai_thong_bao)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p in ('bai_trong_moi', 'dang_ky_ket_qua', 'loi_moi_ket_qua', 'cong_bo_kpi', 'dang_ky_can_duyet', 'de_xuat_can_duyet');
$$;

create function public.luu_tuy_chon_thong_bao(p_loai public.loai_thong_bao, p_trong_app boolean, p_day_push boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_app boolean := coalesce(p_trong_app, true);
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if not public.loai_thong_bao_tat_duoc(p_loai) then
    raise exception 'Loại thông báo này là bắt buộc, không tắt được' using errcode = '23514';
  end if;
  -- Tắt trong app thì không có thông báo nào để đẩy => tắt luôn push
  insert into public.thong_bao_tuy_chon (user_id, loai, trong_app, day_push)
  values (v_uid, p_loai, v_app, v_app and coalesce(p_day_push, true))
  on conflict (user_id, loai) do update set trong_app = excluded.trong_app, day_push = excluded.day_push;
end;
$$;

-- Tạo thông báo: tôn trọng tùy chọn "trong app"
create or replace function public.tao_thong_bao(
  p_user uuid,
  p_loai public.loai_thong_bao,
  p_muc public.muc_do_thong_bao,
  p_tieu_de text,
  p_noi_dung text,
  p_lien_ket text,
  p_khoa text default null,
  p_gop boolean default false,
  p_ke_ca_nguoi_thao_tac boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return false;
  end if;
  if not p_ke_ca_nguoi_thao_tac and p_user is not distinct from (select auth.uid()) then
    return false;
  end if;
  if public.loai_thong_bao_tat_duoc(p_loai) and exists (
    select 1 from public.thong_bao_tuy_chon o where o.user_id = p_user and o.loai = p_loai and not o.trong_app
  ) then
    return false;
  end if;
  if p_khoa is not null and exists (
    select 1 from public.thong_bao t
    where t.user_id = p_user and t.khoa = p_khoa and (not p_gop or not t.da_doc)
  ) then
    return false;
  end if;
  insert into public.thong_bao (user_id, loai, muc_do, tieu_de, noi_dung, lien_ket, khoa)
  values (p_user, p_loai, p_muc, p_tieu_de, p_noi_dung, p_lien_ket, p_khoa);
  return true;
end;
$$;

-- ============ Thử lại push ============
alter table public.thong_bao
  add column push_luc timestamptz,
  add column push_so_lan smallint not null default 0,
  add column push_lan_cuoi timestamptz;

-- Gọi webhook push của app cho 1 thông báo (dùng chung cho trigger lần đầu và job thử lại). Thiếu pg_net/cấu hình thì bỏ qua.
create function public.goi_webhook_push(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  if to_regnamespace('net') is null then
    return;
  end if;
  select h.url, h.secret into c from public.cau_hinh_push h;
  if not found then
    return;
  end if;
  begin
    perform net.http_post(
      url := c.url,
      body := jsonb_build_object('id', p_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', c.secret)
    );
  exception when others then
    raise warning 'Không gọi được webhook push: %', sqlerrm;
  end;
end;
$$;

create or replace function public.tb_gui_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.push_subscription s where s.user_id = new.user_id) then
    return null;
  end if;
  if public.loai_thong_bao_tat_duoc(new.loai) and exists (
    select 1 from public.thong_bao_tuy_chon o where o.user_id = new.user_id and o.loai = new.loai and not o.day_push
  ) then
    return null;
  end if;
  perform public.goi_webhook_push(new.id);
  return null;
end;
$$;

-- Thông báo chưa đọc, chưa đẩy được, tạo trong 30 phút gần đây: gọi lại webhook (tối đa 3 lần, cách nhau >= 2 phút). Trả về số thông báo đã gọi lại.
create function public.thu_lai_push()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_n int := 0;
begin
  for r in
    select t.id
    from public.thong_bao t
    where not t.da_doc
      and t.push_luc is null
      and t.push_so_lan < 3
      and t.created_at > now() - interval '30 minutes'
      and ((t.push_lan_cuoi is null and t.created_at < now() - interval '1 minute') or t.push_lan_cuoi < now() - interval '2 minutes')
      and exists (select 1 from public.push_subscription s where s.user_id = t.user_id)
      and not (
        public.loai_thong_bao_tat_duoc(t.loai)
        and exists (select 1 from public.thong_bao_tuy_chon o where o.user_id = t.user_id and o.loai = t.loai and not o.day_push)
      )
    order by t.created_at
    limit 100
  loop
    perform public.goi_webhook_push(r.id);
    -- Ghi nhận lần thử ngay tại đây để không gọi dồn dập nếu app chưa kịp phản hồi
    update public.thong_bao set push_so_lan = push_so_lan + 1, push_lan_cuoi = now() where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.schedule('thu-lai-push', '* * * * *', 'select public.thu_lai_push()');
  end if;
end;
$$;

-- ============ Phân quyền thực thi hàm ============
revoke execute on function public.loai_thong_bao_tat_duoc(public.loai_thong_bao) from public, anon, authenticated;
revoke execute on function public.luu_tuy_chon_thong_bao(public.loai_thong_bao, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.tao_thong_bao(uuid, public.loai_thong_bao, public.muc_do_thong_bao, text, text, text, text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.goi_webhook_push(uuid) from public, anon, authenticated;
revoke execute on function public.tb_gui_push() from public, anon, authenticated;
revoke execute on function public.thu_lai_push() from public, anon, authenticated;
grant execute on function public.luu_tuy_chon_thong_bao(public.loai_thong_bao, boolean, boolean) to authenticated;
