-- ============================================================
-- Seed 001 — Tiendas iniciales con config base
--
-- Ejecutar DESPUÉS de migration 002_fix_product_best_prices.sql
-- Los selectores CSS son placeholders — actualizar vía Admin UI
-- o editando directamente la tabla store_selectors.
--
-- Campos válidos en selector_field:
--   product_name, price_normal, price_discount,
--   payment_method, product_url, image_url, brand
-- ============================================================

-- Tiendas
INSERT INTO stores (name, url, logo_url, method, scrape_frequency_minutes, country, is_active)
VALUES
  ('Paris',               'https://www.paris.cl',                   NULL, 'scraper', 120, 'CL', true),
  ('Falabella',           'https://www.falabella.com/falabella-cl',  NULL, 'scraper', 120, 'CL', true),
  ('Ripley',              'https://simple.ripley.cl',                NULL, 'scraper', 120, 'CL', true),
  ('Lider',               'https://www.lider.cl',                    NULL, 'scraper', 180, 'CL', true),
  ('Fasa',                'https://www.fasa.cl',                     NULL, 'scraper', 180, 'CL', true),
  ('SAIRAM Perfumes',     'https://www.sairam.cl',                   NULL, 'scraper', 240, 'CL', true),
  ('MercadoLibre',        'https://www.mercadolibre.cl',             NULL, 'api',     60,  'CL', true),
  ('Multimarcasperfumes', 'https://www.multimarcasperfumes.cl',      NULL, 'scraper', 240, 'CL', true),
  ('Alisha Perfumes',     'https://www.alishaperfumes.cl',           NULL, 'scraper', 240, 'CL', true),
  ('Silk Perfumes',       'https://www.silkperfumes.cl',             NULL, 'scraper', 240, 'CL', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Selectores base (placeholders — actualizar con los reales)
-- Para encontrar los selectores: DevTools → Inspect element
-- sobre precio/nombre en la página de producto de cada tienda
-- ============================================================

-- Paris
INSERT INTO store_selectors (store_id, field, selector, selector_type)
SELECT s.id, v.field::selector_field, v.selector, v.selector_type::selector_type
FROM stores s,
  (VALUES
    ('product_name',   'h1.product-title',        'css'),
    ('price_normal',   '.prices-main-price',       'css'),
    ('price_discount', '.prices-discount-price',   'css'),
    ('image_url',      '.product-img img',         'css')
  ) AS v(field, selector, selector_type)
WHERE s.name = 'Paris'
ON CONFLICT (store_id, field) DO NOTHING;

-- Falabella
INSERT INTO store_selectors (store_id, field, selector, selector_type)
SELECT s.id, v.field::selector_field, v.selector, v.selector_type::selector_type
FROM stores s,
  (VALUES
    ('product_name',   'h1.jsx-product-title',         'css'),
    ('price_normal',   '.original-price',              'css'),
    ('price_discount', '.discount-badge + .price',     'css'),
    ('image_url',      '.zoom-image-container img',    'css')
  ) AS v(field, selector, selector_type)
WHERE s.name = 'Falabella'
ON CONFLICT (store_id, field) DO NOTHING;

-- Ripley
INSERT INTO store_selectors (store_id, field, selector, selector_type)
SELECT s.id, v.field::selector_field, v.selector, v.selector_type::selector_type
FROM stores s,
  (VALUES
    ('product_name',   'h1.product-title',                 'css'),
    ('price_normal',   '.product-price .price',            'css'),
    ('price_discount', '.product-price .discount-price',   'css'),
    ('image_url',      '.product-gallery img.active',      'css')
  ) AS v(field, selector, selector_type)
WHERE s.name = 'Ripley'
ON CONFLICT (store_id, field) DO NOTHING;

-- Lider
INSERT INTO store_selectors (store_id, field, selector, selector_type)
SELECT s.id, v.field::selector_field, v.selector, v.selector_type::selector_type
FROM stores s,
  (VALUES
    ('product_name',   '[data-testid="product-title"]',           'css'),
    ('price_normal',   '[data-testid="price-without-discount"]',  'css'),
    ('price_discount', '[data-testid="price-with-discount"]',     'css'),
    ('image_url',      '[data-testid="product-image"] img',       'css')
  ) AS v(field, selector, selector_type)
WHERE s.name = 'Lider'
ON CONFLICT (store_id, field) DO NOTHING;

-- Fasa
INSERT INTO store_selectors (store_id, field, selector, selector_type)
SELECT s.id, v.field::selector_field, v.selector, v.selector_type::selector_type
FROM stores s,
  (VALUES
    ('product_name',   'h1.product-name',          'css'),
    ('price_normal',   '.price-box .regular-price', 'css'),
    ('price_discount', '.price-box .special-price', 'css'),
    ('image_url',      '.product-image img',        'css')
  ) AS v(field, selector, selector_type)
WHERE s.name = 'Fasa'
ON CONFLICT (store_id, field) DO NOTHING;
