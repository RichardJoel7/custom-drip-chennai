-- Custom Drip Chennai — online payments (Cashfree)
-- Run in the Supabase SQL Editor AFTER 0017_shipping_labels.sql.
--
-- Customers can pay online through Cashfree (UPI, cards, net banking, wallets). The order is
-- created first and waits ("awaiting_payment"); the server marks it paid only after Cashfree
-- itself confirms the payment, never on the browser's word. Unpaid online orders expire and
-- put their stock back. The manual UPI flow still works when Cashfree isn't set up.

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'label_printed_at'
  ) then
    raise exception 'Run 0017_shipping_labels.sql before 0018_online_payments.sql.';
  end if;
end $$;

-- orders: how they're paid, and what Cashfree told us ----------------------------------------
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending_verification', 'awaiting_payment', 'paid', 'rejected', 'failed'));

-- online orders have no customer-typed UPI transaction ID
alter table orders alter column upi_transaction_id drop not null;

alter table orders
  add column if not exists payment_method text not null default 'upi_manual',
  add column if not exists gateway_order_id text,
  add column if not exists gateway_session_id text,
  add column if not exists gateway_payment_id text,
  add column if not exists gateway_payment_method text,
  add column if not exists gateway_bank_reference text,
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_method_check') then
    alter table orders add constraint orders_payment_method_check check (payment_method in ('upi_manual', 'cashfree'));
  end if;
end $$;

create unique index if not exists orders_gateway_order_id_idx on orders (gateway_order_id) where gateway_order_id is not null;
-- finds online orders still waiting for payment, oldest first
create index if not exists orders_awaiting_payment_idx on orders (created_at) where payment_status = 'awaiting_payment';

-- place_order(): one more parameter, how the customer pays -----------------------------------
-- 'upi_manual': the customer pays the shop's UPI QR and types the transaction ID (as before).
-- 'cashfree':   the order waits for an online payment; the server confirms it with Cashfree.
-- The new parameter has a default, so calls from before this migration keep working.
drop function if exists place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb);

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
  -- [{ "garment_id", "size_id", "color_id", "gsm_id", "quantity",
  --    "placements": [
  --      fixed (front only):  { "side": "front", "print_option_id", "design_id", "design_source": hub|upload,
  --                             "transform": {"scale","dx","dy"} | null }
  --      custom size:         { "kind": "custom", "side": front|back, "design_id", "design_source",
  --                             "rect": {"x","y","w","h"} in cm, from the top-left of the side's print area }
  --    ] }, ...]
  p_custom_items jsonb default '[]'::jsonb,
  p_payment_method text default 'upi_manual'
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
  v_garment custom_garments%rowtype;
  v_size custom_tee_sizes%rowtype;
  v_color custom_tee_colors%rowtype;
  v_gsm custom_tee_gsm_options%rowtype;
  v_print custom_print_options%rowtype;
  v_design designs%rowtype;
  v_upload customer_designs%rowtype;
  v_gsm_id uuid;
  v_gsm_price numeric(10,2);
  v_print_price numeric(10,2);
  v_unit_price numeric(10,2);
  v_placements jsonb;
  v_placement jsonb;
  v_snapshots jsonb;
  v_side text;
  v_source text;
  v_design_json jsonb;
  v_transform jsonb;
  v_scale numeric;
  v_dx numeric;
  v_dy numeric;
  v_has_front boolean;
  v_has_back boolean;
  v_order_item_id uuid;
  v_kind text;
  v_rect jsonb;
  v_rx numeric;
  v_ry numeric;
  v_rw numeric;
  v_rh numeric;
  v_key text;
  v_keys text[];
  v_back_price numeric(10,2);
  v_print_json jsonb;
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

  if coalesce(p_payment_method, '') not in ('upi_manual', 'cashfree') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_payment_method = 'upi_manual' and coalesce(trim(p_upi_transaction_id), '') = '' then
    raise exception 'MISSING_UPI_TXN';
  end if;

  v_email := lower(trim(p_email));

  select standard_shipping_fee, free_shipping_threshold, custom_back_print_price
    into v_standard_fee, v_free_threshold, v_back_price
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
    upi_transaction_id, payment_method, payment_status, order_status
  ) values (
    v_customer_id, p_full_name, p_mobile_number, v_email, nullif(trim(p_instagram_username), ''),
    p_address_line1, nullif(trim(p_address_line2), ''), nullif(trim(p_area), ''), p_city, p_state, p_pincode, nullif(trim(p_order_notes), ''),
    case when p_payment_method = 'cashfree' then null else trim(p_upi_transaction_id) end,
    p_payment_method,
    case when p_payment_method = 'cashfree' then 'awaiting_payment' else 'pending_verification' end,
    'new'
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

  -- custom garments: made to order, so no stock — priced from the admin price list ---
  for v_item in select * from jsonb_array_elements(v_custom_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    if v_qty is null or v_qty <= 0 or v_qty > 100 then
      raise exception 'INVALID_QUANTITY';
    end if;

    if nullif(v_item ->> 'garment_id', '') is null then
      raise exception 'INVALID_CUSTOM_ITEM';
    end if;

    select * into v_garment from custom_garments
      where id = (v_item ->> 'garment_id')::uuid and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    -- every option must belong to the chosen garment
    select * into v_size from custom_tee_sizes
      where id = (v_item ->> 'size_id')::uuid and garment_id = v_garment.id and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    select * into v_color from custom_tee_colors
      where id = (v_item ->> 'color_id')::uuid and garment_id = v_garment.id and is_active = true;
    if not found then
      raise exception 'CUSTOM_OPTION_UNAVAILABLE';
    end if;

    v_gsm_id := null;
    v_gsm_price := 0;
    if nullif(v_item ->> 'gsm_id', '') is not null then
      select * into v_gsm from custom_tee_gsm_options
        where id = (v_item ->> 'gsm_id')::uuid and garment_id = v_garment.id and is_active = true;
      if not found then
        raise exception 'CUSTOM_OPTION_UNAVAILABLE';
      end if;
      v_gsm_id := v_gsm.id;
      v_gsm_price := v_gsm.price;
    elsif exists (select 1 from custom_tee_gsm_options where garment_id = v_garment.id and is_active = true) then
      -- this garment offers GSM choices, so one must be picked
      raise exception 'INVALID_CUSTOM_ITEM';
    end if;

    -- prints: 1–8 of them — one custom-size print per side, each fixed print once
    v_placements := v_item -> 'placements';
    if v_placements is null or jsonb_typeof(v_placements) <> 'array'
       or jsonb_array_length(v_placements) = 0 or jsonb_array_length(v_placements) > 8 then
      raise exception 'INVALID_CUSTOM_ITEM';
    end if;

    v_snapshots := '[]'::jsonb;
    v_keys := array[]::text[];
    v_has_front := false;
    v_has_back := false;

    for v_placement in select * from jsonb_array_elements(v_placements) loop
      v_side := v_placement ->> 'side';
      if v_side is null or v_side not in ('front', 'back') then
        raise exception 'INVALID_CUSTOM_ITEM';
      end if;
      if v_side = 'front' then v_has_front := true; else v_has_back := true; end if;
      v_kind := coalesce(v_placement ->> 'kind', 'fixed');

      -- the artwork: a live Design Hub design, or one of this customer's own uploads
      v_source := coalesce(v_placement ->> 'design_source', 'hub');
      if v_source = 'upload' then
        select * into v_upload from customer_designs
          where id = (v_placement ->> 'design_id')::uuid and user_id = p_auth_user_id;
        if not found then
          raise exception 'DESIGN_UNAVAILABLE';
        end if;
        v_design_json := jsonb_build_object(
          'id', v_upload.id, 'name', v_upload.name, 'image_url', v_upload.image_url,
          'source', 'upload', 'width', v_upload.width, 'height', v_upload.height
        );
      elsif v_source = 'hub' then
        select * into v_design from designs
          where id = (v_placement ->> 'design_id')::uuid and is_active = true;
        if not found then
          raise exception 'DESIGN_UNAVAILABLE';
        end if;
        v_design_json := jsonb_build_object(
          'id', v_design.id, 'name', v_design.name, 'image_url', v_design.image_url, 'source', 'hub'
        );
      else
        raise exception 'INVALID_CUSTOM_ITEM';
      end if;

      if v_kind = 'custom' then
        -- any size, anywhere: a box in cm, from the top-left of the side's print area
        v_rect := v_placement -> 'rect';
        if v_rect is null or jsonb_typeof(v_rect) <> 'object'
           or coalesce(jsonb_typeof(v_rect -> 'x'), '') <> 'number'
           or coalesce(jsonb_typeof(v_rect -> 'y'), '') <> 'number'
           or coalesce(jsonb_typeof(v_rect -> 'w'), '') <> 'number'
           or coalesce(jsonb_typeof(v_rect -> 'h'), '') <> 'number' then
          raise exception 'INVALID_CUSTOM_ITEM';
        end if;
        v_rx := (v_rect ->> 'x')::numeric;
        v_ry := (v_rect ->> 'y')::numeric;
        v_rw := (v_rect ->> 'w')::numeric;
        v_rh := (v_rect ->> 'h')::numeric;
        if v_rw < 2 or v_rh < 2 or v_rw > 200 or v_rh > 200 or abs(v_rx) > 300 or abs(v_ry) > 300 then
          raise exception 'INVALID_CUSTOM_ITEM';
        end if;

        -- custom prints are offered once the garment has a size (A4, A3…) ticked; the box itself
        -- can be any size, anywhere on the garment
        if not exists (
          select 1 from custom_print_options p
            join custom_garment_print_options gp on gp.print_option_id = p.id and gp.garment_id = v_garment.id
            where p.kind = 'size' and p.is_active = true
        ) then
          raise exception 'CUSTOM_OPTION_UNAVAILABLE';
        end if;
        v_print_json := jsonb_build_object(
          'id', 'custom', 'name', 'Custom size', 'width_cm', round(v_rw, 1), 'height_cm', round(v_rh, 1),
          'front_placement', 'center'
        );

        v_key := v_side || ':custom';
        v_transform := null;
        v_rect := jsonb_build_object('x', round(v_rx, 1), 'y', round(v_ry, 1), 'w', round(v_rw, 1), 'h', round(v_rh, 1));
      elsif v_kind = 'fixed' then
        -- chest print, logo…: front only, and offered on this garment
        if v_side <> 'front' then
          raise exception 'CUSTOM_OPTION_UNAVAILABLE';
        end if;
        select p.* into v_print from custom_print_options p
          join custom_garment_print_options gp on gp.print_option_id = p.id and gp.garment_id = v_garment.id
          where p.id = (v_placement ->> 'print_option_id')::uuid and p.is_active = true and p.kind = 'placement';
        if not found then
          raise exception 'CUSTOM_OPTION_UNAVAILABLE';
        end if;

        -- optional size/position the customer set: 20–100% of the print size, moved (cm)
        v_transform := v_placement -> 'transform';
        if v_transform is null or jsonb_typeof(v_transform) = 'null' then
          v_transform := null;
        else
          if jsonb_typeof(v_transform) <> 'object'
             or coalesce(jsonb_typeof(v_transform -> 'scale'), '') <> 'number'
             or coalesce(jsonb_typeof(v_transform -> 'dx'), '') <> 'number'
             or coalesce(jsonb_typeof(v_transform -> 'dy'), '') <> 'number' then
            raise exception 'INVALID_CUSTOM_ITEM';
          end if;
          v_scale := (v_transform ->> 'scale')::numeric;
          v_dx := (v_transform ->> 'dx')::numeric;
          v_dy := (v_transform ->> 'dy')::numeric;
          if v_scale < 0.2 or v_scale > 1 or abs(v_dx) > 100 or abs(v_dy) > 100 then
            raise exception 'INVALID_CUSTOM_ITEM';
          end if;
          v_transform := jsonb_build_object('scale', round(v_scale, 3), 'dx', round(v_dx, 2), 'dy', round(v_dy, 2));
        end if;

        v_key := v_side || ':' || v_print.id::text;
        v_rect := null;
        v_print_json := jsonb_build_object(
          'id', v_print.id,
          'name', v_print.name,
          'width_cm', v_print.width_cm,
          'height_cm', v_print.height_cm,
          'front_placement', v_print.front_placement
        );
      else
        raise exception 'INVALID_CUSTOM_ITEM';
      end if;

      if v_key = any(v_keys) then
        raise exception 'INVALID_CUSTOM_ITEM';
      end if;
      v_keys := array_append(v_keys, v_key);

      v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
        'side', v_side,
        'kind', v_kind,
        'print_option', v_print_json,
        'design', v_design_json,
        'transform', v_transform,
        'rect', v_rect
      ));
    end loop;

    -- front prints are included in the garment price; anything on the back is one flat price
    if v_has_back then
      if v_back_price is null then
        raise exception 'CUSTOM_OPTION_UNAVAILABLE';
      end if;
      v_print_price := v_back_price;
    else
      v_print_price := 0;
    end if;

    v_unit_price := v_size.price + v_gsm_price + v_print_price;
    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (
      order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, line_total,
      is_custom, custom_details
    ) values (
      v_order_id, null, null, 'Custom ' || v_garment.name, v_size.label, v_color.name, v_qty, v_unit_price, v_line_total,
      true,
      jsonb_build_object(
        'color_hex', v_color.hex,
        'sides', case when v_has_front and v_has_back then 'both' when v_has_front then 'front' else 'back' end,
        'tee_price', v_size.price,
        'gsm', case when v_gsm_id is null then null
          else jsonb_build_object('id', v_gsm.id, 'gsm', v_gsm.gsm, 'price', v_gsm.price) end,
        'print_price', v_print_price,
        -- a copy of the mockup as ordered, so later edits to the garment don't change old orders
        'garment', jsonb_build_object(
          'id', v_garment.id,
          'name', v_garment.name,
          'gender', v_garment.gender,
          'front_image_url', v_garment.front_image_url,
          'front_aspect', v_garment.front_aspect,
          'back_image_url', v_garment.back_image_url,
          'back_aspect', v_garment.back_aspect,
          'front_area', v_garment.front_area,
          'back_area', v_garment.back_area,
          'area_width_cm', v_garment.area_width_cm,
          'logo_spot', v_garment.logo_spot,
          'color_front_image_url', v_color.front_image_url,
          'color_back_image_url', v_color.back_image_url
        ),
        'placements', v_snapshots
      )
    )
    returning id into v_order_item_id;

    insert into order_item_designs (order_item_id, design_id)
      select distinct v_order_item_id, (x ->> 'design_id')::uuid
        from jsonb_array_elements(v_placements) x
        where coalesce(x ->> 'design_source', 'hub') = 'hub';
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
revoke all on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid, jsonb, text) to service_role;

-- cancel_unpaid_order(): an online order that was never paid -----------------------------------
-- Cancels it and puts its catalogue stock back (custom tees are made to order, so hold none).
-- Only acts on orders still waiting for payment, so calling it twice, or on a paid order, does
-- nothing. Returns whether it cancelled the order.
create or replace function cancel_unpaid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update orders
    set payment_status = 'failed', order_status = 'cancelled', updated_at = now()
    where id = p_order_id and payment_status = 'awaiting_payment'
    returning id into v_id;

  if v_id is null then
    return false;
  end if;

  update product_variants pv
    set stock_quantity = pv.stock_quantity + held.quantity, updated_at = now()
    from (
      select variant_id, sum(quantity) as quantity
        from order_items
        where order_id = p_order_id and variant_id is not null
        group by variant_id
    ) held
    where pv.id = held.variant_id;

  return true;
end;
$$;

revoke all on function cancel_unpaid_order(uuid) from public, anon, authenticated;
grant execute on function cancel_unpaid_order(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
