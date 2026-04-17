-- ============================================================
-- Migration 004 — Add missing RPC + verify unique constraint
-- ============================================================

-- 1. Function: get_min_historical_price
--    Used by GET /products/:id to show the all-time low price
CREATE OR REPLACE FUNCTION get_min_historical_price(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(COALESCE(price_discounted, price_normal))
  FROM prices
  WHERE store_product_id IN (
    SELECT id FROM store_products WHERE product_id = p_product_id
  );
$$;

-- 2. Ensure unique constraint on products(name, brand_id) exists
--    (may already exist from migration 003 — DO NOTHING if so)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_brand_unique'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_name_brand_unique UNIQUE (name, brand_id);
  END IF;
END $$;

-- 3. Add MercadoLibre api_config (missing from seed)
UPDATE stores
SET api_config = jsonb_build_object(
  'baseUrl', 'https://api.mercadolibre.com',
  'siteId', 'MLC',
  'category', 'MLC1051',
  'queryParams', jsonb_build_object('q', 'perfume', 'limit', '50')
)
WHERE name = 'MercadoLibre' AND api_config IS NULL;
