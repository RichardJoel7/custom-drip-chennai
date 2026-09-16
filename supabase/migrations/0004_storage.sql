-- Custom Drip Chennai — Storage bucket for product images + QR code
-- Public read (product photos need to render on the storefront with no auth),
-- writes restricted to admins.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_bucket_public_read on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_bucket_admin_insert on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

create policy product_images_bucket_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and is_admin())
  with check (bucket_id = 'product-images' and is_admin());

create policy product_images_bucket_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
