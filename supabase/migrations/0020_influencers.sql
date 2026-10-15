-- Custom Drip Chennai — influencer codes and commission
-- Run in the Supabase SQL Editor AFTER 0019_coupons.sql.
--
-- The admin adds an influencer (with the email they sign in with and their own terms: a % of
-- what the customer paid for the items after the discount, excluding shipping, and/or a fixed
-- amount per order) and gives them a coupon code. Each order placed with that code records the
-- influencer and their commission on the terms of that day. Commission shows as pending once
-- the order is paid and becomes payable once it's delivered; cancelled orders drop out.
-- Influencers see only their own numbers, through the my_influencer_* functions below.

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'place_order_with_coupon') then
    raise exception 'Run 0019_coupons.sql before 0020_influencers.sql.';
  end if;
end $$;

-- influencers ---------------------------------------------------------------------------------
create table if not exists influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  -- the email they sign in with, kept lower-case
  email text not null check (email = lower(trim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  instagram text,
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  commission_fixed numeric(10,2) not null default 0 check (commission_fixed >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists influencers_email_idx on influencers (email);

alter table influencers enable row level security;
drop policy if exists influencers_admin_all on influencers;
create policy influencers_admin_all on influencers for all using (is_admin()) with check (is_admin());

-- payouts: what was paid to an influencer, and when ---------------------------------------------
create table if not exists influencer_payouts (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references influencers(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  paid_on date not null default ((now() at time zone 'Asia/Kolkata')::date),
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists influencer_payouts_influencer_idx on influencer_payouts (influencer_id, paid_on);

alter table influencer_payouts enable row level security;
drop policy if exists influencer_payouts_admin_all on influencer_payouts;
create policy influencer_payouts_admin_all on influencer_payouts for all using (is_admin()) with check (is_admin());

-- whose code it is, and whose order it was ------------------------------------------------------
alter table coupons add column if not exists influencer_id uuid references influencers(id) on delete set null;
create index if not exists coupons_influencer_idx on coupons (influencer_id) where influencer_id is not null;

alter table orders
  add column if not exists influencer_id uuid references influencers(id) on delete set null,
  add column if not exists influencer_commission numeric(10,2) check (influencer_commission is null or influencer_commission >= 0);
create index if not exists orders_influencer_idx on orders (influencer_id, created_at) where influencer_id is not null;

-- commission_for(): % of the items after the discount (no shipping), plus any fixed amount -------
create or replace function commission_for(p_subtotal numeric, p_discount numeric, p_percent numeric, p_fixed numeric)
returns numeric
language sql
immutable
as $$
  select round(greatest(coalesce(p_subtotal, 0) - coalesce(p_discount, 0), 0) * coalesce(p_percent, 0) / 100.0, 2)
         + coalesce(p_fixed, 0);
$$;

-- place_order_with_coupon(): as in 0019, plus the influencer and their commission ---------------
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
  v_influencer record;
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

    -- an influencer's code: their commission on today's terms (a paused influencer earns none)
    select i.id, i.commission_percent, i.commission_fixed into v_influencer
      from coupons c join influencers i on i.id = c.influencer_id
      where c.code = v_coupon.out_code and i.is_active;
    if found then
      update orders
        set influencer_id = v_influencer.id,
            influencer_commission = commission_for(v_subtotal, v_coupon.out_discount, v_influencer.commission_percent, v_influencer.commission_fixed)
        where id = v_order.out_order_id;
    end if;
  end if;

  return query select v_order.out_order_id, v_order.out_order_number, v_order.out_tracking_token, v_total;
end;
$$;

revoke all on function place_order_with_coupon(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function place_order_with_coupon(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text, text) to service_role;

-- influencer_claim_orders(): admin only — a code given to an influencer after it was already
-- used: its earlier orders become theirs too, at their current terms.
create or replace function influencer_claim_orders(p_influencer_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not is_admin() then
    raise exception 'NOT_ALLOWED';
  end if;
  update orders o
    set influencer_id = i.id,
        influencer_commission = commission_for(o.subtotal, o.discount_amount, i.commission_percent, i.commission_fixed)
    from coupons c join influencers i on i.id = c.influencer_id
    where i.id = p_influencer_id and o.coupon_code = c.code and o.influencer_id is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function influencer_claim_orders(uuid) from public, anon;
grant execute on function influencer_claim_orders(uuid) to authenticated;

-- What a signed-in influencer can see: only their own, and only from an account whose email is
-- confirmed (so nobody can sign up with an influencer's address and look).
create or replace function my_influencer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select i.id
    from influencers i
    join auth.users u on u.id = auth.uid()
   where u.email_confirmed_at is not null
     and lower(u.email) = i.email
   limit 1;
$$;

-- name, terms and codes
create or replace function my_influencer()
returns table (name text, instagram text, commission_percent numeric, commission_fixed numeric, is_active boolean, codes jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select i.name, i.instagram, i.commission_percent, i.commission_fixed, i.is_active,
         coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'percent_off', c.percent_off, 'is_active', c.is_active) order by c.created_at)
                     from coupons c where c.influencer_id = i.id), '[]'::jsonb)
    from influencers i
   where i.id = my_influencer_id();
$$;

-- their paid orders between two moments, without any customer details
create or replace function my_influencer_orders(p_from timestamptz, p_to timestamptz)
returns table (placed_at timestamptz, order_ref text, coupon_code text, sale numeric, commission numeric, status text)
language sql
stable
security definer
set search_path = public
as $$
  select o.created_at,
         left(o.order_number, greatest(length(o.order_number) - 2, 0)) || '••',
         o.coupon_code,
         greatest(o.subtotal - o.discount_amount, 0),
         coalesce(o.influencer_commission, 0),
         case when o.order_status = 'delivered' then 'earned' else 'pending' end
    from orders o
   where o.influencer_id = my_influencer_id()
     and o.payment_status = 'paid'
     and o.order_status <> 'cancelled'
     and o.created_at >= p_from
     and o.created_at < p_to
   order by o.created_at desc
   limit 5000;
$$;

-- all-time totals: payable (delivered), pending (paid, not delivered yet) and paid out
create or replace function my_influencer_totals()
returns table (orders int, sales numeric, earned numeric, pending numeric, paid numeric)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select o.order_status, greatest(o.subtotal - o.discount_amount, 0) as sale, coalesce(o.influencer_commission, 0) as commission
      from orders o
     where o.influencer_id = my_influencer_id() and o.payment_status = 'paid' and o.order_status <> 'cancelled'
  )
  select (select count(*)::int from mine),
         (select coalesce(sum(sale), 0) from mine),
         (select coalesce(sum(commission), 0) from mine where order_status = 'delivered'),
         (select coalesce(sum(commission), 0) from mine where order_status <> 'delivered'),
         (select coalesce(sum(p.amount), 0) from influencer_payouts p where p.influencer_id = my_influencer_id());
$$;

create or replace function my_influencer_payouts()
returns table (amount numeric, paid_on date, note text)
language sql
stable
security definer
set search_path = public
as $$
  select p.amount, p.paid_on, p.note
    from influencer_payouts p
   where p.influencer_id = my_influencer_id()
   order by p.paid_on desc, p.created_at desc;
$$;

revoke all on function my_influencer_id() from public, anon;
revoke all on function my_influencer() from public, anon;
revoke all on function my_influencer_orders(timestamptz, timestamptz) from public, anon;
revoke all on function my_influencer_totals() from public, anon;
revoke all on function my_influencer_payouts() from public, anon;
grant execute on function my_influencer_id() to authenticated;
grant execute on function my_influencer() to authenticated;
grant execute on function my_influencer_orders(timestamptz, timestamptz) to authenticated;
grant execute on function my_influencer_totals() to authenticated;
grant execute on function my_influencer_payouts() to authenticated;

commit;

notify pgrst, 'reload schema';
