-- Custom Drip Chennai — allow a product to belong to more than one collection
--
-- 0006 gave each product a single `collection` text value (e.g. a tee could be either
-- "Football Collection" or "Gym Collection", never both). Replaces it with a `collections`
-- text array so one tee can be tagged into as many collections as apply.

alter table products add column collections text[] not null default '{}';

update products
  set collections = array[collection]
  where collection is not null and collection <> '';

drop index if exists products_gender_collection_idx;
alter table products drop column collection;

create index products_gender_idx on products (gender) where is_active = true;
create index products_collections_gin_idx on products using gin (collections);
