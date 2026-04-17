import { createClient } from '@supabase/supabase-js';
const c = createClient('https://mczvtevibjsqtqasmhec.supabase.co', 'sb_secret_0I-7AkO8SZGd5Jc49em4-g_pA_f5amv');

const SAIRAM = '38289b7d-943f-4424-b2f5-a74fdc9dff5e';

// Fix SAIRAM price selectors: use XPath to select meta[name="product:..."] 
// CSS colon in attribute value is parsed as pseudo-class — XPath avoids this
let r = await c.from('store_selectors').upsert([
  {
    store_id: SAIRAM,
    field: 'price_normal',
    selector: '//meta[@name="product:original_price:amount"]',
    selector_type: 'xpath'
  },
  {
    store_id: SAIRAM,
    field: 'price_discount',
    selector: '//meta[@name="product:price:amount"]',
    selector_type: 'xpath'
  },
], { onConflict: 'store_id,field' });
console.log('SAIRAM price XPath selectors:', r.error || 'ok');

process.exit(0);
