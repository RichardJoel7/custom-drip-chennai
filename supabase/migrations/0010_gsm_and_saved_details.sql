-- Custom Drip Chennai — fabric weight (GSM) for custom tees + saved checkout details
-- Run in the Supabase SQL Editor AFTER 0009_custom_studio.sql.
--
-- Adds:
--   * custom_tee_gsm_options  — fabric weights (180 GSM, 240 GSM...) with an extra price per tee
--   * saved_checkout_details  — a signed-in customer's delivery details, to auto-fill checkout
-- place_order() now charges the chosen GSM's extra price and records it on the order line.

begin;

do $$
begin
  if to_regclass('public.custom_print_options') is null then
    raise exception 'Run 0009_custom_studio.sql before 0010_gsm_and_saved_details.sql.';
  end if;
end $$;

-- fabric weight (GSM) --------------------------------------------------------------
create table custom_tee_gsm_options (
  id uuid primary key default gen_random_uuid(),
  gsm int not null check (gsm between 100 and 600),
  description text,
  price numeric(10,2) not null default 0 check (price >= 0), -- added to the tee price
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table custom_tee_gsm_options enable row level security;

create policy custom_tee_gsm_options_public_select on custom_tee_gsm_options for select using (is_active = true or is_admin());
create policy custom_tee_gsm_options_admin_insert on custom_tee_gsm_options for insert with check (is_admin());
create policy custom_tee_gsm_options_admin_update on custom_tee_gsm_options for update using (is_admin()) with check (is_admin());
create policy custom_tee_gsm_options_admin_delete on custom_tee_gsm_options for delete using (is_admin());

-- starter options — review and edit these in Admin → Customizer before going live
insert into custom_tee_gsm_options (gsm, description, price, sort_order) values
  (180, 'Regular weight — soft, breathable everyday tee', 0, 1),
  (240, 'Heavyweight — thick, premium streetwear feel', 100, 2);

-- saved checkout details -------------------------------------------------------------
-- One row per account. Customers read and write only their own row (RLS).
create table saved_checkout_details (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  email text not null,
  address_line1 text not null,
  address_line2 text,
  area text,
  city text not null,
  state text not null,
  pincode text not null,
  instagram_username text,
  updated_at timestamptz not null default now()
);

alter table saved_checkout_details enable row level security;

create policy saved_checkout_details_owner_all on saved_checkout_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- place_order(): custom tees now carry a GSM choice -----------------------------------
-- Same signature as 0009, so existing permissions are kept (and re-applied below).
create or replace function place_order(
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
  -- [{ "size_id", "color_id", "gsm_id", "print_option_id", "sides": front|back|both,
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
  v_gsm custom_tee_gsm_options%rowtype;
  v_print custom_print_options%rowtype;
  v_front designs%rowtype;
  v_back designs%rowtype;
  v_front_id uuid;
  v_back_id uuid;
  v_gsm_id uuid;
  v_gsm_price numeric(10,2);
  v_gsm_offered boolean;
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

  -- when the admin offers GSM options, every custom tee must pick one
  select exists (select 1 from custom_tee_gsm_options where is_active = true) into v_gsm_offered;

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

    v_gsm_id := null;
    v_gsm_price := 0;
    if nullif(v_item ->> 'gsm_id', '') is not null then
      select * into v_gsm from custom_tee_gsm_options
        where id = (v_item ->> 'gsm_id')::uuid and is_active = true;
      if not found then
        raise exception 'CUSTOM_OPTION_UNAVAILABLE';
      end if;
      v_gsm_id := v_gsm.id;
      v_gsm_price := v_gsm.price;
    elsif v_gsm_offered then
      raise exception 'INVALID_CUSTOM_ITEM';
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

    v_unit_price := v_size.price + v_gsm_price + v_print_price;
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
        'gsm', case when v_gsm_id is null then null
          else jsonb_build_object('id', v_gsm.id, 'gsm', v_gsm.gsm, 'price', v_gsm.price) end,
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

-- Only the server (service role) may call this — see 0009 for why anon/authenticated are named.
revoke all on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb) to service_role;

commit;

notify pgrst, 'reload schema';
