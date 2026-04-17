-- ============================================================
-- Migration 002 — Fix product_best_prices materialized view
--
-- Aligns column names with ProductSummary DTO and adds
-- best_store / best_store_id columns needed for search filters.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS product_best_prices;

CREATE MATERIALIZED VIEW product_best_prices AS
WITH latest_prices AS (
  -- Most recent price per store_product
  SELECT
    sp.product_id,
    sp.store_id,
    pr.price_normal,
    pr.price_discounted,
    COALESCE(pr.price_discounted, pr.price_normal) AS effective_price,
    CASE
      WHEN pr.price_discounted IS NOT NULL AND pr.price_normal > 0
        THEN ROUND(((pr.price_normal - pr.price_discounted)::numeric / pr.price_normal) * 100, 2)
      ELSE 0
    END AS discount_pct
  FROM store_products sp
  JOIN LATERAL (
    SELECT price_normal, price_discounted
    FROM prices
    WHERE store_product_id = sp.id
    ORDER BY captured_at DESC
    LIMIT 1
  ) pr ON TRUE
  WHERE sp.is_active = TRUE
),
best_by_product AS (
  -- Store with lowest effective price per product
  SELECT DISTINCT ON (product_id)
    product_id,
    store_id        AS best_store_id,
    effective_price AS best_price,
    price_discounted AS best_price_discounted,
    discount_pct
  FROM latest_prices
  ORDER BY product_id, effective_price ASC NULLS LAST
),
max_discount AS (
  SELECT product_id, MAX(discount_pct) AS max_discount_pct
  FROM latest_prices
  GROUP BY product_id
)
SELECT
  p.id,
  p.name,
  b.name                  AS brand,
  p.gender,
  p.image_url,
  bbp.best_price,
  bbp.best_price_discounted,
  bbp.best_store_id,
  s.name                  AS best_store,
  md.max_discount_pct
FROM products p
JOIN brands b            ON b.id = p.brand_id
JOIN best_by_product bbp ON bbp.product_id = p.id
JOIN stores s            ON s.id = bbp.best_store_id
JOIN max_discount md      ON md.product_id = p.id;

CREATE UNIQUE INDEX ON product_best_prices(id);

-- Keep the RPC function in sync (drop + recreate with new index name)
DROP FUNCTION IF EXISTS refresh_product_best_prices();
CREATE OR REPLACE FUNCTION refresh_product_best_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_best_prices;
END;
$$;
