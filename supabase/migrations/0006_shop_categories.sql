-- Custom Drip Chennai — Men's/Women's shop navigation + collections
--
-- Adds two new, independent fields to products so the storefront's Shop menu can offer
-- "Men's" / "Women's" with each gender's collections (e.g. "Football Collection") nested
-- underneath, populated entirely from what admins tag on products — no fixed list to
-- maintain in code. Deliberately separate from the existing free-text `category` column
-- (garment type, e.g. "Oversized T-Shirt"), which this does not touch.

alter table products
  add column gender text check (gender is null or gender in ('men', 'women')),
  add column collection text;

create index products_gender_collection_idx on products (gender, collection) where is_active = true;
