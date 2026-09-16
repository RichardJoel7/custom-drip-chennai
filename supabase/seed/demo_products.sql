-- OPTIONAL demo/sample data — for local development and testing ONLY.
--
-- These are placeholder products so you can see the storefront working before you add
-- your real Custom Drip Chennai products. They are clearly marked with is_demo = true and
-- use placeholder image URLs (replace with real Supabase Storage URLs, or just delete the
-- demo products from Admin -> Products once you've added your real catalogue).
--
-- To remove all demo data at any time, run:
--   delete from products where is_demo = true;
-- (product_images and product_variants are removed automatically via ON DELETE CASCADE)

insert into products (name, slug, description, price, compare_at_price, category, fabric, fit, gsm, print_type, care_instructions, is_featured, is_active, is_demo)
values
  (
    'Messiah Oversized Tee',
    'messiah-oversized-tee',
    '[DEMO PRODUCT] Premium oversized cotton tee featuring an original graphic print. Heavyweight fabric with a relaxed streetwear fit.',
    799, 999,
    'Oversized T-Shirt', '100% Cotton', 'Oversized', '240 GSM', 'DTG Print',
    'Machine wash cold, inside out. Do not bleach. Iron on reverse.',
    true, true, true
  ),
  (
    'Chennai Skyline Tee',
    'chennai-skyline-tee',
    '[DEMO PRODUCT] A tribute to the city, printed on soft-touch cotton.',
    699, null,
    'Graphic T-Shirt', '100% Cotton', 'Regular', '220 GSM', 'Screen Print',
    'Machine wash cold, inside out. Do not bleach.',
    true, true, true
  ),
  (
    'Drip Logo Tee',
    'drip-logo-tee',
    '[DEMO PRODUCT] Minimal front logo tee, everyday essential.',
    599, 699,
    'Basic T-Shirt', '100% Cotton', 'Regular', '200 GSM', 'DTG Print',
    'Machine wash cold, inside out.',
    false, true, true
  );

-- Placeholder images (swap for real Supabase Storage URLs once uploaded via Admin)
insert into product_images (product_id, image_url, sort_order, is_main)
select id, 'https://placehold.co/1000x1200/111111/FFFFFF/png?text=Messiah+Oversized+Tee', 0, true
from products where slug = 'messiah-oversized-tee';

insert into product_images (product_id, image_url, sort_order, is_main)
select id, 'https://placehold.co/1000x1200/222222/FFFFFF/png?text=Back+Print', 1, false
from products where slug = 'messiah-oversized-tee';

insert into product_images (product_id, image_url, sort_order, is_main)
select id, 'https://placehold.co/1000x1200/111111/FFFFFF/png?text=Chennai+Skyline+Tee', 0, true
from products where slug = 'chennai-skyline-tee';

insert into product_images (product_id, image_url, sort_order, is_main)
select id, 'https://placehold.co/1000x1200/111111/FFFFFF/png?text=Drip+Logo+Tee', 0, true
from products where slug = 'drip-logo-tee';

-- Variants (size x colour x stock)
insert into product_variants (product_id, size, color, stock_quantity)
select p.id, v.size, v.color, v.stock
from products p
cross join (values
  ('S', 'Black', 4), ('M', 'Black', 8), ('L', 'Black', 10), ('XL', 'Black', 6), ('XXL', 'Black', 0),
  ('S', 'White', 3), ('M', 'White', 6), ('L', 'White', 7), ('XL', 'White', 2), ('XXL', 'White', 0)
) as v(size, color, stock)
where p.slug = 'messiah-oversized-tee';

insert into product_variants (product_id, size, color, stock_quantity)
select p.id, v.size, v.color, v.stock
from products p
cross join (values
  ('S', 'Black', 5), ('M', 'Black', 5), ('L', 'Black', 5), ('XL', 'Black', 5), ('XXL', 'Black', 5)
) as v(size, color, stock)
where p.slug = 'chennai-skyline-tee';

insert into product_variants (product_id, size, color, stock_quantity)
select p.id, v.size, v.color, v.stock
from products p
cross join (values
  ('S', 'White', 2), ('M', 'White', 4), ('L', 'White', 4), ('XL', 'White', 3), ('XXL', 'White', 1)
) as v(size, color, stock)
where p.slug = 'drip-logo-tee';
