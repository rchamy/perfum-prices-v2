-- ============================================================
-- perfum-prices-v2 — Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'visitor');
CREATE TYPE notification_channel AS ENUM ('email', 'telegram', 'both');
CREATE TYPE store_method AS ENUM ('scraper', 'api');
CREATE TYPE selector_type AS ENUM ('css', 'xpath');
CREATE TYPE selector_field AS ENUM (
  'product_name', 'price_normal', 'price_discount',
  'payment_method', 'product_url', 'image_url', 'brand'
);
CREATE TYPE gender_type AS ENUM ('male', 'female', 'unisex');
CREATE TYPE note_type AS ENUM ('top', 'heart', 'base');
CREATE TYPE threshold_type AS ENUM ('percentage', 'fixed_price');
CREATE TYPE worker_status AS ENUM ('success', 'error', 'partial');

-- ============================================================
-- USERS (extends Supabase Auth)
-- ============================================================

CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL DEFAULT '',
  role                user_role NOT NULL DEFAULT 'visitor',
  notification_channel notification_channel NOT NULL DEFAULT 'email',
  telegram_chat_id    TEXT,
  telegram_link_token TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user row on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BRANDS
-- ============================================================

CREATE TABLE brands (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL UNIQUE,
  country_of_origin TEXT
);

-- ============================================================
-- OLFACTIVE FAMILIES
-- ============================================================

CREATE TABLE olfactive_families (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO olfactive_families (name) VALUES
  ('Floral'), ('Oriental'), ('Amaderado'), ('Cítrico'),
  ('Acuático'), ('Aromático'), ('Gourmand'), ('Frutal');

-- ============================================================
-- OLFACTIVE NOTES
-- ============================================================

CREATE TABLE olfactive_notes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES olfactive_families(id) ON DELETE CASCADE,
  name      TEXT NOT NULL
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  gender      gender_type NOT NULL DEFAULT 'unisex',
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- ============================================================
-- PRODUCT NOTES
-- ============================================================

CREATE TABLE product_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  note_id    UUID NOT NULL REFERENCES olfactive_notes(id) ON DELETE CASCADE,
  note_type  note_type NOT NULL,
  UNIQUE (product_id, note_id, note_type)
);

-- ============================================================
-- STORES
-- ============================================================

CREATE TABLE stores (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  url                       TEXT NOT NULL,
  logo_url                  TEXT,
  method                    store_method NOT NULL DEFAULT 'scraper',
  api_config                JSONB,
  scrape_frequency_minutes  INT NOT NULL DEFAULT 60,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  country                   TEXT NOT NULL DEFAULT 'CL',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORE SELECTORS
-- ============================================================

CREATE TABLE store_selectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  field         selector_field NOT NULL,
  selector      TEXT NOT NULL,
  selector_type selector_type NOT NULL DEFAULT 'css',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (store_id, field)
);

-- ============================================================
-- STORE PRODUCTS
-- ============================================================

CREATE TABLE store_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_url     TEXT NOT NULL,
  external_id     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  UNIQUE (store_id, product_id)
);

CREATE INDEX idx_store_products_store ON store_products(store_id);
CREATE INDEX idx_store_products_product ON store_products(product_id);

-- ============================================================
-- PRICES (append-only historical log)
-- ============================================================

CREATE TABLE prices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_product_id  UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  price_normal      NUMERIC(12,2) NOT NULL,
  price_discounted  NUMERIC(12,2),
  payment_method    TEXT,
  discount_label    TEXT,
  currency          TEXT NOT NULL DEFAULT 'CLP',
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prices_store_product ON prices(store_product_id);
CREATE INDEX idx_prices_captured_at ON prices(captured_at DESC);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE alerts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id             UUID REFERENCES stores(id) ON DELETE SET NULL,
  threshold_type       threshold_type NOT NULL,
  threshold_value      NUMERIC(12,2) NOT NULL,
  notification_channel notification_channel NOT NULL DEFAULT 'email',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_product ON alerts(product_id);

-- ============================================================
-- FAVORITES
-- ============================================================

CREATE TABLE favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ============================================================
-- WORKER LOGS
-- ============================================================

CREATE TABLE worker_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  status         worker_status NOT NULL DEFAULT 'success',
  products_found INT NOT NULL DEFAULT 0,
  error_message  TEXT,
  notified       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_logs_store ON worker_logs(store_id);
CREATE INDEX idx_worker_logs_created_at ON worker_logs(created_at DESC);

-- ============================================================
-- JOB QUEUE (for manual worker triggers from Admin)
-- ============================================================

CREATE TABLE job_queue (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_at  TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_selectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_logs ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Alerts: users manage their own
CREATE POLICY "alerts_own" ON alerts
  FOR ALL USING (auth.uid() = user_id);

-- Favorites: users manage their own
CREATE POLICY "favorites_own" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Stores: public read, admin write
CREATE POLICY "stores_public_read" ON stores
  FOR SELECT USING (TRUE);

CREATE POLICY "stores_admin_write" ON stores
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Store selectors: admin only
CREATE POLICY "selectors_admin" ON store_selectors
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Worker logs: admin only
CREATE POLICY "worker_logs_admin" ON worker_logs
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- MATERIALIZED VIEW: best current prices per product
-- (refresh after each worker run)
-- ============================================================

CREATE MATERIALIZED VIEW product_best_prices AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  b.name AS brand_name,
  p.gender,
  p.image_url,
  MIN(pr.price_discounted) FILTER (WHERE pr.price_discounted IS NOT NULL) AS best_price_discounted,
  MIN(pr.price_normal) AS best_price_normal,
  ROUND(
    MAX(
      CASE
        WHEN pr.price_discounted IS NOT NULL
        THEN ((pr.price_normal - pr.price_discounted) / pr.price_normal) * 100
        ELSE 0
      END
    ), 2
  ) AS max_discount_pct
FROM products p
JOIN brands b ON b.id = p.brand_id
JOIN store_products sp ON sp.product_id = p.id AND sp.is_active = TRUE
JOIN LATERAL (
  SELECT price_normal, price_discounted
  FROM prices
  WHERE store_product_id = sp.id
  ORDER BY captured_at DESC
  LIMIT 1
) pr ON TRUE
GROUP BY p.id, p.name, b.name, p.gender, p.image_url;

CREATE UNIQUE INDEX ON product_best_prices(product_id);
