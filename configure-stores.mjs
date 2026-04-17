import { createClient } from '@supabase/supabase-js';
const c = createClient('https://mczvtevibjsqtqasmhec.supabase.co', 'sb_secret_0I-7AkO8SZGd5Jc49em4-g_pA_f5amv');

const SAIRAM = '38289b7d-943f-4424-b2f5-a74fdc9dff5e';
const MULTI  = '1a0183f3-6304-4a6c-a35c-1d0767d5c315';

// Update SAIRAM image_url → use meta og:image
let r = await c.from('store_selectors').update({ selector: 'meta[property="og:image"]' }).eq('store_id', SAIRAM).eq('field', 'image_url');
console.log('SAIRAM image update:', r.error || 'ok');

// Insert SAIRAM price selectors (meta tag approach)
r = await c.from('store_selectors').upsert([
  { store_id: SAIRAM, field: 'price_normal',   selector: 'meta[name="product:original_price:amount"]', selector_type: 'css' },
  { store_id: SAIRAM, field: 'price_discount',  selector: 'meta[name="product:price:amount"]',          selector_type: 'css' },
], { onConflict: 'store_id,field' });
console.log('SAIRAM price selectors:', r.error || 'ok');

// Insert Multimarcas selectors (Shopify, different theme than Silk)
r = await c.from('store_selectors').upsert([
  { store_id: MULTI, field: 'list_item',        selector: '.product-thumbnail',        selector_type: 'css' },
  { store_id: MULTI, field: 'list_product_url', selector: 'a.product-thumbnail__title', selector_type: 'css' },
  { store_id: MULTI, field: 'list_next_page',   selector: 'a[rel="next"]',              selector_type: 'css' },
  { store_id: MULTI, field: 'product_name',     selector: 'h1',                        selector_type: 'css' },
  { store_id: MULTI, field: 'price_normal',     selector: 'span.compare-at-price',     selector_type: 'css' },
  { store_id: MULTI, field: 'price_discount',   selector: 'span.price',                selector_type: 'css' },
  { store_id: MULTI, field: 'image_url',        selector: 'meta[property="og:image"]', selector_type: 'css' },
  { store_id: MULTI, field: 'brand',            selector: '.product__vendor',          selector_type: 'css' },
], { onConflict: 'store_id,field' });
console.log('Multimarcas selectors:', r.error || 'ok');

// Activate Multimarcas
r = await c.from('stores').update({ is_active: true }).eq('id', MULTI);
console.log('Multimarcas activated:', r.error || 'ok');

process.exit(0);
