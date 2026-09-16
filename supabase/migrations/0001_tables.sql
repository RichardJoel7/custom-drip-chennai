-- Custom Drip Chennai — core schema
-- Run in order: 0001_tables.sql -> 0002_functions.sql -> 0003_rls.sql -> 0004_storage.sql

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- admins: whitelist of Supabase Auth users allowed into /admin
-- ---------------------------------------------------------------------------
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: single-row store configuration (shipping, UPI, brand info)
-- ---------------------------------------------------------------------------
create table settings (
  id int primary key default 1,
  store_name text not null default 'Custom Drip Chennai',
  instagram_url text not null default 'https://www.instagram.com/custom_drip_chennai/',
  contact_number text,
  whatsapp_number text,
  upi_id text,
  upi_display_name text,
  upi_qr_image_url text,
  standard_shipping_fee numeric(10,2) not null default 50,
  free_shipping_threshold numeric(10,2) not null default 999,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  category text,
  fabric text,
  fit text,
  gsm text,
  print_type text,
  care_instructions text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_slug_idx on products (slug);
create index products_active_idx on products (is_active);
create index products_featured_idx on products (is_featured) where is_featured = true;

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- product_variants: size x colour combinations with independent stock
-- ---------------------------------------------------------------------------
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  size text not null,
  color text not null,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create index product_variants_product_idx on product_variants (product_id);

-- ---------------------------------------------------------------------------
-- customers: created at checkout time, no auth account required
-- ---------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null,
  email text not null,
  instagram_username text,
  created_at timestamptz not null default now()
);

create index customers_mobile_idx on customers (mobile_number);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create sequence order_number_seq start 1;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'CD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 4, '0')
  ),
  tracking_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  customer_id uuid not null references customers (id),

  full_name text not null,
  mobile_number text not null,
  email text not null,
  instagram_username text,

  address_line1 text not null,
  address_line2 text,
  area text,
  city text not null,
  state text not null,
  pincode text not null,
  order_notes text,

  subtotal numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,

  upi_transaction_id text not null,
  payment_status text not null default 'pending_verification'
    check (payment_status in ('pending_verification', 'paid', 'rejected')),
  order_status text not null default 'new'
    check (order_status in ('new', 'payment_confirmed', 'shipped', 'delivered', 'cancelled')),

  courier_name text,
  courier_tracking_number text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_order_number_idx on orders (order_number);
create index orders_tracking_token_idx on orders (tracking_token);
create index orders_order_status_idx on orders (order_status);
create index orders_payment_status_idx on orders (payment_status);
create index orders_created_idx on orders (created_at desc);

-- ---------------------------------------------------------------------------
-- order_items: snapshot of product/variant at time of order
-- ---------------------------------------------------------------------------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id),
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  size text not null,
  color text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);
