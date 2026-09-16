-- Custom Drip Chennai — Row Level Security
--
-- Design:
--   * Product catalogue + settings are readable by anyone (needed for the storefront),
--     writable only by admins.
--   * Customers/orders/order_items are never readable by anonymous or plain authenticated
--     users — only by admins. Guest checkout and the guest order-tracking page never touch
--     these tables through RLS at all: they go through server-only code using the
--     service-role key (place_order(), and a server-side tracking lookup), which bypasses
--     RLS by design. This keeps customer PII fully locked down while still letting a guest
--     place an order and track it without an account.
--   * admins table is only ever readable/writable by the developer via the Supabase
--     dashboard/service role — no self-service signup path exists.

alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table settings enable row level security;
alter table admins enable row level security;

-- products ------------------------------------------------------------------
create policy products_public_select on products
  for select using (is_active = true or is_admin());

create policy products_admin_insert on products
  for insert with check (is_admin());

create policy products_admin_update on products
  for update using (is_admin()) with check (is_admin());

create policy products_admin_delete on products
  for delete using (is_admin());

-- product_images --------------------------------------------------------------
create policy product_images_public_select on product_images
  for select using (
    is_admin() or exists (
      select 1 from products p where p.id = product_images.product_id and p.is_active = true
    )
  );

create policy product_images_admin_insert on product_images
  for insert with check (is_admin());

create policy product_images_admin_update on product_images
  for update using (is_admin()) with check (is_admin());

create policy product_images_admin_delete on product_images
  for delete using (is_admin());

-- product_variants --------------------------------------------------------------
create policy product_variants_public_select on product_variants
  for select using (
    is_admin() or exists (
      select 1 from products p where p.id = product_variants.product_id and p.is_active = true
    )
  );

create policy product_variants_admin_insert on product_variants
  for insert with check (is_admin());

create policy product_variants_admin_update on product_variants
  for update using (is_admin()) with check (is_admin());

create policy product_variants_admin_delete on product_variants
  for delete using (is_admin());

-- settings --------------------------------------------------------------
create policy settings_public_select on settings
  for select using (true);

create policy settings_admin_update on settings
  for update using (is_admin()) with check (is_admin());

-- customers --------------------------------------------------------------
create policy customers_admin_select on customers
  for select using (is_admin());

create policy customers_admin_update on customers
  for update using (is_admin()) with check (is_admin());

-- orders --------------------------------------------------------------
create policy orders_admin_select on orders
  for select using (is_admin());

create policy orders_admin_update on orders
  for update using (is_admin()) with check (is_admin());

-- order_items --------------------------------------------------------------
create policy order_items_admin_select on order_items
  for select using (is_admin());

-- admins --------------------------------------------------------------
create policy admins_self_select on admins
  for select using (auth.uid() = id or is_admin());
