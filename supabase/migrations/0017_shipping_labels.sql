-- Custom Drip Chennai — shipping labels
-- Run in the Supabase SQL Editor AFTER 0016_free_size_custom_prints.sql.
--
-- What a printed shipping label needs:
--   * the ship-from (return) address — in its own admin-only table, because `settings` is
--     readable by everyone and this is often a home address;
--   * on each order: when it shipped, the parcel's weight, and when its label was last printed.

begin;

create table if not exists shipping_settings (
  id int primary key default 1,
  from_name text,
  from_phone text,
  from_address text,
  updated_at timestamptz not null default now(),
  constraint shipping_settings_singleton check (id = 1)
);

insert into shipping_settings (id) values (1) on conflict (id) do nothing;

alter table shipping_settings enable row level security;

drop policy if exists shipping_settings_admin_select on shipping_settings;
create policy shipping_settings_admin_select on shipping_settings
  for select using (is_admin());

drop policy if exists shipping_settings_admin_update on shipping_settings;
create policy shipping_settings_admin_update on shipping_settings
  for update using (is_admin()) with check (is_admin());

alter table orders
  add column if not exists shipped_at timestamptz,
  add column if not exists package_weight_g integer,
  add column if not exists label_printed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_package_weight_g_check') then
    alter table orders add constraint orders_package_weight_g_check
      check (package_weight_g is null or package_weight_g between 1 and 50000);
  end if;
end $$;

-- orders shipped before this: their last update is the best guess at when they went out, and
-- they left without one of these labels — so they start under "Printed" (reprintable there)
-- rather than filling "Ready to print"
update orders set shipped_at = updated_at
  where shipped_at is null and order_status in ('shipped', 'delivered');
update orders set label_printed_at = shipped_at
  where label_printed_at is null and order_status in ('shipped', 'delivered');

commit;

notify pgrst, 'reload schema';
