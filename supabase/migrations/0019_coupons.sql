-- Custom Drip Chennai — coupon codes
-- Run in the Supabase SQL Editor AFTER 0018_online_payments.sql.
--
-- The admin creates codes (e.g. DRIP10 = 10% off) in Admin → Coupons. A customer types one at
-- checkout; the discount comes off the items' subtotal (shipping is worked out on the subtotal
-- before the discount, so a coupon never takes free shipping away). The database checks the
-- code when the order is placed, so the price can't be changed from the browser.

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'cancel_unpaid_order') then
    raise exception 'Run 0018_online_payments.sql before 0019_coupons.sql.';
  end if;
end $$;

-- coupons -------------------------------------------------------------------------------------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent_off int not null check (percent_off between 1 and 90),
  is_active boolean not null default true,
  expires_at timestamptz,                         -- null: no end date
  min_order_amount numeric(10,2) check (min_order_amount is null or min_order_amount >= 0),
  max_uses int check (max_uses is null or max_uses > 0),   -- null: unlimited
  once_per_customer boolean not null default false,
  created_at timestamptz not null default now(),
  constraint coupons_code_format check (code ~ '^[A-Z0-9_-]{3,30}$')
);
create unique index if not exists coupons_code_idx on coupons (code);

alter table coupons enable row level security;
-- Only admins read or change coupons directly; customers' checks go through the server.
drop policy if exists coupons_admin_all on coupons;
create policy coupons_admin_all on coupons for all using (is_admin()) with check (is_admin());

-- orders: which coupon, and how much it took off ---------------------------------------------
alter table orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0);
create index if not exists orders_coupon_code_idx on orders (coupon_code) where coupon_code is not null;

-- coupon_check(): can this customer use this code on this subtotal? -----------------------------
-- Returns the coupon's percent and the discount, or raises INVALID_COUPON / COUPON_MIN_ORDER /
-- COUPON_USED_UP / COUPON_ALREADY_USED. Uses still count while an online payment is pending;
-- failed or rejected orders don't count.
create or replace function coupon_check(p_code text, p_subtotal numeric, p_email text, p_lock boolean default false)
returns table (out_code text, out_percent_off int, out_discount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon coupons%rowtype;
  v_uses int;
begin
  if p_lock then
    select * into v_coupon from coupons where code = upper(trim(p_code)) for update;
  else
    select * into v_coupon from coupons where code = upper(trim(p_code));
  end if;

  if not found or not v_coupon.is_active or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
    raise exception 'INVALID_COUPON';
  end if;

  if v_coupon.min_order_amount is not null and p_subtotal < v_coupon.min_order_amount then
    raise exception 'COUPON_MIN_ORDER:%', v_coupon.min_order_amount;
  end if;

  if v_coupon.max_uses is not null then
    select count(*) into v_uses from orders
      where coupon_code = v_coupon.code and payment_status not in ('failed', 'rejected');
    if v_uses >= v_coupon.max_uses then
      raise exception 'COUPON_USED_UP';
    end if;
  end if;

  if v_coupon.once_per_customer and exists (
    select 1 from orders
      where coupon_code = v_coupon.code
        and email = lower(trim(p_email))
        and payment_status not in ('failed', 'rejected')
  ) then
    raise exception 'COUPON_ALREADY_USED';
  end if;

  return query select v_coupon.code, v_coupon.percent_off, round(p_subtotal * v_coupon.percent_off / 100.0, 0);
end;
$$;

revoke all on function coupon_check(text, numeric, text, boolean) from public, anon, authenticated;
grant execute on function coupon_check(text, numeric, text, boolean) to service_role;

-- place_order_with_coupon(): place_order() and then the coupon, in one transaction ---------------
-- Same parameters as place_order() plus the code. If the code turns out to be invalid, the
-- whole order (and the stock it took) is rolled back.
create or replace function place_order_with_coupon(
  p_full_name text,
  p_mobile_number text,
  p_email text,
  p_instagram_username text,
  p_address_line1 text,
  p_address_line2 text,
  p_area text,
  p_city text,
  p_state text,
  p_pincode text,
  p_order_notes text,
  p_upi_transaction_id text,
  p_items jsonb,
  p_auth_user_id uuid default null,
  p_custom_items jsonb default '[]'::jsonb,
  p_payment_method text default 'upi_manual',
  p_coupon_code text default null
)
returns table (
  out_order_id uuid,
  out_order_number text,
  out_tracking_token text,
  out_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_coupon record;
  v_subtotal numeric(10,2);
  v_shipping numeric(10,2);
  v_total numeric(10,2);
begin
  select * into v_order from place_order(
    p_full_name, p_mobile_number, p_email, p_instagram_username, p_address_line1, p_address_line2,
    p_area, p_city, p_state, p_pincode, p_order_notes, p_upi_transaction_id, p_items, p_auth_user_id,
    p_custom_items, p_payment_method
  );
  v_total := v_order.out_total;

  if coalesce(trim(p_coupon_code), '') <> '' then
    select subtotal, shipping_fee into v_subtotal, v_shipping from orders where id = v_order.out_order_id;
    -- the new order has no coupon_code yet, so it isn't counted in the code's own usage limits;
    -- the row lock makes two orders racing for the last use wait for each other
    select * into v_coupon from coupon_check(p_coupon_code, v_subtotal, p_email, true);
    update orders
      set coupon_code = v_coupon.out_code,
          discount_amount = v_coupon.out_discount,
          total = v_subtotal - v_coupon.out_discount + v_shipping,
          updated_at = now()
      where id = v_order.out_order_id;
    v_total := v_subtotal - v_coupon.out_discount + v_shipping;
  end if;

  return query select v_order.out_order_id, v_order.out_order_number, v_order.out_tracking_token, v_total;
end;
$$;

revoke all on function place_order_with_coupon(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function place_order_with_coupon(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text, text) to service_role;

commit;

notify pgrst, 'reload schema';
