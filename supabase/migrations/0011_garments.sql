-- Custom Drip Chennai — garments for the Custom Studio (tee, polo, waffle tee, crop top, hoodie...)
-- Run in the Supabase SQL Editor AFTER 0010_gsm_and_saved_details.sql.
--
-- Adds:
--   * custom_garments               — garment types the admin manages, each with front/back
--                                     photos and a marked print area (no photos = the drawn tee)
--   * custom_garment_print_options  — which print sizes each garment allows
--   * garment_id on custom_tee_sizes / custom_tee_colors / custom_tee_gsm_options, so every
--     garment has its own sizes, prices, colours and GSM (print prices stay shared)
--   * optional real photos per colour (e.g. a proper black hoodie shot)
-- Everything that exists today becomes the built-in "Classic Tee".

begin;

do $$
begin
  if to_regclass('public.custom_tee_gsm_options') is null then
    raise exception 'Run 0010_gsm_and_saved_details.sql before 0011_garments.sql.';
  end if;
end $$;

-- garments ---------------------------------------------------------------------------
create table custom_garments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  gender text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
  description text,
  -- blank garment photos (white/light grey, transparent background); null = drawn tee
  front_image_url text,
  front_storage_path text,
  front_aspect numeric(6,4) check (front_aspect is null or front_aspect > 0), -- width / height
  back_image_url text,
  back_storage_path text,
  back_aspect numeric(6,4) check (back_aspect is null or back_aspect > 0),
  -- the biggest printable box on each photo, as 0–1 fractions: {"x","y","w","h"}
  front_area jsonb,
  back_area jsonb,
  -- how wide that box is in real life, which sets the true scale of A4/A3 prints
  area_width_cm numeric(5,1) check (area_width_cm is null or area_width_cm > 0),
  -- centre of a left-chest logo on the front photo: {"x","y"}
  logo_spot jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table custom_garment_print_options (
  garment_id uuid not null references custom_garments (id) on delete cascade,
  print_option_id uuid not null references custom_print_options (id) on delete cascade,
  primary key (garment_id, print_option_id)
);

alter table custom_tee_sizes add column garment_id uuid references custom_garments (id) on delete cascade;
alter table custom_tee_colors add column garment_id uuid references custom_garments (id) on delete cascade;
alter table custom_tee_gsm_options add column garment_id uuid references custom_garments (id) on delete cascade;

-- a real photo of this colour, shown instead of auto-colouring the blank photo
alter table custom_tee_colors
  add column front_image_url text,
  add column front_storage_path text,
  add column back_image_url text,
  add column back_storage_path text;

-- today's price list becomes the "Classic Tee" (the drawn tee, no photos)
do $$
declare
  v_classic uuid;
begin
  insert into custom_garments (name, slug, gender, description, sort_order)
    values ('Classic Tee', 'classic-tee', 'unisex', 'Regular-fit crew-neck tee', 0)
    returning id into v_classic;

  update custom_tee_sizes set garment_id = v_classic;
  update custom_tee_colors set garment_id = v_classic;
  update custom_tee_gsm_options set garment_id = v_classic;

  insert into custom_garment_print_options (garment_id, print_option_id)
    select v_classic, id from custom_print_options;
end $$;

alter table custom_tee_sizes alter column garment_id set not null;
alter table custom_tee_colors alter column garment_id set not null;
alter table custom_tee_gsm_options alter column garment_id set not null;

create index custom_tee_sizes_garment_idx on custom_tee_sizes (garment_id);
create index custom_tee_colors_garment_idx on custom_tee_colors (garment_id);
create index custom_tee_gsm_options_garment_idx on custom_tee_gsm_options (garment_id);

-- RLS: public can read what's live, only admins can write ------------------------------
alter table custom_garments enable row level security;
alter table custom_garment_print_options enable row level security;

create policy custom_garments_public_select on custom_garments for select using (is_active = true or is_admin());
create policy custom_garments_admin_insert on custom_garments for insert with check (is_admin());
create policy custom_garments_admin_update on custom_garments for update using (is_admin()) with check (is_admin());
create policy custom_garments_admin_delete on custom_garments for delete using (is_admin());

create policy custom_garment_print_options_public_select on custom_garment_print_options for select using (true);
create policy custom_garment_print_options_admin_insert on custom_garment_print_options for insert with check (is_admin());
create policy custom_garment_print_options_admin_delete on custom_garment_print_options for delete using (is_admin());

-- place_order(): custom items now name their garment ----------------------------------
-- Same signature as 0009/0010, so existing permissions are kept (and re-applied below).
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
  -- [{ "garment_id", "size_id", "color_id", "gsm_id", "print_option_id",
  --    "sides": front|back|both, "front_design_id", "back_design_id", "quantity" }, ...]
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
  v_garment custom_garments%rowtype;
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

  -- custom garments: made to order, so no stock — priced from the admin price list ---
  for v_item in select * from jsonb_array_elements(v_custom_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    if v_qty is null or v_qty <= 0 or v_qty > 100 then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_sides := v_item ->> 'sides';
    if v_sides is null or v_sides not in ('front', 'back', 'both') then
      raise exception 'INVALID_CUSTOM_ITEM';
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

    select p.* into v_print from custom_print_options p
      join custom_garment_print_options gp on gp.print_option_id = p.id and gp.garment_id = v_garment.id
      where p.id = (v_item ->> 'print_option_id')::uuid and p.is_active = true;
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
      v_order_id, null, null, 'Custom ' || v_garment.name, v_size.label, v_color.name, v_qty, v_unit_price, v_line_total,
      true,
      jsonb_build_object(
        'color_hex', v_color.hex,
        'sides', v_sides,
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
