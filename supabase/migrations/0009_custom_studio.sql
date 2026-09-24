-- Custom Drip Chennai — Custom Studio
-- Run in the Supabase SQL Editor AFTER 0008_customer_accounts.sql.
--
-- Adds:
--   * designs            — the admin-uploaded Design Hub customers pick artwork from
--   * custom_tee_sizes   — base tee price per size (S, M, L...)
--   * custom_tee_colors  — tee colours offered in the studio
--   * custom_print_options — print sizes (A4, A3...) with front / back / front+back rates
--   * custom tees as order lines (order_items.is_custom + a details snapshot)
-- place_order() stays the only way to create an order and prices custom tees from these
-- tables, so the browser can never set its own price.

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'auth_user_id'
  ) then
    raise exception 'Run 0008_customer_accounts.sql before 0009_custom_studio.sql.';
  end if;
end $$;

-- designs -----------------------------------------------------------------------
create table designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image_url text not null,
  storage_path text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index designs_active_idx on designs (is_active, sort_order, created_at desc);

-- custom tee price list -----------------------------------------------------------
create table custom_tee_sizes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  price numeric(10,2) not null check (price >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table custom_tee_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- A null price means that side combination isn't offered for this print size.
create table custom_print_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  width_cm numeric(5,1) not null check (width_cm > 0),
  height_cm numeric(5,1) not null check (height_cm > 0),
  front_placement text not null default 'center' check (front_placement in ('center', 'left_chest')),
  price_front numeric(10,2) check (price_front is null or price_front >= 0),
  price_back numeric(10,2) check (price_back is null or price_back >= 0),
  price_both numeric(10,2) check (price_both is null or price_both >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- order_items: a line is either a catalogue product or a custom tee ----------------
alter table order_items alter column product_id drop not null;

alter table order_items
  add column is_custom boolean not null default false,
  add column custom_details jsonb,
  add column front_design_id uuid references designs (id),
  add column back_design_id uuid references designs (id);

alter table order_items add constraint order_items_product_or_custom
  check (is_custom or product_id is not null);

-- used when an admin deletes designs, to keep any design that's already been ordered
create index order_items_front_design_idx on order_items (front_design_id) where front_design_id is not null;
create index order_items_back_design_idx on order_items (back_design_id) where back_design_id is not null;

-- RLS: public can read what's active, only admins can write ------------------------
alter table designs enable row level security;
alter table custom_tee_sizes enable row level security;
alter table custom_tee_colors enable row level security;
alter table custom_print_options enable row level security;

create policy designs_public_select on designs for select using (is_active = true or is_admin());
create policy designs_admin_insert on designs for insert with check (is_admin());
create policy designs_admin_update on designs for update using (is_admin()) with check (is_admin());
create policy designs_admin_delete on designs for delete using (is_admin());

create policy custom_tee_sizes_public_select on custom_tee_sizes for select using (is_active = true or is_admin());
create policy custom_tee_sizes_admin_insert on custom_tee_sizes for insert with check (is_admin());
create policy custom_tee_sizes_admin_update on custom_tee_sizes for update using (is_admin()) with check (is_admin());
create policy custom_tee_sizes_admin_delete on custom_tee_sizes for delete using (is_admin());

create policy custom_tee_colors_public_select on custom_tee_colors for select using (is_active = true or is_admin());
create policy custom_tee_colors_admin_insert on custom_tee_colors for insert with check (is_admin());
create policy custom_tee_colors_admin_update on custom_tee_colors for update using (is_admin()) with check (is_admin());
create policy custom_tee_colors_admin_delete on custom_tee_colors for delete using (is_admin());

create policy custom_print_options_public_select on custom_print_options for select using (is_active = true or is_admin());
create policy custom_print_options_admin_insert on custom_print_options for insert with check (is_admin());
create policy custom_print_options_admin_update on custom_print_options for update using (is_admin()) with check (is_admin());
create policy custom_print_options_admin_delete on custom_print_options for delete using (is_admin());

-- 0008 let customers read their own orders but not the lines inside them, so "My Orders"
-- showed 0 items. Customers can now read (never write) the items of their own orders.
create policy order_items_self_select on order_items
  for select using (
    order_id in (
      select o.id from orders o
      join customers c on c.id = o.customer_id
      where c.auth_user_id = auth.uid()
    )
  );

-- starter price list — review and edit these in Admin → Customizer before going live ---
insert into custom_tee_sizes (label, price, sort_order) values
  ('S', 399, 1),
  ('M', 399, 2),
  ('L', 399, 3),
  ('XL', 429, 4),
  ('XXL', 459, 5);

insert into custom_tee_colors (name, hex, sort_order) values
  ('Black', '#111111', 1),
  ('White', '#f7f7f5', 2),
  ('Navy', '#1d2b4a', 3),
  ('Maroon', '#6d1f2c', 4),
  ('Bottle Green', '#1f4a38', 5),
  ('Grey Melange', '#a4a8ad', 6),
  ('Beige', '#d8c8aa', 7),
  ('Red', '#c1121f', 8);

insert into custom_print_options
  (name, description, width_cm, height_cm, front_placement, price_front, price_back, price_both, sort_order)
values
  ('A4 Print', 'Great for detailed designs', 21, 29.7, 'center', 199, 199, 349, 1),
  ('A3 Print', 'Full statement piece', 29.7, 42, 'center', 299, 299, 549, 2),
  ('Chest Print', 'Centre chest band — maximum visibility', 25, 10, 'center', 149, 149, 249, 3),
  ('Brand Logo', 'Pocket area — subtle brand identity', 9, 9, 'left_chest', 99, null, null, 4);

-- place_order(): now also accepts custom tees ---------------------------------------
drop function if exists place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb);
drop function if exists place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid);

create function place_order(
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
  p_items jsonb, -- [{ "product_id": uuid, "variant_id": uuid, "quantity": int }, ...]
  p_auth_user_id uuid default null,
  -- [{ "size_id", "color_id", "print_option_id", "sides": front|back|both,
  --    "front_design_id", "back_design_id", "quantity" }, ...]
  p_custom_items jsonb default '[]'::jsonb
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
  v_customer_id uuid;
  v_email text;
  v_order_id uuid;
  v_order_number text;
  v_tracking_token text;
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_standard_fee numeric(10,2);
  v_free_threshold numeric(10,2);
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_qty int;
  v_line_total numeric(10,2);
  v_custom_items jsonb := coalesce(p_custom_items, '[]'::jsonb);
  v_size custom_tee_sizes%rowtype;
  v_color custom_tee_colors%rowtype;
  v_print custom_print_options%rowtype;
  v_front designs%rowtype;
  v_back designs%rowtype;
  v_front_id uuid;
  v_back_id uuid;
  v_sides text;
  v_print_price numeric(10,2);
  v_unit_price numeric(10,2);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'NO_ITEMS';
  end if;

  if jsonb_typeof(v_custom_items) <> 'array' then
    raise exception 'INVALID_CUSTOM_ITEM';
  end if;

  if jsonb_array_length(p_items) + jsonb_array_length(v_custom_items) = 0 then
    raise exception 'NO_ITEMS';
  end if;

  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_mobile_number), '') = '' then
    raise exception 'INVALID_CUSTOMER';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'INVALID_EMAIL';
  end if;

  if coalesce(trim(p_address_line1), '') = '' or coalesce(trim(p_city), '') = ''
     or coalesce(trim(p_state), '') = '' or coalesce(trim(p_pincode), '') = '' then
    raise exception 'INVALID_ADDRESS';
  end if;

  if coalesce(trim(p_upi_transaction_id), '') = '' then
    raise exception 'MISSING_UPI_TXN';
  end if;

  v_email := lower(trim(p_email));

  select standard_shipping_fee, free_shipping_threshold
    into v_standard_fee, v_free_threshold
    from settings where id = 1;

  insert into customers (full_name, mobile_number, email, instagram_username, auth_user_id)
    values (p_full_name, p_mobile_number, v_email, nullif(trim(p_instagram_username), ''), p_auth_user_id)
  on conflict (email) do update
    set full_name = excluded.full_name,
        mobile_number = excluded.mobile_number,
        instagram_username = coalesce(excluded.instagram_username, customers.instagram_username),
        auth_user_id = coalesce(excluded.auth_user_id, customers.auth_user_id)
  returning id into v_customer_id;

  insert into orders (
    customer_id, full_name, mobile_number, email, instagram_username,
    address_line1, address_line2, area, city, state, pincode, order_notes,
    upi_transaction_id, payment_status, order_status
  ) values (
    v_customer_id, p_full_name, p_mobile_number, v_email, nullif(trim(p_instagram_username), ''),
    p_address_line1, nullif(trim(p_address_line2), ''), nullif(trim(p_area), ''), p_city, p_state, p_pincode, nullif(trim(p_order_notes), ''),
    p_upi_transaction_id, 'pending_verification', 'new'
  )
  returning id, order_number, tracking_token into v_order_id, v_order_number, v_tracking_token;

  -- catalogue products -------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid and is_active = true;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    -- lock the variant row so concurrent checkouts cannot oversell the same stock
    select * into v_variant from product_variants
      where id = (v_item ->> 'variant_id')::uuid and product_id = v_product.id
      for update;

    if not found then
      raise exception 'VARIANT_UNAVAILABLE';
    end if;

    if v_variant.stock_quantity < v_qty then
      raise exception 'OUT_OF_STOCK';
    end if;

    update product_variants
      set stock_quantity = stock_quantity - v_qty, updated_at = now()
      where id = v_variant.id;

    v_line_total := v_product.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (
      order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, line_total
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.size, v_variant.color, v_qty, v_product.price, v_line_total
    );
  end loop;

  -- custom tees: made to order, so no stock — priced from the admin price list ------
  for v_item in select * from jsonb_array_elements(v_custom_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    if v_qty is null or v_qty <= 0 or v_qty > 100 then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_sides := v_item ->> 'sides';
    if v_sides is null or v_sides not in ('front', 'back', 'both') then
      raise exception 'INVALID_CUSTOM_ITEM';
    end if;

    select * into v_size from custom_tee_sizes
      where id = (v_item ->> 'size_id')::uuid and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    select * into v_color from custom_tee_colors
      where id = (v_item ->> 'color_id')::uuid and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    select * into v_print from custom_print_options
      where id = (v_item ->> 'print_option_id')::uuid and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    v_print_price := case v_sides
      when 'front' then v_print.price_front
      when 'back' then v_print.price_back
      else v_print.price_both
    end;

    if v_print_price is null then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    v_front_id := null;
    v_back_id := null;

    if v_sides in ('front', 'both') then
      select * into v_front from designs
        where id = (v_item ->> 'front_design_id')::uuid and is_active = true;
      if not found then
        raise exception 'DESIGN_UNAVAILABLE';
      end if;
      v_front_id := v_front.id;
    end if;

    if v_sides in ('back', 'both') then
      select * into v_back from designs
        where id = (v_item ->> 'back_design_id')::uuid and is_active = true;
      if not found then
        raise exception 'DESIGN_UNAVAILABLE';
      end if;
      v_back_id := v_back.id;
    end if;

    v_unit_price := v_size.price + v_print_price;
    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (
      order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, line_total,
      is_custom, custom_details, front_design_id, back_design_id
    ) values (
      v_order_id, null, null, 'Custom Tee', v_size.label, v_color.name, v_qty, v_unit_price, v_line_total,
      true,
      jsonb_build_object(
        'color_hex', v_color.hex,
        'sides', v_sides,
        'tee_price', v_size.price,
        'print_price', v_print_price,
        'print_option', jsonb_build_object(
          'id', v_print.id,
          'name', v_print.name,
          'width_cm', v_print.width_cm,
          'height_cm', v_print.height_cm,
          'front_placement', v_print.front_placement
        ),
        'front_design', case when v_front_id is null then null
          else jsonb_build_object('id', v_front.id, 'name', v_front.name, 'image_url', v_front.image_url) end,
        'back_design', case when v_back_id is null then null
          else jsonb_build_object('id', v_back.id, 'name', v_back.name, 'image_url', v_back.image_url) end
      ),
      v_front_id,
      v_back_id
    );
  end loop;

  if v_subtotal >= v_free_threshold then
    v_shipping := 0;
  else
    v_shipping := v_standard_fee;
  end if;

  update orders
    set subtotal = v_subtotal,
        shipping_fee = v_shipping,
        total = v_subtotal + v_shipping,
        updated_at = now()
    where id = v_order_id;

  return query select v_order_id, v_order_number, v_tracking_token, (v_subtotal + v_shipping);
end;
$$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by default, which
-- "revoke ... from public" alone does not undo. Only the server (service role) may call this.
revoke all on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb) to service_role;

commit;

notify pgrst, 'reload schema';
