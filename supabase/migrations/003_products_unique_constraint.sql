-- Migration 003 — Unique constraint on products(name, brand_id)
-- Required for ON CONFLICT upsert when worker auto-creates products from ML API

ALTER TABLE products ADD CONSTRAINT products_name_brand_unique UNIQUE (name, brand_id);
