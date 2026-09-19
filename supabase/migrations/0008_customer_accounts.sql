-- Custom Drip Chennai — customer accounts
--
-- Customers can now sign in (Google or email/password, via Supabase Auth) and must be
-- signed in to place an order — browsing and the cart itself stay guest-accessible. This
-- links the existing guest-checkout `customers` table to `auth.users`, adds a wishlist, and
-- lets a signed-in customer read (never write) their own customer row and order history via
-- RLS. Admin access and the guest tracking-by-token page are untouched.

alter table customers add column auth_user_id uuid references auth.users (id) on delete set null;
create unique index customers_auth_user_id_idx on customers (auth_user_id) where auth_user_id is not null;

-- wishlists ------------------------------------------------------------------
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlists_user_idx on wishlists (user_id);

alter table wishlists enable row level security;

create policy wishlists_owner_all on wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- customers / orders: a signed-in customer can read (only) their own data -----
create policy customers_self_select on customers
  for select using (auth.uid() = auth_user_id);

create policy orders_self_select on orders
  for select using (
    customer_id in (select id from customers where auth_user_id = auth.uid())
  );

-- place_order(): link the order's customer row to the signed-in account ------
drop function if exists place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb);

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
  p_auth_user_id uuid default null
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
  v_item_count int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
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
    v_item_count := v_item_count + 1;

    insert into order_items (
      order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, line_total
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.size, v_variant.color, v_qty, v_product.price, v_line_total
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

revoke all on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid) from public;
grant execute on function place_order(text, text, text, text, text, text, text, text, text, text, text, text, jsonb, uuid) to service_role;
